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
fs.writeFileSync('temp2.js', script);

const { DB_VEHICLES } = require('./temp2.js');

const targetBrands = [
    'ASHOK LELAND', 'ASHOK LEYLAND', 
    'ISUZU', 
    'HINO', 
    'ELCHER', 
    'FOTON', 
    'DFAC', 
    'DFSK', 
    'JMC', 
    'DATSUN', 'DATZEN', 
    'FREIGHT ROVER', 
    'LITEACE'
];

const batch2 = [];
const seen = new Set();

for (const v of DB_VEHICLES) {
    if (targetBrands.includes(v.brand?.toUpperCase())) {
        const key = `${v.brand}|${v.model}`;
        if (!seen.has(key)) {
            seen.add(key);
            batch2.push({
                brand: v.brand,
                model: v.model,
                type: v.type,
                id: v.id
            });
        }
    }
}

console.log(JSON.stringify(batch2, null, 2));

fs.unlinkSync('temp2.js');
