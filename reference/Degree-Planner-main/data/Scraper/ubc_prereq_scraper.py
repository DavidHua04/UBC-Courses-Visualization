import csv
import re
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = "https://vancouver.calendar.ubc.ca"
COURSES_BY_SUBJECT_URL = BASE + "/course-descriptions/courses-subject"

HEADERS = {
    "User-Agent": "UBC-degree-planner-bot/0.1 (for personal academic project; contact: your-email@example.com)"
}

def fetch(url):
    print(f"Fetching {url}")
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return resp.text

def get_subject_urls():
    html = fetch(COURSES_BY_SUBJECT_URL)
    soup = BeautifulSoup(html, "html.parser")

    subject_urls = set()

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/course-descriptions/subject/" in href:
            full_url = urljoin(BASE, href)
            subject_urls.add(full_url)

    subject_urls = sorted(subject_urls)
    print(f"Found {len(subject_urls)} subject pages.")
    for example in list(subject_urls)[:5]:
        print("  example subject url:", example)
    return subject_urls

def parse_course_heading(h3_text):
    text = " ".join(h3_text.split())

    m = re.match(r"([A-Z]+)(_V)?\s+(\d+[A-Z]?)\s+\((\d+)\)\s+(.*)", text)
    if not m:
        return {
            "subject": None,
            "campus_suffix": None,
            "number": None,
            "credits": None,
            "title": text,
        }

    subject, campus_suffix, number, credits, title = m.groups()
    return {
        "subject": subject,
        "campus_suffix": campus_suffix or "",
        "number": number,
        "credits": credits,
        "title": title.strip(),
    }

def extract_course_block(h3):
    heading_text = h3.get_text(" ", strip=True)
    course_meta = parse_course_heading(heading_text)

    description_parts = []
    prereq_raw = None
    coreq_raw = None
    exclusion_raw = None

    sibling = h3.find_next_sibling()
    while sibling and sibling.name != "h3":
        if sibling.name in ["p", "div", "li"]:
            text = sibling.get_text(" ", strip=True)
            if text:
                description_parts.append(text)

                if "Prerequisite:" in text:
                    after = text.split("Prerequisite:", 1)[1].strip()
                    prereq_raw = after
                if "Corequisite:" in text:
                    after = text.split("Corequisite:", 1)[1].strip()
                    coreq_raw = after
                if "Credit will only be granted for one of" in text or "Credit will be granted for only one of" in text:
                    exclusion_raw = text
        sibling = sibling.find_next_sibling()

    description = " ".join(description_parts).strip()

    course = {
        "subject": course_meta["subject"],
        "campus_suffix": course_meta["campus_suffix"],
        "course_number": course_meta["number"],
        "credits": course_meta["credits"],
        "title": course_meta["title"],
        "description": description,
        "prerequisite_raw": prereq_raw,
        "corequisite_raw": coreq_raw,
        "exclusion_raw": exclusion_raw,
    }
    return course

def parse_subject_page(subject_url):
    html = fetch(subject_url)
    soup = BeautifulSoup(html, "html.parser")

    courses = []
    for h3 in soup.select("h3"):
        h3_text = h3.get_text(" ", strip=True)
        if not re.search(r"\d", h3_text):
            continue

        course = extract_course_block(h3)
        if course["course_number"]:
            courses.append(course)

    print(f"  Found {len(courses)} courses in {subject_url}")
    return courses

def main():
    subject_urls = get_subject_urls()

    all_courses = []
    for i, subject_url in enumerate(subject_urls, start=1):
        print(f"[{i}/{len(subject_urls)}] Subject: {subject_url}")
        try:
            courses = parse_subject_page(subject_url)
            all_courses.extend(courses)
        except Exception as e:
            print(f"  Error parsing {subject_url}: {e}")
        time.sleep(0.5)

    fieldnames = [
        "subject",
        "campus_suffix",
        "course_number",
        "credits",
        "title",
        "description",
        "prerequisite_raw",
        "corequisite_raw",
        "exclusion_raw",
    ]

    with open("ubc_prereqs.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for c in all_courses:
            writer.writerow(c)

    print(f"Done. Wrote {len(all_courses)} courses to ubc_prereqs.csv")

if __name__ == "__main__":
    main()
