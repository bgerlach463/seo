// This file extends the SEOFibUIController with chart rendering capabilities
// Make sure to include Chart.js before using these functions

import { CONFIG } from './config.js';

/**
 * UI Controller for the SEO Fibonacci Analyzer
 */
export class SEOFibUIController {
    /**
     * @param {import('./analyzer.js').SEOFibonacciAnalyzer} analyzer 
     */
    constructor(analyzer) {
        this.analyzer = analyzer;
    }

    /**
     * Render the list of volatile keywords for selection
     * @param {HTMLElement} container - Container element for the list
     */
    renderVolatileKeywordsList(container) {
        if (!container) {
            console.error('Invalid container element provided');
            return;
        }

        container.innerHTML = '';
        
        // Create a select all checkbox
        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'select-all-container';
        
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'select-all';
        
        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = 'select-all';
        selectAllLabel.textContent = 'Select All Keywords';
        
        selectAllDiv.appendChild(selectAllCheckbox);
        selectAllDiv.appendChild(selectAllLabel);
        container.appendChild(selectAllDiv);
        
        // Create the keyword list
        const keywordList = document.createElement('div');
        keywordList.className = 'keyword-list';
        
        this.analyzer.volatileKeywords.forEach(keyword => {
            const keywordData = this.analyzer.getKeywordData(keyword);
            if (!keywordData) return;

            const keywordDiv = document.createElement('div');
            keywordDiv.className = 'keyword-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = keyword;
            checkbox.id = `keyword-${keyword}`;
            
            const label = document.createElement('label');
            label.htmlFor = `keyword-${keyword}`;
            label.textContent = `${keyword} (Score: ${keywordData.volatilityScore.toFixed(2)})`;
            
            keywordDiv.appendChild(checkbox);
            keywordDiv.appendChild(label);
            keywordList.appendChild(keywordDiv);
        });
        
        container.appendChild(keywordList);
        
        // Handle select all functionality
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = keywordList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = selectAllCheckbox.checked;
            });
        });
    }

    /**
     * Get the list of currently selected keywords
     * @returns {string[]}
     */
    getSelectedKeywords() {
        const checkboxes = document.querySelectorAll('.keyword-list input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(checkbox => checkbox.value);
    }

    /**
     * Render a Fibonacci chart for a keyword
     * @param {string} keyword - The keyword to chart
     * @param {HTMLCanvasElement} container - Canvas element for the chart
     */
    renderFibonacciChart(keyword, container) {
        const keywordData = this.analyzer.getKeywordData(keyword);
        if (!keywordData || !container) {
            console.error('Invalid keyword or container');
            return;
        }
        
        createChartVisualization(keywordData, container);
    }
}

/**
 * Create a chart visualization for keyword data
 * @param {import('./analyzer.js').KeywordData} chartData 
 * @param {HTMLElement} container 
 */
export function createChartVisualization(chartData, container) {
    // If container is a canvas element, use it directly
    // Otherwise, create a canvas and append it to the container
    let canvas = container;
    if (!(container instanceof HTMLCanvasElement)) {
        canvas = document.createElement('canvas');
        canvas.height = CONFIG.CHART.CANVAS_HEIGHT;
        container.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context');
        return;
    }

    // Data preparation
    const dates = chartData.positions.map(p => new Date(p.date).toLocaleDateString());
    const positions = chartData.positions.map(p => p.position);

    // Create datasets for the Fibonacci levels
    const minPosition = Math.min(...positions);
    const maxPosition = Math.max(...positions);
    const range = maxPosition - minPosition;

    const fibDatasets = CONFIG.FIBONACCI_LEVELS.map(level => {
        const value = maxPosition - (range * level);
        return {
            label: `Fib ${level * 100}%`,
            data: Array(dates.length).fill(value),
            borderColor: CONFIG.COLORS.FIBONACCI_LEVELS[level],
            borderWidth: CONFIG.CHART.FIB_LINE_WIDTH,
            borderDash: CONFIG.CHART.FIB_DASH_PATTERN,
            fill: false,
            pointRadius: 0
        };
    });

    // Create the chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Keyword Position',
                    data: positions,
                    borderColor: CONFIG.COLORS.KEYWORD_LINE,
                    backgroundColor: CONFIG.COLORS.KEYWORD_FILL,
                    borderWidth: CONFIG.CHART.LINE_WIDTH,
                    fill: true,
                    tension: 0.4
                },
                ...fibDatasets
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    reverse: true,
                    title: {
                        display: true,
                        text: 'Position'
                    },
                    beginAtZero: true
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Position History with Fibonacci Levels - ${chartData.keyword}`,
                    font: {
                        size: CONFIG.CHART.FONT_SIZE
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        filter: function(legendItem) {
                            // Only show main data and significant Fibonacci levels
                            return legendItem.text === 'Keyword Position' ||
                                   legendItem.text === 'Fib 38.2%' ||
                                   legendItem.text === 'Fib 50%' ||
                                   legendItem.text === 'Fib 61.8%';
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += Math.round(context.parsed.y * 100) / 100;
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function getFibLevelColor(level) {
    const colors = {
        0: 'rgba(255, 99, 132, 0.5)',    // Red
        0.236: 'rgba(255, 159, 64, 0.5)', // Orange
        0.382: 'rgba(255, 205, 86, 0.5)', // Yellow
        0.5: 'rgba(75, 192, 192, 0.5)',   // Green
        0.618: 'rgba(54, 162, 235, 0.5)', // Blue
        0.786: 'rgba(153, 102, 255, 0.5)', // Purple
        1: 'rgba(201, 203, 207, 0.5)'     // Grey
    };
    return colors[level] || 'rgba(0, 0, 0, 0.5)';
}
