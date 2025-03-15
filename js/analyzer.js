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

// Main class for the analyzer
export class SEOFibonacciAnalyzer {
  constructor() {
    /** @type {KeywordData[]} */
    this.keywords = [];
    /** @type {string[]} */
    this.volatileKeywords = [];
    this.fibonacciLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  }

  // Parse SEMrush CSV report
  parseCSV(fileContent) {
    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          this.processRawData(results.data);
          resolve(this.keywords);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Process raw data from SEMrush into our internal format
   * @param {Object[]} data - Raw data from SEMrush CSV
   * @throws {Error} If data is invalid or empty
   */
  processRawData(data) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid or empty data provided');
    }

    // Group by keyword to collect all historical data points
    const keywordGroups = _.groupBy(data, 'Keyword');
    
    // Transform data into our internal format with proper date sorting
    this.keywords = Object.entries(keywordGroups).map(([keyword, entries]) => {
      if (!entries || entries.length === 0) {
        console.warn(`Empty entries for keyword: ${keyword}`);
        return null;
      }

      // Sort by date
      const sortedEntries = _.sortBy(entries, 'Date');
      
      return {
        keyword,
        searchVolume: parseInt(entries[0].Volume) || 0,
        positions: sortedEntries.map(entry => ({
          date: new Date(entry.Date),
          position: parseFloat(entry.Position),
          url: entry.URL || ''
        }))
      };
    }).filter(Boolean); // Remove null entries

    console.log(`Processed ${this.keywords.length} keywords`);
  }

  /**
   * Calculate volatility scores for all keywords
   */
  calculateVolatility() {
    this.volatileKeywords = [];

    this.keywords.forEach(keyword => {
      const positions = keyword.positions.map(p => p.position);
      
      // Calculate standard deviation of position changes
      const changes = positions.slice(1).map((pos, i) => 
        Math.abs(pos - positions[i])
      );
      
      if (changes.length === 0) {
        console.warn(`Insufficient data points for keyword: ${keyword.keyword}`);
        return;
      }

      const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
      const variance = changes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / changes.length;
      const stdDev = Math.sqrt(variance);
      
      // Calculate average position
      const avgPosition = positions.reduce((a, b) => a + b, 0) / positions.length;
      
      // Normalize volatility score based on average position
      const volatilityScore = (stdDev / avgPosition) * 100;
      
      keyword.volatilityScore = volatilityScore;
      
      // Consider a keyword volatile if its score is above threshold
      if (volatilityScore > CONFIG.VOLATILITY_THRESHOLD) {
        this.volatileKeywords.push(keyword.keyword);
      }
    });
    
    // Sort volatile keywords by volatility score
    this.volatileKeywords.sort((a, b) => {
      const scoreA = this.getKeywordData(a)?.volatilityScore ?? 0;
      const scoreB = this.getKeywordData(b)?.volatilityScore ?? 0;
      return scoreB - scoreA;
    });
    
    console.log(`Found ${this.volatileKeywords.length} volatile keywords`);
  }

  /**
   * Get keyword data by keyword string
   * @param {string} keyword - The keyword to look up
   * @returns {KeywordData|null}
   */
  getKeywordData(keyword) {
    return this.keywords.find(k => k.keyword === keyword) || null;
  }

  // Calculate Fibonacci retracement levels for a keyword
  calculateFibonacciLevels(keyword) {
    const keywordData = this.getKeywordData(keyword);
    if (!keywordData) return null;
    
    const positions = keywordData.positions.map(p => p.position);
    const minPosition = Math.min(...positions);
    const maxPosition = Math.max(...positions);
    const range = maxPosition - minPosition;
    
    // Calculate levels
    const levels = {};
    CONFIG.FIBONACCI_LEVELS.forEach(level => {
      levels[level] = maxPosition - (range * level);
    });
    
    return levels;
  }

  // Find Fibonacci patterns in the data
  findFibonacciPatterns(keyword) {
    const keywordData = this.getKeywordData(keyword);
    if (!keywordData) return [];
    
    const positions = keywordData.positions;
    const fibLevels = this.calculateFibonacciLevels(keyword);
    
    const patterns = [];
    
    // Look for bounces off Fibonacci levels
    positions.forEach((pos, i) => {
      if (i === 0 || i === positions.length - 1) return;
      
      const prevPos = positions[i-1].position;
      const currentPos = pos.position;
      const nextPos = positions[i+1].position;
      
      // Check each Fibonacci level
      Object.entries(fibLevels).forEach(([level, value]) => {
        // Check if position is near this level
        if (Math.abs(currentPos - value) <= CONFIG.PATTERN_TOLERANCE) {
          // Determine if it's a bounce up or down
          if (prevPos > currentPos && nextPos > currentPos) {
            patterns.push({
              date: pos.date,
              position: currentPos,
              fibLevel: parseFloat(level),
              bounceType: 'Support'
            });
          } else if (prevPos < currentPos && nextPos < currentPos) {
            patterns.push({
              date: pos.date,
              position: currentPos,
              fibLevel: parseFloat(level),
              bounceType: 'Resistance'
            });
          }
        }
      });
    });
    
    return patterns;
  }

  // Calculate how well the keyword follows Fibonacci patterns
  calculateFibonacciReliability(keyword) {
    const patterns = this.findFibonacciPatterns(keyword);
    const keywordData = this.getKeywordData(keyword);
    
    if (!patterns.length || !keywordData) return 0;
    
    // Calculate what percentage of major moves respect Fibonacci levels
    const totalMoves = keywordData.positions.length - 1;
    const patternsFound = patterns.length;
    
    return (patternsFound / totalMoves) * 100;
  }

  // Predict next potential ranking based on Fibonacci levels
  predictNextRanking(keyword) {
    const keywordData = this.getKeywordData(keyword);
    if (!keywordData) return null;
    
    const positions = keywordData.positions;
    const currentPos = positions[positions.length - 1].position;
    const prevPos = positions[positions.length - 2]?.position;
    
    if (!prevPos) return null;
    
    const fibLevels = this.calculateFibonacciLevels(keyword);
    if (!fibLevels) return null;

    const trend = currentPos < prevPos ? 'up' : 'down';
    
    // Find next Fibonacci level in the trend direction
    const levels = Object.entries(fibLevels)
      .map(([level, value]) => ({ level: parseFloat(level), value }))
      .sort((a, b) => a.value - b.value);
    
    if (trend === 'up') {
      // Find next resistance level above current position
      const nextLevel = levels.find(l => l.value < currentPos);
      return nextLevel || levels[0];
    } else {
      // Find next support level below current position
      const nextLevel = [...levels].reverse().find(l => l.value > currentPos);
      return nextLevel || levels[levels.length - 1];
    }
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
    const volatileKeywords = this.analyzer.volatileKeywords;
    
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
      const currentPos = this.analyzer.keywords.find(k => k.keyword === keyword).positions[this.analyzer.keywords.find(k => k.keyword === keyword).positions.length - 1].position;
      
      row.innerHTML = `
        <td><input type="checkbox" class="keyword-select" data-keyword="${keyword}"></td>
        <td>${keyword}</td>
        <td>${this.analyzer.keywords.find(k => k.keyword === keyword).searchVolume}</td>
        <td>${this.analyzer.keywords.find(k => k.keyword === keyword).volatilityScore.toFixed(2)}</td>
        <td>${currentPos}</td>
        <td>${this.analyzer.calculateFibonacciLevels(keyword)[0]}</td>
        <td>${this.analyzer.calculateFibonacciLevels(keyword)[1]}</td>
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
    const keywordData = this.analyzer.keywords.find(k => k.keyword === keyword);
    if (!keywordData) return;
    
    const fibData = this.analyzer.calculateFibonacciLevels(keyword);
    const patterns = this.analyzer.findFibonacciPatterns(keyword);
    const reliability = this.analyzer.calculateFibonacciReliability(keyword);
    const prediction = this.analyzer.predictNextRanking(keyword);
    
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
