// SEO Fibonacci Retracement Analyzer
// This code forms the core of the analysis tool

import { createChartVisualization } from './ui.js';
import { CONFIG } from './config.js';

/**
 * @typedef {Object} Position
 * @property {Date} date - The date of the ranking
 * @property {number} position - The keyword's position/ranking
 * @property {string} url - The URL that ranked for this keyword
 */

/**
 * @typedef {Object} KeywordData
 * @property {string} keyword - The keyword
 * @property {number} searchVolume - Monthly search volume
 * @property {Position[]} positions - Historical position data
 * @property {number} volatilityScore - Calculated volatility score
 */

/**
 * @typedef {Object} FibonacciPattern
 * @property {Date} date - When the pattern occurred
 * @property {number} position - The position where the pattern occurred
 * @property {number} fibLevel - The Fibonacci level involved
 * @property {'Support'|'Resistance'} bounceType - Type of pattern
 */

/**
 * SEO Fibonacci Analysis Tool - Core Analyzer
 * Handles pattern detection, volatility calculation, and Fibonacci analysis
 */
export class SEOFibonacciAnalyzer {
  constructor() {
    this.data = new Map(); // Keyword -> Array of position data
    this.volatileKeywords = new Set();
    this.fibonacciPatterns = new Map(); // Keyword -> Array of patterns
    this.predictions = new Map(); // Keyword -> Prediction data
  }

  /**
   * Process raw keyword data and identify patterns
   * @param {Object[]} rawData - Array of keyword position data
   */
  processRawData(rawData) {
    // Clear existing data
    this.data.clear();
    this.volatileKeywords.clear();
    this.fibonacciPatterns.clear();
    this.predictions.clear();

    // Group data by keyword and sort by date
    rawData.forEach(item => {
      if (!this.data.has(item.keyword)) {
        this.data.set(item.keyword, []);
      }
      this.data.get(item.keyword).push({
        date: new Date(item.date),
        position: item.position,
        searchVolume: item.searchVolume
      });
    });

    // Sort data points by date for each keyword
    this.data.forEach((points, keyword) => {
      points.sort((a, b) => a.date - b.date);
    });

    // Analyze each keyword
    this.data.forEach((points, keyword) => {
      if (points.length >= CONFIG.ANALYSIS.MIN_DATA_POINTS) {
        const volatility = this.calculateVolatility(points);
        if (volatility >= CONFIG.ANALYSIS.VOLATILITY_THRESHOLD) {
          this.volatileKeywords.add(keyword);
          this.fibonacciPatterns.set(keyword, this.findFibonacciPatterns(points));
          this.predictions.set(keyword, this.predictNextRanking(points));
        }
      }
    });

    return {
      volatileKeywords: Array.from(this.volatileKeywords),
      totalKeywords: this.data.size
    };
  }

  /**
   * Calculate volatility score for a keyword
   * @param {Object[]} points - Array of position data points
   * @returns {number} Volatility score
   */
  calculateVolatility(points) {
    const positions = points.map(p => p.position);
    
    // Calculate standard deviation
    const mean = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - mean, 2), 0) / positions.length;
    const stdDev = Math.sqrt(variance);

    // Calculate average position change
    let totalChange = 0;
    for (let i = 1; i < positions.length; i++) {
      totalChange += Math.abs(positions[i] - positions[i - 1]);
    }
    const avgChange = totalChange / (positions.length - 1);

    // Combine metrics with weights
    return (
      (stdDev * CONFIG.ANALYSIS.STD_DEV_WEIGHT) +
      (avgChange * CONFIG.ANALYSIS.POSITION_CHANGE_WEIGHT)
    );
  }

  /**
   * Find Fibonacci retracement patterns in the data
   * @param {Object[]} points - Array of position data points
   * @returns {Object[]} Array of identified patterns
   */
  findFibonacciPatterns(points) {
    const patterns = [];
    const positions = points.map(p => p.position);

    // Find local extremes (peaks and troughs)
    const extremes = this.findLocalExtremes(positions);

    // Analyze each potential swing
    for (let i = 0; i < extremes.length - 1; i++) {
      const start = extremes[i];
      const end = extremes[i + 1];
      const swing = Math.abs(positions[end] - positions[start]);

      // Calculate Fibonacci levels for this swing
      const levels = this.calculateFibonacciLevels(
        positions[start],
        positions[end]
      );

      // Find touches of Fibonacci levels
      const touches = this.findLevelTouches(positions.slice(start, end + 1), levels);

      if (touches.length >= CONFIG.FIBONACCI.MIN_LEVEL_TOUCHES) {
        patterns.push({
          startIndex: start,
          endIndex: end,
          startValue: positions[start],
          endValue: positions[end],
          swing,
          levels,
          touches
        });
      }
    }

    return patterns;
  }

  /**
   * Calculate Fibonacci retracement levels
   * @param {number} start - Start position
   * @param {number} end - End position
   * @returns {Object} Calculated Fibonacci levels
   */
  calculateFibonacciLevels(start, end) {
    const diff = end - start;
    const levels = {};

    CONFIG.FIBONACCI.LEVELS.forEach(level => {
      levels[level] = start + (diff * level);
    });

    return levels;
  }

  /**
   * Find points where price touches Fibonacci levels
   * @param {number[]} positions - Array of positions
   * @param {Object} levels - Fibonacci levels
   * @returns {Object[]} Array of level touches
   */
  findLevelTouches(positions, levels) {
    const touches = [];
    const tolerance = CONFIG.ANALYSIS.PATTERN_TOLERANCE;

    positions.forEach((pos, index) => {
      Object.entries(levels).forEach(([level, value]) => {
        if (Math.abs(pos - value) <= tolerance) {
          touches.push({
            index,
            position: pos,
            level: parseFloat(level),
            value
          });
        }
      });
    });

    return touches;
  }

  /**
   * Find local maxima and minima in position data
   * @param {number[]} positions - Array of positions
   * @returns {number[]} Indices of local extremes
   */
  findLocalExtremes(positions) {
    const extremes = [0]; // Always include start point

    for (let i = 1; i < positions.length - 1; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      const next = positions[i + 1];

      if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
        extremes.push(i);
      }
    }

    extremes.push(positions.length - 1); // Always include end point
    return extremes;
  }

  /**
   * Predict next ranking based on patterns
   * @param {Object[]} points - Array of position data points
   * @returns {Object|null} Prediction data or null if no reliable prediction
   */
  predictNextRanking(points) {
    const patterns = this.fibonacciPatterns.get(points[0].keyword);
    if (!patterns || patterns.length === 0) return null;

    // Use the most recent pattern for prediction
    const lastPattern = patterns[patterns.length - 1];
    const lastPosition = points[points.length - 1].position;

    // Find the closest Fibonacci level
    let closestLevel = null;
    let minDistance = Infinity;

    Object.entries(lastPattern.levels).forEach(([level, value]) => {
      const distance = Math.abs(lastPosition - value);
      if (distance < minDistance) {
        minDistance = distance;
        closestLevel = {
          level: parseFloat(level),
          value
        };
      }
    });

    if (!closestLevel) return null;

    // Predict next movement based on pattern
    const isUptrend = lastPattern.endValue > lastPattern.startValue;
    const nextLevel = this.getNextFibonacciLevel(closestLevel.level, isUptrend);
    
    return {
      currentLevel: closestLevel,
      nextLevel: {
        level: nextLevel,
        value: lastPattern.levels[nextLevel]
      },
      confidence: this.calculatePredictionConfidence(patterns, points)
    };
  }

  /**
   * Get the next Fibonacci level in the sequence
   * @param {number} currentLevel - Current Fibonacci level
   * @param {boolean} isUptrend - Whether the trend is up
   * @returns {number} Next Fibonacci level
   */
  getNextFibonacciLevel(currentLevel, isUptrend) {
    const levels = CONFIG.FIBONACCI.LEVELS;
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentIndex === -1) return levels[0];
    
    if (isUptrend) {
      return levels[Math.max(0, currentIndex - 1)];
    } else {
      return levels[Math.min(levels.length - 1, currentIndex + 1)];
    }
  }

  /**
   * Calculate confidence score for prediction
   * @param {Object[]} patterns - Array of identified patterns
   * @param {Object[]} points - Array of position data points
   * @returns {number} Confidence score (0-1)
   */
  calculatePredictionConfidence(patterns, points) {
    if (!patterns || patterns.length === 0) return 0;

    // Factors affecting confidence:
    // 1. Number of similar patterns
    // 2. Pattern completion percentage
    // 3. Recent pattern strength
    // 4. Overall trend consistency

    const patternCount = patterns.length;
    const recentPatternStrength = patterns[patterns.length - 1].touches.length / 
      CONFIG.FIBONACCI.MIN_LEVEL_TOUCHES;
    
    // Calculate trend consistency
    let trendChanges = 0;
    for (let i = 2; i < points.length; i++) {
      const prev = points[i - 1].position - points[i - 2].position;
      const curr = points[i].position - points[i - 1].position;
      if (Math.sign(prev) !== Math.sign(curr)) trendChanges++;
    }
    const trendConsistency = 1 - (trendChanges / points.length);

    // Combine factors with weights
    return Math.min(1, (
      (patternCount * 0.3) +
      (recentPatternStrength * 0.4) +
      (trendConsistency * 0.3)
    ));
  }

  /**
   * Get data for a specific keyword
   * @param {string} keyword - The keyword to get data for
   * @returns {Object|null} Keyword data or null if not found
   */
  getKeywordData(keyword) {
    const points = this.data.get(keyword);
    if (!points) return null;

    return {
      positions: points.map(p => p.position),
      dates: points.map(p => p.date),
      searchVolume: points[0].searchVolume,
      patterns: this.fibonacciPatterns.get(keyword) || [],
      prediction: this.predictions.get(keyword)
    };
  }

  /**
   * Get list of volatile keywords
   * @returns {string[]} Array of volatile keywords
   */
  getVolatileKeywords() {
    return Array.from(this.volatileKeywords);
  }

  /**
   * Get total number of keywords
   * @returns {number} Total number of keywords
   */
  getTotalKeywords() {
    return this.data.size;
  }
}

// UI Controller for handling user interactions
class SEOFibUIController {
  constructor(analyzer) {
    this.analyzer = analyzer;
    this.selectedKeywords = [];
  }
  
  // Render list of volatile keywords for user selection
  renderVolatileKeywordsList(container) {
    const volatileKeywords = this.analyzer.getVolatileKeywords();
    
    // Clear container
    container.innerHTML = '';
    
    // Create table of keywords with checkboxes
    const table = document.createElement('table');
    table.className = 'keyword-table';
    
    // Add header
    const header = document.createElement('tr');
    header.innerHTML = `
      <th><input type="checkbox" id="select-all"></th>
      <th>Keyword</th>
      <th>Search Volume</th>
      <th>Volatility Score</th>
      <th>Current Position</th>
      <th>Best Position</th>
      <th>Worst Position</th>
    `;
    table.appendChild(header);
    
    // Add rows for each keyword
    volatileKeywords.forEach(keyword => {
      const row = document.createElement('tr');
      const currentPos = this.analyzer.getKeywordData(keyword).positions[this.analyzer.getKeywordData(keyword).positions.length - 1];
      
      row.innerHTML = `
        <td><input type="checkbox" class="keyword-select" data-keyword="${keyword}"></td>
        <td>${keyword}</td>
        <td>${this.analyzer.getKeywordData(keyword).searchVolume}</td>
        <td>${this.analyzer.calculateVolatility(this.analyzer.getKeywordData(keyword).positions).toFixed(2)}</td>
        <td>${currentPos}</td>
        <td>${this.analyzer.calculateFibonacciLevels(currentPos, this.analyzer.getKeywordData(keyword).positions[this.analyzer.getKeywordData(keyword).positions.length - 1])[0]}</td>
        <td>${this.analyzer.calculateFibonacciLevels(currentPos, this.analyzer.getKeywordData(keyword).positions[this.analyzer.getKeywordData(keyword).positions.length - 1])[1]}</td>
      `;
      table.appendChild(row);
    });
    
    container.appendChild(table);
    
    // Add select all functionality
    document.getElementById('select-all').addEventListener('change', e => {
      const checkboxes = document.querySelectorAll('.keyword-select');
      checkboxes.forEach(cb => cb.checked = e.target.checked);
    });
  }
  
  // Get user selected keywords
  getSelectedKeywords() {
    const checkboxes = document.querySelectorAll('.keyword-select:checked');
    return Array.from(checkboxes).map(cb => cb.dataset.keyword);
  }
  
  // Render Fibonacci chart for a keyword
  renderFibonacciChart(keyword, container) {
    const keywordData = this.analyzer.getKeywordData(keyword);
    if (!keywordData) return;
    
    const fibData = this.analyzer.calculateFibonacciLevels(keywordData.positions[0].position, keywordData.positions[keywordData.positions.length - 1].position);
    const patterns = this.analyzer.findFibonacciPatterns(keywordData.positions);
    const reliability = this.analyzer.calculatePredictionConfidence(patterns, keywordData.positions);
    const prediction = this.analyzer.predictNextRanking(keywordData.positions);
    
    // Create chart data
    const chartData = {
      positions: keywordData.positions.map(p => ({
        date: p.date,
        position: p.position
      })),
      fibLevels: fibData,
      patterns: patterns,
      prediction: prediction,
      reliability: reliability
    };
    
    // Use the imported createChartVisualization function
    createChartVisualization(chartData, container);
  }
}

// Export the classes for use
export { SEOFibonacciAnalyzer, SEOFibUIController };
