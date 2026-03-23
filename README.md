# Lab 04–06 — Gradebook Explorer (Starter Code)

This starter package supports Labs 04–06 for **CSCI3230U Web App Development**.

You will build a web-based gradebook explorer that:
- Loads a CSV gradebook (`grades.csv`)
- Lets the user select rows/columns, edit cells, and compute summaries
- Generates a D3 bar chart of letter-grade frequencies (A–F) for the selected data

---

## Directory Structure

```text
lab04_06_gradebook_explorer/
├─ README.md
└─ src/
   ├─ pages/
   │  └─ spreadsheet.html
   ├─ css/
   │  └─ spreadsheet.css
   ├─ js/
   │  ├─ spreadsheet.js
   │  ├─ gradebook.js
   │  └─ chart.js
   └─ data/
      └─ grades.csv
```

## How to Run 

Because this lab loads grades.csv, you must run a local web server (opening the HTML file directly with file:// will not work with fetch() in most browsers).

```bash
python -m http.server 8000
```

Then open:

```bash
http://localhost:8000/src/pages/spreadsheet.html
```

From the project root (lab04_06_gradebook_explorer/), run:

```bash
python -m http.server 8000
```

Then open the page in your browser:

```bash
http://localhost:8000/src/pages/spreadsheet.html
```

## How the App Works

When the page loads, the application attempts to fetch `grades.csv` asynchronously. The CSV is parsed into a JavaScript structure that separates:

- the header row
- assessment names
- student names
- grade values

The table is then rendered into the page. Clicking:

- a row header selects every non-header cell in that student row
- a column header sorts the table by that assessment and selects every non-header cell in that column

Selections update two outputs immediately:

- the summary panel
- the numeric histogram
- the letter-grade distribution chart

When a grade cell is clicked, the cell enters edit mode with a text field. Pressing `ENTER` saves the new value, restores the cell text, and refreshes the summary/charts if the edited cell belongs to the active selection.

---
## Data Model Notes

The parsed gradebook structure includes:

- `headers`: the original CSV header row
- `assessments`: all grade columns except the first header cell
- `students`: the list of student names
- `rows`: row objects shaped like `{ student, grades }`
- `rawRows`: normalized CSV rows
- `rawMatrix`: grade values only, without the student name column

This structure makes it easy to:

- validate row and column indices
- retrieve one row of grades
- retrieve one column of grades
- update a single editable cell

---

## Core Utility Functions

The main functions exposed by `gradebook.js` are:

- `parseCsvText(csvText)`
  - Converts raw CSV text into an array-of-arrays format.
- `parseGradeData(rawRows)`
  - Converts rows into the internal gradebook structure.
- `parseNumericGrade(value)`
  - Safely converts a value to a number or returns `null`.
- `getNumericArray(gradebook, index, isRow)`
  - Returns one row or one column as valid numeric values only.
- `isValidRowIndex(gradebook, rowIndex)`
  - Checks whether a row index is valid.
- `isValidColumnIndex(gradebook, colIndex)`
  - Checks whether a column index is valid.
- `isGradeCellPosition(gradebook, rowIndex, colIndex)`
  - Ensures a coordinate points to a non-header grade cell.
- `setCellValue(gradebook, rowIndex, colIndex, value)`
  - Saves an edited grade into the in-memory data structure.
- `computeSummary(values)`
  - Computes count, mean, min, and max for valid numeric values.
- `numericToLetterGrade(value)`
  - Converts numeric grades into A-F categories.
- `computeLetterGradeFrequencies(values)`
  - Returns normalized A-F frequencies as an object with five keys.
- `sortRowsByColumn(gradebook, colIndex, direction)`
  - Sorts student rows by one assessment column while keeping aligned row data synchronized.
- `loadGradesAsync(filePath)`
  - Loads and parses the CSV asynchronously using `fetch()`.

---
## Editing Behavior

Editable cells follow this workflow:

1. Click a grade cell.
2. The cell becomes a text input containing the current value.
3. Edit the value.
4. Press `ENTER` to save.

---

## Sorting Behavior

Column sorting is tied directly to assessment header clicks.

- Clicking a column header sorts the student rows by that column.
- The first click sorts ascending.
- Clicking the same header again toggles to descending.
- After sorting, the selected column remains highlighted so the summary and charts still reflect that assessment.

---

## Testing and Verification

Verification completed in this repository includes:

- syntax checks on all JavaScript files
- informal `console.log` checks for the core data helper functions
- runtime fallback to a hard-coded sample dataset if CSV loading fails

Manual test checklist:

1. Start the server and open the page in the browser.
2. Confirm the CSV data appears in the table.
3. Click a row header and verify:
   - only non-header cells in that row are highlighted
   - the summary panel updates
   - both charts update
4. Click a column header and verify:
   - the table sorts by that column
   - the column remains selected
   - both charts update
5. Click the same column header again and verify the sort direction changes.
6. Click a grade cell, edit the value, and press `ENTER`.
7. While editing a cell, use the arrow keys and confirm the value is saved and the editor moves to the adjacent cell.
8. Re-select the containing row or column and confirm the summary/charts reflect the new value.
9. Try entering a blank or non-numeric value and confirm it is ignored in the summary statistics.

---
