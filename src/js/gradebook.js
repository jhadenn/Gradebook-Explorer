// src/js/gradebook.js
// Data parsing and utility helpers for Gradebook Explorer.

(function initializeGradebookModel(global) {
  "use strict";

  const MIN_GRADE = 0;
  const MAX_GRADE = 100;

  // Small built-in dataset used for informal testing and CSV load fallback
  const SAMPLE_DATA = [
    ["Student", "Lab 1", "Lab 2", "Lab 3", "Midterm", "Final"],
    ["Ava", "92", "85", "88", "79", "91"],
    ["Noah", "76", "81", "74", "69", "72"],
    ["Mia", "88", "90", "84", "93", "86"]
  ];

  // Creates a copy of a two-dimensional array so the sample data stays unchanged
  function cloneRows(rows) {
    return rows.map(function copyRow(row) {
      return row.slice();
    });
  }

  // Converts simple CSV text into an array of row arrays
  function parseCsvText(csvText) {
    return csvText
      .trim()
      .split(/\r?\n/)
      .map(function splitLine(line) {
        return line.split(",").map(function trimCell(cell) {
          return cell.trim();
        });
      })
      .filter(function keepRow(row) {
        return row.length > 0 && row.some(function hasValue(cell) {
          return cell !== "";
        });
      });
  }

  // Safely turns any input into a finite number or returns null when invalid.
  function parseFiniteNumber(value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const trimmedValue = String(value).trim();

    if (trimmedValue === "") {
      return null;
    }

    const parsedValue = Number(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  // Checks whether a numeric grade falls inside the accepted 0-100 range.
  function isGradeInRange(value) {
    return value >= MIN_GRADE && value <= MAX_GRADE;
  }

  // Safely turns grade-like input into a finite in-range grade or returns null when invalid.
  function parseNumericGrade(value) {
    const parsedValue = parseFiniteNumber(value);
    return parsedValue !== null && isGradeInRange(parsedValue) ? parsedValue : null;
  }

  // Validates user-entered grade input before it is saved into the gradebook.
  function validateGradeInput(value) {
    const normalizedValue = value === null || value === undefined ? "" : String(value).trim();

    if (normalizedValue === "") {
      return {
        isValid: true,
        normalizedValue: "",
        message: ""
      };
    }

    const numericValue = parseFiniteNumber(normalizedValue);

    if (numericValue === null) {
      return {
        isValid: false,
        normalizedValue: normalizedValue,
        message: "Grades must be numeric values from 0 to 100."
      };
    }

    if (!isGradeInRange(numericValue)) {
      return {
        isValid: false,
        normalizedValue: normalizedValue,
        message: "Grades must be between 0 and 100."
      };
    }

    return {
      isValid: true,
      normalizedValue: normalizedValue,
      message: ""
    };
  }

  // Normalizes CSV-style rows into a structure that is easy to access by row and column
  function parseGradeData(rawRows) {
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return {
        headers: [],
        assessments: [],
        students: [],
        rows: [],
        rawRows: [],
        rawMatrix: []
      };
    }

    const normalizedRows = rawRows.map(function normalizeRow(row) {
      return Array.isArray(row)
        ? row.map(function stringifyCell(cell) {
            return cell === null || cell === undefined ? "" : String(cell).trim();
          })
        : [];
    });

    const headerRow = normalizedRows[0];
    const headers = headerRow.slice();
    const assessments = headerRow.slice(1);
    const rows = normalizedRows.slice(1).map(function buildRow(row, rowIndex) {
      const student = row[0] || "Student " + (rowIndex + 1);
      const grades = assessments.map(function gradeAtIndex(_, colIndex) {
        return row[colIndex + 1] || "";
      });

      return {
        student: student,
        grades: grades
      };
    });

    return {
      headers: headers,
      assessments: assessments,
      students: rows.map(function extractStudent(row) {
        return row.student;
      }),
      rows: rows,
      rawRows: normalizedRows,
      rawMatrix: rows.map(function extractGrades(row) {
        return row.grades.slice();
      })
    };
  }

  // Checks whether a requested row index points to a real student row
  function isValidRowIndex(gradebook, rowIndex) {
    return Boolean(
      gradebook &&
        Array.isArray(gradebook.rows) &&
        Number.isInteger(rowIndex) &&
        rowIndex >= 0 &&
        rowIndex < gradebook.rows.length
    );
  }

  // Checks whether a requested column index points to a real assessment column
  function isValidColumnIndex(gradebook, colIndex) {
    return Boolean(
      gradebook &&
        Array.isArray(gradebook.assessments) &&
        Number.isInteger(colIndex) &&
        colIndex >= 0 &&
        colIndex < gradebook.assessments.length
    );
  }

  // Ensures that a coordinate refers to a non-header grade cell
  function isGradeCellPosition(gradebook, rowIndex, colIndex) {
    return isValidRowIndex(gradebook, rowIndex) && isValidColumnIndex(gradebook, colIndex);
  }

  // Returns one row or one column as numeric values only, skipping invalid entries
  function getNumericArray(gradebook, index, isRow) {
    if (isRow === undefined) {
      isRow = true;
    }

    if (isRow) {
      if (!isValidRowIndex(gradebook, index)) {
        return [];
      }

      return gradebook.rows[index].grades
        .map(parseNumericGrade)
        .filter(function keepNumber(value) {
          return value !== null;
        });
    }

    if (!isValidColumnIndex(gradebook, index)) {
      return [];
    }

    return gradebook.rows
      .map(function extractColumn(row) {
        return parseNumericGrade(row.grades[index]);
      })
      .filter(function keepNumber(value) {
        return value !== null;
      });
  }

  // Returns the raw string value stored in a grade cell
  function getCellRawValue(gradebook, rowIndex, colIndex) {
    if (!isGradeCellPosition(gradebook, rowIndex, colIndex)) {
      return "";
    }

    return gradebook.rows[rowIndex].grades[colIndex];
  }

  // Updates all in-memory representations of a single grade cell
  function setCellValue(gradebook, rowIndex, colIndex, value) {
    if (!isGradeCellPosition(gradebook, rowIndex, colIndex)) {
      return false;
    }

    const validation = validateGradeInput(value);

    if (!validation.isValid) {
      return false;
    }

    gradebook.rows[rowIndex].grades[colIndex] = validation.normalizedValue;
    gradebook.rawMatrix[rowIndex][colIndex] = validation.normalizedValue;
    gradebook.rawRows[rowIndex + 1][colIndex + 1] = validation.normalizedValue;
    return true;
  }

  // Computes count, mean, minimum, and maximum while ignoring invalid grades
  function computeSummary(values) {
    const numericValues = values
      .map(parseNumericGrade)
      .filter(function keepNumber(value) {
        return value !== null;
      });

    if (numericValues.length === 0) {
      return {
        count: 0,
        mean: null,
        min: null,
        max: null
      };
    }

    const total = numericValues.reduce(function add(sum, value) {
      return sum + value;
    }, 0);

    return {
      count: numericValues.length,
      mean: total / numericValues.length,
      min: Math.min.apply(null, numericValues),
      max: Math.max.apply(null, numericValues)
    };
  }

  // Maps numeric grades into the A-F buckets used by the chart
  function numericToLetterGrade(value) {
    const numericValue = parseNumericGrade(value);

    if (numericValue === null) {
      return null;
    }

    if (numericValue >= 80) {
      return "A";
    }

    if (numericValue >= 70) {
      return "B";
    }

    if (numericValue >= 60) {
      return "C";
    }

    if (numericValue >= 50) {
      return "D";
    }

    return "F";
  }

  // Converts numeric grades into normalized A-F frequencies for visualization
  function computeLetterGradeFrequencies(values) {
    const keys = ["A", "B", "C", "D", "F"];
    const frequencies = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0
    };
    const validValues = values
      .map(parseNumericGrade)
      .filter(function keepNumber(value) {
        return value !== null;
      });

    if (validValues.length === 0) {
      return frequencies;
    }

    validValues.forEach(function countGrade(value) {
      const letter = numericToLetterGrade(value);
      frequencies[letter] += 1;
    });

    keys.forEach(function normalizeKey(key) {
      frequencies[key] = frequencies[key] / validValues.length;
    });

    return frequencies;
  }

  // Reorders student rows by one assessment column and keeps aligned row data synchronized.
  function sortRowsByColumn(gradebook, colIndex, direction) {
    if (!isValidColumnIndex(gradebook, colIndex)) {
      return false;
    }

    const sortDirection = direction === "desc" ? "desc" : "asc";
    const combinedRows = gradebook.rows.map(function combineRowData(row, index) {
      return {
        row: row,
        rawGrades: gradebook.rawMatrix[index],
        rawRow: gradebook.rawRows[index + 1],
        originalIndex: index
      };
    });

    combinedRows.sort(function compareRows(left, right) {
      const leftValue = parseNumericGrade(left.row.grades[colIndex]);
      const rightValue = parseNumericGrade(right.row.grades[colIndex]);

      if (leftValue === null && rightValue === null) {
        return left.originalIndex - right.originalIndex;
      }

      if (leftValue === null) {
        return 1;
      }

      if (rightValue === null) {
        return -1;
      }

      if (leftValue === rightValue) {
        return left.originalIndex - right.originalIndex;
      }

      return sortDirection === "desc" ? rightValue - leftValue : leftValue - rightValue;
    });

    gradebook.rows = combinedRows.map(function extractRow(entry) {
      return entry.row;
    });
    gradebook.rawMatrix = combinedRows.map(function extractRawGrades(entry) {
      return entry.rawGrades;
    });
    gradebook.rawRows = [gradebook.rawRows[0]].concat(
      combinedRows.map(function extractRawRow(entry) {
        return entry.rawRow;
      })
    );
    gradebook.students = gradebook.rows.map(function extractStudent(row) {
      return row.student;
    });

    return true;
  }

  // Creates a gradebook object from the fallback sample dataset
  function createSampleGradebook() {
    return parseGradeData(cloneRows(SAMPLE_DATA));
  }

  // Loads the CSV file asynchronously, then parses it into the gradebook structure
  function loadGradesAsync(filePath) {
    const resolvedPath = filePath || "../data/grades.csv";

    return fetch(resolvedPath)
      .then(function handleResponse(response) {
        if (!response.ok) {
          throw new Error("Unable to load grades from " + resolvedPath);
        }

        return response.text();
      })
      .then(function parseResponse(csvText) {
        return parseGradeData(parseCsvText(csvText));
      });
  }

  // Informal console checks requested by the lab instructions
  function runInformalTests() {
    const sampleGradebook = createSampleGradebook();
    console.log("Gradebook sample headers:", sampleGradebook.headers);
    console.log("Gradebook sample row 0:", getNumericArray(sampleGradebook, 0, true));
    console.log("Gradebook sample column 1:", getNumericArray(sampleGradebook, 1, false));
    console.log("Gradebook valid row index 1:", isValidRowIndex(sampleGradebook, 1));
    console.log("Gradebook valid column index 4:", isValidColumnIndex(sampleGradebook, 4));
    console.log("Gradebook ignores invalid number:", parseNumericGrade("not-a-grade"));
    console.log("Gradebook rejects negative grade:", validateGradeInput("-5"));
    console.log("Gradebook rejects grade above 100:", validateGradeInput("110"));
  }

  // Expose the model utilities globally so the other page scripts can reuse them
  global.GradebookModel = {
    SAMPLE_DATA: cloneRows(SAMPLE_DATA),
    parseCsvText: parseCsvText,
    parseGradeData: parseGradeData,
    parseFiniteNumber: parseFiniteNumber,
    parseNumericGrade: parseNumericGrade,
    isGradeInRange: isGradeInRange,
    validateGradeInput: validateGradeInput,
    getNumericArray: getNumericArray,
    getCellRawValue: getCellRawValue,
    setCellValue: setCellValue,
    computeSummary: computeSummary,
    numericToLetterGrade: numericToLetterGrade,
    computeLetterGradeFrequencies: computeLetterGradeFrequencies,
    sortRowsByColumn: sortRowsByColumn,
    createSampleGradebook: createSampleGradebook,
    loadGradesAsync: loadGradesAsync,
    isValidRowIndex: isValidRowIndex,
    isValidColumnIndex: isValidColumnIndex,
    isGradeCellPosition: isGradeCellPosition,
    runInformalTests: runInformalTests
  };

  // Run the informal tests on script load
  runInformalTests();
})(window);
