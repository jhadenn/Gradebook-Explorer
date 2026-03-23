// src/js/spreadsheet.js
// DOM generation + jQuery interactivity + editing + summary updates.

(function initializeSpreadsheet(global, $) {
  "use strict";

  // Shared helper modules loaded before this controller.
  const model = global.GradebookModel;
  const chart = global.GradebookChart;

  // Central UI state for the current dataset, active selection, active editor, and sort state.
  const appState = {
    gradebook: null,
    selection: null,
    editingCell: null,
    sort: {
      columnIndex: null,
      direction: "asc"
    }
  };

  // Formats a summary value for display, or shows a dash when unavailable.
  function formatStat(value) {
    return value === null ? "-" : value.toFixed(2);
  }

  // Returns the numeric values for the currently selected row or column.
  function getSelectionValues() {
    if (!appState.selection || !appState.gradebook) {
      return [];
    }

    if (appState.selection.type === "row") {
      return model.getNumericArray(appState.gradebook, appState.selection.index, true);
    }

    if (appState.selection.type === "column") {
      return model.getNumericArray(appState.gradebook, appState.selection.index, false);
    }

    return [];
  }

  // Builds the user-facing summary label for the current selection.
  function getSelectionLabel() {
    if (!appState.selection || !appState.gradebook) {
      return "None: -";
    }

    if (appState.selection.type === "row") {
      return "Row: " + appState.gradebook.students[appState.selection.index];
    }

    return "Column: " + appState.gradebook.assessments[appState.selection.index];
  }

  // Recomputes and redraws the selection summary panel.
  function renderSummary() {
    const values = getSelectionValues();
    const summary = model.computeSummary(values);

    $("#selected-label").text(getSelectionLabel());
    $("#selected-count").text(summary.count);
    $("#selected-mean").text(formatStat(summary.mean));
    $("#selected-min").text(formatStat(summary.min));
    $("#selected-max").text(formatStat(summary.max));
  }

  // Replaces the chart area with either a placeholder or a fresh two-chart visualization.
  function renderChartForSelection() {
    const values = getSelectionValues();

    if (values.length === 0) {
      chart.showChartPlaceholder(
        "#chart-root",
        "Select a row or column to visualize the current grade distribution."
      );
      return;
    }

    chart.renderSelectionCharts(
      "#chart-root",
      values,
      model.computeLetterGradeFrequencies(values)
    );
  }

  // Updates every output that depends on the current selection.
  function updateSelectionOutputs() {
    renderSummary();
    renderChartForSelection();
  }

  // Shows feedback near the table for validation errors and save-related messages.
  function setFeedbackMessage(message, messageType) {
    const feedback = $("#gradebook-feedback");

    feedback
      .text(message || "")
      .removeClass("is-error is-info");

    if (message) {
      feedback.addClass(messageType === "error" ? "is-error" : "is-info");
    }
  }

  // Clears any existing selection highlight and resets the output panels.
  function deselectAll() {
    $("#gradebook-table .selected").removeClass("selected");
    appState.selection = null;
    updateSelectionOutputs();
  }

  // Highlights all non-header cells in the specified student row.
  function selectRow(rowIndex) {
    if (!model.isValidRowIndex(appState.gradebook, rowIndex)) {
      return;
    }

    $("#gradebook-table .selected").removeClass("selected");
    $('#gradebook-table td.grade-cell[data-row-index="' + rowIndex + '"]').addClass("selected");
    appState.selection = {
      type: "row",
      index: rowIndex
    };
    updateSelectionOutputs();
  }

  // Highlights all non-header cells in the specified assessment column.
  function selectColumn(colIndex) {
    if (!model.isValidColumnIndex(appState.gradebook, colIndex)) {
      return;
    }

    $("#gradebook-table .selected").removeClass("selected");
    $('#gradebook-table td.grade-cell[data-col-index="' + colIndex + '"]').addClass("selected");
    appState.selection = {
      type: "column",
      index: colIndex
    };
    updateSelectionOutputs();
  }

  // Returns the display label for a column header, including its current sort direction.
  function getColumnHeaderLabel(assessment, colIndex) {
    if (appState.sort.columnIndex !== colIndex) {
      return assessment;
    }

    return assessment + (appState.sort.direction === "asc" ? " ^" : " v");
  }

  // Dynamically builds the HTML table from the parsed gradebook data.
  function renderGradebookTable(gradebook) {
    const table = $("<table>", {
      id: "gradebook-table"
    });
    const thead = $("<thead>");
    const headerRow = $("<tr>");

    headerRow.append(
      $("<th>", {
        class: "corner-header",
        text: gradebook.headers[0] || "Student"
      })
    );

    gradebook.assessments.forEach(function appendColumnHeader(assessment, colIndex) {
      const isSortedColumn = appState.sort.columnIndex === colIndex;
      const sortClass = isSortedColumn ? " sorted-" + appState.sort.direction : "";

      headerRow.append(
        $("<th>", {
          class: "column-header" + sortClass,
          text: getColumnHeaderLabel(assessment, colIndex),
          "data-col-index": colIndex,
          scope: "col"
        })
      );
    });

    thead.append(headerRow);
    table.append(thead);

    const tbody = $("<tbody>");

    gradebook.rows.forEach(function appendRow(row, rowIndex) {
      const tr = $("<tr>");

      tr.append(
        $("<th>", {
          class: "row-header",
          text: row.student,
          "data-row-index": rowIndex,
          scope: "row"
        })
      );

      row.grades.forEach(function appendGradeCell(value, colIndex) {
        tr.append(
          $("<td>", {
            class: "grade-cell",
            text: value,
            "data-row-index": rowIndex,
            "data-col-index": colIndex
          })
        );
      });

      tbody.append(tr);
    });

    table.append(tbody);
    $("#gradebook-table-container").empty().append(table);
  }

  // Finds a grade cell using gradebook row and column coordinates.
  function getGradeCell(rowIndex, colIndex) {
    return $('#gradebook-table td.grade-cell[data-row-index="' + rowIndex + '"][data-col-index="' + colIndex + '"]');
  }

  // Closes the current editor and optionally writes the edited value back to the model.
  function stopEditingCell(saveChanges) {
    if (!appState.editingCell) {
      return null;
    }

    const activeCell = appState.editingCell;
    const input = activeCell.find(".cell-editor");
    const rowIndex = Number(activeCell.attr("data-row-index"));
    const colIndex = Number(activeCell.attr("data-col-index"));
    const previousValue = activeCell.attr("data-previous-value") || "";
    const nextValue = input.val();

    if (!saveChanges) {
      activeCell
        .removeClass("editing-cell")
        .removeAttr("data-previous-value")
        .text(previousValue);
      appState.editingCell = null;

      return {
        rowIndex: rowIndex,
        colIndex: colIndex,
        blocked: false
      };
    }

    const validation = model.validateGradeInput(nextValue);

    if (!validation.isValid) {
      setFeedbackMessage(validation.message, "error");
      global.setTimeout(function refocusInvalidEditor() {
        input.trigger("focus").trigger("select");
      }, 0);

      return {
        rowIndex: rowIndex,
        colIndex: colIndex,
        blocked: true
      };
    }

    const normalizedValue = validation.normalizedValue;

    model.setCellValue(appState.gradebook, rowIndex, colIndex, normalizedValue);
    activeCell
      .removeClass("editing-cell")
      .removeAttr("data-previous-value")
      .text(normalizedValue);
    appState.editingCell = null;
    setFeedbackMessage("", "info");

    if (
      appState.selection &&
      ((appState.selection.type === "row" && appState.selection.index === rowIndex) ||
        (appState.selection.type === "column" && appState.selection.index === colIndex))
    ) {
      updateSelectionOutputs();
    }

    return {
      rowIndex: rowIndex,
      colIndex: colIndex,
      blocked: false
    };
  }

  // Replaces a grade cell's text with a text input for inline editing.
  function startEditingCell(cellElement) {
    const cell = $(cellElement);

    if (appState.editingCell && appState.editingCell.is(cell)) {
      return;
    }

    const stopResult = stopEditingCell(true);

    if (stopResult && stopResult.blocked) {
      return;
    }

    const currentValue = cell.text().trim();
    const input = $("<input>", {
      class: "cell-editor",
      type: "text",
      value: currentValue,
      "aria-label": "Edit grade"
    });

    cell
      .addClass("editing-cell")
      .attr("data-previous-value", currentValue)
      .empty()
      .append(input);

    appState.editingCell = cell;
    input.trigger("focus").trigger("select");
  }

  // Saves the current edit and moves the editor to an adjacent cell when possible.
  function moveEditingCell(rowOffset, colOffset) {
    if (!appState.editingCell) {
      return;
    }

    const currentRowIndex = Number(appState.editingCell.attr("data-row-index"));
    const currentColIndex = Number(appState.editingCell.attr("data-col-index"));
    const nextRowIndex = currentRowIndex + rowOffset;
    const nextColIndex = currentColIndex + colOffset;

    if (!model.isGradeCellPosition(appState.gradebook, nextRowIndex, nextColIndex)) {
      return;
    }

    const stopResult = stopEditingCell(true);

    if (stopResult && stopResult.blocked) {
      return;
    }

    global.setTimeout(function openAdjacentEditor() {
      startEditingCell(getGradeCell(nextRowIndex, nextColIndex));
    }, 0);
  }

  // Sorts the visible rows by one assessment column, toggling direction on repeated clicks.
  function sortByColumn(colIndex) {
    if (!model.isValidColumnIndex(appState.gradebook, colIndex)) {
      return;
    }

    if (appState.sort.columnIndex === colIndex) {
      appState.sort.direction = appState.sort.direction === "asc" ? "desc" : "asc";
    } else {
      appState.sort.columnIndex = colIndex;
      appState.sort.direction = "asc";
    }

    model.sortRowsByColumn(appState.gradebook, colIndex, appState.sort.direction);
    renderGradebookTable(appState.gradebook);
    attachEventHandlers();
  }

  // Attaches delegated handlers after the table has been rendered.
  function attachEventHandlers() {
    const table = $("#gradebook-table");
    table.off();

    // Clicking a student name selects that entire row.
    table.on("click", "th.row-header", function handleRowClick() {
      const stopResult = stopEditingCell(true);

      if (stopResult && stopResult.blocked) {
        return;
      }

      selectRow(Number($(this).attr("data-row-index")));
    });

    // Clicking an assessment header sorts by that column and selects it.
    table.on("click", "th.column-header", function handleColumnClick() {
      const colIndex = Number($(this).attr("data-col-index"));

      const stopResult = stopEditingCell(true);

      if (stopResult && stopResult.blocked) {
        return;
      }

      sortByColumn(colIndex);
      selectColumn(colIndex);
    });

    // Clicking a grade cell switches that cell into edit mode.
    table.on("click", "td.grade-cell", function handleCellClick() {
      startEditingCell(this);
    });

    // ENTER saves edits, ESC restores the previous value, and arrow keys move between cells.
    table.on("keydown", ".cell-editor", function handleEditorKeydown(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        stopEditingCell(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        stopEditingCell(false);
        setFeedbackMessage("", "info");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveEditingCell(-1, 0);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveEditingCell(1, 0);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveEditingCell(0, -1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveEditingCell(0, 1);
      }
    });

    // Leaving the field also commits the current value.
    table.on("blur", ".cell-editor", function handleEditorBlur() {
      stopEditingCell(true);
    });
  }

  // Updates the small status line shown above the table.
  function setStatus(message) {
    $("#gradebook-status").text(message);
  }

  // Initializes the full page once a usable gradebook dataset is available.
  function initializePage(gradebook, statusMessage) {
    appState.gradebook = gradebook;
    appState.selection = null;
    appState.editingCell = null;
    appState.sort.columnIndex = null;
    appState.sort.direction = "asc";
    setFeedbackMessage("", "info");
    renderGradebookTable(gradebook);
    attachEventHandlers();
    updateSelectionOutputs();
    setStatus(statusMessage);
  }

  // Tries to load the CSV first and falls back to sample data if needed.
  function loadGradebook() {
    model
      .loadGradesAsync("../data/grades.csv")
      .then(function handleLoadedGradebook(gradebook) {
        initializePage(gradebook, "Loaded from grades.csv");
      })
      .catch(function handleLoadError(error) {
        console.warn("Falling back to sample grade data:", error);
        initializePage(model.createSampleGradebook(), "Using sample data (CSV unavailable)");
      });
  }

  // Show the initial placeholder, then load the dataset once the DOM is ready.
  $(function onReady() {
    chart.showChartPlaceholder(
      "#chart-root",
      "Select a row or column to visualize the current grade distribution."
    );
    loadGradebook();
  });

  // Expose the lab-required selection helpers globally.
  global.deselectAll = deselectAll;
  global.selectRow = selectRow;
  global.selectColumn = selectColumn;
})(window, window.jQuery);
