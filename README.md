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

---

## Implemented Features

This repository includes the complete Gradebook Explorer workflow for Labs 04, 05, and 06:

- A centered gradebook layout with a title, description, selection summary panel, gradebook table, and chart area
- Dynamic table generation from `src/data/grades.csv`
- Row selection by clicking a student header
- Column selection by clicking an assessment header
- Summary statistics for the current selection:
  - selected label
  - count of valid numeric grades
  - mean
  - minimum
  - maximum
- Inline editing for grade cells
- A D3 bar chart showing A-F frequency distributions for the current selection
- A fallback sample dataset when the CSV cannot be loaded

---

## How the App Works

When the page loads, the application attempts to fetch `grades.csv` asynchronously. The CSV is parsed into a JavaScript structure that separates:

- the header row
- assessment names
- student names
- grade values

The table is then rendered into the page. Clicking:

- a row header selects every non-header cell in that student row
- a column header selects every non-header cell in that assessment column

Selections update two outputs immediately:

- the summary panel
- the grade distribution chart

When a grade cell is clicked, the cell enters edit mode with a text field. Pressing `ENTER` saves the new value, restores the text view, and refreshes the summary/chart if the edited cell belongs to the active selection.

---

## File Responsibilities

### `src/pages/spreadsheet.html`

Defines the page structure and includes:

- the application title and description
- the summary panel placeholders
- the gradebook container
- the chart container
- external libraries:
  - jQuery
  - D3

### `src/css/spreadsheet.css`

Contains all application styling required by the lab, including:

- page layout
- table styling
- summary cards
- editable cell styling
- chart spacing
- required colors:
  - column headers use `#d0d0d0`
  - selected cells use `#e0e0ff`

### `src/js/gradebook.js`

Contains the core data utilities used by the rest of the app:

- CSV parsing
- numeric grade parsing
- row/column extraction
- boundary validation
- summary calculations
- letter-grade conversion
- letter-frequency calculation
- asynchronous grade loading with `fetch()`

This file also includes informal console-based checks for the core helper functions.

### `src/js/spreadsheet.js`

Controls the gradebook UI:

- rendering the table from parsed data
- handling row and column selection
- updating the summary panel
- enabling editable cells
- saving edited values back into the in-memory gradebook model
- redrawing outputs after edits and selections

### `src/js/chart.js`

Creates and replaces the D3 visualization for the current selection:

- clears any previous chart
- computes bar positions for A-F
- renders normalized frequencies from `0` to `1`
- displays percentage ticks on the y-axis

### `src/data/grades.csv`

Provides the gradebook dataset used to populate the app.

Expected format:

```csv
Student,Lab 1,Lab 2,Lab 3,Midterm,Final
Ava,92,85,88,79,91
Noah,76,81,74,69,72
```

The first row is treated as headers. The first column is treated as student names.

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
- `loadGradesAsync(filePath)`
  - Loads and parses the CSV asynchronously using `fetch()`.

---

## Grade Conversion Rules

The current implementation uses the following letter-grade mapping:

- `A`: `80` and above
- `B`: `70` to `79.99`
- `C`: `60` to `69.99`
- `D`: `50` to `59.99`
- `F`: below `50`

Frequencies are normalized by dividing each letter count by the total number of valid numeric grades in the current selection.

---

## Editing Behavior

Editable cells follow this workflow:

1. Click a grade cell.
2. The cell becomes a text input containing the current value.
3. Edit the value.
4. Press `ENTER` to save.

Additional behavior:

- Clicking another editable cell saves the current edit first.
- Clicking a row or column header saves the current edit first.
- Invalid or empty values are still stored, but they are ignored by numeric summaries and chart calculations.

---

## Libraries Used

This project uses CDN-hosted libraries:

- jQuery `3.7.1`
- D3 `7`

No local package installation is required for the app itself. The only requirement is a local HTTP server so the CSV can be loaded with `fetch()`.

---

## Testing and Verification

Verification completed in this repository includes:

- syntax checks on all JavaScript files
- informal `console.log` checks for the core data helper functions
- runtime fallback to a hard-coded sample dataset if CSV loading fails

Recommended manual test checklist:

1. Start the server and open the page in the browser.
2. Confirm the CSV data appears in the table.
3. Click a row header and verify:
   - only non-header cells in that row are highlighted
   - the summary panel updates
   - the chart updates
4. Click a column header and verify the same behavior for the column.
5. Click a grade cell, edit the value, and press `ENTER`.
6. Re-select the containing row or column and confirm the summary/chart reflects the new value.
7. Try entering a blank or non-numeric value and confirm it is ignored in the summary statistics.

---

## Troubleshooting

### The table does not load from CSV

Make sure you are not opening the HTML file directly with `file://`.

Use:

```bash
python -m http.server 8000
```

Then visit:

```bash
http://localhost:8000/src/pages/spreadsheet.html
```

### The app shows sample data instead of the CSV

That means the `fetch()` request failed. Common reasons:

- the server was not started from the project root
- the page was opened directly instead of through `localhost`
- the CSV file path was changed

### The chart is empty

The chart only renders when the current selection contains at least one valid numeric grade.

If all values in the selection are blank or invalid text, the placeholder message is shown instead.

---

## Current Limitations

- The CSV parser is intentionally simple and assumes comma-separated values without quoted commas.
- Grades are stored in memory only; edits are not written back to `grades.csv`.
- The app supports one active selection at a time.
- Sorting and keyboard navigation between cells are listed in the lab as extra challenges and are not currently implemented.

---

## Suggested Future Extensions

Possible next steps if you want to keep extending the project:

- add column sorting
- add keyboard navigation between editable cells
- add a numeric histogram alongside the A-F chart
- persist edits using browser storage or a backend service
- add validation messages for non-numeric input
