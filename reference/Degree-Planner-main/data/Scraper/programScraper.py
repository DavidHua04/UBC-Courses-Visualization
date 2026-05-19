#!/usr/bin/env python3
"""
UBC Program Scraper – Final Version
Author: ChatGPT
Reads URLs from `ubc_program_urls.txt` and outputs standardized JSON entries.

Supports all known UBC program layouts.
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re


# ----------------------------------------------------------
# Helpers
# ----------------------------------------------------------

def fetch(url):
    """HTTP GET with timeout + basic error surfacing."""
    try:
        r = requests.get(url, timeout=12)
        r.raise_for_status()
        return r.text
    except Exception as e:
        raise RuntimeError(f"Failed to load {url}: {e}")


def clean_slug(url):
    """Return the final URL path component as program ID."""
    return url.rstrip("/").split("/")[-1]


def parse_length(text):
    """Convert UBC length formats into years."""
    if not text:
        return None

    t = text.lower().strip()

    # Years
    m_year = re.findall(r"([\d\.]+)\s*(?:yr|yrs|year|years)", t)
    if m_year:
        return float(m_year[0])

    # Months
    m_month = re.findall(r"([\d\.]+)\s*(?:mo|mos|month|months)", t)
    if m_month:
        return round(float(m_month[0]) / 12, 3)

    return None


# ----------------------------------------------------------
# Program Information Extractor (works for ALL UBC layouts)
# ----------------------------------------------------------

def extract_program_info(soup):
    """
    Extract program metadata from ANY UBC layout.
    Returns dict:
      { campus, faculty, degree, length, co-op, honours }
    """
    vitals = soup.select_one("#program-vitals")
    if not vitals:
        return None

    info = {
        "campus": None,
        "faculty": None,
        "degree": None,
        "length": None,
        "co-op": None,
        "honours": None
    }

    items = vitals.select("li")

    for li in items:
        text = li.get_text(strip=True)
        strong = li.find("strong")
        value = strong.get_text(strip=True) if strong else None

        # Campus
        if "Campus" in text:
            info["campus"] = value

        # Faculty
        elif "Faculty" in text:
            if value:
                info["faculty"] = value.replace("Degree:", "").strip()

        # Degree
        elif "Degree" in text:
            info["degree"] = value

        # Length
        elif text.startswith("Length") and value:
            info["length"] = parse_length(value)

        # Co-op
        elif "Co-op" in text and value:
            info["co-op"] = (value.lower() == "yes")

        # Honours
        elif "Honours" in text and value:
            info["honours"] = (value.lower() == "yes")

    return info


# ----------------------------------------------------------
# Major/Honours JSON Builder
# ----------------------------------------------------------

def build_entries(url, info, program_title):
    """Generate JSON entries for Major and (optional) Honours."""
    slug = clean_slug(url)
    base_name = program_title.split("(")[0].strip()

    major_credits = 120
    honours_credits = 132

    # Default fields
    base = {
        "faculty": info["faculty"],
        "description": info["degree"],
        "requirements": [],
        "co-op": info["co-op"],
        "length": info["length"],
        "campus": info["campus"]
    }

    entries = []

    # ---- Major ----
    entries.append({
        **base,
        "id": slug,
        "name": f"Major in {base_name}",
        "totalCredits": major_credits
    })

    # ---- Honours ----
    if info["honours"]:
        entries.append({
            **base,
            "id": f"honours_{slug}",
            "name": f"Honours in {base_name}",
            "totalCredits": honours_credits
        })

    return entries


# ----------------------------------------------------------
# Scrape one program page
# ----------------------------------------------------------

def scrape_program(url):
    html = fetch(url)
    soup = BeautifulSoup(html, "html.parser")

    # Program title
    h1 = soup.find("h1")
    if not h1:
        return None, f"No <h1> title found at {url}"
    program_title = h1.get_text(strip=True)

    # Extract program info
    info = extract_program_info(soup)
    if not info:
        return None, "Program info box not found"

    entries = build_entries(url, info, program_title)
    return entries, None


# ----------------------------------------------------------
# MAIN
# ----------------------------------------------------------

def main():
    urls = []
    with open("ubc_program_urls.txt") as f:
        for line in f:
            line = line.strip()
            if line:
                urls.append(line)

    print(f"Found {len(urls)} URLs.")

    all_entries = []

    for i, url in enumerate(urls, start=1):
        print(f"[{i}/{len(urls)}] Scraping {url} ... ", end="")

        entries, err = scrape_program(url)
        if err:
            print(f"ERROR: {err}")
        else:
            print("OK")
            all_entries.extend(entries)

        time.sleep(0.5)

    with open("ubc_programs.json", "w") as f:
        json.dump(all_entries, f, indent=2)

    print("\nDone. Saved to ubc_programs.json")


if __name__ == "__main__":
    main()
