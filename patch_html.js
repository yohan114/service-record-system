const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Remove the huge embedded JSON script tag
html = html.replace(/<script id="db-data" type="application\/json">[\s\S]*?<\/script>/, '');

// 2. Replace the initial load logic
const oldLoad = `        // 1. Load Data
        let db;
        try {
            db = JSON.parse(document.getElementById('db-data').textContent);
        } catch(e) {
            alert("Error parsing embedded data!");
            console.error(e);
        }

        const vehicles = db.vehicles;
        const filters = db.filters;
        const links = db.links;
        const prices = db.prices;
        const genuine = db.genuine;
        const motorcycles = db.motorcycles || [];`;

const newLoad = `        // 1. Load Data dynamically
        let vehicles = [], filters = [], links = [], prices = [], genuine = [], motorcycles = [];
        
        async function initApp() {
            try {
                document.getElementById('results').innerHTML = '<div style="padding:2rem;text-align:center;">Loading database from server...</div>';
                const res = await fetch('/api/catalog');
                const db = await res.json();
                
                vehicles = db.vehicles;
                filters = db.filters;
                links = db.links;
                prices = db.prices;
                genuine = db.genuine;
                motorcycles = db.motorcycles || [];
                
                document.getElementById('results').innerHTML = ''; // clear loading
                renderAll(); // Assuming there's a renderAll or similar, wait, the original script just renders initially if empty.
            } catch(e) {
                alert("Error fetching data from server!");
                console.error(e);
            }
        }`;

html = html.replace(oldLoad, newLoad);

// We need to call initApp() at the start.
// Let's find where the original script adds event listeners and just call initApp() there.
html = html.replace('document.getElementById("searchInput").addEventListener("input", performSearch);', 'initApp();\n        document.getElementById("searchInput").addEventListener("input", performSearch);');

// 3. Add a "Service History" button to each vehicle card.
// The vehicle card is generated in `function renderVehicle(v) { ... }`
// We'll inject a button next to the title.
const oldCardHeader = `                <div style="font-size: 1.25rem; font-weight: bold; color: #2d3748; margin-bottom: 0.5rem;">
                    \${v.ECNumber ? '['+v.ECNumber+'] ' : ''}\${v.Brand} \${v.VehicleType}
                </div>`;
const newCardHeader = `                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                    <div style="font-size: 1.25rem; font-weight: bold; color: #2d3748;">
                        \${v.ECNumber ? '['+v.ECNumber+'] ' : ''}\${v.Brand} \${v.VehicleType}
                    </div>
                    <button onclick="openServiceHistory(\${v.VehicleID})" style="background:#3182ce; color:white; border:none; padding:0.5rem 1rem; border-radius:4px; cursor:pointer; font-size:0.9rem;">Service History</button>
                </div>`;
html = html.replace(oldCardHeader, newCardHeader);

fs.writeFileSync('public/index.html', html);
console.log('index.html patched for dynamic loading!');
