const fs = require('fs');
const path = require('path');

const inputFile = 'index.html';
const outputDir = 'portable';
const outputFile = path.join(outputDir, 'Advantech_LoRa_Payload_Formatter_Portable.html');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

console.log(`Reading ${inputFile}...`);
let html = fs.readFileSync(inputFile, 'utf8');

// 1. Inline CSS
// Look for <link rel="stylesheet" href="css/style.css">
// We'll use a regex to capture ANY local css file in css/
html = html.replace(/<link rel="stylesheet" href="(css\/.*?.css)">/g, (match, cssPath) => {
    try {
        console.log(`Inlining CSS: ${cssPath}`);
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        return `<style>\n${cssContent}\n</style>`;
    } catch (e) {
        console.warn(`Warning: Could not inline ${cssPath}: ${e.message}`);
        return match; // Keep original if failed
    }
});

// 2. Inline JS
// Look for <script src="js/parser.js"></script>
html = html.replace(/<script src="(js\/.*?.js)"><\/script>/g, (match, jsPath) => {
    try {
        console.log(`Inlining JS: ${jsPath}`);
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        return `<script>\n${jsContent}\n</script>`;
    } catch (e) {
        console.warn(`Warning: Could not inline ${jsPath}: ${e.message}`);
        return match;
    }
});

console.log(`Writing to ${outputFile}...`);
fs.writeFileSync(outputFile, html, 'utf8');
console.log('Done! Portable file created.');
