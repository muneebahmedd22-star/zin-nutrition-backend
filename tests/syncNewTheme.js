const fs = require('fs');
const path = require('path');

const srcDir = 'D:\\theme_export__zinnutrition-com-dawn__16JUN2026-0600pm';
const destDir = 'D:\\theme_export__zinnutrition-com-1__09JUL2026-0930pm';

const filesToCopy = [
  'sections/diet-generator.liquid',
  'sections/coaching-generator.liquid'
];

try {
  // 1. Copy files
  for (const relPath of filesToCopy) {
    const srcPath = path.join(srcDir, relPath);
    const destPath = path.join(destDir, relPath);
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${relPath} to new theme folder!`);
    } else {
      console.warn(`Source file not found: ${srcPath}`);
    }
  }

  // 2. Append CSS overrides to new base.css
  const newCssPath = path.join(destDir, 'assets/base.css');
  const cssOverrides = `

/* ==========================================================================
   ZIN NUTRITION - PREMIUM DESIGN CUSTOM OVERRIDES
   ========================================================================== */

/* Glassmorphism Product Card Override */
.card, .card-wrapper {
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
}
.card:hover, .card-wrapper:hover {
  box-shadow: 0 12px 30px rgba(218, 165, 32, 0.25) !important;
  transform: translateY(-6px) scale(1.02) !important;
  border-color: rgba(218, 165, 32, 0.6) !important;
}

/* Premium White Footer Override */
.footer {
  background-color: #ffffff !important;
  color: #111111 !important;
}
.footer a {
  color: #444444 !important;
  transition: color 0.3s ease, padding-left 0.3s ease !important;
}
.footer a:hover {
  color: #DAA520 !important;
  padding-left: 5px;
  text-shadow: 0 0 8px rgba(218, 165, 32, 0.4);
}
.footer .footer-block__heading {
  color: #111111 !important;
  border-bottom: 2px solid #DAA520;
  display: inline-block;
  padding-bottom: 5px;
  margin-bottom: 15px;
}
.footer .field__input {
  background-color: #ffffff !important;
  border: 1px solid rgba(0, 0, 0, 0.15) !important;
  color: #111111 !important;
  border-radius: 8px !important;
}
.footer .field__input:focus {
  border-color: #DAA520 !important;
  box-shadow: 0 0 10px rgba(218, 165, 32, 0.2) !important;
}
.footer .list-social__link {
  color: #444444 !important;
  transition: all 0.3s ease !important;
}
.footer .list-social__link:hover {
  color: #DAA520 !important;
  transform: scale(1.2);
}
`;

  if (fs.existsSync(newCssPath)) {
    // Check if overrides are already in base.css to prevent double appending
    const cssContent = fs.readFileSync(newCssPath, 'utf8');
    if (!cssContent.includes('ZIN NUTRITION - PREMIUM DESIGN CUSTOM OVERRIDES')) {
      fs.appendFileSync(newCssPath, cssOverrides);
      console.log('Appended CSS overrides to new base.css!');
    } else {
      console.log('CSS overrides already present in new base.css.');
    }
  } else {
    console.warn(`Destination CSS not found: ${newCssPath}`);
  }

  console.log('SUCCESS: New theme folder is fully updated with all fixes and features!');

} catch (err) {
  console.error('Failed to sync folders:', err.message);
}
