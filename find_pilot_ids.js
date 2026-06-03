const fs = require('fs');
let data = fs.readFileSync('vehicle_filter_data.js', 'utf8');

// replace 'const' with '' globally for these vars
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

const pilotIds = [];

const findPilot = (brand, model, desc) => {
    return DB_VEHICLES.find(v => 
        (!brand || v.brand === brand) && 
        (!model || v.model === model) && 
        (!desc || v.desc === desc)
    );
};

// 1. JCB 3DX
pilotIds.push({ name: 'JCB 3DX', id: findPilot('JCB', '3DX')?.id });
// 2. HYUNDAI R220LC-9S
pilotIds.push({ name: 'HYUNDAI R220LC-9S', id: findPilot('HYUNDAI', 'R220LC-9S')?.id });
// 3. BOB CAT S450 (or S-450)
pilotIds.push({ name: 'BOB CAT S450', id: findPilot('BOB CAT', 'S-450')?.id || findPilot('BOB CAT S450', undefined)?.id });
// 4. VOLVO EC210 (or EC210V)
pilotIds.push({ name: 'VOLVO EC210V', id: findPilot('VOLVO', 'EC210V')?.id });
// 5. KOMATSU PC120
pilotIds.push({ name: 'KOMATSU PC-120-6EO', id: findPilot('KOMATSU', 'PC-120-6EO')?.id });

console.log(JSON.stringify(pilotIds, null, 2));

fs.unlinkSync('temp.js');
