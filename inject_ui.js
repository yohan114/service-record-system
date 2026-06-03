const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
const ui = fs.readFileSync('public/service_ui.html', 'utf8');

if(!html.includes('serviceHistoryModal')) {
    html = html.replace('</body>', ui + '\n    <script src="service_ui.js"></script>\n    <script>setTimeout(initServiceForm, 500);</script>\n</body>');
    fs.writeFileSync('public/index.html', html);
    console.log('Injected UI into index.html');
} else {
    console.log('UI already injected');
}
