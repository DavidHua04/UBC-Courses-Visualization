# UBC Degree Planner – Frontend E2E Test Plan

## Application Overview

The UBC Degree Planner is a React 19 single-page application served at http://localhost:5173 (Vite dev server, /api proxied to Express backend at port 3000). The app is laid out in three panels: a left Sidebar (Transcript & Goals), a central PlanBoard (kanban of year/term columns), and a right SummaryPanel (credit progress + prerequisite validation). Students build multi-year course plans by searching for courses, adding them to term columns, dragging cards between columns, changing course statuses, running prerequisite validation, and comparing or tracking progress against a declared program. The course catalog contains 29 CPSC/MATH/STAT courses seeded from the backend. All state is persisted to the backend via a REST API; there is no local-only storage except for per-plan program selection (localStorage). Tests assume a fresh backend state unless a seeding step is included. The browser starts at http://localhost:5173 for every test.

## Test Scenarios

### 1. Application Bootstrap

**Seed:** `frontend/e2e/seed.spec.ts`

#### 1.1. Loading state is shown then resolves

**File:** `frontend/e2e/bootstrap/loading-state.spec.ts`

**Steps:**
  1. Navigate to http://localhost:5173
    - expect: A full-screen loading indicator with the text 'Loading…' is visible immediately after navigation while the API calls are in-flight
  2. Wait for the loading indicator to disappear
    - expect: The three-panel layout (Sidebar, PlanBoard area, no right panel yet) is rendered
    - expect: The 'Loading…' text is no longer present on the page

#### 1.2. Error state is shown when backend is unreachable

**File:** `frontend/e2e/bootstrap/error-state.spec.ts`

**Steps:**
  1. Block all requests to /api/* using route interception so that the fetch for plans fails with a network error
  2. Navigate to http://localhost:5173
    - expect: The page shows 'Could not connect to server'
    - expect: The page shows 'Make sure the backend is running on port 3000'
    - expect: The three-panel layout is NOT rendered

#### 1.3. Empty state: no plans exist

**File:** `frontend/e2e/bootstrap/empty-state.spec.ts`

**Steps:**
  1. Ensure no plans exist on the backend (delete any pre-existing plans via the API before navigating)
  2. Navigate to http://localhost:5173
    - expect: The Sidebar section 'Simulated Plans' displays 'No plans yet.'
    - expect: The center area displays 'No plan selected'
    - expect: A 'Create your first plan' button is visible in the center area

#### 1.4. Auto-selects the first existing plan on load

**File:** `frontend/e2e/bootstrap/auto-select-plan.spec.ts`

**Steps:**
  1. Ensure at least one plan named 'Test Plan' exists on the backend before navigating
  2. Navigate to http://localhost:5173
    - expect: The plan named 'Test Plan' is highlighted/selected in the Sidebar's Simulated Plans list
    - expect: The PlanBoard header displays 'Test Plan'
    - expect: The term columns for Year 1 Winter 1 and Year 1 Winter 2 are visible in the board

### 2. Plan Management

**Seed:** `frontend/e2e/seed.spec.ts`

#### 2.1. Create a new plan via the Sidebar Add button

**File:** `frontend/e2e/plans/create-plan-sidebar.spec.ts`

**Steps:**
  1. Navigate to http://localhost:5173
  2. In the Sidebar under 'Simulated Plans', click the 'Add' button
    - expect: A browser prompt dialog appears with the text 'Plan name:'
  3. Type 'My Degree Plan' into the prompt and click OK
    - expect: The dialog closes
    - expect: A new entry 'My Degree Plan' appears in the Sidebar's Simulated Plans list
    - expect: The new plan is immediately selected (shown with bold text and a highlighted background)
    - expect: The PlanBoard header reads 'My Degree Plan'
    - expect: The board shows empty Year 1 Winter 1 and Year 1 Winter 2 columns with 'Drop courses here' placeholders

#### 2.2. Create a plan via the empty-state 'Create your first plan' button

**File:** `frontend/e2e/plans/create-plan-empty-state.spec.ts`

**Steps:**
  1. Ensure no plans exist; navigate to http://localhost:5173
    - expect: 'Create your first plan' button is visible in the center area
  2. Click the 'Create your first plan' button
    - expect: A browser prompt dialog appears
  3. Enter 'First Plan' and confirm
    - expect: The plan 'First Plan' appears in the Sidebar
    - expect: The PlanBoard becomes visible with the plan header 'First Plan'

#### 2.3. Cancel plan creation leaves state unchanged

**File:** `frontend/e2e/plans/create-plan-cancel.spec.ts`

**Steps:**
  1. Navigate to http://localhost:5173
  2. Click the 'Add' button under Simulated Plans
    - expect: Prompt dialog appears
  3. Click Cancel in the prompt dialog
    - expect: No new plan is added to the Sidebar list
    - expect: The existing selected plan (if any) remains selected and unchanged

#### 2.4. Plan creation with blank name is rejected

**File:** `frontend/e2e/plans/create-plan-blank-name.spec.ts`

**Steps:**
  1. Navigate to http://localhost:5173; click the 'Add' button under Simulated Plans
  2. Submit the prompt with an empty string (press OK without typing anything)
    - expect: No new plan is created
    - expect: No alert or error message is shown (the app silently discards the empty submission)

#### 2.5. Switch between multiple plans

**File:** `frontend/e2e/plans/switch-plans.spec.ts`

**Steps:**
  1. Create two plans named 'Plan A' and 'Plan B' via the Sidebar Add button
    - expect: Both plans appear in the Simulated Plans list
  2. Click on 'Plan A' in the Sidebar
    - expect: 'Plan A' is highlighted in the Sidebar
    - expect: The PlanBoard header reads 'Plan A'
  3. Click on 'Plan B' in the Sidebar
    - expect: 'Plan B' is highlighted in the Sidebar
    - expect: 'Plan A' is no longer highlighted
    - expect: The PlanBoard header reads 'Plan B'

#### 2.6. Delete a non-selected plan

**File:** `frontend/e2e/plans/delete-nonselected-plan.spec.ts`

**Steps:**
  1. Create two plans named 'Keep Me' and 'Delete Me'; ensure 'Keep Me' is selected
  2. Hover over 'Delete Me' in the Sidebar to reveal its delete (×) button, then click it
    - expect: A browser confirm dialog appears with the text 'Delete this plan?'
  3. Click OK to confirm deletion
    - expect: 'Delete Me' is removed from the Simulated Plans list
    - expect: 'Keep Me' remains in the list and stays selected
    - expect: The PlanBoard header still reads 'Keep Me'

#### 2.7. Delete the currently selected plan falls back to next plan

**File:** `frontend/e2e/plans/delete-selected-plan.spec.ts`

**Steps:**
  1. Create two plans named 'First' and 'Second'; select 'First'
  2. Hover over 'First' and click its × button; confirm the deletion dialog
    - expect: 'First' is removed from the Sidebar list
    - expect: 'Second' is automatically selected
    - expect: The PlanBoard header reads 'Second'

#### 2.8. Delete the only existing plan shows empty state

**File:** `frontend/e2e/plans/delete-last-plan.spec.ts`

**Steps:**
  1. Ensure exactly one plan named 'Only Plan' exists; navigate to http://localhost:5173 with it selected
  2. Hover over 'Only Plan' and click × ; confirm deletion
    - expect: 'Only Plan' is removed from the Sidebar
    - expect: The Sidebar Simulated Plans section shows 'No plans yet.'
    - expect: The center area shows 'No plan selected' and the 'Create your first plan' button

#### 2.9. Cancel plan deletion leaves state unchanged

**File:** `frontend/e2e/plans/delete-plan-cancel.spec.ts`

**Steps:**
  1. Create a plan named 'Survivor'; hover over it and click ×
    - expect: Confirm dialog appears
  2. Click Cancel in the confirm dialog
    - expect: 'Survivor' is still in the Simulated Plans list
    - expect: 'Survivor' remains selected

### 3. Course Catalog & Search Modal

**Seed:** `frontend/e2e/seed.spec.ts`

#### 3.1. Open the Add Course modal from a term column button

**File:** `frontend/e2e/catalog/open-modal-from-column.spec.ts`

**Steps:**
  1. Seed the course catalog via POST /api/v1/courses/seed if needed; create a plan; navigate to http://localhost:5173 with the plan selected
  2. Click the 'Add Course' button inside the Year 1 Winter 1 term column
    - expect: The Course Search modal opens
    - expect: The modal title reads 'Add Course'
    - expect: A search input with placeholder 'Search by code or name…' is focused
    - expect: The left filter panel shows 'Subject' and 'Level' sections
    - expect: All 29 courses are listed in the results area (or the count footer shows the correct number)

#### 3.2. Open the Add Course modal from the top-bar '+ Term' button

**File:** `frontend/e2e/catalog/open-modal-from-topbar.spec.ts`

**Steps:**
  1. Navigate to http://localhost:5173 with a plan selected
  2. Click the '+ Term' button in the PlanBoard header bar
    - expect: The Course Search modal opens

#### 3.3. Search filters results by keyword

**File:** `frontend/e2e/catalog/search-by-keyword.spec.ts`

**Steps:**
  1. Open the Course Search modal
  2. Type 'CPSC 110' into the search input
    - expect: The results list updates to show only courses matching 'CPSC 110'
    - expect: The footer count updates to reflect the filtered number
    - expect: Courses not matching the query are hidden

#### 3.4. Filter by department (Subject)

**File:** `frontend/e2e/catalog/filter-by-department.spec.ts`

**Steps:**
  1. Open the Course Search modal
  2. Click the 'MATH' filter button in the Subject panel on the left
    - expect: Only MATH courses appear in the results list
    - expect: Non-MATH courses are hidden
    - expect: The footer count reflects MATH-only courses
  3. Click 'All' in the Subject panel
    - expect: All courses reappear in the results

#### 3.5. Filter by level

**File:** `frontend/e2e/catalog/filter-by-level.spec.ts`

**Steps:**
  1. Open the Course Search modal
  2. Click the '300s' level filter button
    - expect: Only courses with codes in the 300-399 range are shown
    - expect: The footer count reflects the filtered number
  3. Click 'All' in the Level panel
    - expect: All courses are shown again

#### 3.6. Combined department and level filter

**File:** `frontend/e2e/catalog/combined-filters.spec.ts`

**Steps:**
  1. Open the Course Search modal; select 'CPSC' in Subject and '300s' in Level
    - expect: Only CPSC courses in the 300-level range appear
    - expect: Other departments and other levels are hidden

#### 3.7. Search with no results shows empty message

**File:** `frontend/e2e/catalog/search-no-results.spec.ts`

**Steps:**
  1. Open the Course Search modal; type 'XYZNONEXISTENT999' in the search input
    - expect: The results area shows 'No courses found'
    - expect: The footer shows '0 courses found'

#### 3.8. Add a course to a specific term column

**File:** `frontend/e2e/catalog/add-course-to-term.spec.ts`

**Steps:**
  1. Open the Course Search modal from the Year 1 Winter 1 'Add Course' button
  2. Search for 'CPSC 110' and click its '+ Add' button
    - expect: The modal closes
    - expect: A CourseCard for 'CPSC 110' appears in the Year 1 Winter 1 column
    - expect: The card shows the course ID, credit count, and 'Planned' status badge
    - expect: The column credit total increases by the course's credits (3 cr)

#### 3.9. Adding a course via clicking the course row (not the Add button) works identically

**File:** `frontend/e2e/catalog/add-course-by-row-click.spec.ts`

**Steps:**
  1. Open the Course Search modal; search for 'CPSC 121'; click anywhere on the CPSC 121 row (not the '+ Add' button)
    - expect: The modal closes
    - expect: CPSC 121 appears in the target term column

#### 3.10. Adding the same course twice to the same plan is rejected

**File:** `frontend/e2e/catalog/duplicate-course-rejected.spec.ts`

**Steps:**
  1. Add CPSC 110 to Year 1 Winter 1
    - expect: CPSC 110 card appears in Year 1 Winter 1
  2. Open the Course Search modal again; search for 'CPSC 110' and click '+ Add'
    - expect: An alert dialog appears with an error message indicating the course is already in the plan (HTTP 409 or similar)
    - expect: The course is NOT added a second time to the board

#### 3.11. UBCGrades link opens in a new tab

**File:** `frontend/e2e/catalog/ubcgrades-link.spec.ts`

**Steps:**
  1. Open the Course Search modal
  2. Locate the 'UBCGrades' link on any course row and verify its href attribute
    - expect: The href contains 'ubcgrades.com/statistics-by-course' with the correct course dept and code in the fragment (e.g., '#UBCV-CPSC-110')
    - expect: The link has target='_blank'

#### 3.12. Close modal via backdrop click

**File:** `frontend/e2e/catalog/close-modal-backdrop.spec.ts`

**Steps:**
  1. Open the Course Search modal; click on the dark backdrop area outside the modal panel
    - expect: The modal closes
    - expect: The board is still visible with no changes

#### 3.13. Close modal via the X button

**File:** `frontend/e2e/catalog/close-modal-x-button.spec.ts`

**Steps:**
  1. Open the Course Search modal; click the × close button in the modal header
    - expect: The modal closes

### 4. Drag and Drop

**Seed:** `frontend/e2e/seed.spec.ts`

#### 4.1. Drag a course card from one term column to another

**File:** `frontend/e2e/dnd/drag-between-columns.spec.ts`

**Steps:**
  1. Seed courses; create a plan; add CPSC 110 to Year 1 Winter 1 and add CPSC 121 to Year 1 Winter 2
  2. Drag the CPSC 110 card from Year 1 Winter 1 and drop it onto the Year 1 Winter 2 drop zone
    - expect: CPSC 110 disappears from the Year 1 Winter 1 column
    - expect: CPSC 110 appears in the Year 1 Winter 2 column
    - expect: Year 1 Winter 1 credit total decreases by CPSC 110's credits
    - expect: Year 1 Winter 2 credit total increases accordingly
    - expect: The SummaryPanel total credit count remains unchanged

#### 4.2. Drag a course to a different year

**File:** `frontend/e2e/dnd/drag-to-different-year.spec.ts`

**Steps:**
  1. Add CPSC 110 to Year 1 Winter 1
  2. Drag the CPSC 110 card and drop it onto the Year 2 Winter 1 column drop zone
    - expect: CPSC 110 moves to Year 2 Winter 1
    - expect: Year 1 Winter 1 is now empty and shows 'Drop courses here'

#### 4.3. Drop zone highlights on drag over

**File:** `frontend/e2e/dnd/drop-zone-highlight.spec.ts`

**Steps:**
  1. Add a course to Year 1 Winter 1; begin dragging the course card
    - expect: The card becomes semi-transparent (opacity 0.4) while dragging
  2. Hover the dragged card over Year 1 Winter 2 column drop zone
    - expect: The Year 1 Winter 2 drop zone changes appearance (dashed indigo border and light indigo background) to indicate it is a valid drop target

#### 4.4. Dropping a card onto the same column is a no-op

**File:** `frontend/e2e/dnd/drop-same-column-noop.spec.ts`

**Steps:**
  1. Add CPSC 110 to Year 1 Winter 1; drag and drop it back onto its own Year 1 Winter 1 column
    - expect: CPSC 110 remains in Year 1 Winter 1
    - expect: No API call is made to update the entry's year/term
    - expect: No visual change or error occurs

#### 4.5. Drop onto another course card in a different column moves the dragged card

**File:** `frontend/e2e/dnd/drop-onto-card.spec.ts`

**Steps:**
  1. Add CPSC 110 to Year 1 Winter 1 and CPSC 121 to Year 1 Winter 2
  2. Drag the CPSC 110 card and drop it directly onto the CPSC 121 card
    - expect: CPSC 110 moves to Year 1 Winter 2 (where CPSC 121 is)
    - expect: CPSC 110 no longer appears in Year 1 Winter 1

### 5. Course Card Interactions

**Seed:** `frontend/e2e/seed.spec.ts`

#### 5.1. Status badge cycles through all four statuses on click

**File:** `frontend/e2e/cards/status-cycle.spec.ts`

**Steps:**
  1. Add CPSC 110 to Year 1 Winter 1; note the initial status badge reads 'Planned' (blue badge)
    - expect: Status badge shows 'Planned'
  2. Click the 'Planned' status badge on the CPSC 110 card
    - expect: The badge changes to 'In Progress' (yellow badge)
  3. Click the 'In Progress' badge
    - expect: The badge changes to 'Completed' (green badge)
  4. Click the 'Completed' badge
    - expect: The badge changes to 'Failed' (red badge)
  5. Click the 'Failed' badge
    - expect: The badge cycles back to 'Planned' (blue badge)

#### 5.2. Completed status moves course to Sidebar completed list

**File:** `frontend/e2e/cards/completed-status-sidebar.spec.ts`

**Steps:**
  1. Add CPSC 110 to Year 1 Winter 1; cycle its status to 'Completed'
  2. Observe the Sidebar 'Completed Courses' section
    - expect: CPSC 110 appears in the Completed Courses list in the Sidebar
    - expect: The Sidebar shows the course ID and title
    - expect: The 'Total: X credits' line in the Sidebar increases to include CPSC 110's credits

#### 5.3. Remove a course card via the × button

**File:** `frontend/e2e/cards/remove-course-card.spec.ts`

**Steps:**
  1. Add CPSC 110 to Year 1 Winter 1
  2. Click the × remove button on the CPSC 110 card
    - expect: The CPSC 110 card is removed from Year 1 Winter 1
    - expect: The column reverts to showing 'Drop courses here'
    - expect: The column credit total returns to 0 cr

#### 5.4. Remove button does not trigger course card click (no selection)

**File:** `frontend/e2e/cards/remove-does-not-select.spec.ts`

**Steps:**
  1. Add CPSC 110 to Year 1 Winter 1; click the × remove button on the card
    - expect: The course is removed
    - expect: The SummaryPanel does NOT switch to the 'Course Info' tab (it remains on 'Summary')

#### 5.5. Click course card selects it and switches SummaryPanel to Course Info tab

**File:** `frontend/e2e/cards/select-course-card.spec.ts`

**Steps:**
  1. Add CPSC 110 to Year 1 Winter 1; click anywhere on the CPSC 110 card body (not the remove button or status badge)
    - expect: The CPSC 110 card gets a purple border and light purple background (indicating selection)
    - expect: The SummaryPanel automatically switches to the 'Course Info' tab
    - expect: The Course Info tab shows: CPSC 110 title, credits, department badge, description, prerequisites section, and three resource links (UBCGrades, UBC Course Schedule, UBC Explorer)

#### 5.6. Clicking an already-selected card deselects it

**File:** `frontend/e2e/cards/deselect-course-card.spec.ts`

**Steps:**
  1. Select a course card by clicking it; click the same card again
    - expect: The card returns to its normal (unselected) appearance
    - expect: The SummaryPanel switches back to the 'Summary' tab

#### 5.7. Course Info tab shows 'No course selected' when no card is selected

**File:** `frontend/e2e/cards/course-info-no-selection.spec.ts`

**Steps:**
  1. Navigate to http://localhost:5173 with a plan selected; click the 'Course Info' tab in the SummaryPanel manually
    - expect: The Course Info tab shows an info icon, 'No course selected', and 'Click any course in your plan to view its details here.'

#### 5.8. 'Back to Summary' link in Course Info tab returns to Summary tab

**File:** `frontend/e2e/cards/back-to-summary.spec.ts`

**Steps:**
  1. Select a course card; in the SummaryPanel Course Info tab, click '← Back to Summary'
    - expect: The SummaryPanel switches to the 'Summary' tab
    - expect: The previously selected course card is deselected

#### 5.9. Course card shows error highlight when prerequisites are not met

**File:** `frontend/e2e/cards/error-highlight.spec.ts`

**Steps:**
  1. Seed courses; create a plan; add CPSC 310 (which requires CPSC 210) to Year 1 Winter 1 without adding CPSC 210
  2. Click 'Re-check' in the SummaryPanel Course Validation section
    - expect: The CPSC 310 card displays a red border and light red background
    - expect: The SummaryPanel shows CPSC 310 under 'Issues:' with an error message about missing prerequisites

### 6. Prerequisite Validation

**Seed:** `frontend/e2e/seed.spec.ts`

#### 6.1. Initial state shows no validation results before Re-check

**File:** `frontend/e2e/validation/initial-state.spec.ts`

**Steps:**
  1. Create a plan; add CPSC 110 to Year 1 Winter 1; observe the SummaryPanel Course Validation section
    - expect: The text 'Click Re-check to validate prerequisites.' is shown
    - expect: No valid/invalid counts are displayed yet

#### 6.2. All prerequisites met: validation passes

**File:** `frontend/e2e/validation/all-prereqs-met.spec.ts`

**Steps:**
  1. Create a plan; add CPSC 110 to Year 1 Winter 1 (CPSC 110 has no prerequisites)
  2. Click 'Re-check' in the Course Validation section
    - expect: The validation runs (brief 'Checking…' state appears)
    - expect: The result shows 'Valid Courses: 1' and 'Invalid Courses: 0'
    - expect: No error cards appear under 'Issues:'
    - expect: The CPSC 110 card has no red border

#### 6.3. Missing prerequisite: validation fails with error details

**File:** `frontend/e2e/validation/missing-prereq.spec.ts`

**Steps:**
  1. Create a plan; add CPSC 210 to Year 1 Winter 1 WITHOUT adding its prerequisite CPSC 110 first
  2. Click 'Re-check'
    - expect: The validation result shows 'Invalid Courses: 1'
    - expect: An error card for CPSC 210 appears under 'Issues:' with a message describing the missing prerequisite
    - expect: The CPSC 210 card on the board shows a red border and red background

#### 6.4. Prerequisite in a later term is invalid (prerequisite must come before)

**File:** `frontend/e2e/validation/prereq-wrong-order.spec.ts`

**Steps:**
  1. Create a plan; add CPSC 110 to Year 1 Winter 2 and add CPSC 210 (requires CPSC 110) to Year 1 Winter 1
  2. Click 'Re-check'
    - expect: CPSC 210 is reported as invalid because CPSC 110 is scheduled after it
    - expect: An error card appears for CPSC 210

#### 6.5. Fix prerequisites: re-validation clears errors

**File:** `frontend/e2e/validation/fix-and-revalidate.spec.ts`

**Steps:**
  1. Create a plan with CPSC 210 in Year 1 Winter 1 (no prereq); run Re-check — CPSC 210 should show as invalid
    - expect: CPSC 210 appears in Issues with an error
  2. Add CPSC 110 to Year 1 Winter 1 (or an earlier position), then click 'Re-check' again
    - expect: The error for CPSC 210 is gone
    - expect: All courses are now shown as valid
    - expect: The red border on the CPSC 210 card is removed

#### 6.6. Validation spinner shows during check

**File:** `frontend/e2e/validation/spinner-state.spec.ts`

**Steps:**
  1. Create a plan with several courses; click 'Re-check'
    - expect: While the request is in-flight, the button text changes to 'Checking…' and is disabled/greyed
    - expect: The text 'Validating…' appears in the validation section body

#### 6.7. Empty plan validates successfully with zero courses

**File:** `frontend/e2e/validation/empty-plan-validation.spec.ts`

**Steps:**
  1. Create a plan with no courses; click 'Re-check'
    - expect: Validation completes without error
    - expect: Valid Courses: 0, Invalid Courses: 0 are shown (or a message that no issues were found)

### 7. Summary Panel

**Seed:** `frontend/e2e/seed.spec.ts`

#### 7.1. Credit progress bar and totals update as courses are added

**File:** `frontend/e2e/summary/credit-progress.spec.ts`

**Steps:**
  1. Create a plan with no courses; observe the SummaryPanel Credit Progress section
    - expect: Total Credits shows '0 / 120'
    - expect: Completed credits: 0, Planned credits: 0
    - expect: Progress bar is empty
  2. Add CPSC 110 (3 cr) to Year 1 Winter 1
    - expect: Total Credits updates to '3 / 120'
    - expect: Planned credits shows 3 (status is 'Planned')
    - expect: Progress bar advances slightly
  3. Change CPSC 110's status to 'Completed'
    - expect: Completed credits shows 3
    - expect: Planned credits shows 0

#### 7.2. Estimated Graduation time decreases as credits are added

**File:** `frontend/e2e/summary/graduation-estimate.spec.ts`

**Steps:**
  1. Create a plan with no courses; note the Estimated Graduation text
    - expect: Estimated Graduation shows a non-zero years/terms value based on 0 credits planned
  2. Add enough courses to bring total credits to 120
    - expect: Estimated Graduation section reads 'Complete!'

#### 7.3. Goals Status counts reflect sidebar goal toggle state

**File:** `frontend/e2e/summary/goals-status.spec.ts`

**Steps:**
  1. Navigate to http://localhost:5173 with a plan selected; observe the Goals Status section in the SummaryPanel
    - expect: 'Met' count is 0, 'Not Met' count is 2 (the two default goals are both unsatisfied)
  2. In the Sidebar Academic Goals section, click on 'Computer Science Major' to toggle it to Satisfied
    - expect: The goal row in the Sidebar shows a green 'Satisfied' badge
    - expect: The SummaryPanel Goals Status 'Met' count increments to 1
    - expect: 'Not Met' count becomes 1

#### 7.4. Summary tab and Course Info tab toggle correctly

**File:** `frontend/e2e/summary/tab-toggle.spec.ts`

**Steps:**
  1. Navigate with a plan selected; the SummaryPanel defaults to 'Summary' tab
    - expect: Credit Progress, Goals Status, Course Validation, and Estimated Graduation sections are visible
  2. Click the 'Course Info' tab button
    - expect: The Course Info tab content is shown
    - expect: Summary content is hidden
  3. Click the 'Summary' tab button
    - expect: Summary content is shown again

### 8. Sidebar – Completed Courses & Academic Goals

**Seed:** `frontend/e2e/seed.spec.ts`

#### 8.1. Completed Courses section shows empty state by default

**File:** `frontend/e2e/sidebar/completed-empty-state.spec.ts`

**Steps:**
  1. Navigate to http://localhost:5173 with a fresh plan selected (no courses)
    - expect: The Sidebar Completed Courses section shows a dashed border area with 'No completed courses yet'
    - expect: Total: 0 credits is shown below the section

#### 8.2. Completed course can be removed from the Sidebar

**File:** `frontend/e2e/sidebar/remove-completed-course.spec.ts`

**Steps:**
  1. Add CPSC 110 to Year 1 Winter 1; set its status to 'Completed'; confirm it appears in the Sidebar
  2. Click the trash icon next to CPSC 110 in the Sidebar Completed Courses list
    - expect: CPSC 110 is removed from the Sidebar Completed Courses list
    - expect: CPSC 110 is also removed from the Year 1 Winter 1 column on the board
    - expect: The Sidebar reverts to 'No completed courses yet' if no other completed courses exist
    - expect: The total credits in the Sidebar updates accordingly

#### 8.3. Upload button opens the Upload Transcript modal

**File:** `frontend/e2e/sidebar/upload-modal-open.spec.ts`

**Steps:**
  1. In the Sidebar Completed Courses section, click the 'Upload' button
    - expect: The Upload Transcript modal opens
    - expect: The modal shows 'Upload Transcript (PDF/CSV)' file chooser area
    - expect: A manual entry table with columns Code, Name, Cr, Term is visible
    - expect: At least one empty row is pre-populated

#### 8.4. Upload modal: add another row

**File:** `frontend/e2e/sidebar/upload-modal-add-row.spec.ts`

**Steps:**
  1. Open the Upload Transcript modal; click the 'Add Another Course' button
    - expect: A new empty row is added to the manual entry table
    - expect: The total row count increases by 1

#### 8.5. Upload modal: submit with a course entry shows alert

**File:** `frontend/e2e/sidebar/upload-modal-submit.spec.ts`

**Steps:**
  1. Open the Upload Transcript modal; fill in the first row with Code: 'CPSC 210', Name: 'Software Construction', Cr: '3', Term: '2024W1'; click 'Submit Courses'
    - expect: An alert dialog appears with the text 'Upload functionality will be connected to the backend API.'
    - expect: After dismissing the alert, the modal closes

#### 8.6. Upload modal: submit with no course ID filled does not submit

**File:** `frontend/e2e/sidebar/upload-modal-empty-submit.spec.ts`

**Steps:**
  1. Open the Upload Transcript modal; leave all fields empty; click 'Submit Courses'
    - expect: No alert appears
    - expect: The modal remains open (no valid rows were found to submit)

#### 8.7. Upload modal closes on backdrop click

**File:** `frontend/e2e/sidebar/upload-modal-backdrop-close.spec.ts`

**Steps:**
  1. Open the Upload Transcript modal; click on the dark backdrop area outside the modal
    - expect: The modal closes

#### 8.8. Add a new academic goal via the Add button

**File:** `frontend/e2e/sidebar/add-academic-goal.spec.ts`

**Steps:**
  1. In the Sidebar Academic Goals section, click the 'Add' button
    - expect: A browser prompt appears
  2. Enter 'Complete Minor in Statistics' and confirm
    - expect: A new goal 'Complete Minor in Statistics' appears in the Academic Goals list with an 'Unsatisfied' badge
    - expect: The SummaryPanel 'Not Met' count increments by 1

#### 8.9. Toggle an academic goal between Unsatisfied and Satisfied

**File:** `frontend/e2e/sidebar/toggle-academic-goal.spec.ts`

**Steps:**
  1. Click on 'Computer Science Major' in the Academic Goals list
    - expect: The badge changes from yellow 'Unsatisfied' to green 'Satisfied'
  2. Click on 'Computer Science Major' again
    - expect: The badge changes back to yellow 'Unsatisfied'

### 9. Program Picker & Progress Modal

**Seed:** `frontend/e2e/seed.spec.ts`

#### 9.1. Faculty dropdown populates from the backend

**File:** `frontend/e2e/program/faculty-dropdown.spec.ts`

**Steps:**
  1. Navigate to http://localhost:5173 with a plan selected; observe the two dropdowns in the PlanBoard header between the plan name and the action buttons
    - expect: The first dropdown shows 'Select faculty…' as the default option
    - expect: At least one faculty option is available in the dropdown

#### 9.2. Selecting a faculty loads program options

**File:** `frontend/e2e/program/program-dropdown.spec.ts`

**Steps:**
  1. Select a faculty from the first dropdown (e.g., 'Science')
    - expect: The second 'Select program…' dropdown becomes enabled
    - expect: At least one program option appears in the second dropdown

#### 9.3. Selecting a program persists to localStorage per plan

**File:** `frontend/e2e/program/program-persists.spec.ts`

**Steps:**
  1. Select a faculty and then a specific program for the active plan
    - expect: The program dropdown shows the selected program
  2. Reload the page
    - expect: The same program is still selected for that plan (loaded from localStorage)

#### 9.4. Open the Progress modal without a program selected shows fallback view

**File:** `frontend/e2e/program/progress-modal-no-program.spec.ts`

**Steps:**
  1. Ensure no program is selected; click the 'Progress' button in the PlanBoard header
    - expect: The Academic Progress modal opens
    - expect: A notice reads 'Select a program above to track degree requirements. Showing a credit-only view in the meantime.'
    - expect: Three summary cards show Completed credits, Planned credits, Credits remaining
    - expect: A total progress bar is shown

#### 9.5. Progress modal with a program selected shows requirements table

**File:** `frontend/e2e/program/progress-modal-with-program.spec.ts`

**Steps:**
  1. Select a faculty and program; click the 'Progress' button
    - expect: The Academic Progress modal opens
    - expect: Three summary cards show Scheduled credits, Total required, Credits remaining
    - expect: A requirements table lists individual requirements with columns: Requirement, Type, Credits, Status, Transfer
    - expect: At least one requirement row is visible

#### 9.6. Toggle transfer credit for a requirement updates progress

**File:** `frontend/e2e/program/transfer-credit-toggle.spec.ts`

**Steps:**
  1. Select a program; open the Progress modal; find a requirement with status 'Pending'
    - expect: The Transfer button reads 'Transfer' (inactive state)
  2. Click the 'Transfer' button for that requirement
    - expect: The Transfer button turns dark ('✓ Transfer')
    - expect: The requirement status changes to 'Met'
    - expect: The satisfied requirement count increments
    - expect: The total progress updates
  3. Click '✓ Transfer' again to un-toggle
    - expect: The requirement reverts to 'Pending'
    - expect: Progress reverts accordingly

#### 9.7. Progress modal closes on backdrop click

**File:** `frontend/e2e/program/progress-modal-close.spec.ts`

**Steps:**
  1. Open the Progress modal; click the dark backdrop outside the modal
    - expect: The Progress modal closes

### 10. Compare Plans Modal

**Seed:** `frontend/e2e/seed.spec.ts`

#### 10.1. Open Compare modal shows active plan on the left

**File:** `frontend/e2e/compare/open-compare.spec.ts`

**Steps:**
  1. Create two plans named 'Plan Alpha' and 'Plan Beta' with different courses; select 'Plan Alpha'
  2. Click the 'Compare' button in the PlanBoard header
    - expect: The Compare Plans modal opens
    - expect: 'Plan Alpha' is shown in the modal header with its name highlighted
    - expect: A dropdown 'Select plan…' is visible for choosing the plan to compare against
    - expect: The left column shows 'Plan Alpha' with its courses
    - expect: The right column shows 'No plan selected' or is empty

#### 10.2. Selecting a plan in the dropdown loads it on the right

**File:** `frontend/e2e/compare/select-comparison-plan.spec.ts`

**Steps:**
  1. Open the Compare modal with 'Plan Alpha' active; select 'Plan Beta' from the dropdown
    - expect: The right column shows 'Plan Beta' with its courses listed by year and term
    - expect: Each course entry shows course ID, title, and credits

#### 10.3. Active plan is excluded from comparison dropdown

**File:** `frontend/e2e/compare/active-plan-excluded.spec.ts`

**Steps:**
  1. Open the Compare modal with 'Plan Alpha' selected
    - expect: The comparison dropdown does NOT include 'Plan Alpha' as an option (only other plans are listed)

#### 10.4. Compare modal closes on backdrop click

**File:** `frontend/e2e/compare/close-compare.spec.ts`

**Steps:**
  1. Open the Compare modal; click the dark backdrop outside the modal panel
    - expect: The Compare modal closes

#### 10.5. Compare modal closes on X button click

**File:** `frontend/e2e/compare/close-compare-x.spec.ts`

**Steps:**
  1. Open the Compare modal; click the × close button in the modal header
    - expect: The Compare modal closes

### 11. Recommendations Panel

**Seed:** `frontend/e2e/seed.spec.ts`

#### 11.1. Recommendations panel is visible by default when a plan is selected

**File:** `frontend/e2e/recommendations/panel-visible.spec.ts`

**Steps:**
  1. Navigate to http://localhost:5173 with a plan selected
    - expect: A fixed-position panel in the bottom-right corner titled 'Recommendations' is visible
    - expect: If no recommendations exist, 'No recommendations.' is shown
    - expect: If no program is selected, a note reads 'Select a program to enable graduation-pace and requirement-coverage checks.'

#### 11.2. Collapse and re-expand the Recommendations panel

**File:** `frontend/e2e/recommendations/collapse-expand.spec.ts`

**Steps:**
  1. Click the × button in the Recommendations panel header
    - expect: The panel collapses and a floating circular icon button appears in the bottom-right corner
  2. Click the circular icon button
    - expect: The Recommendations panel reappears in its expanded state

#### 11.3. Recommendations refresh when a course is added to the plan

**File:** `frontend/e2e/recommendations/refresh-on-plan-change.spec.ts`

**Steps:**
  1. Note the current recommendations for the active plan
  2. Add a course to a term column
    - expect: The Recommendations panel re-fetches (a brief loading state may appear) and may display updated recommendations reflecting the new plan state

#### 11.4. Recommendations panel shows severity-coded cards

**File:** `frontend/e2e/recommendations/severity-styles.spec.ts`

**Steps:**
  1. Arrange conditions that trigger backend recommendations (e.g., select a program and add courses that leave certain requirements unmet or create a heavy term load); observe the Recommendations panel
    - expect: Warning-severity recommendations have an amber/yellow background and border
    - expect: Suggestion-severity recommendations have a blue background and border
    - expect: Info-severity recommendations have a green background and border
    - expect: Each card shows a title and a message body

### 12. Term Column Visibility

**Seed:** `frontend/e2e/seed.spec.ts`

#### 12.1. Default columns shown are W1 and W2 for each year

**File:** `frontend/e2e/term-columns/default-columns.spec.ts`

**Steps:**
  1. Create a new plan with no courses; observe the PlanBoard
    - expect: Year 1 Winter 1 and Year 1 Winter 2 columns are visible
    - expect: Year 2 Winter 1 and Year 2 Winter 2 are visible
    - expect: Year 3 and Year 4 Winter 1 and Winter 2 columns are visible
    - expect: Summer columns are NOT shown unless courses exist in them
    - expect: A circular '+' add-term button is visible at the end of the column row

#### 12.2. Summer column appears when a course is added to it

**File:** `frontend/e2e/term-columns/summer-column-appears.spec.ts`

**Steps:**
  1. Open the Course Search modal; add CPSC 110 to Year 1 Summer (select Year 1 / S when adding) by using the modal opened from the board's '+ Term' button and specifying year 1, term S
    - expect: A 'Year 1 Summer' column appears in the board
    - expect: CPSC 110's card is visible in it

#### 12.3. Each term column displays its total credit count

**File:** `frontend/e2e/term-columns/credit-count-display.spec.ts`

**Steps:**
  1. Add CPSC 110 (3 cr) and CPSC 121 (3 cr) to Year 1 Winter 1
    - expect: The Year 1 Winter 1 column header shows '6 cr' (or the sum of both courses' credits)
