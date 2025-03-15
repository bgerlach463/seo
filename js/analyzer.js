/**
 * SEO Fibonacci Analysis Tool
 * Analyzes keyword ranking patterns using Fibonacci retracement levels
 */

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

export class SEOFibonacciAnalyzer {
    constructor() {
        /** @type {KeywordData[]} */
        this.keywords = [];
        /** @type {string[]} */
        this.volatileKeywords = [];
    }

    /**
     * Process raw data into internal format
     * @param {Object[]} data - Raw data from SEMrush CSV
     * @throws {Error} If data is invalid or empty
     */
    processRawData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid or empty data provided');
        }

        console.log('Processing raw data...');
        
        // Group by keyword
        const keywordGroups = _.groupBy(data, 'Keyword');
        
        // Transform data into internal format
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
        }).filter(Boolean);

        console.log(`Processed ${this.keywords.length} keywords`);
    }

    /**
     * Calculate volatility scores for all keywords
     */
    calculateVolatility() {
        console.log('Calculating volatility scores...');
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

    /**
     * Calculate Fibonacci retracement levels for a keyword
     * @param {string} keyword - The keyword to analyze
     * @returns {Object|null} Fibonacci levels
     */
    calculateFibonacciLevels(keyword) {
        const keywordData = this.getKeywordData(keyword);
        if (!keywordData) return null;
        
        const positions = keywordData.positions.map(p => p.position);
        const minPosition = Math.min(...positions);
        const maxPosition = Math.max(...positions);
        const range = maxPosition - minPosition;
        
        const levels = {};
        CONFIG.FIBONACCI_LEVELS.forEach(level => {
            levels[level] = maxPosition - (range * level);
        });
        
        return levels;
    }

    /**
     * Find Fibonacci patterns in the keyword data
     * @param {string} keyword - The keyword to analyze
     * @returns {FibonacciPattern[]} Array of found patterns
     */
    findFibonacciPatterns(keyword) {
        const keywordData = this.getKeywordData(keyword);
        if (!keywordData) return [];
        
        const positions = keywordData.positions;
        const fibLevels = this.calculateFibonacciLevels(keyword);
        
        const patterns = [];
        
        positions.forEach((pos, i) => {
            if (i === 0 || i === positions.length - 1) return;
            
            const prevPos = positions[i-1].position;
            const currentPos = pos.position;
            const nextPos = positions[i+1].position;
            
            Object.entries(fibLevels).forEach(([level, value]) => {
                if (Math.abs(currentPos - value) <= CONFIG.PATTERN_TOLERANCE) {
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

    /**
     * Calculate how well the keyword follows Fibonacci patterns
     * @param {string} keyword - The keyword to analyze
     * @returns {number} Reliability score (0-100)
     */
    calculateFibonacciReliability(keyword) {
        const patterns = this.findFibonacciPatterns(keyword);
        const keywordData = this.getKeywordData(keyword);
        
        if (!patterns.length || !keywordData) return 0;
        
        const totalMoves = keywordData.positions.length - 1;
        const patternsFound = patterns.length;
        
        return (patternsFound / totalMoves) * 100;
    }

    /**
     * Predict next potential ranking based on Fibonacci levels
     * @param {string} keyword - The keyword to analyze
     * @returns {Object|null} Predicted next level
     */
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
        
        const levels = Object.entries(fibLevels)
            .map(([level, value]) => ({ level: parseFloat(level), value }))
            .sort((a, b) => a.value - b.value);
        
        if (trend === 'up') {
            const nextLevel = levels.find(l => l.value < currentPos);
            return nextLevel || levels[0];
        } else {
            const nextLevel = [...levels].reverse().find(l => l.value > currentPos);
            return nextLevel || levels[levels.length - 1];
        }
    }
} 