// Adapter for SEMrush position tracking exports in wide format
// This transforms the complex SEMrush export into the format expected by the analyzer

export function transformSEMrushData(rawData) {
  console.log('Starting data transformation');
  console.log('Raw data sample:', rawData[0]);
  
  const transformedData = [];
  
  // Process each row (each row represents a keyword)
  rawData.forEach((row, index) => {
    try {
      const keyword = row.Keyword;
      if (!keyword) {
        console.warn(`Row ${index} missing keyword:`, row);
        return;
      }
      
      const searchVolume = parseFloat(row['Search Volume']) || 0;
      
      // Extract all date columns - they follow the pattern: *.indsci.com/*_YYYYMMDD
      const dateColumns = Object.keys(row).filter(key => {
        // Match columns that:
        // 1. Don't have _type or _landing
        // 2. End with a date pattern _YYYYMMDD
        // 3. Have the domain pattern
        return key.includes('.indsci.com/') && 
               key.match(/\d{8}$/) &&
               !key.includes('_type') && 
               !key.includes('_landing');
      });
      
      console.log(`Found ${dateColumns.length} date columns for keyword: ${keyword}`);
      
      if (dateColumns.length === 0) {
        console.warn('No valid date columns found for row:', row);
        return;
      }
      
      // Sort date columns chronologically
      dateColumns.sort((a, b) => {
        const dateA = a.match(/\d{8}$/)[0]; // Extract YYYYMMDD from end
        const dateB = b.match(/\d{8}$/)[0];
        return dateA.localeCompare(dateB);
      });
      
      // Create an entry for each date that has ranking data
      dateColumns.forEach(dateCol => {
        const position = parseInt(row[dateCol]);
        
        // Skip if position is not a valid number (e.g., "-" or empty)
        if (isNaN(position)) {
          console.log(`Skipping invalid position for ${keyword} on ${dateCol}:`, row[dateCol]);
          return;
        }
        
        // Extract date from column name (_YYYYMMDD format)
        const dateMatch = dateCol.match(/(\d{4})(\d{2})(\d{2})$/);
        if (!dateMatch) {
          console.warn(`Invalid date format in column: ${dateCol}`);
          return;
        }
        
        const [_, year, month, day] = dateMatch;
        const date = `${year}-${month}-${day}`;
        
        transformedData.push({
          keyword,
          date,
          position,
          searchVolume
        });
      });
    } catch (error) {
      console.error(`Error processing row ${index}:`, error);
      console.error('Problematic row:', row);
    }
  });
  
  console.log(`Transformed ${transformedData.length} data points`);
  console.log('Sample of transformed data:', transformedData.slice(0, 2));
  
  return transformedData;
}
