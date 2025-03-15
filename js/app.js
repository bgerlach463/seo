/**
 * Main application entry point for the SEO Fibonacci Analysis Tool
 */
import { CONFIG } from './config.js';
import { SEOFibonacciAnalyzer } from './analyzer.js';
import { SEOFibUIController } from './ui-controller.js';
import { transformSEMrushData, validateSEMrushFormat } from './semrush-adapter.js';

class App {
    constructor() {
        this.analyzer = new SEOFibonacciAnalyzer();
        this.ui = new SEOFibUIController();
        this.initializeEventListeners();
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        const processButton = document.getElementById('processButton');
        const analyzeButton = document.getElementById('analyzeSelected');

        if (!processButton || !analyzeButton) {
            console.error('Required buttons not found');
            return;
        }

        processButton.addEventListener('click', () => this.handleProcessData());
        analyzeButton.addEventListener('click', () => this.handleAnalyzeSelected());
    }

    /**
     * Handle processing of uploaded data
     */
    async handleProcessData() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput?.files[0];

        if (!file) {
            this.ui.showStatus('Please select a file first', 'warning');
            return;
        }

        try {
            this.ui.showStatus('Reading file...', 'info');
            const rawData = await this.readFile(file);

            this.ui.showStatus('Processing data...', 'info');
            const transformedData = transformSEMrushData(rawData);
            
            const results = this.analyzer.processRawData(transformedData);
            
            if (results.volatileKeywords.length > 0) {
                this.ui.renderVolatileKeywordsList(results.volatileKeywords, this.analyzer);
                this.ui.showStatus(
                    `Found ${results.volatileKeywords.length} volatile keywords out of ${results.totalKeywords} total`,
                    'success'
                );
            } else {
                this.ui.showStatus('No volatile keywords found in the data', 'warning');
            }
        } catch (error) {
            console.error('Error processing data:', error);
            this.ui.showStatus(error.message, 'error');
        }
    }

    /**
     * Handle analysis of selected keywords
     */
    async handleAnalyzeSelected() {
        const selectedKeywords = this.ui.getSelectedKeywords();
        
        if (selectedKeywords.length === 0) {
            this.ui.showStatus('Please select at least one keyword to analyze', 'warning');
            return;
        }

        try {
            this.ui.clearCharts();
            
            selectedKeywords.forEach(keyword => {
                const data = this.analyzer.getKeywordData(keyword);
                if (!data) {
                    console.warn(`No data found for keyword: ${keyword}`);
                    return;
                }

                const patterns = this.analyzer.findFibonacciPatterns(data.positions);
                const prediction = this.analyzer.predictNextRanking(data.positions);
                const reliability = this.analyzer.calculatePredictionConfidence(patterns, data.positions);

                this.ui.renderFibonacciChart(data, patterns, reliability, prediction);
            });

            this.ui.showStatus('Analysis complete', 'success');
        } catch (error) {
            console.error('Error analyzing keywords:', error);
            this.ui.showStatus('Error analyzing keywords: ' + error.message, 'error');
        }
    }

    /**
     * Read and parse CSV file
     * @param {File} file - The uploaded CSV file
     * @returns {Promise<Object[]>} Parsed CSV data
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const csvData = Papa.parse(e.target.result, {
                        header: true,
                        skipEmptyLines: true,
                        transformHeader: h => h.trim(),
                        transform: v => v.trim()
                    });

                    if (csvData.errors.length > 0) {
                        console.warn('CSV parsing warnings:', csvData.errors);
                    }

                    if (!validateSEMrushFormat(csvData.data)) {
                        reject(new Error('Invalid SEMrush CSV format'));
                        return;
                    }

                    resolve(csvData.data);
                } catch (error) {
                    reject(new Error('Error parsing CSV: ' + error.message));
                }
            };

            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (CONFIG.DEBUG.ENABLED) {
        console.log('Initializing SEO Fibonacci Analysis Tool...');
    }
    
    try {
        window.app = new App();
    } catch (error) {
        console.error('Error initializing application:', error);
        const status = document.getElementById('status');
        if (status) {
            status.textContent = 'Error initializing application: ' + error.message;
            status.className = 'status error';
            status.style.display = 'block';
        }
    }
}); 