// ============================================================
//  Seeds the SQLite database from data already in the repo:
//    - vehicle_filter_data.js  -> Vehicles / Filters / links / filter prices / motorcycles
//    - Service record.xlsx      -> ServiceJobs history (read directly, "Summery" sheet)
//
//  Safe to re-run:
//    * Reference catalog is rebuilt every run.
//    * Editable price lists + service history are only seeded when empty,
//      so user edits and app-entered jobs are never clobbered.
// ============================================================

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { db, computeTotals } = require('./db');

// ---- Load the exported catalog (file uses top-level `const`, no exports) ----
function loadCatalogDump() {
    const code = fs.readFileSync(path.join(__dirname, 'vehicle_filter_data.js'), 'utf8').replace(/^﻿/, '');
    const factory = new Function(
        code + '\n; return { DB_VEHICLES, DB_FILTERS, DB_VF_LINKS, DB_PRICES, DB_GENUINE_PRICES, DB_MOTORCYCLES };'
    );
    return factory();
}

const D = loadCatalogDump();
const norm = s => (s || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

// ---- Read historical services straight from "Service record.xlsx" (Summery sheet) ----
function parseHistDate(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v).trim();
    const m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/);
    if (m) {
        let y = +m[3]; if (y < 100) y += 2000;
        const dt = new Date(Date.UTC(y, +m[2] - 1, +m[1]));
        return isNaN(dt) ? null : dt.toISOString().slice(0, 10);
    }
    const dt = new Date(s);
    return isNaN(dt) ? null : dt.toISOString().slice(0, 10);
}
function readExcelHistory(file) {
    const wb = XLSX.readFile(file);
    const ws = wb.Sheets['Summery'];
    if (!ws) return [];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    const COLS = ['date', 'jobNo', 'vehicleRaw', 'site', 'sm', 'nsm', 'oilQty', 'oilFilter',
                  'fuel1', 'fuel2', 'lineFilter', 'airInner', 'airOuter', 'gearTrans', 'hyFilter', 'remarks'];
    const out = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i]; if (!r) continue;
        const rec = {};
        COLS.forEach((k, j) => rec[k] = r[j] == null ? '' : String(r[j]).trim());
        if (!rec.vehicleRaw) continue;
        rec.isoDate = parseHistDate(r[0]);
        out.push(rec);
    }
    return out;
}

console.log('Seeding database…');

// ------------------------------------------------------------
//  1. Reference catalog (rebuilt each run)
// ------------------------------------------------------------
const seedCatalog = db.transaction(() => {
    db.exec('DELETE FROM Vehicles; DELETE FROM Filters; DELETE FROM VehicleFilters; DELETE FROM GenuinePrices; DELETE FROM Motorcycles;');

    const insVeh = db.prepare(`INSERT INTO Vehicles
        (VehicleID, SequenceNo, EquipmentDescription, ECNumber, Brand, VehicleType, ModelNo,
         RegistrationNo, Capacity, YearOfManufacture, SerialNo, ChassisNo, EngineNo, GPSUnit, Site)
        VALUES (@id,@seq,@desc,@ec,@brand,@type,@model,@reg,@cap,@year,@serial,@chassis,@engine,@gps,@site)`);
    for (const v of D.DB_VEHICLES) insVeh.run({
        id: v.id, seq: v.seq ?? null, desc: v.desc ?? '', ec: v.ec ?? '', brand: v.brand ?? '',
        type: v.type ?? '', model: v.model ?? '', reg: v.reg ?? '', cap: v.cap ?? '', year: v.year ?? '',
        serial: v.serial ?? '', chassis: v.chassis ?? '', engine: v.engine ?? '', gps: v.gps ?? '', site: v.site ?? ''
    });

    const insFil = db.prepare(`INSERT INTO Filters
        (FilterID, AnalysisRank, FilterCategory, OEMPartNumber, HIFIPartNumber, Description,
         TotalServiceCount, UniqueVehicleCount, TopVehicleMatch, MonthlyDemand, AnnualDemand,
         CompatibleFleetTypes, CrossReferences)
        VALUES (@id,@rank,@cat,@oem,@hifi,@desc,@svc,@veh,@top,@md,@ad,@fleet,@cross)`);
    for (const f of D.DB_FILTERS) insFil.run({
        id: f.id, rank: f.rank ?? 0, cat: f.cat ?? '', oem: f.oem ?? '', hifi: f.hifi ?? '', desc: f.desc ?? '',
        svc: f.svcCount ?? 0, veh: f.vehCount ?? 0, top: f.topMatch ?? '', md: f.monthlyD ?? 0, ad: f.annualD ?? 0,
        fleet: f.fleet ?? '', cross: f.crossRef ?? ''
    });

    const insLink = db.prepare(`INSERT INTO VehicleFilters (FilterID, VehicleReference, MatchedECNumber, MatchedVehicleID)
        VALUES (@fid,@ref,@ec,@vid)`);
    for (const l of D.DB_VF_LINKS) insLink.run({ fid: l.fid, ref: l.ref ?? '', ec: l.ec ?? '', vid: l.vid ?? null });

    const insGen = db.prepare(`INSERT INTO GenuinePrices
        (GenuinePriceID, HIFIEquivalent, GenuineBrand, RetailPriceExclVAT, VATAmount, SourcingPriceInclVAT)
        VALUES (@id,@hifi,@brand,@retail,@vat,@sourcing)`);
    for (const g of D.DB_GENUINE_PRICES) insGen.run({
        id: g.id, hifi: g.hifi ?? '', brand: g.brand ?? '', retail: g.retail ?? 0, vat: g.vat ?? 0, sourcing: g.sourcing ?? 0
    });

    const insMoto = db.prepare(`INSERT INTO Motorcycles
        (MotorcycleID, ECNumber, Brand, VehicleType, ModelNo, RegistrationNo, Capacity, SerialNo, Site, Remark)
        VALUES (@id,@ec,@brand,@type,@model,@reg,@cap,@serial,@site,@remark)`);
    for (const m of D.DB_MOTORCYCLES) insMoto.run({
        id: m.id, ec: m.ec ?? '', brand: m.brand ?? '', type: m.type ?? '', model: m.model ?? '',
        reg: m.reg ?? '', cap: m.cap ?? '', serial: m.serial ?? '', site: m.site ?? '', remark: m.remark ?? ''
    });
});
seedCatalog();
console.log(`  Vehicles: ${D.DB_VEHICLES.length}, Filters: ${D.DB_FILTERS.length}, Links: ${D.DB_VF_LINKS.length}, Genuine: ${D.DB_GENUINE_PRICES.length}, Motorcycles: ${D.DB_MOTORCYCLES.length}`);

// ------------------------------------------------------------
//  2. Filter price book (only when empty — it is user-editable)
// ------------------------------------------------------------
if (db.prepare('SELECT COUNT(*) c FROM FilterPrices').get().c === 0) {
    const ins = db.prepare(`INSERT INTO FilterPrices (SupplierFilterCode, Description, QuotedQty, UnitPriceLKR, TotalPriceLKR)
        VALUES (@code,@desc,@qty,@unit,@total)`);
    const tx = db.transaction(rows => {
        for (const p of rows) ins.run({
            code: p.code ?? '', desc: p.desc ?? '', qty: p.qty ?? 1,
            unit: p.unit ?? 0, total: p.total ?? (p.unit ?? 0)
        });
    });
    tx(D.DB_PRICES);
    console.log(`  FilterPrices: ${D.DB_PRICES.length} rows seeded`);
} else {
    console.log('  FilterPrices: already populated, left untouched');
}

// ------------------------------------------------------------
//  3a. Structured history from a Microsoft Access export (optional)
//      If seed_data/services_export.json exists it takes precedence over the
//      Excel import, so users migrating straight from Access avoid duplicates.
// ------------------------------------------------------------
const exportPath = path.join(__dirname, 'seed_data', 'services_export.json');
const jobsEmpty = db.prepare('SELECT COUNT(*) c FROM ServiceJobs').get().c === 0;

if (jobsEmpty && fs.existsSync(exportPath)) {
    const jobs = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    const insJob = db.prepare(`INSERT INTO ServiceJobs
        (VehicleID, VehicleLabel, ServiceDate, JobNo, MeterReading, NextServiceMeter, ServiceType, SiteLocation,
         UpkeepingStatus, RepairDetails, PartsSubtotal, LabourRate, LabourCharge, SundryRate, SundryAmount, GrandTotal)
        VALUES (@vid,@label,@date,@job,@meter,@next,@type,@site,@upkeep,@repair,@parts,@lrate,@labour,@srate,@sundry,@grand)`);
    const insO = db.prepare('INSERT INTO ServiceOils (ServiceID, OilName, OilType, ActionType, Quantity, Price) VALUES (?,?,?,?,?,?)');
    const insF = db.prepare('INSERT INTO ServiceFilters (ServiceID, FilterCategory, FilterNo, ActionType, Price) VALUES (?,?,?,?,?)');
    const insC = db.prepare('INSERT INTO ServiceCosts (ServiceID, CostDescription, Unit, Rate, Qty, Amount) VALUES (?,?,?,?,?,?)');
    const n = x => Number(x) || 0;
    const tx = db.transaction(rows => {
        for (const j of rows) {
            const oils = j.oils || [], filters = j.filters || [], costs = j.costs || [];
            const parts = oils.reduce((s, o) => s + n(o.Price), 0) + filters.reduce((s, f) => s + n(f.Price), 0) + costs.reduce((s, c) => s + n(c.Amount), 0);
            const t = computeTotals(parts);
            const info = insJob.run({
                vid: j.VehicleID || null, label: j.VehicleLabel || '', date: j.ServiceDate || null, job: j.JobNo || '',
                meter: j.MeterReading || '', next: j.NextServiceMeter || '', type: j.ServiceType || '', site: j.SiteLocation || '',
                upkeep: j.UpkeepingStatus || '', repair: j.RepairDetails || '',
                parts: t.partsSubtotal, lrate: t.labourRate, labour: t.labourCharge, srate: t.sundryRate, sundry: t.sundryAmount, grand: t.grandTotal
            });
            const sid = info.lastInsertRowid;
            for (const o of oils) insO.run(sid, o.OilName || '', o.OilType || '', o.ActionType || '', n(o.Quantity), n(o.Price));
            for (const f of filters) insF.run(sid, f.FilterCategory || '', f.FilterNo || '', f.ActionType || '', n(f.Price));
            for (const c of costs) insC.run(sid, c.CostDescription || '', c.Unit || '', n(c.Rate), n(c.Qty), n(c.Amount));
        }
    });
    tx(jobs);
    console.log(`  ServiceJobs: ${jobs.length} rows imported from Access export (services_export.json)`);
}

// ------------------------------------------------------------
//  3b. Service history read directly from "Service record.xlsx"
// ------------------------------------------------------------
const xlsxPath = path.join(__dirname, 'Service record.xlsx');
if (jobsEmpty && !fs.existsSync(exportPath) && fs.existsSync(xlsxPath)) {
    const history = readExcelHistory(xlsxPath);

    // Build EC / registration lookup maps (normalised)
    const ecMap = new Map(), regMap = new Map();
    for (const v of db.prepare('SELECT VehicleID, ECNumber, RegistrationNo FROM Vehicles').all()) {
        if (v.ECNumber) ecMap.set(norm(v.ECNumber), v.VehicleID);
        if (v.RegistrationNo) regMap.set(norm(v.RegistrationNo), v.VehicleID);
    }
    const matchVehicle = raw => {
        const tokens = new Set();
        tokens.add(norm(raw));
        for (const t of (raw || '').split(/[(),/\s]+/)) if (t && t.length >= 2) tokens.add(norm(t));
        for (const t of tokens) { if (regMap.has(t)) return regMap.get(t); }
        for (const t of tokens) { if (ecMap.has(t)) return ecMap.get(t); }
        return null;
    };

    const FILTER_MAP = [
        ['oilFilter', 'Engine Oil Filter'], ['fuel1', 'Primary Fuel Filter'], ['fuel2', 'Water Separator'],
        ['lineFilter', 'Line Filter'], ['airInner', 'Air Filter Inner'], ['airOuter', 'Air Filter Outer'],
        ['gearTrans', 'Trans: Filter'], ['hyFilter', 'Hydraulic Filter - S']
    ];

    const insJob = db.prepare(`INSERT INTO ServiceJobs
        (VehicleID, VehicleLabel, ServiceDate, JobNo, MeterReading, NextServiceMeter, SiteLocation, RepairDetails)
        VALUES (@vid,@label,@date,@job,@sm,@nsm,@site,@remarks)`);
    const insFilt = db.prepare(`INSERT INTO ServiceFilters (ServiceID, FilterCategory, FilterNo, ActionType)
        VALUES (?,?,?,'X')`);
    const insOil = db.prepare(`INSERT INTO ServiceOils (ServiceID, OilName, Quantity) VALUES (?, 'Engine Oil', ?)`);

    let matched = 0, unmatched = 0;
    const tx = db.transaction(rows => {
        for (const h of rows) {
            const vid = matchVehicle(h.vehicleRaw);
            if (vid) matched++; else unmatched++;
            const info = insJob.run({
                vid, label: h.vehicleRaw || '', date: h.isoDate || null, job: h.jobNo || '',
                sm: h.sm || '', nsm: h.nsm || '', site: h.site || '', remarks: h.remarks || ''
            });
            const sid = info.lastInsertRowid;
            for (const [key, cat] of FILTER_MAP) {
                if (h[key]) insFilt.run(sid, cat, h[key]);
            }
            const q = parseFloat((h.oilQty || '').toString().replace(/[^0-9.]/g, ''));
            if (q) insOil.run(sid, q);
        }
    });
    tx(history);
    console.log(`  ServiceJobs: ${history.length} history rows seeded from Excel (${matched} matched to a vehicle, ${unmatched} kept by label)`);
} else if (jobsEmpty) {
    console.log('  ServiceJobs: no history source found, left empty');
} else {
    console.log('  ServiceJobs: already populated, left untouched');
}

console.log('Done.');
