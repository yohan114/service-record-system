// ============================================================
//  Edward & Christie - Fleet Service Record System  (API server)
//  SQLite backend (better-sqlite3). All queries are parameterised.
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, getSettings, getRates, computeTotals } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Wrap a synchronous handler with uniform error handling
const h = fn => (req, res) => {
    try { fn(req, res); }
    catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

// ------------------------------------------------------------
//  Catalog (cached in memory — large but static reference data)
// ------------------------------------------------------------
let catalogCache = null;
function buildCatalog() {
    catalogCache = {
        vehicles: db.prepare('SELECT * FROM Vehicles ORDER BY SequenceNo').all(),
        filters:  db.prepare('SELECT * FROM Filters').all(),
        links:    db.prepare('SELECT VehicleFilterID, FilterID, VehicleReference, MatchedECNumber, MatchedVehicleID FROM VehicleFilters').all(),
        prices:   db.prepare('SELECT * FROM FilterPrices').all(),
        genuine:  db.prepare('SELECT * FROM GenuinePrices').all(),
        motorcycles: db.prepare('SELECT * FROM Motorcycles').all()
    };
    return catalogCache;
}

app.get('/api/catalog', h((req, res) => res.json(catalogCache || buildCatalog())));
app.post('/api/catalog/refresh', h((req, res) => { buildCatalog(); res.json({ success: true }); }));

// ------------------------------------------------------------
//  Settings / rates
// ------------------------------------------------------------
app.get('/api/settings', h((req, res) => {
    res.json({ settings: getSettings(), rates: getRates() });
}));

app.put('/api/settings', h((req, res) => {
    const upsert = db.prepare('INSERT INTO Settings (Key, Value) VALUES (?, ?) ON CONFLICT(Key) DO UPDATE SET Value=excluded.Value');
    const tx = db.transaction(obj => { for (const [k, v] of Object.entries(obj)) upsert.run(k, String(v)); });
    tx(req.body || {});
    res.json({ success: true, settings: getSettings(), rates: getRates() });
}));

// ------------------------------------------------------------
//  Editable price lists  (Oils / Filter categories / Filter price book)
// ------------------------------------------------------------
function crudList(route, table, idCol, fields, opts = {}) {
    const hasActive = fields.includes('Active');
    const orderBy = fields.includes('SortOrder') ? `SortOrder, ${idCol}` : idCol;
    // GET all, POST add, PUT update, DELETE remove
    app.get(`/api/${route}`, h((req, res) => {
        const where = (hasActive && req.query.all !== '1') ? 'WHERE Active = 1' : '';
        let sql = `SELECT * FROM ${table} ${where} ORDER BY ${orderBy}`;
        if (opts.searchCols && req.query.q) {
            const like = opts.searchCols.map(c => `${c} LIKE @q`).join(' OR ');
            sql = `SELECT * FROM ${table} WHERE (${like}) ${hasActive && req.query.all !== '1' ? 'AND Active = 1' : ''} ORDER BY ${orderBy}`;
            return res.json(db.prepare(sql).all({ q: `%${req.query.q}%` }));
        }
        res.json(db.prepare(sql).all());
    }));
    app.post(`/api/${route}`, h((req, res) => {
        const cols = fields.join(', ');
        const ph = fields.map(f => '@' + f).join(', ');
        const info = db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${ph})`).run(pick(req.body, fields));
        res.json({ success: true, id: info.lastInsertRowid });
    }));
    app.put(`/api/${route}/:id`, h((req, res) => {
        const sets = fields.map(f => `${f}=@${f}`).join(', ');
        db.prepare(`UPDATE ${table} SET ${sets} WHERE ${idCol}=@__id`).run({ ...pick(req.body, fields), __id: req.params.id });
        res.json({ success: true });
    }));
    app.delete(`/api/${route}/:id`, h((req, res) => {
        db.prepare(`DELETE FROM ${table} WHERE ${idCol}=?`).run(req.params.id);
        res.json({ success: true });
    }));
}
function pick(body, fields) {
    const o = {};
    for (const f of fields) {
        let v = body ? body[f] : undefined;
        if (v === undefined || v === null) v = (f === 'Active' ? 1 : (f === 'SortOrder' || f.includes('Price') || f.includes('Qty')) ? 0 : '');
        o[f] = v;
    }
    return o;
}

crudList('oils', 'OilList', 'OilID', ['Name', 'UnitPrice', 'Unit', 'SortOrder', 'Active']);
crudList('filter-categories', 'FilterCategoryList', 'CategoryID', ['Name', 'UnitPrice', 'SortOrder', 'Active']);
crudList('filter-prices', 'FilterPrices', 'PriceID',
    ['SupplierFilterCode', 'Description', 'QuotedQty', 'UnitPriceLKR', 'TotalPriceLKR'],
    { searchCols: ['SupplierFilterCode', 'Description'] });

// ------------------------------------------------------------
//  Service records
// ------------------------------------------------------------
const jobSelect = `
    SELECT j.*,
           v.ECNumber, v.Brand, v.VehicleType, v.ModelNo, v.RegistrationNo, v.SequenceNo,
           COALESCE(NULLIF(v.ECNumber,''), j.VehicleLabel, 'Vehicle #' || j.VehicleID) AS DisplayName
    FROM ServiceJobs j LEFT JOIN Vehicles v ON v.VehicleID = j.VehicleID`;

function attachDetails(jobs) {
    if (!jobs.length) return jobs;
    const ids = jobs.map(j => j.ServiceID);
    const ph = ids.map(() => '?').join(',');
    const oils = db.prepare(`SELECT * FROM ServiceOils WHERE ServiceID IN (${ph})`).all(...ids);
    const filters = db.prepare(`SELECT * FROM ServiceFilters WHERE ServiceID IN (${ph})`).all(...ids);
    const costs = db.prepare(`SELECT * FROM ServiceCosts WHERE ServiceID IN (${ph})`).all(...ids);
    return jobs.map(j => ({
        ...j,
        oils: oils.filter(o => o.ServiceID === j.ServiceID),
        filters: filters.filter(f => f.ServiceID === j.ServiceID),
        costs: costs.filter(c => c.ServiceID === j.ServiceID)
    }));
}

// Global searchable list (the "anyone can check a record" view)
app.get('/api/services', h((req, res) => {
    const { from, to, vehicleId, site, q } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const cond = [], args = {};
    if (from)      { cond.push('j.ServiceDate >= @from'); args.from = from; }
    if (to)        { cond.push('j.ServiceDate <= @to'); args.to = to; }
    if (vehicleId) { cond.push('j.VehicleID = @vehicleId'); args.vehicleId = vehicleId; }
    if (site)      { cond.push('j.SiteLocation LIKE @site'); args.site = `%${site}%`; }
    if (q)         { cond.push('(j.JobNo LIKE @q OR v.ECNumber LIKE @q OR v.RegistrationNo LIKE @q OR j.VehicleLabel LIKE @q OR v.Brand LIKE @q OR v.ModelNo LIKE @q)'); args.q = `%${q}%`; }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const rows = db.prepare(`${jobSelect} ${where} ORDER BY j.ServiceDate DESC, j.ServiceID DESC LIMIT @limit OFFSET @offset`)
        .all({ ...args, limit, offset });
    const total = db.prepare(`SELECT COUNT(*) c FROM ServiceJobs j LEFT JOIN Vehicles v ON v.VehicleID=j.VehicleID ${where}`).get(args).c;
    res.json({ total, count: rows.length, offset, jobs: attachDetails(rows) });
}));

// Recent (dashboard)
app.get('/api/services/recent', h((req, res) => {
    const rows = db.prepare(`${jobSelect} ORDER BY j.ServiceDate DESC, j.ServiceID DESC LIMIT 50`).all();
    res.json(attachDetails(rows));
}));

// All services on a given day (Daily Log)
app.get('/api/services/by-date/:date', h((req, res) => {
    const rows = db.prepare(`${jobSelect} WHERE j.ServiceDate = ? ORDER BY j.ServiceID DESC`).all(req.params.date);
    res.json(attachDetails(rows));
}));

// Single full job
app.get('/api/services/:id', h((req, res) => {
    const job = db.prepare(`${jobSelect} WHERE j.ServiceID = ?`).get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Not found' });
    res.json(attachDetails([job])[0]);
}));

// Per-vehicle history
app.get('/api/vehicles/:id/history', h((req, res) => {
    const rows = db.prepare(`${jobSelect} WHERE j.VehicleID = ? ORDER BY j.ServiceDate DESC, j.ServiceID DESC`).all(req.params.id);
    res.json(attachDetails(rows));
}));

// ---- Create / update share the same line-item + totals logic ----
function lineItems(data) {
    const oils = (data.oils || []).filter(o => o.name && (o.quantity || o.price || o.action || o.type));
    const filters = (data.filters || []).filter(f => f.category && (f.no || f.price || f.action));
    const costs = (data.costs || []).filter(c => c.desc || c.amount);
    const num = x => Number(x) || 0;
    const partsSubtotal =
        oils.reduce((s, o) => s + num(o.price), 0) +
        filters.reduce((s, f) => s + num(f.price), 0) +
        costs.reduce((s, c) => s + num(c.amount), 0);
    return { oils, filters, costs, totals: computeTotals(partsSubtotal) };
}

function writeChildren(serviceId, oils, filters, costs) {
    const num = x => Number(x) || 0;
    const io = db.prepare('INSERT INTO ServiceOils (ServiceID, OilName, OilType, ActionType, Quantity, Price) VALUES (?,?,?,?,?,?)');
    const iff = db.prepare('INSERT INTO ServiceFilters (ServiceID, FilterCategory, FilterNo, ActionType, Price) VALUES (?,?,?,?,?)');
    const ic = db.prepare('INSERT INTO ServiceCosts (ServiceID, CostDescription, Unit, Rate, Qty, Amount) VALUES (?,?,?,?,?,?)');
    for (const o of oils) io.run(serviceId, o.name || '', o.type || '', o.action || '', num(o.quantity), num(o.price));
    for (const f of filters) iff.run(serviceId, f.category || '', f.no || '', f.action || '', num(f.price));
    for (const c of costs) ic.run(serviceId, c.desc || '', c.unit || '', num(c.rate), num(c.qty), num(c.amount));
}

app.post('/api/services', h((req, res) => {
    const d = req.body;
    if (!d.date) return res.status(400).json({ error: 'Service date is required' });
    const { oils, filters, costs, totals } = lineItems(d);
    const result = db.transaction(() => {
        const info = db.prepare(`INSERT INTO ServiceJobs
            (VehicleID, VehicleLabel, ServiceDate, JobNo, MeterReading, NextServiceMeter, ServiceType,
             SiteLocation, UpkeepingStatus, RepairDetails, PartsSubtotal, LabourRate, LabourCharge,
             SundryRate, SundryAmount, GrandTotal)
            VALUES (@vehicleId,@label,@date,@jobNo,@meter,@nextMeter,@serviceType,@site,@upkeep,@repair,
                    @parts,@lrate,@labour,@srate,@sundry,@grand)`).run({
            vehicleId: d.vehicleId || null, label: d.vehicleLabel || '', date: d.date, jobNo: d.jobNo || '',
            meter: d.meter || '', nextMeter: d.nextMeter || '', serviceType: d.serviceType || '',
            site: d.site || '', upkeep: d.upkeep || '', repair: d.repairDetails || '',
            parts: totals.partsSubtotal, lrate: totals.labourRate, labour: totals.labourCharge,
            srate: totals.sundryRate, sundry: totals.sundryAmount, grand: totals.grandTotal
        });
        const id = info.lastInsertRowid;
        writeChildren(id, oils, filters, costs);
        return id;
    })();
    res.json({ success: true, serviceId: result, totals });
}));

app.put('/api/services/:id', h((req, res) => {
    const id = req.params.id;
    if (!db.prepare('SELECT 1 FROM ServiceJobs WHERE ServiceID=?').get(id)) return res.status(404).json({ error: 'Not found' });
    const d = req.body;
    const { oils, filters, costs, totals } = lineItems(d);
    db.transaction(() => {
        db.prepare(`UPDATE ServiceJobs SET VehicleID=@vehicleId, VehicleLabel=@label, ServiceDate=@date, JobNo=@jobNo,
            MeterReading=@meter, NextServiceMeter=@nextMeter, ServiceType=@serviceType, SiteLocation=@site,
            UpkeepingStatus=@upkeep, RepairDetails=@repair, PartsSubtotal=@parts, LabourRate=@lrate,
            LabourCharge=@labour, SundryRate=@srate, SundryAmount=@sundry, GrandTotal=@grand,
            UpdatedAt=datetime('now') WHERE ServiceID=@id`).run({
            id, vehicleId: d.vehicleId || null, label: d.vehicleLabel || '', date: d.date, jobNo: d.jobNo || '',
            meter: d.meter || '', nextMeter: d.nextMeter || '', serviceType: d.serviceType || '',
            site: d.site || '', upkeep: d.upkeep || '', repair: d.repairDetails || '',
            parts: totals.partsSubtotal, lrate: totals.labourRate, labour: totals.labourCharge,
            srate: totals.sundryRate, sundry: totals.sundryAmount, grand: totals.grandTotal
        });
        db.prepare('DELETE FROM ServiceOils WHERE ServiceID=?').run(id);
        db.prepare('DELETE FROM ServiceFilters WHERE ServiceID=?').run(id);
        db.prepare('DELETE FROM ServiceCosts WHERE ServiceID=?').run(id);
        writeChildren(id, oils, filters, costs);
    })();
    res.json({ success: true, totals });
}));

app.delete('/api/services/:id', h((req, res) => {
    db.prepare('DELETE FROM ServiceJobs WHERE ServiceID=?').run(req.params.id);
    res.json({ success: true });
}));

// ------------------------------------------------------------
//  Dashboard stats
// ------------------------------------------------------------
app.get('/api/stats', h((req, res) => {
    const vehicles = db.prepare('SELECT COUNT(*) c FROM Vehicles').get().c;
    const filters = db.prepare('SELECT COUNT(*) c FROM Filters').get().c;
    const services = db.prepare('SELECT COUNT(*) c FROM ServiceJobs').get().c;
    const thisMonth = db.prepare("SELECT COUNT(*) c FROM ServiceJobs WHERE strftime('%Y-%m', ServiceDate) = strftime('%Y-%m','now')").get().c;
    // monthly counts grouped by year (mirrors the old "Service summery" sheet)
    const monthly = db.prepare(`
        SELECT strftime('%Y', ServiceDate) yr, strftime('%m', ServiceDate) mo, COUNT(*) c
        FROM ServiceJobs WHERE ServiceDate IS NOT NULL AND ServiceDate <> ''
        GROUP BY yr, mo ORDER BY yr, mo`).all();
    res.json({ vehicles, filters, services, thisMonth, monthly });
}));

// SPA fallback for client-side hash routing
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

buildCatalog();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Service Record System running on http://localhost:${PORT}`));
