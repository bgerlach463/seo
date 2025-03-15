/**
 * Configuration constants for the SEO Fibonacci Analysis Tool
 */
export const CONFIG = {
    // Analysis settings
    FIBONACCI_LEVELS: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
    VOLATILITY_THRESHOLD: 10,
    PATTERN_TOLERANCE: 2,
    
    // Chart colors and styling
    COLORS: {
        KEYWORD_LINE: '#4CAF50',
        KEYWORD_FILL: 'rgba(76, 175, 80, 0.1)',
        FIBONACCI_LEVELS: {
            0: 'rgba(255, 99, 132, 0.5)',    // Red
            0.236: 'rgba(255, 159, 64, 0.5)', // Orange
            0.382: 'rgba(255, 205, 86, 0.5)', // Yellow
            0.5: 'rgba(75, 192, 192, 0.5)',   // Green
            0.618: 'rgba(54, 162, 235, 0.5)', // Blue
            0.786: 'rgba(153, 102, 255, 0.5)', // Purple
            1: 'rgba(201, 203, 207, 0.5)'     // Grey
        }
    },
    
    // Chart settings
    CHART: {
        LINE_WIDTH: 2,
        FIB_LINE_WIDTH: 1,
        FIB_DASH_PATTERN: [5, 5],
        CANVAS_HEIGHT: 300,
        FONT_SIZE: 16
    },
    
    // CSV parsing options
    CSV: {
        HEADER: true,
        DYNAMIC_TYPING: true,
        SKIP_EMPTY_LINES: true
    }
}; 