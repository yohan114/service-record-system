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
fs.writeFileSync('temp.js', script);

const { DB_VEHICLES } = require('./temp.js');

const targetBrands = [
    'CAT', 'CATAPILLAR', 'CATERPILLER', 
    'KOBELCO', 'KOBELKO', 
    'HITACHI', 'HITHACHI', 
    'KOMATSU', 
    'VOLVO', 
    'HYUNDAI'
];

// Extract distinct models for these brands
const batch1 = [];
const seen = new Set();

for (const v of DB_VEHICLES) {
    if (targetBrands.includes(v.brand?.toUpperCase()) || (v.model && v.model.toUpperCase().includes('ROBEX'))) {
        const key = `${v.brand}|${v.model}`;
        if (!seen.has(key)) {
            seen.add(key);
            batch1.push({
                brand: v.brand,
                model: v.model,
                type: v.type,
                id: v.id
            });
        }
    }
}

console.log(JSON.stringify(batch1, null, 2));

fs.unlinkSync('temp.js');
