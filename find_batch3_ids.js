const fs = require('fs');

let data = fs.readFileSync('vehicle_filter_data.js', 'utf8');
data = data.replace(/const DB_VEHICLES =/g, 'var DB_VEHICLES =');
data = data.replace(/const DB_FILTERS =/g, 'var DB_FILTERS =');
data = data.replace(/const DB_VF_LINKS =/g, 'var DB_VF_LINKS =');
data = data.replace(/const DB_PRICES =/g, 'var DB_PRICES =');
data = data.replace(/const DB_GENUINE_PRICES =/g, 'var DB_GENUINE_PRICES =');
data = data.replace(/const DB_MOTORCYCLES =/g, 'var DB_MOTORCYCLES =');

const script = `
    ${data}
    module.exports = { DB_VEHICLES };
`;
fs.writeFileSync('temp3.js', script);

const { DB_VEHICLES } = require('./temp3.js');

const targetBrands = [
    'BOMAG', 'DYNAPAC', 'HAMM', 'CASE', 'SAKAI', 'VOGELE', 'WIRTGEN', 'AMMANN'
];

const batch3 = [];
const seen = new Set();

for (const v of DB_VEHICLES) {
    if (v.brand && targetBrands.includes(v.brand.toUpperCase())) {
        const key = `${v.brand}|${v.model}`;
        if (!seen.has(key)) {
            seen.add(key);
            batch3.push({
                brand: v.brand,
                model: v.model,
                type: v.type,
                id: v.id
            });
        }
    } else if (v.type && (v.type.toUpperCase().includes('ROLLER') || v.type.toUpperCase().includes('PAVER') || v.type.toUpperCase().includes('GRADER'))) {
        // Also include generic rollers/pavers if not covered in batch 1/2
        const key = `${v.brand}|${v.model}`;
        if (!seen.has(key)) {
            seen.add(key);
            batch3.push({
                brand: v.brand,
                model: v.model,
                type: v.type,
                id: v.id
            });
        }
    }
}

console.log(JSON.stringify(batch3, null, 2));

fs.unlinkSync('temp3.js');
