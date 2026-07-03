# Degree Map — UBC course planner

Plan a UBC degree term by term, with the full real catalog and live
prerequisite checking. Search 7,269 courses, drop them onto a year-by-term
board, and see immediately whether you're eligible, what each course unlocks,
and how far you are from graduating.

Everything runs in your browser: plans live in localStorage, export to JSON,
and travel whole inside a share link. There is no server and no account.

## What it does

- **Search with live eligibility** — every result carries a dot showing
  whether you could take that course in the currently selected term:
  prerequisites met, not met, needs your judgment (prose rules like
  "third-year standing"), or already in your plan.
- **Prerequisites as proof trees** — course rules render as nested
  ALL OF / ONE OF logic with a ✓/✗ per leaf, so you see *which branch*
  fails, and whether the missing course is planned in a later term
  (ordering problem) or absent entirely.
- **Unlocks** — the reverse prerequisite graph, precomputed across the whole
  catalog: pick CPSC 110 and see the courses it opens up.
- **Whole-plan validation** — prerequisite order, corequisites, duplicates,
  retakes after failure, and term credit loads, recomputed on every change.
- **Degree progress** — track a program's requirements (CS major fully
  specified) with per-requirement meters, satisfying courses, and
  transfer-credit exemptions.
- **What-if scenarios** — duplicate a plan in one click and rearrange it;
  switch between plans freely.

## Setup: installing Node.js and npm

This project needs **Node.js** (which includes `npm`, the tool that
downloads dependencies and runs the scripts below). If you've never
installed either, here's how — no prior experience assumed.

**Check if you already have them.** Open a terminal (Windows: PowerShell;
macOS: Terminal) and run:

```bash
node -v
npm -v
```

If both print a version number, skip ahead to [Run it](#run-it). If you get
"command not found" / "not recognized", install Node with the steps for
your OS below.

<details>
<summary><b>Windows</b></summary>

1. Go to [nodejs.org](https://nodejs.org) and download the **LTS**
   installer (the button labeled "LTS", not "Current").
2. Run the installer, keeping all default options.
3. **Close and reopen** any terminal windows — PATH changes from the
   installer only apply to new terminals.
4. Verify with `node -v` and `npm -v` again.

If you have `winget` (built into modern Windows 10/11), you can instead run:

```powershell
winget install OpenJS.NodeJS.LTS
```

then close/reopen your terminal and verify.

If `node` is still not found after installing and reopening your terminal,
search Start menu for "Edit environment variables for your account" and
check that a Node.js path (e.g. `C:\Program Files\nodejs\`) is listed under
your user `Path` variable.

</details>

<details>
<summary><b>macOS</b></summary>

1. Go to [nodejs.org](https://nodejs.org) and download the **LTS**
   installer for macOS.
2. Run the `.pkg` installer with default options.
3. Open a new Terminal window and verify with `node -v` and `npm -v`.

If you use [Homebrew](https://brew.sh), you can instead run `brew install
node`.

</details>

<details>
<summary><b>Linux</b></summary>

Use your distribution's package manager, or the installers at
[nodejs.org](https://nodejs.org). For example, on Ubuntu/Debian:

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

</details>

Once `node -v` and `npm -v` both work, get the project onto your machine
(skip this if you already have the folder):

```bash
git clone <this-repo-url>
cd UBC-Courses-Visualization
```

## Run it

```bash
npm install      # downloads dependencies into node_modules/ (first time only)
npm run data     # data/source → public/data (also runs as part of build)
npm run dev      # http://localhost:5173
```

Open the printed `http://localhost:5173` URL in your browser. Press
`Ctrl+C` in the terminal to stop the server when you're done.

Other commands:

```bash
npm run test     # engine + parser unit tests (vitest)
npm run build    # data + typecheck + production bundle
npm run preview  # serve the production build
npm run e2e      # browser smoke test against the preview server
```

Deploy by putting `dist/` on any static host.

## How it's built

```
data/source/      scraped UBC catalog + program specs (checked in)
scripts/          build-data.ts → public/data/ (index, dept chunks,
                  unlocks graph, programs); prose→rule-tree parser
src/engine/       pure domain logic: prereq evaluation, plan validation,
                  requirement matching, degree progress — all unit tested
src/catalog/      static-data client: upfront search index, lazy dept chunks
src/state/        Zustand store, localStorage persistence, share links
src/ui/           React components (three-zone workspace)
```

The design rationale — why there's no backend, what was kept from the
original full-stack version, and the UX decisions — is in [PLAN.md](PLAN.md).
