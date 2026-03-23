// src/js/chart.js
// D3 chart rendering for Gradebook Explorer.

(function initializeGradebookChart(global) {
  "use strict";

  // Removes any previous chart content before rendering a new state.
  function clearChart(containerSelector) {
    const container = d3.select(containerSelector);
    container.selectAll("*").remove();
  }

  // Displays a placeholder message when there is no valid chart data yet.
  function showChartPlaceholder(containerSelector, message) {
    clearChart(containerSelector);
    d3.select(containerSelector)
      .append("p")
      .attr("class", "chart-placeholder")
      .text(message || "Select a row or column to visualize the current grade distribution.");
  }

  // Creates the two-chart layout used for the extended visualization.
  function createChartPanels(containerSelector) {
    const container = d3.select(containerSelector);
    const chartGrid = container.append("div").attr("class", "chart-grid");

    const histogramPanel = chartGrid.append("section").attr("class", "chart-panel");
    histogramPanel.append("h3").attr("class", "chart-panel-title").text("Numeric Histogram");
    const histogramRoot = histogramPanel.append("div").attr("class", "chart-panel-root");

    const letterPanel = chartGrid.append("section").attr("class", "chart-panel");
    letterPanel.append("h3").attr("class", "chart-panel-title").text("Letter Grade Distribution");
    const letterRoot = letterPanel.append("div").attr("class", "chart-panel-root");

    return {
      histogramRoot: histogramRoot,
      letterRoot: letterRoot
    };
  }

  // Draws a histogram of the selected numeric marks using evenly spaced bins across the selection range.
  function renderNumericHistogram(containerSelection, values) {
    const width = 460;
    const height = 320;
    const margin = {
      top: 20,
      right: 18,
      bottom: 56,
      left: 52
    };
    const minValue = d3.min(values);
    const maxValue = d3.max(values);
    const xDomainStart = Math.floor(Math.min(0, minValue));
    const xDomainEnd = Math.ceil(Math.max(100, maxValue));
    const xScale = d3
      .scaleLinear()
      .domain([xDomainStart, xDomainEnd === xDomainStart ? xDomainStart + 1 : xDomainEnd])
      .range([margin.left, width - margin.right]);
    const bins = d3
      .bin()
      .domain(xScale.domain())
      .thresholds(xScale.ticks(10))(values);
    const yMax = d3.max(bins, function getBinCount(bin) {
      return bin.length;
    }) || 0;
    const yScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, yMax)])
      .nice()
      .range([height - margin.bottom, margin.top]);
    const svg = containerSelection
      .append("svg")
      .attr("class", "chart-svg")
      .attr("viewBox", "0 0 " + width + " " + height)
      .attr("role", "img")
      .attr("aria-label", "Histogram showing numeric grade frequencies.");

    svg
      .append("g")
      .attr("transform", "translate(0," + (height - margin.bottom) + ")")
      .call(d3.axisBottom(xScale));

    svg
      .append("g")
      .attr("transform", "translate(" + margin.left + ",0)")
      .call(d3.axisLeft(yScale).ticks(Math.min(6, Math.max(2, yMax))));

    svg
      .selectAll(".histogram-bar")
      .data(bins)
      .enter()
      .append("rect")
      .attr("class", "chart-bar histogram-bar")
      .attr("x", function positionX(bin) {
        return xScale(bin.x0) + 1;
      })
      .attr("y", function positionY(bin) {
        return yScale(bin.length);
      })
      .attr("width", function barWidth(bin) {
        return Math.max(0, xScale(bin.x1) - xScale(bin.x0) - 2);
      })
      .attr("height", function barHeight(bin) {
        return yScale(0) - yScale(bin.length);
      });

    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("x", width / 2)
      .attr("y", height - 12)
      .attr("text-anchor", "middle")
      .text("Mark");

    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .text("Count");
  }

  // Draws a simple bar chart for the normalized A-F frequencies.
  function renderLetterGradeChart(containerSelection, frequencies) {
    const labels = ["A", "B", "C", "D", "F"];
    const data = labels.map(function buildDatum(label) {
      return {
        grade: label,
        value: Number(frequencies[label] || 0)
      };
    });
    const width = 460;
    const height = 320;
    const margin = {
      top: 20,
      right: 18,
      bottom: 56,
      left: 52
    };
    const svg = containerSelection
      .append("svg")
      .attr("class", "chart-svg")
      .attr("viewBox", "0 0 " + width + " " + height)
      .attr("role", "img")
      .attr("aria-label", "Bar chart showing letter grade frequencies.");
    const xScale = d3
      .scaleBand()
      .domain(labels)
      .range([margin.left, width - margin.right])
      .padding(0.25);
    const yScale = d3
      .scaleLinear()
      .domain([0, 1])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .attr("transform", "translate(0," + (height - margin.bottom) + ")")
      .call(d3.axisBottom(xScale));

    svg
      .append("g")
      .attr("transform", "translate(" + margin.left + ",0)")
      .call(d3.axisLeft(yScale).tickFormat(d3.format(".0%")));

    svg
      .selectAll(".letter-bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "chart-bar letter-bar")
      .attr("x", function positionX(datum) {
        return xScale(datum.grade);
      })
      .attr("y", function positionY(datum) {
        return yScale(datum.value);
      })
      .attr("width", xScale.bandwidth())
      .attr("height", function barHeight(datum) {
        return yScale(0) - yScale(datum.value);
      });

    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("x", width / 2)
      .attr("y", height - 12)
      .attr("text-anchor", "middle")
      .text("Letter Grade");

    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .text("Frequency");
  }

  // Renders both the numeric histogram and the letter-grade chart for the current selection.
  function renderSelectionCharts(containerSelector, values, frequencies) {
    clearChart(containerSelector);
    const panels = createChartPanels(containerSelector);
    renderNumericHistogram(panels.histogramRoot, values);
    renderLetterGradeChart(panels.letterRoot, frequencies);
  }

  // Expose chart helpers globally for the page controller.
  global.GradebookChart = {
    clearChart: clearChart,
    showChartPlaceholder: showChartPlaceholder,
    renderSelectionCharts: renderSelectionCharts
  };
})(window);
