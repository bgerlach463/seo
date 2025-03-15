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
      const dateColumns = Object.keys(row).filter(key => 
        key.includes('_202') && !key.includes('_type') && !key.includes('_landing')
      );
      
      console.log(`Found ${dateColumns.length} date columns for keyword: ${keyword}`);
      
      if (dateColumns.length === 0) {
        console.warn('No valid date columns found for row:', row);
        return;
      }
      
      // Sort date columns chronologically
      dateColumns.sort((a, b) => {
        const dateA = a.split('_').pop();
        const dateB = b.split('_').pop();
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
        const datePart = dateCol.split('_').pop();
        const year = datePart.substring(0, 4);
        const month = datePart.substring(4, 6);
        const day = datePart.substring(6, 8);
        const dateString = `${year}-${month}-${day}`;
        
        // Get URL from the corresponding landing column if it exists
        const landingCol = `${dateCol.substring(0, dateCol.lastIndexOf('_'))}_${datePart}_landing`;
        const url = row[landingCol] || '';
        
        // Add entry to transformed data
        transformedData.push({
          Keyword: keyword,
          Date: dateString,
          Position: position,
          URL: url,
          Volume: searchVolume
        });
      });
    } catch (error) {
      console.error(`Error processing row ${index}:`, error);
      console.error('Problematic row:', row);
    }
  });
  
  console.log(`Transformed ${transformedData.length} data points`);
  console.log('Sample transformed data:', transformedData[0]);
  
  return transformedData;
}
