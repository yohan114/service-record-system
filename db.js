// ============================================================
//  SQLite data layer for the Service Record System
//  Replaces the previous Windows-only MS Access (node-adodb) backend.
//  - Opens (and creates) data/service.db
//  - Builds the full schema if it does not exist
//  - Seeds default Settings, Oil list and Filter category list
// ============================================================

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'service.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ------------------------------------------------------------
//  Schema
// ------------------------------------------------------------
db.exec(`
-- ============ Reference catalog (seeded from vehicle_filter_data.js) ============
CREATE TABLE IF NOT EXISTS Vehicles (
    VehicleID            INTEGER PRIMARY KEY,
    SequenceNo           INTEGER,
    EquipmentDescription TEXT,
    ECNumber             TEXT,
    Brand                TEXT,
    VehicleType          TEXT,
    ModelNo              TEXT,
    RegistrationNo       TEXT,
    Capacity             TEXT,
    YearOfManufacture    TEXT,
    SerialNo             TEXT,
    ChassisNo            TEXT,
    EngineNo             TEXT,
    GPSUnit              TEXT,
    Site                 TEXT,
    Status               TEXT DEFAULT 'Active'
);
CREATE INDEX IF NOT EXISTS idx_Vehicles_EC  ON Vehicles (ECNumber);
CREATE INDEX IF NOT EXISTS idx_Vehicles_Reg ON Vehicles (RegistrationNo);

CREATE TABLE IF NOT EXISTS Filters (
    FilterID             INTEGER PRIMARY KEY,
    AnalysisRank         INTEGER,
    FilterCategory       TEXT,
    OEMPartNumber        TEXT,
    HIFIPartNumber       TEXT,
    Description          TEXT,
    TotalServiceCount    INTEGER,
    UniqueVehicleCount   INTEGER,
    TopVehicleMatch      TEXT,
    MonthlyDemand        REAL,
    AnnualDemand         REAL,
    CompatibleFleetTypes TEXT,
    CrossReferences      TEXT
);
CREATE INDEX IF NOT EXISTS idx_Filters_Cat ON Filters (FilterCategory);

CREATE TABLE IF NOT EXISTS VehicleFilters (
    VehicleFilterID  INTEGER PRIMARY KEY AUTOINCREMENT,
    FilterID         INTEGER,
    VehicleReference TEXT,
    MatchedECNumber  TEXT,
    MatchedVehicleID INTEGER
);
CREATE INDEX IF NOT EXISTS idx_VF_Vehicle ON VehicleFilters (MatchedVehicleID);
CREATE INDEX IF NOT EXISTS idx_VF_Filter  ON VehicleFilters (FilterID);

CREATE TABLE IF NOT EXISTS GenuinePrices (
    GenuinePriceID      INTEGER PRIMARY KEY,
    HIFIEquivalent      TEXT,
    GenuineBrand        TEXT,
    RetailPriceExclVAT  REAL,
    VATAmount           REAL,
    SourcingPriceInclVAT REAL
);

CREATE TABLE IF NOT EXISTS Motorcycles (
    MotorcycleID   INTEGER PRIMARY KEY,
    ECNumber       TEXT,
    Brand          TEXT,
    VehicleType    TEXT,
    ModelNo        TEXT,
    RegistrationNo TEXT,
    Capacity       TEXT,
    SerialNo       TEXT,
    Site           TEXT,
    Remark         TEXT
);

-- ============ Editable price lists ============
-- Detailed filter price book (seeded from Filters Prices.xlsx, 195 rows)
CREATE TABLE IF NOT EXISTS FilterPrices (
    PriceID            INTEGER PRIMARY KEY AUTOINCREMENT,
    SupplierFilterCode TEXT,
    Description        TEXT,
    QuotedQty          INTEGER DEFAULT 1,
    UnitPriceLKR       REAL DEFAULT 0,
    TotalPriceLKR      REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_FP_Code ON FilterPrices (SupplierFilterCode);

-- Oil master list (drives the service form + editable in Price Lists)
CREATE TABLE IF NOT EXISTS OilList (
    OilID     INTEGER PRIMARY KEY AUTOINCREMENT,
    Name      TEXT NOT NULL,
    UnitPrice REAL NOT NULL DEFAULT 0,
    Unit      TEXT DEFAULT 'L',
    SortOrder INTEGER DEFAULT 0,
    Active    INTEGER DEFAULT 1
);

-- Filter category master list (drives the service form filter rows)
CREATE TABLE IF NOT EXISTS FilterCategoryList (
    CategoryID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name       TEXT NOT NULL,
    UnitPrice  REAL NOT NULL DEFAULT 0,
    SortOrder  INTEGER DEFAULT 0,
    Active     INTEGER DEFAULT 1
);

-- ============ Service records ============
CREATE TABLE IF NOT EXISTS ServiceJobs (
    ServiceID        INTEGER PRIMARY KEY AUTOINCREMENT,
    VehicleID        INTEGER,
    VehicleLabel     TEXT,
    ServiceDate      TEXT,
    JobNo            TEXT,
    MeterReading     TEXT,
    NextServiceMeter TEXT,
    ServiceType      TEXT,
    SiteLocation     TEXT,
    UpkeepingStatus  TEXT,
    RepairDetails    TEXT,
    PartsSubtotal    REAL DEFAULT 0,
    LabourRate       REAL DEFAULT 0,
    LabourCharge     REAL DEFAULT 0,
    SundryRate       REAL DEFAULT 0,
    SundryAmount     REAL DEFAULT 0,
    GrandTotal       REAL DEFAULT 0,
    CreatedAt        TEXT DEFAULT (datetime('now')),
    UpdatedAt        TEXT
);
CREATE INDEX IF NOT EXISTS idx_SJ_Vehicle ON ServiceJobs (VehicleID);
CREATE INDEX IF NOT EXISTS idx_SJ_Date    ON ServiceJobs (ServiceDate);

CREATE TABLE IF NOT EXISTS ServiceOils (
    ServiceOilID INTEGER PRIMARY KEY AUTOINCREMENT,
    ServiceID    INTEGER NOT NULL REFERENCES ServiceJobs(ServiceID) ON DELETE CASCADE,
    OilName      TEXT,
    OilType      TEXT,
    ActionType   TEXT,
    Quantity     REAL DEFAULT 0,
    Price        REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_SO_Service ON ServiceOils (ServiceID);

CREATE TABLE IF NOT EXISTS ServiceFilters (
    ServiceFilterID INTEGER PRIMARY KEY AUTOINCREMENT,
    ServiceID       INTEGER NOT NULL REFERENCES ServiceJobs(ServiceID) ON DELETE CASCADE,
    FilterCategory  TEXT,
    FilterNo        TEXT,
    ActionType      TEXT,
    Price           REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_SF_Service ON ServiceFilters (ServiceID);

CREATE TABLE IF NOT EXISTS ServiceCosts (
    CostID          INTEGER PRIMARY KEY AUTOINCREMENT,
    ServiceID       INTEGER NOT NULL REFERENCES ServiceJobs(ServiceID) ON DELETE CASCADE,
    CostDescription TEXT,
    Unit            TEXT,
    Rate            REAL DEFAULT 0,
    Qty             REAL DEFAULT 0,
    Amount          REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_SC_Service ON ServiceCosts (ServiceID);

-- ============ App settings (key/value) ============
CREATE TABLE IF NOT EXISTS Settings (
    Key   TEXT PRIMARY KEY,
    Value TEXT
);
`);

// ------------------------------------------------------------
//  Default settings (only inserted if missing)
// ------------------------------------------------------------
const DEFAULT_SETTINGS = {
    labour_rate_low:   '20',     // % applied when parts subtotal <= threshold
    labour_rate_high:  '15',     // % applied when parts subtotal >  threshold
    labour_threshold:  '10000',  // LKR break point
    sundry_rate:       '5',      // % of parts subtotal
    currency:          'Rs',
    company_name:      'Edward and Christie (Pvt) Ltd',
    form_title:        'Vehicle/ Machinery Service Details'
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO Settings (Key, Value) VALUES (?, ?)');
for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(k, v);

// ------------------------------------------------------------
//  Default oil + filter-category lists (only if tables are empty)
// ------------------------------------------------------------
const DEFAULT_OILS = [
    'Engine Oil', 'Gear Box Oil', 'Differential Oil', 'Transmission Oil', 'Hydraulic Oil',
    'Torque Con. Oil', 'Power Steering Oil', 'Brake Oil', 'Swing Motor Oil', 'Travelling Motor Oil',
    'Rear Axel Case Oil', 'Front Axel Case Oil', 'Circle Gear Case Oil', 'Tandem Drive Oil',
    'Compressor Oil', 'Petrol & Kerosene Oil', 'Grease', 'Battery water', 'Coolant'
];
const DEFAULT_FILTER_CATEGORIES = [
    'Engine Oil Filter', 'Air Filter', 'Air Filter Inner', 'Air Filter Outer', 'Trans: Filter',
    'Water Separator', 'Fuel Sedimentary', 'Hydraulic Filter - S', 'Line Filter', 'Coolant Filter',
    'Power Steering Filter', 'Air Dryer Filter', 'Air Breather Filter', 'Fuel Tank Filter',
    'Primary Fuel Filter', 'Engine fuel Filter - S', 'Engine Oil Filter - S', 'Engine Air Filter - S'
];

if (db.prepare('SELECT COUNT(*) c FROM OilList').get().c === 0) {
    const ins = db.prepare('INSERT INTO OilList (Name, UnitPrice, Unit, SortOrder) VALUES (?, 0, ?, ?)');
    DEFAULT_OILS.forEach((name, i) => ins.run(name, name === 'Grease' ? 'kg' : 'L', i));
}
if (db.prepare('SELECT COUNT(*) c FROM FilterCategoryList').get().c === 0) {
    const ins = db.prepare('INSERT INTO FilterCategoryList (Name, UnitPrice, SortOrder) VALUES (?, 0, ?)');
    DEFAULT_FILTER_CATEGORIES.forEach((name, i) => ins.run(name, i));
}

// ------------------------------------------------------------
//  Settings helpers
// ------------------------------------------------------------
function getSettings() {
    const rows = db.prepare('SELECT Key, Value FROM Settings').all();
    const out = {};
    for (const r of rows) out[r.Key] = r.Value;
    return out;
}

function getRates() {
    const s = getSettings();
    return {
        labourRateLow:  parseFloat(s.labour_rate_low)  || 0,
        labourRateHigh: parseFloat(s.labour_rate_high) || 0,
        labourThreshold: parseFloat(s.labour_threshold) || 0,
        sundryRate:     parseFloat(s.sundry_rate)      || 0
    };
}

// Single source of truth for the money math (mirrored on the client for live preview)
function computeTotals(partsSubtotal, rates = getRates()) {
    const parts = Math.round((Number(partsSubtotal) || 0) * 100) / 100;
    const labourRate = parts > rates.labourThreshold ? rates.labourRateHigh : rates.labourRateLow;
    const labourCharge = Math.round(parts * labourRate) / 100;
    const sundryAmount = Math.round(parts * rates.sundryRate) / 100;
    const grandTotal = Math.round((parts + labourCharge + sundryAmount) * 100) / 100;
    return { partsSubtotal: parts, labourRate, labourCharge, sundryRate: rates.sundryRate, sundryAmount, grandTotal };
}

module.exports = { db, getSettings, getRates, computeTotals, DB_PATH };
