/**
 * UI Controller for the SEO Fibonacci Analysis Tool
 * Handles user interactions, DOM updates, and chart rendering
 */
import { CONFIG } from './config.js';

export class SEOFibUIController {
    constructor() {
        this.initializeElements();
        this.initializeEventListeners();
        this.selectedKeywords = new Set();
        this.charts = new Map();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        // File handling elements
        this.fileInput = document.getElementById('fileInput');
        this.processButton = document.getElementById('processButton');
        this.fileName = document.getElementById('fileName');
        this.status = document.getElementById('status');

        // Results section elements
        this.resultsSection = document.getElementById('resultsSection');
        this.keywordList = document.getElementById('keywordList');
        this.selectAllCheckbox = document.getElementById('selectAllKeywords');
        this.analyzeSelectedButton = document.getElementById('analyzeSelected');
        this.chartContainer = document.getElementById('chartContainer');

        // Validate required elements
        const requiredElements = [
            'fileInput', 'processButton', 'fileName', 'status',
            'resultsSection', 'keywordList', 'selectAllCheckbox',
            'analyzeSelectedButton', 'chartContainer'
        ];

        const missingElements = requiredElements.filter(id => !this[id]);
        if (missingElements.length > 0) {
            throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
        }
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // File input handling
        this.fileInput.addEventListener('change', () => this.handleFileSelect());
        
        // Keyword selection handling
        this.selectAllCheckbox.addEventListener('change', () => this.handleSelectAll());
        this.analyzeSelectedButton.addEventListener('click', () => this.handleAnalyzeSelected());
        
        // Prevent form submission on enter
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });
    }

    /**
     * Handle file selection
     */
    handleFileSelect() {
        const file = this.fileInput.files[0];
        if (!file) {
            this.showStatus('No file selected', 'warning');
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showStatus('Please select a CSV file', 'error');
            this.fileInput.value = '';
            return;
        }

        this.fileName.textContent = file.name;
        this.processButton.disabled = false;
        this.showStatus('File selected. Click "Process Data" to analyze.', 'info');
    }

    /**
     * Show status message
     * @param {string} message - Message to display
     * @param {string} type - Message type (info, success, warning, error)
     */
    showStatus(message, type = 'info') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        this.status.style.display = 'block';

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                this.status.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Render list of volatile keywords
     * @param {string[]} keywords - Array of volatile keywords
     * @param {Object} analyzer - Analyzer instance
     */
    renderVolatileKeywordsList(keywords, analyzer) {
        this.keywordList.innerHTML = '';
        this.selectedKeywords.clear();
        
        if (keywords.length === 0) {
            this.keywordList.innerHTML = '<p class="no-results">No volatile keywords found</p>';
            return;
        }

        keywords.forEach(keyword => {
            const data = analyzer.getKeywordData(keyword);
            if (!data) return;

            const keywordItem = document.createElement('div');
            keywordItem.className = 'keyword-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `keyword-${keyword}`;
            checkbox.addEventListener('change', () => this.handleKeywordSelect(keyword));

            const label = document.createElement('label');
            label.htmlFor = `keyword-${keyword}`;
            label.textContent = keyword;

            const stats = document.createElement('div');
            stats.className = 'keyword-stats';
            stats.innerHTML = `
                <span class="search-volume">Volume: ${data.searchVolume}</span>
                <span class="current-position">Position: ${data.positions[data.positions.length - 1]}</span>
            `;

            keywordItem.appendChild(checkbox);
            keywordItem.appendChild(label);
            keywordItem.appendChild(stats);
            this.keywordList.appendChild(keywordItem);
        });

        this.resultsSection.style.display = 'block';
        setTimeout(() => this.resultsSection.classList.add('visible'), 100);
    }

    /**
     * Handle keyword selection
     * @param {string} keyword - Selected keyword
     */
    handleKeywordSelect(keyword) {
        const checkbox = document.getElementById(`keyword-${keyword}`);
        if (checkbox.checked) {
            this.selectedKeywords.add(keyword);
        } else {
            this.selectedKeywords.delete(keyword);
            this.selectAllCheckbox.checked = false;
        }

        this.analyzeSelectedButton.disabled = this.selectedKeywords.size === 0;
        this.updateSelectAllState();
    }

    /**
     * Handle "Select All" checkbox
     */
    handleSelectAll() {
        const checkboxes = this.keywordList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.selectAllCheckbox.checked;
            const keyword = checkbox.id.replace('keyword-', '');
            if (this.selectAllCheckbox.checked) {
                this.selectedKeywords.add(keyword);
            } else {
                this.selectedKeywords.delete(keyword);
            }
        });

        this.analyzeSelectedButton.disabled = this.selectedKeywords.size === 0;
    }

    /**
     * Update "Select All" checkbox state
     */
    updateSelectAllState() {
        const checkboxes = this.keywordList.querySelectorAll('input[type="checkbox"]');
        const checkedCount = this.keywordList.querySelectorAll('input[type="checkbox"]:checked').length;
        this.selectAllCheckbox.checked = checkedCount === checkboxes.length;
    }

    /**
     * Render Fibonacci chart for selected keywords
     * @param {Object} keywordData - Keyword data object
     * @param {Object[]} patterns - Fibonacci patterns
     * @param {number} reliability - Pattern reliability score
     * @param {Object} prediction - Ranking prediction
     */
    renderFibonacciChart(keywordData, patterns, reliability, prediction) {
        // Clear existing chart
        this.chartContainer.innerHTML = '';
        
        // Create canvas for the chart
        const canvas = document.createElement('canvas');
        this.chartContainer.appendChild(canvas);

        // Prepare data for the chart
        const dates = keywordData.dates.map(d => d.toISOString().split('T')[0]);
        const positions = keywordData.positions;

        // Create Chart.js configuration
        const chartConfig = {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Ranking',
                        data: positions,
                        borderColor: CONFIG.CHART.COLORS.RANKING_LINE,
                        backgroundColor: CONFIG.CHART.COLORS.RANKING_FILL,
                        borderWidth: CONFIG.CHART.STYLES.LINE_WIDTH,
                        pointRadius: CONFIG.CHART.STYLES.POINT_RADIUS,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM D'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        reverse: true,
                        title: {
                            display: true,
                            text: 'Position'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Ranking Pattern Analysis - ${keywordData.keyword}`,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Position: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                animation: {
                    duration: CONFIG.CHART.ANIMATION.DURATION,
                    easing: CONFIG.CHART.ANIMATION.EASING
                }
            }
        };

        // Add Fibonacci levels if patterns exist
        if (patterns && patterns.length > 0) {
            patterns.forEach((pattern, index) => {
                Object.entries(pattern.levels).forEach(([level, value]) => {
                    chartConfig.data.datasets.push({
                        label: `Fib ${level}`,
                        data: new Array(dates.length).fill(value),
                        borderColor: CONFIG.CHART.COLORS.FIBONACCI_LEVELS[index % CONFIG.CHART.COLORS.FIBONACCI_LEVELS.length],
                        borderWidth: CONFIG.CHART.STYLES.FIBONACCI_LINE_WIDTH,
                        borderDash: CONFIG.CHART.STYLES.FIBONACCI_LINE_DASH,
                        pointRadius: 0,
                        fill: false
                    });
                });
            });
        }

        // Add prediction if available
        if (prediction) {
            const lastDate = new Date(dates[dates.length - 1]);
            const nextDate = new Date(lastDate);
            nextDate.setDate(nextDate.getDate() + 7);

            chartConfig.data.datasets.push({
                label: 'Prediction',
                data: [
                    { x: dates[dates.length - 1], y: positions[positions.length - 1] },
                    { x: nextDate.toISOString().split('T')[0], y: prediction.nextLevel.value }
                ],
                borderColor: CONFIG.CHART.COLORS.PREDICTION_LINE,
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: [0, 4],
                fill: false
            });
        }

        // Create and store the chart
        const chart = new Chart(canvas, chartConfig);
        this.charts.set(keywordData.keyword, chart);
    }

    /**
     * Clear all charts
     */
    clearCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
        this.chartContainer.innerHTML = '';
    }

    /**
     * Get selected keywords
     * @returns {string[]} Array of selected keywords
     */
    getSelectedKeywords() {
        return Array.from(this.selectedKeywords);
    }
} 