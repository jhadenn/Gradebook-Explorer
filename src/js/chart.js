// src/js/chart.js
// D3 chart rendering for Gradebook Explorer.

(function initializeGradebookChart(global) {
  "use strict";

  // Removes any previous chart content before rendering a new state
  function clearChart(containerSelector) {
    const container = d3.select(containerSelector);
    container.selectAll("*").remove();
  }

  // Displays a placeholder message when there is no valid chart data yet
  function showChartPlaceholder(containerSelector, message) {
    clearChart(containerSelector);
    d3.select(containerSelector)
      .append("p")
      .attr("class", "chart-placeholder")
      .text(message || "Select a row or column to visualize the current grade distribution.");
  }

  // Draws a simple bar chart for the normalized A-F frequencies
  function renderLetterGradeChart(containerSelector, frequencies) {
    const container = d3.select(containerSelector);
    const labels = ["A", "B", "C", "D", "F"];
    const data = labels.map(function buildDatum(label) {
      return {
        grade: label,
        value: Number(frequencies[label] || 0)
      };
    });
    const width = 880;
    const height = 320;
    const margin = {
      top: 20,
      right: 24,
      bottom: 56,
      left: 58
    };

    // Replace any previous visualization so selections do not stack charts
    clearChart(containerSelector);

    const svg = container
      .append("svg")
      .attr("class", "chart-svg")
      .attr("viewBox", "0 0 " + width + " " + height)
      .attr("role", "img")
      .attr("aria-label", "Bar chart showing letter grade frequencies.");

    // Horizontal category scale for the five letter grades
    const xScale = d3
      .scaleBand()
      .domain(labels)
      .range([margin.left, width - margin.right])
      .padding(0.25);

    // Frequency is normalized, so the y-axis spans 0 to 1
    const yScale = d3
      .scaleLinear()
      .domain([0, 1])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat(d3.format(".0%"));

    // Draw the x-axis at the bottom of the chart
    svg
      .append("g")
      .attr("transform", "translate(0," + (height - margin.bottom) + ")")
      .call(xAxis);

    // Draw the y-axis on the left
    svg
      .append("g")
      .attr("transform", "translate(" + margin.left + ",0)")
      .call(yAxis);

    // Draw one bar per letter-grade bucket
    svg
      .selectAll(".chart-bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "chart-bar")
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

    // Horizontal axis label
    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("x", width / 2)
      .attr("y", height - 12)
      .attr("text-anchor", "middle")
      .text("Letter Grade");

    // Vertical axis label
    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .text("Frequency");
  }

  // Expose chart helpers globally for the page controller
  global.GradebookChart = {
    clearChart: clearChart,
    showChartPlaceholder: showChartPlaceholder,
    renderLetterGradeChart: renderLetterGradeChart
  };
})(window);
