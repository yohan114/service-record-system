const fs = require('fs');
let f = fs.readFileSync('public/js/views/service_form.js', 'utf8');
f = f.replace(/\\\$\\{/g, '${');
fs.writeFileSync('public/js/views/service_form.js', f);
console.log('Fixed literals in service_form.js');
