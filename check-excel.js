const xlsx = require('xlsx');

function checkFile() {
  const wb = xlsx.readFile('latest_payment.xlsx');
  
  if (!wb.SheetNames.includes('Detail Payment')) {
    console.log("Sheet 'Detail Payment' not found. Available sheets: ", wb.SheetNames);
    return;
  }
  
  const sheet = wb.Sheets['Detail Payment'];
  const json = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  
  console.log(`Total Rows: ${json.length}`);
  
  // Find the header row
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(20, json.length); i++) {
    const rowKeys = Object.keys(json[i]);
    const values = Object.values(json[i]).filter(Boolean);
    if (values.includes('Cust.Name') || values.includes('Payment Document')) {
      headerRowIdx = i;
      break;
    }
  }
  
  if (headerRowIdx === -1) {
    console.log("Could not find header row");
    return;
  }
  
  console.log(`\nHeader Row Index: ${headerRowIdx}`);
  const headerRow = json[headerRowIdx];
  const keys = Object.keys(headerRow);
  const headers = keys.map(k => headerRow[k]).filter(Boolean);
  
  console.log("\nHeaders found:");
  console.log(headers);
  
  // Look at "Month", "Year", "Invoice Date" or others
  console.log("\nSample Data (first 5 rows after header):");
  for (let i = headerRowIdx + 1; i < headerRowIdx + 6; i++) {
    console.log(`--- Row ${i} ---`);
    for (const key of keys) {
      const h = headerRow[key];
      if (h === 'Month' || h === 'Year' || h === 'Invoice Date' || h === 'Tgl Hari Ini' || h === 'Origin Inv') {
         console.log(`${h}: ${json[i][key]}`);
      }
    }
  }
  
  // Look for some older rows to see what happens
  console.log("\nSample Data (rows near end):");
  for (let i = json.length - 5; i < json.length; i++) {
    console.log(`--- Row ${i} ---`);
    for (const key of keys) {
      const h = headerRow[key];
      if (h === 'Month' || h === 'Year' || h === 'Invoice Date' || h === 'Tgl Hari Ini' || h === 'Origin Inv') {
         console.log(`${h}: ${json[i][key]}`);
      }
    }
  }
  
  // Count years based on Month/Year vs Invoice Date
  const yearCounts = {};
  const dateYearCounts = {};
  for (let i = headerRowIdx + 1; i < json.length; i++) {
    const row = json[i];
    
    // Find column keys
    let monthKey, yearKey, invDateKey;
    for (const k of keys) {
      if (headerRow[k] === 'Year') yearKey = k;
      if (headerRow[k] === 'Invoice Date') invDateKey = k;
    }
    
    if (yearKey && row[yearKey]) {
      yearCounts[row[yearKey]] = (yearCounts[row[yearKey]] || 0) + 1;
    }
    
    if (invDateKey && row[invDateKey]) {
      // excel dates or string dates
      const val = row[invDateKey];
      let y = "unknown";
      if (typeof val === 'number') {
         // excel date
         const date = new Date(Math.round((val - 25569) * 86400 * 1000));
         y = date.getFullYear();
      } else if (typeof val === 'string') {
         // try extracting 20xx
         const m = val.match(/20\d\d/);
         if (m) y = m[0];
      }
      dateYearCounts[y] = (dateYearCounts[y] || 0) + 1;
    }
  }
  
  console.log("\nCounts by 'Year' column:");
  console.log(yearCounts);
  
  console.log("\nCounts by 'Invoice Date' column:");
  console.log(dateYearCounts);
}

checkFile();