const fs = require('fs');
const path = require('path');

const downloadsDir = 'C:\\Users\\Dell\\Downloads';
try {
  const files = fs.readdirSync(downloadsDir);
  const matched = files.filter(f => f.toLowerCase().includes('eat') || f.toLowerCase().includes('right') || f.toLowerCase().includes('type'));
  console.log('Matched files in Downloads:', matched);
} catch (err) {
  console.error('Error reading downloads folder:', err.message);
}
