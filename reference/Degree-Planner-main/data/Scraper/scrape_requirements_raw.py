import json
import os
import re
import time
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup, Tag, NavigableString

# ---------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------

BASE = "https://vancouver.calendar.ubc.ca"
COURSES_OF_STUDY_URL = (
    "https://vancouver.calendar.ubc.ca/faculties-colleges-and-schools/courses-study-and-degrees"
)

HEADERS = {
    "User-Agent": "ubc-degree-planner/0.1 (personal academic project; contact: your-email@example.com)"
}

OUT_FILE = "ubc_degree_requirements_raw_all.json"

# modest concurrency – fast but not abusive
MAX_WORKERS = 8

# ---------------------------------------------------------------------
# HTTP session (connection reuse)
# ---------------------------------------------------------------------

SESSION = requests.Session()
SESSION.headers.update(HEADERS)


def fetch(url: str) -> str:
    """Fetch a URL using a shared session."""
    print(f"Fetching {url}")
    resp = SESSION.get(url, timeout=20)
    resp.raise_for_status()
    return resp.text


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def is_specialization_heading(text: str) -> bool:
    """
    Detect headings that are actually 'specialization names' on a page,
    e.g. 'Major in X', 'Honours in Y', 'Minor in Z', etc.
    """
    text = text.strip()
    prefixes = (
        "Major",
        "Honours",
        "Combined Major",
        "Combined Honours",
        "Minor",
        "Specialization",
        "Specializations",   # some Science pages use this
        "Major Programs",
        "Honours Programs",
    )
    return any(text.startswith(p) for p in prefixes)


def is_year_heading(text: str) -> bool:
    """
    Detect per-year headings to group raw lines.
    Extend here if you see more styles (Year 1, etc.).
    """
    text = text.strip()
    patterns = [
        r"^First Year$",
        r"^Second Year$",
        r"^Third Year$",
        r"^Fourth Year$",
        r"^Third and Fourth Years$",
        r"^Years 2 and 3$",
        r"^Fourth and Fifth Years$",
        # slightly looser fallbacks – some faculties use these
        r"^First-Year Curriculum$",
        r"^First Year Curriculum$",
        r"^Second Year Program$",
        r"^Third Year Program$",
        r"^Fourth Year Program$",
    ]
    return any(re.match(p, text) for p in patterns)


def get_faculty_from_url(program_url: str) -> str:
    """
    Extract the faculty/school slug from a program URL, e.g.
    '.../faculties-colleges-and-schools/faculty-arts/bachelor-arts/...'
    -> 'faculty-arts'
    -> 'faculty-applied-science'
    -> 'school-music'
    etc.
    """
    parsed = urlparse(program_url)
    parts = parsed.path.strip("/").split("/")
    try:
        idx = parts.index("faculties-colleges-and-schools")
    except ValueError:
        return ""
    if idx + 1 < len(parts):
        return parts[idx + 1]
    return ""


# ---------------------------------------------------------------------
# Step 1: find all "Bachelor of ..." root pages
# ---------------------------------------------------------------------

def get_bachelor_root_urls():
    """
    Find all 'Bachelor of ...' root pages (BA, BSc, BASc, BEd, B.PharmSci, etc.).
    This keeps us focused on undergrad degrees.
    """
    html = fetch(COURSES_OF_STUDY_URL)
    soup = BeautifulSoup(html, "html.parser")

    roots = set()

    for a in soup.find_all("a", href=True):
        text = a.get_text(" ", strip=True)
        if text.startswith("Bachelor of "):
            href = a["href"]
            if "/faculties-colleges-and-schools/" in href:
                full = urljoin(BASE, href)
                roots.add(full)

    roots = sorted(roots)
    print(f"\nFound {len(roots)} bachelor root URLs:")
    for r in roots:
        print("  ", r)
    return roots


# ---------------------------------------------------------------------
# Step 2: for each bachelor, find all program pages
# ---------------------------------------------------------------------

def get_program_urls_for_bachelor(bachelor_url: str):
    """
    Given a 'Bachelor of ...' root page, find all child program pages.
    """
    html = fetch(bachelor_url)
    soup = BeautifulSoup(html, "html.parser")

    parsed = urlparse(bachelor_url)
    base_path = parsed.path.rstrip("/")

    program_urls = set()

    for a in soup.find_all("a", href=True):
        href = a["href"]
        full = urljoin(BASE, href)

        p = urlparse(full)
        if p.netloc != parsed.netloc:
            continue

        path = p.path.rstrip("/")

        # Under same bachelor path, but not equal to the root
        if path.startswith(base_path) and path != base_path:
            program_urls.add(full)

    program_urls = sorted(program_urls)
    print(f"\n[{bachelor_url}] -> found {len(program_urls)} program URLs")
    return program_urls


def get_all_program_urls(bachelor_roots):
    """
    Aggregate all program URLs from all bachelor roots into a single set.
    """
    all_programs = set()
    for root in bachelor_roots:
        try:
            progs = get_program_urls_for_bachelor(root)
        except Exception as e:
            print(f"Error getting program URLs for {root}: {e}")
            continue
        all_programs.update(progs)

    all_programs = sorted(all_programs)
    print(f"\nTotal unique program URLs: {len(all_programs)}")
    return all_programs


# ---------------------------------------------------------------------
# Step 3: extract specializations + year-by-year raw text for a program
# ---------------------------------------------------------------------

def extract_specializations_with_headings(soup: BeautifulSoup, program_url: str):
    """
    Arts/Science-style pages: multiple specializations on a single page,
    each under headings like 'Major in X', 'Minor in Y', etc.
    """
    faculty = get_faculty_from_url(program_url)

    spec_headers = []
    for tag in soup.find_all(["h3", "h4"]):
        text = tag.get_text(" ", strip=True)
        if is_specialization_heading(text):
            spec_headers.append(tag)

    results = []

    for idx, spec_header in enumerate(spec_headers):
        spec_name = spec_header.get_text(" ", strip=True)
        print(f"  -> Specialization {idx+1}: {spec_name}")

        years = []
        current_year = None
        current_entries = []

        node = spec_header.next_sibling

        while node:
            # stop when we reach the next specialization heading
            if isinstance(node, Tag) and node.name in ["h3", "h4"]:
                maybe_next = node.get_text(" ", strip=True)
                if is_specialization_heading(maybe_next):
                    break

            if isinstance(node, NavigableString):
                node = node.next_sibling
                continue
            if not isinstance(node, Tag):
                node = node.next_sibling
                continue

            text = node.get_text(" ", strip=True)

            # New year section
            if is_year_heading(text):
                if current_year is not None and current_entries:
                    years.append(
                        {
                            "year_label": current_year,
                            "raw_lines": current_entries,
                        }
                    )
                    current_entries = []

                current_year = text
                print(f"     Year heading: {current_year}")
                node = node.next_sibling
                continue

            # Collect requirement-ish text
            if current_year is not None and node.name in ["p", "div", "li"]:
                line = text.strip()
                if line:
                    current_entries.append(line)

            node = node.next_sibling

        if current_year is not None and current_entries:
            years.append(
                {
                    "year_label": current_year,
                    "raw_lines": current_entries,
                }
            )

        results.append(
            {
                "program_url": program_url,
                "faculty": faculty,
                "specialization_name": spec_name,
                "years_raw": years,
            }
        )

    return results


def extract_single_specialization_fallback(soup: BeautifulSoup, program_url: str):
    """
    Fallback path for pages that do NOT have explicit
    'Major/Minor/Honours' headings – typical for many Applied Science,
    Nursing, Forestry, Education, Pharmaceutical Sciences, etc.

    In this case, treat the ENTIRE PAGE as ONE specialization,
    using the H1 title as the specialization name.
    """
    faculty = get_faculty_from_url(program_url)

    # Specialization name from H1 (or <title> as a last resort)
    h1 = soup.find("h1")
    if h1:
        spec_name = h1.get_text(" ", strip=True)
    elif soup.title and soup.title.string:
        spec_name = soup.title.string.strip()
    else:
        spec_name = "Program"

    print(f"  -> Fallback specialization (whole page): {spec_name}")

    years = []
    current_year = None
    current_entries = []

    # Try to anchor traversal after H1; if no H1, use the whole document body
    start_node = h1.next_sibling if h1 else soup.body and soup.body.contents[0]

    node = start_node
    visited = set()

    while node:
        # simple loop-safety
        if id(node) in visited:
            break
        visited.add(id(node))

        if isinstance(node, NavigableString):
            node = node.next_sibling
            continue
        if not isinstance(node, Tag):
            node = node.next_sibling
            continue

        text = node.get_text(" ", strip=True)

        # New year section (if present)
        if is_year_heading(text):
            if current_year is not None and current_entries:
                years.append(
                    {
                        "year_label": current_year,
                        "raw_lines": current_entries,
                    }
                )
                current_entries = []

            current_year = text
            print(f"     Year heading: {current_year}")
            node = node.next_sibling
            continue

        # Collect requirement-ish text
        if current_year is not None and node.name in ["p", "div", "li"]:
            line = text.strip()
            if line:
                current_entries.append(line)

        node = node.next_sibling

    if current_year is not None and current_entries:
        years.append(
            {
                "year_label": current_year,
                "raw_lines": current_entries,
            }
        )

    return [
        {
            "program_url": program_url,
            "faculty": faculty,
            "specialization_name": spec_name,
            "years_raw": years,
        }
    ]


def extract_specializations_raw(program_url: str):
    """
    Main extractor for a single program URL.

    1. Try heading-based specializations (Arts/Science style).
    2. If none found, treat page as a single specialization (fallback).
    """
    html = fetch(program_url)
    soup = BeautifulSoup(html, "html.parser")

    # 1) Try the standard heading-based approach
    specs = extract_specializations_with_headings(soup, program_url)
    if specs:
        return specs

    # 2) Fallback – page as a single specialization
    return extract_single_specialization_fallback(soup, program_url)


def scrape_program(program_url: str):
    """
    Wrapper to use with ThreadPoolExecutor.
    Returns (program_url, specs, error_message_or_None).
    """
    print(f"\n=== Program: {program_url} ===")
    try:
        specs = extract_specializations_raw(program_url)
        return program_url, specs, None
    except Exception as e:
        return program_url, [], str(e)


# ---------------------------------------------------------------------
# Progress bar helper
# ---------------------------------------------------------------------

def print_progress(completed: int, total: int):
    bar_len = 40
    if total <= 0:
        return
    frac = completed / total
    filled = int(bar_len * frac)
    bar = "#" * filled + "-" * (bar_len - filled)
    print(f"\r[{bar}] {completed}/{total} ({frac * 100:5.1f}%)", end="", flush=True)


# ---------------------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------------------

def main():
    # Load existing JSON (if present) so we can:
    #  - skip already-scraped specializations
    #  - backfill faculty into old entries
    existing_specs = []
    existing_pairs = set()  # (program_url, specialization_name)

    if os.path.exists(OUT_FILE):
        with open(OUT_FILE, "r", encoding="utf-8") as f:
            existing_specs = json.load(f)
        print(f"Loaded {len(existing_specs)} existing specialization blocks from {OUT_FILE}")

        for spec in existing_specs:
            # Ensure faculty is present on old records
            if "faculty" not in spec:
                spec["faculty"] = get_faculty_from_url(spec.get("program_url", ""))

            key = (spec.get("program_url"), spec.get("specialization_name"))
            existing_pairs.add(key)

        print(f"Existing unique (program_url, specialization_name) pairs: {len(existing_pairs)}")

    # Discover all bachelor roots and program URLs
    bachelor_roots = get_bachelor_root_urls()
    all_program_urls = get_all_program_urls(bachelor_roots)

    # Start with existing data and append new stuff
    all_specs = list(existing_specs)

    total_programs = len(all_program_urls)
    completed_programs = 0

    print(f"\nStarting parallel scrape with max_workers={MAX_WORKERS} ...")

    start_time = time.time()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_url = {
            executor.submit(scrape_program, prog_url): prog_url
            for prog_url in all_program_urls
        }

        for future in as_completed(future_to_url):
            prog_url = future_to_url[future]
            try:
                prog_url, specs, err = future.result()
            except Exception as e:
                print(f"\n  Unhandled error for {prog_url}: {e}")
                completed_programs += 1
                print_progress(completed_programs, total_programs)
                continue

            if err:
                print(f"\n  Error parsing {prog_url}: {err}")
            else:
                new_count = 0
                for s in specs:
                    key = (s["program_url"], s["specialization_name"])
                    if key in existing_pairs:
                        print(f"    Skipping already-scraped specialization: {s['specialization_name']}")
                        continue
                    all_specs.append(s)
                    existing_pairs.add(key)
                    new_count += 1

                if new_count:
                    print(f"  -> {new_count} new specialization blocks added for program")

            completed_programs += 1
            print_progress(completed_programs, total_programs)

    elapsed = time.time() - start_time
    print("\n\nScraping finished in {:.1f} seconds.".format(elapsed))

    # Save merged results
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_specs, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(all_specs)} specialization blocks (total) to {OUT_FILE}")


if __name__ == "__main__":
    main()
