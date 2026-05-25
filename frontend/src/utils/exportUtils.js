import * as XLSX from 'xlsx';

/**
 * Export data to Excel (.xlsx)
 * @param {Array<Object>} data - Array of objects representing rows. Keys are column headers.
 * @param {string} filename - Name of the file without extension.
 */
export const exportToExcel = (data, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  
  // Auto-adjust column widths based on content
  const colWidths = [];
  data.forEach(row => {
    Object.keys(row).forEach((key, i) => {
      const value = row[key] ? row[key].toString() : '';
      const headerLen = key.length;
      const valLen = value.length;
      const maxLen = Math.max(headerLen, valLen);
      colWidths[i] = Math.max(colWidths[i] || 10, maxLen + 2);
    });
  });
  worksheet['!cols'] = colWidths.map(w => ({ wch: w }));

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Export multiple sheets to Excel (.xlsx)
 * @param {Object} sheets - Object where keys are sheet names and values are arrays of data objects.
 * @param {string} filename - Name of the file without extension.
 */
export const exportMultipleSheetsToExcel = (sheets, filename) => {
  const workbook = XLSX.utils.book_new();

  Object.keys(sheets).forEach(sheetName => {
    const data = sheets[sheetName];
    if (!data || data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Auto-adjust column widths
    const colWidths = [];
    data.forEach(row => {
      Object.keys(row).forEach((key, i) => {
        const value = row[key] ? row[key].toString() : '';
        const headerLen = key.length;
        const valLen = value.length;
        const maxLen = Math.max(headerLen, valLen);
        colWidths[i] = Math.max(colWidths[i] || 10, maxLen + 2);
      });
    });
    worksheet['!cols'] = colWidths.map(w => ({ wch: w }));
  });

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};


