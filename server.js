const express = require('express');
const cors = require('cors');
const ADODB = require('node-adodb');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set up connection to Access Database (use x64 cscript)
const dbPath = path.join(__dirname, 'VehicleFilterDB.accdb');
const connection = ADODB.open(`Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${dbPath};`, true);

// In-memory cache for catalog to speed up initial load
let catalogCache = null;

async function fetchCatalog() {
    try {
        const vehicles = await connection.query('SELECT * FROM Vehicles');
        const filters = await connection.query('SELECT * FROM Filters');
        const links = await connection.query('SELECT * FROM VehicleFilters');
        const prices = await connection.query('SELECT * FROM FilterPrices');
        const genuine = await connection.query('SELECT * FROM GenuinePrices');
        
        catalogCache = { vehicles, filters, links, prices, genuine };
        console.log('Catalog cached successfully.');
    } catch (err) {
        console.error('Error fetching catalog:', err);
    }
}

// Fetch catalog initially
fetchCatalog();

app.get('/api/catalog', async (req, res) => {
    if (catalogCache) {
        res.json(catalogCache);
    } else {
        await fetchCatalog();
        res.json(catalogCache || { error: 'Failed to load data' });
    }
});

// Force refresh catalog
app.post('/api/catalog/refresh', async (req, res) => {
    await fetchCatalog();
    res.json({ success: true });
});

app.get('/api/vehicles/:id/history', async (req, res) => {
    const vId = req.params.id;
    try {
        const jobs = await connection.query(`SELECT * FROM ServiceJobs WHERE VehicleID = ${vId} ORDER BY ServiceDate DESC`);
        
        if (jobs.length === 0) {
            return res.json([]);
        }

        // Fetch details for all these jobs
        const jobIds = jobs.map(j => j.ServiceID).join(',');
        
        const oils = await connection.query(`SELECT * FROM ServiceOils WHERE ServiceID IN (${jobIds})`);
        const filters = await connection.query(`SELECT * FROM ServiceFilters WHERE ServiceID IN (${jobIds})`);
        const costs = await connection.query(`SELECT * FROM ServiceCosts WHERE ServiceID IN (${jobIds})`);

        // Attach them to the respective jobs
        const history = jobs.map(job => {
            return {
                ...job,
                oils: oils.filter(o => o.ServiceID === job.ServiceID),
                filters: filters.filter(f => f.ServiceID === job.ServiceID),
                costs: costs.filter(c => c.ServiceID === job.ServiceID)
            };
        });

        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/services/recent', async (req, res) => {
    try {
        const jobs = await connection.query(`SELECT TOP 50 * FROM ServiceJobs ORDER BY ServiceDate DESC`);
        
        if (jobs.length === 0) {
            return res.json([]);
        }

        const jobIds = jobs.map(j => j.ServiceID).join(',');
        const oils = await connection.query(`SELECT * FROM ServiceOils WHERE ServiceID IN (${jobIds})`);
        const filters = await connection.query(`SELECT * FROM ServiceFilters WHERE ServiceID IN (${jobIds})`);
        const costs = await connection.query(`SELECT * FROM ServiceCosts WHERE ServiceID IN (${jobIds})`);

        const history = jobs.map(job => {
            return {
                ...job,
                oils: oils.filter(o => o.ServiceID === job.ServiceID),
                filters: filters.filter(f => f.ServiceID === job.ServiceID),
                costs: costs.filter(c => c.ServiceID === job.ServiceID)
            };
        });

        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/services', async (req, res) => {
    const data = req.body;
    
    // We will build a batch of SQL commands
    // node-adodb doesn't have a built-in transaction wrapper that easily handles returning the ID,
    // so we will insert the job, get the ID, then insert the sub-items.
    
    try {
        const { vehicleId, date, jobNo, meter, nextMeter, serviceType, site, upkeep, repairDetails, oils, filters, costs } = data;
        
        // Escape strings
        const esc = str => str ? str.replace(/'/g, "''") : '';
        
        const insertJobSql = `INSERT INTO ServiceJobs (VehicleID, ServiceDate, JobNo, MeterReading, NextServiceMeter, ServiceType, SiteLocation, UpkeepingStatus, RepairDetails) VALUES (${vehicleId}, '${esc(date)}', '${esc(jobNo)}', '${esc(meter)}', '${esc(nextMeter)}', '${esc(serviceType)}', '${esc(site)}', '${esc(upkeep)}', '${esc(repairDetails)}')`;
        
        await connection.execute(insertJobSql);
        
        // Get the latest inserted ID for this vehicle (a bit of a hack, but Access ADODB doesn't support SELECT @@IDENTITY easily in node-adodb without a macro)
        // Since it's a local single-user app, this is safe.
        const latestJob = await connection.query(`SELECT TOP 1 ServiceID FROM ServiceJobs WHERE VehicleID = ${vehicleId} ORDER BY ServiceID DESC`);
        const serviceId = latestJob[0].ServiceID;

        // Prepare bulk inserts
        let subQueries = [];
        
        if (oils && oils.length > 0) {
            for (let o of oils) {
                if (o.quantity || o.action) {
                    subQueries.push(`INSERT INTO ServiceOils (ServiceID, OilName, OilType, ActionType, Quantity, Price) VALUES (${serviceId}, '${esc(o.name)}', '${esc(o.type)}', '${esc(o.action)}', ${o.quantity || 0}, ${o.price || 0})`);
                }
            }
        }

        if (filters && filters.length > 0) {
            for (let f of filters) {
                if (f.action) {
                    subQueries.push(`INSERT INTO ServiceFilters (ServiceID, FilterCategory, FilterNo, ActionType, Price) VALUES (${serviceId}, '${esc(f.category)}', '${esc(f.no)}', '${esc(f.action)}', ${f.price || 0})`);
                }
            }
        }
        
        if (costs && costs.length > 0) {
            for (let c of costs) {
                if (c.amount || c.qty) {
                    subQueries.push(`INSERT INTO ServiceCosts (ServiceID, CostDescription, Unit, Rate, Qty, Amount) VALUES (${serviceId}, '${esc(c.desc)}', '${esc(c.unit)}', ${c.rate || 0}, ${c.qty || 0}, ${c.amount || 0})`);
                }
            }
        }

        // Execute sub queries
        for (let q of subQueries) {
            await connection.execute(q);
        }

        res.json({ success: true, serviceId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
