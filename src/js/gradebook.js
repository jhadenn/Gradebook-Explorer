// src/js/gradebook.js
// Data parsing and utility helpers for Gradebook Explorer.

(function initializeGradebookModel(global) {
  "use strict";


  function cloneRows(rows) {
    return rows.map(function copyRow(row) {
      return row.slice();
    });
  }

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

  function parseNumericGrade(value) {
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

  function isValidRowIndex(gradebook, rowIndex) {
    return Boolean(
      gradebook &&
        Array.isArray(gradebook.rows) &&
        Number.isInteger(rowIndex) &&
        rowIndex >= 0 &&
        rowIndex < gradebook.rows.length
    );
  }

  function isValidColumnIndex(gradebook, colIndex) {
    return Boolean(
      gradebook &&
        Array.isArray(gradebook.assessments) &&
        Number.isInteger(colIndex) &&
        colIndex >= 0 &&
        colIndex < gradebook.assessments.length
    );
  }

  function isGradeCellPosition(gradebook, rowIndex, colIndex) {
    return isValidRowIndex(gradebook, rowIndex) && isValidColumnIndex(gradebook, colIndex);
  }

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

  function getCellRawValue(gradebook, rowIndex, colIndex) {
    if (!isGradeCellPosition(gradebook, rowIndex, colIndex)) {
      return "";
    }

    return gradebook.rows[rowIndex].grades[colIndex];
  }

  function setCellValue(gradebook, rowIndex, colIndex, value) {
    if (!isGradeCellPosition(gradebook, rowIndex, colIndex)) {
      return false;
    }

    const normalizedValue = value === null || value === undefined ? "" : String(value).trim();
    gradebook.rows[rowIndex].grades[colIndex] = normalizedValue;
    gradebook.rawMatrix[rowIndex][colIndex] = normalizedValue;
    gradebook.rawRows[rowIndex + 1][colIndex + 1] = normalizedValue;
    return true;
  }

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

    const SAMPLE_DATA = [
    ["Student", "Lab 1", "Lab 2", "Lab 3", "Midterm", "Final"],
    ["Ava", "92", "85", "88", "79", "91"],
    ["Noah", "76", "81", "74", "69", "72"],
    ["Mia", "88", "90", "84", "93", "86"]
  ];

  function createSampleGradebook() {
    return parseGradeData(cloneRows(SAMPLE_DATA));
  }

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

  function runInformalTests() {
    const sampleGradebook = createSampleGradebook();
    console.log("Gradebook sample headers:", sampleGradebook.headers);
    console.log("Gradebook sample row 0:", getNumericArray(sampleGradebook, 0, true));
    console.log("Gradebook sample column 1:", getNumericArray(sampleGradebook, 1, false));
    console.log("Gradebook valid row index 1:", isValidRowIndex(sampleGradebook, 1));
    console.log("Gradebook valid column index 4:", isValidColumnIndex(sampleGradebook, 4));
    console.log("Gradebook ignores invalid number:", parseNumericGrade("not-a-grade"));
  }

  global.GradebookModel = {
    SAMPLE_DATA: cloneRows(SAMPLE_DATA),
    parseCsvText: parseCsvText,
    parseGradeData: parseGradeData,
    parseNumericGrade: parseNumericGrade,
    getNumericArray: getNumericArray,
    getCellRawValue: getCellRawValue,
    setCellValue: setCellValue,
    computeSummary: computeSummary,
    numericToLetterGrade: numericToLetterGrade,
    computeLetterGradeFrequencies: computeLetterGradeFrequencies,
    createSampleGradebook: createSampleGradebook,
    loadGradesAsync: loadGradesAsync,
    isValidRowIndex: isValidRowIndex,
    isValidColumnIndex: isValidColumnIndex,
    isGradeCellPosition: isGradeCellPosition,
    runInformalTests: runInformalTests
  };

  runInformalTests();
})(window);
