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
fs.writeFileSync('temp4.js', script);

const { DB_VEHICLES } = require('./temp4.js');

const types = new Set();
for (const v of DB_VEHICLES) {
    if (v.type) types.add(v.type);
}

console.log(Array.from(types).sort());
fs.unlinkSync('temp4.js');
