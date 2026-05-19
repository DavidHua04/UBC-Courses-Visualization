import json
import os
import re
import time
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag, NavigableString

# ========= CONFIG =========
BASE = "https://vancouver.calendar.ubc.ca"
INPUT_FILE = "ubc_degree_requirements_clean2.json"   # your existing JSON
OUTPUT_FILE = "ubc_specializations_with_requirements.json"

HEADERS = {
    "User-Agent": "ubc-degree-planner/0.1 (personal academic project; contact: you@example.com)"
}

# Toggle this if you want AI-parsed requirements directly in this script
USE_AI = True  # set to True when you're ready and have an API key

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = "gpt-4o-mini"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


# ========= HTTP helper =========
def fetch(url: str) -> str:
    print(f"Fetching {url}")
    r = requests.get(url, headers=HEADERS, timeout=25)
    r.raise_for_status()
    return r.text


# ========= HTML helpers =========

def normalize_text(s: str) -> str:
    """Lowercase, collapse whitespace, strip."""
    return re.sub(r"\s+", " ", s).strip().lower()


def find_specialization_heading(
    soup: BeautifulSoup,
    specialization_name: str
) -> Optional[Tag]:
    """
    Try to find the <h2>/<h3>/<h4> heading that corresponds to specialization_name.
    Uses fuzzy-ish matching: equal, contains, or contained-in (case-insensitive).
    """
    target = normalize_text(specialization_name)
    best = None
    best_score = None

    for tag in soup.find_all(["h2", "h3", "h4"]):
        text = normalize_text(tag.get_text(" ", strip=True))
        if not text:
            continue

        # Check basic match conditions
        if target == text or target in text or text in target:
            # Score: closer length is better
            score = abs(len(text) - len(target))
            if best is None or score < best_score:
                best = tag
                best_score = score

    return best


def is_block_terminator(tag: Tag) -> bool:
    """
    Decide when we've reached the end of this specialization block.
    Rough rule: next h2/h3/h4 is the start of another section.
    """
    if not isinstance(tag, Tag):
        return False
    if tag.name in ["h2", "h3", "h4"]:
        # New major heading, likely next specialization / next section
        return True
    return False


def extract_requirement_lines_from_block(start_heading: Tag) -> List[str]:
    """
    Starting just after the specialization heading, walk siblings until
    we hit the next specialization/major heading. Collect text from p, li,
    and table rows as "requirement" lines.
    """
    lines: List[str] = []
    node = start_heading.next_sibling

    while node:
        if isinstance(node, NavigableString):
            node = node.next_sibling
            continue

        if not isinstance(node, Tag):
            node = node.next_sibling
            continue

        # Stop when encountering a new high-level heading
        if is_block_terminator(node):
            break

        # Paragraphs / generic divs
        if node.name in ["p", "div"]:
            text = node.get_text(" ", strip=True)
            if text:
                lines.append(text)

        # Lists
        if node.name in ["ul", "ol"]:
            for li in node.find_all("li", recursive=False):
                text = li.get_text(" ", strip=True)
                if text:
                    lines.append(text)

        # Tables: each row as a line
        if node.name == "table":
            for tr in node.find_all("tr"):
                cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
                row_text = " | ".join(c for c in cells if c)
                if row_text:
                    lines.append(row_text)

        node = node.next_sibling

    # Optional: de-duplicate & drop super-short lines
    cleaned = []
    seen = set()
    for ln in lines:
        ln_stripped = ln.strip()
        if len(ln_stripped) < 3:
            continue
        if ln_stripped in seen:
            continue
        seen.add(ln_stripped)
        cleaned.append(ln_stripped)

    return cleaned


# ========= Optional: AI parser to structure requirements =========

AI_SYSTEM_PROMPT = """
You are a data-normalization assistant for a UBC degree-planning app.

You will receive JSON with:
- program_url
- specialization_name
- faculty
- requirements_raw: list of messy requirement strings scraped from the UBC Calendar
  (paragraphs, bullet points, table rows).

Your job: convert those into structured JSON using EXACTLY this schema:

{
  "program_url": "string",
  "specialization_name": "string",
  "faculty": "string or null",
  "requirements": [
    {
      "type": "course_list" | "course_choice" | "bucket" | "meta",
      "courses": ["SUBJ 101", "SUBJ 102"],   // for course_list
      "options": [                           // for course_choice
        { "courses": ["SUBJ 101"], "credits": 3 },
        { "courses": ["SUBJ 102","SUBJ 103"], "credits": 6 }
      ],
      "bucket_label": "string or null",      // for buckets like 'Humanities electives'
      "min_credits": number,                 // 0 if N/A
      "min_choose": number,                  // 0 if N/A
      "label": "string or null",             // for meta entries, totals, etc.
      "notes": "string"                      // extra natural-language details if useful
    }
  ]
}

Rules:
- Convert codes like 'CPSC_V 110' to 'CPSC 110' in the output.
- Use type 'course_choice' when text clearly presents alternative courses
  (e.g. 'one of CPSC 110 or CPSC 121').
- Use type 'bucket' for 'x credits of electives', 'breadth', or 'courses from list'.
- Use type 'meta' for totals or non-course conditions, e.g. 'A 68% average is required'.
- Keep requirements that mention courses or credits; drop irrelevant prose if needed.
- ONLY output valid JSON. No comments, no markdown, no extra text.
"""


def call_openai_parse_requirements(spec_obj: Dict, requirements_raw: List[str]) -> Dict:
    """
    Send one specialization's raw requirement lines to the model
    and return structured requirements.
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is empty; set it in the script or env.")

    payload = {
        "program_url": spec_obj.get("program_url"),
        "specialization_name": spec_obj.get("specialization_name"),
        "faculty": spec_obj.get("faculty"),
        "requirements_raw": requirements_raw,
    }

    messages = [
        {"role": "system", "content": AI_SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps(payload)},
    ]

    r = requests.post(
        OPENAI_API_URL,
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": OPENAI_MODEL,
            "messages": messages,
            "temperature": 0,
        },
        timeout=90,
    )
    r.raise_for_status()
    text = r.json()["choices"][0]["message"]["content"]
    return json.loads(text)


# ========= Main pipeline =========

def process_specialization(spec: Dict) -> Dict:
    """
    Given one specialization record from the JSON, scrape its requirements
    and (optionally) AI-parse them. Returns an updated record.
    """
    url = spec["program_url"]
    name = spec["specialization_name"]
    print(f"\n=== {name} ===")
    print(f"URL: {url}")

    try:
        html = fetch(url)
    except Exception as e:
        print(f"  !! Error fetching page: {e}")
        spec["requirements_raw"] = []
        spec["requirements_parsed"] = None
        return spec

    soup = BeautifulSoup(html, "html.parser")
    heading = find_specialization_heading(soup, name)

    if not heading:
        print("  !! Could not find matching heading on page.")
        spec["requirements_raw"] = []
        spec["requirements_parsed"] = None
        return spec

    raw_lines = extract_requirement_lines_from_block(heading)
    print(f"  -> Extracted {len(raw_lines)} raw requirement lines")

    spec["requirements_raw"] = raw_lines

    if USE_AI and raw_lines:
        try:
            parsed = call_openai_parse_requirements(spec, raw_lines)
            spec["requirements_parsed"] = parsed.get("requirements", [])
            print(f"  -> AI parsed {len(spec['requirements_parsed'])} structured items")
        except Exception as e:
            print(f"  !! AI parse error: {e}")
            spec["requirements_parsed"] = None
    else:
        spec["requirements_parsed"] = None

    return spec


def main():
    # Load your existing JSON of all specializations
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        specs = json.load(f)

    updated_specs = []
    for i, spec in enumerate(specs, start=1):
        print(f"\n[{i}/{len(specs)}] Processing specialization: {spec['specialization_name']}")
        updated = process_specialization(spec)
        updated_specs.append(updated)
        time.sleep(0.4)  # be polite to UBC servers & to the API

    # Save updated JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(updated_specs, f, indent=2, ensure_ascii=False)

    print(f"\nDone. Wrote {len(updated_specs)} specializations to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
