/**
 * SEMrush data adapter for transforming and validating CSV data
 */
import { CONFIG } from './config.js';

/**
 * Validates that the data has all required columns
 * @param {Object[]} data - The parsed CSV data
 * @returns {boolean} True if valid, throws error if invalid
 */
export function validateSEMrushFormat(data) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data format: Empty or not an array');
    }

    const firstRow = data[0];
    const missingColumns = CONFIG.SEMRUSH.REQUIRED_COLUMNS.filter(
        col => !Object.keys(firstRow).includes(col)
    );

    if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    return true;
}

/**
 * Transforms SEMrush CSV data into the format needed for analysis
 * @param {Object[]} rawData - The raw CSV data
 * @returns {Object[]} Transformed data array
 */
export function transformSEMrushData(rawData) {
    if (!validateSEMrushFormat(rawData)) {
        return [];
    }

    return rawData
        .filter(row => {
            // Filter out rows with invalid positions or missing data
            const position = parseInt(row.Position);
            return (
                !isNaN(position) &&
                position >= CONFIG.SEMRUSH.POSITION_RANGE.MIN &&
                position <= CONFIG.SEMRUSH.POSITION_RANGE.MAX &&
                row.Keyword &&
                row.Date
            );
        })
        .map(row => {
            // Transform each row into the required format
            const position = parseInt(row.Position);
            const volume = parseInt(row['Search Volume']) || 0;
            const date = formatDate(row.Date);

            return {
                keyword: row.Keyword.trim(),
                position,
                searchVolume: volume,
                date,
                timestamp: new Date(date).getTime()
            };
        })
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by date ascending
}

/**
 * Formats a date string into YYYY-MM-DD format
 * @param {string} dateStr - The date string from SEMrush
 * @returns {string} Formatted date string
 */
function formatDate(dateStr) {
    // Handle SEMrush date format (YYYYMMDD)
    if (dateStr.length === 8) {
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    
    // Try to parse other date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}`);
    }
    
    return date.toISOString().split('T')[0];
}

/**
 * Groups data by keyword
 * @param {Object[]} data - Transformed data array
 * @returns {Map<string, Object[]>} Data grouped by keyword
 */
export function groupByKeyword(data) {
    return data.reduce((groups, item) => {
        const keyword = item.keyword;
        if (!groups.has(keyword)) {
            groups.set(keyword, []);
        }
        groups.get(keyword).push(item);
        return groups;
    }, new Map());
}

/**
 * Validates a single data point
 * @param {Object} dataPoint - Single data point to validate
 * @returns {boolean} True if valid
 */
export function validateDataPoint(dataPoint) {
    return (
        typeof dataPoint.keyword === 'string' &&
        typeof dataPoint.position === 'number' &&
        !isNaN(dataPoint.position) &&
        typeof dataPoint.date === 'string' &&
        !isNaN(new Date(dataPoint.date).getTime())
    );
}
