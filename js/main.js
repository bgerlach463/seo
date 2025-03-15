// Import our analyzer classes and transformers
import { SEOFibonacciAnalyzer } from './analyzer.js';
import { SEOFibUIController } from './ui.js';
import { transformSEMrushData } from './semrush-adapter.js';
import { CONFIG } from './config.js';

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing application...');

    // DOM elements
    const elements = {
        csvFileInput: document.getElementById('csv-file'),
        uploadButton: document.getElementById('upload-btn'),
        uploadStatus: document.getElementById('upload-status'),
        keywordSection: document.getElementById('keyword-selection'),
        keywordListContainer: document.getElementById('keyword-list-container'),
        analyzeButton: document.getElementById('analyze-btn'),
        resultsSection: document.getElementById('results'),
        chartsContainer: document.getElementById('charts-container'),
        summaryContainer: document.getElementById('summary-container')
    };

    // Verify all elements were found
    const missingElements = Object.entries(elements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing DOM elements:', missingElements);
        showStatus('Error initializing application. Please check the console.', 'error', elements.uploadStatus);
        return null;
    }

    console.log('All DOM elements found');

    // Create instances of our classes
    const analyzer = new SEOFibonacciAnalyzer();
    const uiController = new SEOFibUIController(analyzer);

    console.log('Classes initialized');

    return { elements, analyzer, uiController };
}

/**
 * Show a status message to the user
 * @param {string} message - The message to show
 * @param {'error'|'success'|'info'} type - The type of message
 * @param {HTMLElement} statusElement - The status element
 */
function showStatus(message, type, statusElement) {
    if (!statusElement) return;

    statusElement.innerHTML = message;
    statusElement.className = '';
    statusElement.classList.add(`status-${type}`);
}

/**
 * Read a file's contents
 * @param {File} file - The file to read
 * @returns {Promise<string>}
 */
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            resolve(event.target.result);
        };
        
        reader.onerror = (error) => {
            console.error('File reading error:', error);
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
}

/**
 * Handle file upload and processing
 * @param {File} file - The file to process
 * @param {Object} context - The application context
 */
async function handleFileUpload(file, context) {
    const { elements, analyzer, uiController } = context;

    if (!file) {
        console.log('No file selected');
        showStatus('Please select a CSV file first.', 'error', elements.uploadStatus);
        return;
    }

    console.log('Processing file:', {
        name: file.name,
        size: file.size,
        type: file.type
    });

    try {
        showStatus('<div class="loading-spinner"></div> Processing file... This might take a minute for large datasets.', 'info', elements.uploadStatus);
        
        // Read and parse the file
        const fileContent = await readFile(file);
        console.log('File read successfully, length:', fileContent.length);
        
        console.log('Starting CSV parsing');
        const parsedResult = Papa.parse(fileContent, {
            ...CONFIG.CSV,
            error: (error) => {
                console.error('CSV parsing error:', error);
                showStatus('Error parsing CSV file. Please check the file format.', 'error', elements.uploadStatus);
            }
        });
        
        if (parsedResult.errors?.length > 0) {
            console.warn('CSV parsing warnings:', parsedResult.errors);
        }
        
        console.log('CSV parsed successfully');
        console.log('Headers:', parsedResult.meta.fields);
        
        // Transform and process the data
        console.log('Starting data transformation');
        const transformedData = transformSEMrushData(parsedResult.data);
        
        if (!transformedData?.length) {
            console.error('No valid data after transformation');
            showStatus('No valid data found in the CSV. Make sure you\'re using a SEMrush position tracking export.', 'error', elements.uploadStatus);
            return;
        }
        
        console.log(`Transformed ${transformedData.length} data points`);
        
        // Process the data
        console.log('Processing transformed data');
        analyzer.processRawData(transformedData);
        
        // Calculate volatility
        console.log('Calculating volatility');
        analyzer.calculateVolatility();
        
        if (!analyzer.volatileKeywords.length) {
            console.warn('No volatile keywords found');
            showStatus('No volatile keywords found in the data. Try uploading a file with more historical data points.', 'error', elements.uploadStatus);
            return;
        }
        
        // Update UI
        console.log('Rendering keyword list');
        uiController.renderVolatileKeywordsList(elements.keywordListContainer);
        elements.keywordSection.style.display = 'block';
        
        showStatus(
            `Successfully processed ${analyzer.keywords.length} keywords. ${analyzer.volatileKeywords.length} keywords show significant volatility.`,
            'success',
            elements.uploadStatus
        );
    } catch (error) {
        console.error('Error processing file:', error);
        showStatus(`Error processing file: ${error.message}`, 'error', elements.uploadStatus);
    }
}

/**
 * Analyze selected keywords and display results
 * @param {Object} context - The application context
 */
function analyzeSelectedKeywords(context) {
    const { elements, analyzer, uiController } = context;
    
    const selectedKeywords = uiController.getSelectedKeywords();
    
    if (!selectedKeywords.length) {
        showStatus('Please select at least one keyword to analyze.', 'error', elements.uploadStatus);
        return;
    }
    
    // Clear previous results
    elements.chartsContainer.innerHTML = '';
    elements.summaryContainer.innerHTML = '';
    
    // Create summary table
    const summaryTable = document.createElement('table');
    summaryTable.className = 'keyword-table';
    summaryTable.innerHTML = `
        <tr>
            <th>Keyword</th>
            <th>Volatility Score</th>
            <th>Fibonacci Reliability</th>
            <th>Next Support/Resistance</th>
            <th>Current Trend</th>
        </tr>
    `;
    
    // Process each selected keyword
    selectedKeywords.forEach(keyword => {
        const keywordData = analyzer.getKeywordData(keyword);
        if (!keywordData) return;

        // Create chart container
        const chartCard = document.createElement('div');
        chartCard.className = 'chart-card';
        
        const chartHeader = document.createElement('div');
        chartHeader.className = 'chart-header';
        
        const chartTitle = document.createElement('div');
        chartTitle.className = 'chart-title';
        chartTitle.textContent = keyword;
        
        chartHeader.appendChild(chartTitle);
        chartCard.appendChild(chartHeader);
        
        // Create and add chart
        const chartCanvas = document.createElement('canvas');
        chartCanvas.height = CONFIG.CHART.CANVAS_HEIGHT;
        chartCard.appendChild(chartCanvas);
        elements.chartsContainer.appendChild(chartCard);
        
        uiController.renderFibonacciChart(keyword, chartCanvas);
        
        // Add summary row
        const reliability = analyzer.calculateFibonacciReliability(keyword);
        const prediction = analyzer.predictNextRanking(keyword);
        
        const positions = keywordData.positions;
        const currentPosition = positions[positions.length - 1].position;
        const previousPosition = positions[positions.length - 2]?.position ?? currentPosition;
        const trendDirection = currentPosition < previousPosition ? 'Improving' : 'Declining';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${keyword}</td>
            <td>${keywordData.volatilityScore.toFixed(2)}</td>
            <td>${reliability.toFixed(2)}%</td>
            <td>${prediction ? `${prediction.value.toFixed(2)} (${prediction.level * 100}%)` : 'N/A'}</td>
            <td>${trendDirection}</td>
        `;
        summaryTable.appendChild(row);
    });
    
    elements.summaryContainer.appendChild(summaryTable);
    elements.resultsSection.style.display = 'block';
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const context = initializeApp();
    if (!context) return;

    const { elements } = context;

    // Set up event listeners
    elements.uploadButton.addEventListener('click', () => {
        const file = elements.csvFileInput.files[0];
        handleFileUpload(file, context);
    });

    elements.analyzeButton.addEventListener('click', () => {
        analyzeSelectedKeywords(context);
    });

    // Show initial status
    showStatus('Please select a SEMrush CSV file and click "Process Data"', 'info', elements.uploadStatus);
});
