const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = path.join(__dirname, 'VehicleFilterDB.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
    }
});

// Helper functions for SQLite using Promises
function dbQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

// Helper to attach oils, filters, and costs to service jobs
async function attachDetailsToJobs(jobs) {
    if (!jobs || jobs.length === 0) return [];
    const jobIds = jobs.map(j => j.ServiceID);
    
    // SQLite can handle up to 999 variables, so we chunk it if necessary.
    // For normal lists, simple mapping works.
    const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    const jobIdChunks = chunk(jobIds, 500);
    
    let oils = [];
    let filters = [];
    let costs = [];
    
    for (const idChunk of jobIdChunks) {
        const placeholders = idChunk.map(() => '?').join(',');
        const chunkOils = await dbQuery(`SELECT * FROM ServiceOils WHERE ServiceID IN (${placeholders})`, idChunk);
        const chunkFilters = await dbQuery(`SELECT * FROM ServiceFilters WHERE ServiceID IN (${placeholders})`, idChunk);
        const chunkCosts = await dbQuery(`SELECT * FROM ServiceCosts WHERE ServiceID IN (${placeholders})`, idChunk);
        
        oils = oils.concat(chunkOils);
        filters = filters.concat(chunkFilters);
        costs = costs.concat(chunkCosts);
    }
    
    return jobs.map(job => {
        return {
            ...job,
            oils: oils.filter(o => o.ServiceID === job.ServiceID),
            filters: filters.filter(f => f.ServiceID === job.ServiceID),
            costs: costs.filter(c => c.ServiceID === job.ServiceID)
        };
    });
}

// 1. Catalog Endpoint
app.get('/api/catalog', async (req, res) => {
    try {
        const vehicles = await dbQuery('SELECT * FROM Vehicles');
        const filters = await dbQuery('SELECT * FROM Filters');
        const links = await dbQuery('SELECT * FROM VehicleFilters');
        const prices = await dbQuery('SELECT * FROM FilterPrices');
        const genuine = await dbQuery('SELECT * FROM GenuinePrices');
        const oilsList = await dbQuery('SELECT * FROM OilsList ORDER BY OilName ASC');
        const filtersList = await dbQuery('SELECT * FROM FiltersList ORDER BY FilterCategory ASC, FilterNo ASC');
        const settingsRows = await dbQuery('SELECT * FROM Settings');
        
        const settings = {};
        settingsRows.forEach(r => {
            settings[r.SettingKey] = r.SettingValue;
        });

        res.json({ 
            vehicles, 
            filters, 
            links, 
            prices, 
            genuine, 
            oilsList, 
            filtersList,
            settings
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Settings Endpoints
app.get('/api/settings', async (req, res) => {
    try {
        const rows = await dbQuery('SELECT * FROM Settings');
        const settings = {};
        rows.forEach(r => {
            settings[r.SettingKey] = r.SettingValue;
        });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    const settings = req.body;
    try {
        await dbRun('BEGIN TRANSACTION');
        for (let key in settings) {
            await dbRun('INSERT OR REPLACE INTO Settings (SettingKey, SettingValue) VALUES (?, ?)', [key, String(settings[key])]);
        }
        await dbRun('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await dbRun('ROLLBACK').catch(() => {});
        res.status(500).json({ error: err.message });
    }
});

// 3. Oils Price List Endpoints
app.get('/api/oils', async (req, res) => {
    try {
        const rows = await dbQuery('SELECT * FROM OilsList ORDER BY OilName ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/oils', async (req, res) => {
    const oils = req.body; // array of { OilName, OilType, Price }
    try {
        await dbRun('BEGIN TRANSACTION');
        await dbRun('DELETE FROM OilsList');
        for (let o of oils) {
            await dbRun('INSERT INTO OilsList (OilName, OilType, Price) VALUES (?, ?, ?)', [
                o.OilName || '', 
                o.OilType || '', 
                parseFloat(o.Price) || 0.0
            ]);
        }
        await dbRun('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await dbRun('ROLLBACK').catch(() => {});
        res.status(500).json({ error: err.message });
    }
});

// 4. Filters Price List Endpoints
app.get('/api/filters', async (req, res) => {
    try {
        const rows = await dbQuery('SELECT * FROM FiltersList ORDER BY FilterCategory ASC, FilterNo ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/filters', async (req, res) => {
    const { FilterID, FilterCategory, FilterNo, Price } = req.body;
    try {
        if (FilterID) {
            await dbRun(
                'UPDATE FiltersList SET FilterCategory = ?, FilterNo = ?, Price = ? WHERE FilterID = ?',
                [FilterCategory, FilterNo, parseFloat(Price) || 0.0, FilterID]
            );
        } else {
            await dbRun(
                'INSERT INTO FiltersList (FilterCategory, FilterNo, Price) VALUES (?, ?, ?)',
                [FilterCategory, FilterNo, parseFloat(Price) || 0.0]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/filters/:id', async (req, res) => {
    const filterId = req.params.id;
    try {
        await dbRun('DELETE FROM FiltersList WHERE FilterID = ?', [filterId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Service History by Vehicle Endpoint
app.get('/api/vehicles/:id/history', async (req, res) => {
    const vehicleId = req.params.id;
    try {
        const jobs = await dbQuery('SELECT * FROM ServiceJobs WHERE VehicleID = ? ORDER BY ServiceDate DESC', [vehicleId]);
        const detailedJobs = await attachDetailsToJobs(jobs);
        res.json(detailedJobs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Recent Services Endpoint (for dashboard)
app.get('/api/services/recent', async (req, res) => {
    try {
        const jobs = await dbQuery('SELECT * FROM ServiceJobs ORDER BY ServiceDate DESC LIMIT 50');
        const detailedJobs = await attachDetailsToJobs(jobs);
        res.json(detailedJobs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 7. Daily Service Log Endpoint
app.get('/api/services/daily', async (req, res) => {
    const date = req.query.date;
    try {
        const jobs = await dbQuery(`
            SELECT j.*, v.ECNumber, v.RegistrationNo, v.Brand, v.ModelNo 
            FROM ServiceJobs j
            LEFT JOIN Vehicles v ON j.VehicleID = v.VehicleID
            WHERE j.ServiceDate = ?
            ORDER BY j.ServiceID DESC
        `, [date]);
        const detailedJobs = await attachDetailsToJobs(jobs);
        res.json(detailedJobs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 8. Advanced Service Search Endpoint
app.get('/api/services/search', async (req, res) => {
    const { query, startDate, endDate } = req.query;
    try {
        let sql = `
            SELECT j.*, v.ECNumber, v.RegistrationNo, v.Brand, v.ModelNo 
            FROM ServiceJobs j
            LEFT JOIN Vehicles v ON j.VehicleID = v.VehicleID
            WHERE 1=1
        `;
        const params = [];
        
        if (query) {
            sql += ` AND (j.JobNo LIKE ? OR v.ECNumber LIKE ? OR v.RegistrationNo LIKE ? OR v.Brand LIKE ? OR v.ModelNo LIKE ?)`;
            const wildcard = `%${query}%`;
            params.push(wildcard, wildcard, wildcard, wildcard, wildcard);
        }
        
        if (startDate) {
            sql += ` AND j.ServiceDate >= ?`;
            params.push(startDate);
        }
        
        if (endDate) {
            sql += ` AND j.ServiceDate <= ?`;
            params.push(endDate);
        }
        
        sql += ` ORDER BY j.ServiceDate DESC, j.ServiceID DESC`;
        
        const jobs = await dbQuery(sql, params);
        const detailedJobs = await attachDetailsToJobs(jobs);
        res.json(detailedJobs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 9. Save Service Job Endpoint
app.post('/api/services', async (req, res) => {
    const data = req.body;
    try {
        const { 
            vehicleId, date, jobNo, meter, nextMeter, serviceType, site, upkeep, repairDetails, 
            oils, filters, costs, 
            partsSubtotal, labourRate, labourCharge, sundryRate, sundryCharge, grandTotal 
        } = data;
        
        await dbRun('BEGIN TRANSACTION');
        
        // Insert Job
        const insertJobSql = `
            INSERT INTO ServiceJobs (
                VehicleID, ServiceDate, JobNo, MeterReading, NextServiceMeter, ServiceType, SiteLocation, UpkeepingStatus, RepairDetails,
                PartsSubtotal, LabourRate, LabourCharge, SundryRate, SundryCharge, GrandTotal
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const jobResult = await dbRun(insertJobSql, [
            vehicleId, date, jobNo, meter, nextMeter, serviceType, site, upkeep, repairDetails,
            parseFloat(partsSubtotal) || 0.0,
            parseFloat(labourRate) || 0.0,
            parseFloat(labourCharge) || 0.0,
            parseFloat(sundryRate) || 0.0,
            parseFloat(sundryCharge) || 0.0,
            parseFloat(grandTotal) || 0.0
        ]);
        
        const serviceId = jobResult.lastID;

        // Insert Oils
        if (oils && oils.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO ServiceOils (ServiceID, OilName, OilType, ActionType, Quantity, Price) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (let o of oils) {
                if (o.quantity || o.action || o.type || o.price) {
                    stmt.run([serviceId, o.name, o.type, o.action, parseFloat(o.quantity) || 0.0, parseFloat(o.price) || 0.0]);
                }
            }
            stmt.finalize();
        }

        // Insert Filters
        if (filters && filters.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO ServiceFilters (ServiceID, FilterCategory, FilterNo, ActionType, Price) 
                VALUES (?, ?, ?, ?, ?)
            `);
            for (let f of filters) {
                if (f.no || f.action || f.price) {
                    stmt.run([serviceId, f.category, f.no, f.action, parseFloat(f.price) || 0.0]);
                }
            }
            stmt.finalize();
        }
        
        // Insert Costs
        if (costs && costs.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO ServiceCosts (ServiceID, CostDescription, Unit, Rate, Qty, Amount) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (let c of costs) {
                if (c.desc || c.amount) {
                    stmt.run([
                        serviceId, c.desc, c.unit, 
                        parseFloat(c.rate) || 0.0, parseFloat(c.qty) || 0.0, parseFloat(c.amount) || 0.0
                    ]);
                }
            }
            stmt.finalize();
        }

        await dbRun('COMMIT');
        res.json({ success: true, serviceId });
    } catch (err) {
        await dbRun('ROLLBACK').catch(() => {});
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 8.5. Service Summary (Monthly Counts) Endpoint
app.get('/api/services/summary', async (req, res) => {
    try {
        const rows = await dbQuery(`
            SELECT strftime('%Y-%m', ServiceDate) as MonthVal, COUNT(*) as Count 
            FROM ServiceJobs 
            WHERE ServiceDate IS NOT NULL AND ServiceDate != '1900-01-01'
            GROUP BY MonthVal 
            ORDER BY MonthVal DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
