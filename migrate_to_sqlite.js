const ADODB = require('node-adodb');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPathAccdb = path.join(__dirname, 'VehicleFilterDB.accdb');
const dbPathSqlite = path.join(__dirname, 'VehicleFilterDB.sqlite');
const excelPathFilters = path.join(__dirname, 'Filters Prices.xlsx');

// 1. Remove existing sqlite DB if it exists
if (fs.existsSync(dbPathSqlite)) {
  fs.unlinkSync(dbPathSqlite);
  console.log('Removed existing SQLite database file.');
}

const sqliteDb = new sqlite3.Database(dbPathSqlite);
const accdbConn = ADODB.open(`Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${dbPathAccdb};`, true);

// Run DB queries in sequence
function runSqlite(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getSqliteVal(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function insertTableRows(table, rows) {
  return new Promise((resolve, reject) => {
    sqliteDb.serialize(() => {
      sqliteDb.run('BEGIN TRANSACTION', (err) => {
        if (err) return reject(err);
      });
      
      const placeholders = table.cols.map(() => '?').join(',');
      const insertSql = `INSERT OR REPLACE INTO ${table.name} (${table.cols.join(',')}) VALUES (${placeholders})`;
      const stmt = sqliteDb.prepare(insertSql, (err) => {
        if (err) return reject(err);
      });
      
      let errorOccurred = false;
      for (let row of rows) {
        if (errorOccurred) break;
        const values = table.cols.map(col => {
          let val = row[col];
          if (col === 'ServiceDate' && val) {
            try {
              const d = new Date(val);
              if (!isNaN(d.getTime())) {
                val = d.toISOString().split('T')[0];
              }
            } catch (e) {}
          }
          return val !== undefined ? val : null;
        });
        stmt.run(values, (err) => {
          if (err && !errorOccurred) {
            errorOccurred = true;
            reject(err);
          }
        });
      }
      
      stmt.finalize((err) => {
        if (err) return reject(err);
        sqliteDb.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });
}

const oilList = [
  "15W40-CI/04",
  "DS-10 Grease",
  "MP-140 Gear Oil",
  "80W90 Gear Oil",
  "MP-90 Gear Oil",
  "HD-68 Power Oil-1888",
  "SAE-30"
];

async function migrate() {
  try {
    console.log('Creating SQLite schema...');
    
    // --- Create Tables ---
    await runSqlite(`
      CREATE TABLE Vehicles (
        VehicleID INTEGER PRIMARY KEY AUTOINCREMENT,
        SequenceNo INTEGER,
        EquipmentDescription TEXT,
        ECNumber TEXT,
        Brand TEXT,
        VehicleType TEXT,
        ModelNo TEXT,
        RegistrationNo TEXT,
        Capacity TEXT,
        YearOfManufacture TEXT,
        SerialNo TEXT,
        ChassisNo TEXT,
        EngineNo TEXT,
        GPSUnit TEXT,
        Site TEXT,
        Status TEXT DEFAULT 'Active'
      )
    `);
    
    await runSqlite(`
      CREATE TABLE Filters (
        FilterID INTEGER PRIMARY KEY AUTOINCREMENT,
        AnalysisRank INTEGER,
        FilterCategory TEXT,
        OEMPartNumber TEXT,
        HIFIPartNumber TEXT,
        Description TEXT,
        TotalServiceCount INTEGER,
        UniqueVehicleCount INTEGER,
        TopVehicleMatch TEXT,
        MonthlyDemand REAL,
        AnnualDemand REAL,
        CompatibleFleetTypes TEXT,
        CrossReferences TEXT
      )
    `);
    
    await runSqlite(`
      CREATE TABLE VehicleFilters (
        VehicleFilterID INTEGER PRIMARY KEY AUTOINCREMENT,
        FilterID INTEGER,
        VehicleReference TEXT,
        MatchedECNumber TEXT,
        MatchedVehicleID INTEGER
      )
    `);
    
    await runSqlite(`
      CREATE TABLE FilterPrices (
        PriceID INTEGER PRIMARY KEY AUTOINCREMENT,
        SupplierFilterCode TEXT,
        Description TEXT,
        QuotedQty INTEGER,
        UnitPriceLKR REAL,
        TotalPriceLKR REAL
      )
    `);
    
    await runSqlite(`
      CREATE TABLE GenuinePrices (
        GenuinePriceID INTEGER PRIMARY KEY AUTOINCREMENT,
        HIFIEquivalent TEXT,
        GenuineBrand TEXT,
        RetailPriceExclVAT REAL,
        VATAmount REAL,
        SourcingPriceInclVAT REAL
      )
    `);
    
    await runSqlite(`
      CREATE TABLE Motorcycles (
        MotorcycleID INTEGER PRIMARY KEY AUTOINCREMENT,
        ECNumber TEXT,
        Brand TEXT,
        VehicleType TEXT,
        ModelNo TEXT,
        RegistrationNo TEXT,
        Capacity TEXT,
        SerialNo TEXT,
        Site TEXT,
        Remark TEXT
      )
    `);
    
    await runSqlite(`
      CREATE TABLE ServiceJobs (
        ServiceID INTEGER PRIMARY KEY AUTOINCREMENT,
        VehicleID INTEGER,
        ServiceDate TEXT,
        JobNo TEXT,
        MeterReading TEXT,
        NextServiceMeter TEXT,
        ServiceType TEXT,
        SiteLocation TEXT,
        UpkeepingStatus TEXT,
        RepairDetails TEXT,
        PartsSubtotal REAL DEFAULT 0.0,
        LabourRate REAL DEFAULT 0.0,
        LabourCharge REAL DEFAULT 0.0,
        SundryRate REAL DEFAULT 0.0,
        SundryCharge REAL DEFAULT 0.0,
        GrandTotal REAL DEFAULT 0.0
      )
    `);
    
    await runSqlite(`
      CREATE TABLE ServiceOils (
        ServiceOilID INTEGER PRIMARY KEY AUTOINCREMENT,
        ServiceID INTEGER,
        OilName TEXT,
        OilType TEXT,
        ActionType TEXT,
        Quantity REAL,
        Price REAL
      )
    `);
    
    await runSqlite(`
      CREATE TABLE ServiceFilters (
        ServiceFilterID INTEGER PRIMARY KEY AUTOINCREMENT,
        ServiceID INTEGER,
        FilterCategory TEXT,
        FilterNo TEXT,
        ActionType TEXT,
        Price REAL
      )
    `);
    
    await runSqlite(`
      CREATE TABLE ServiceCosts (
        CostID INTEGER PRIMARY KEY AUTOINCREMENT,
        ServiceID INTEGER,
        CostDescription TEXT,
        Unit TEXT,
        Rate REAL,
        Qty REAL,
        Amount REAL
      )
    `);
    
    await runSqlite(`
      CREATE TABLE Settings (
        SettingKey TEXT PRIMARY KEY,
        SettingValue TEXT
      )
    `);
    
    await runSqlite(`
      CREATE TABLE OilsList (
        OilID INTEGER PRIMARY KEY AUTOINCREMENT,
        OilName TEXT,
        OilType TEXT,
        Price REAL DEFAULT 0.0
      )
    `);
    
    await runSqlite(`
      CREATE TABLE FiltersList (
        FilterID INTEGER PRIMARY KEY AUTOINCREMENT,
        FilterCategory TEXT,
        FilterNo TEXT,
        Price REAL DEFAULT 0.0
      )
    `);

    // Indexes
    await runSqlite(`CREATE INDEX idx_Vehicles_EC ON Vehicles (ECNumber)`);
    await runSqlite(`CREATE INDEX idx_Vehicles_Reg ON Vehicles (RegistrationNo)`);
    await runSqlite(`CREATE INDEX idx_Filters_OEM ON Filters (OEMPartNumber)`);
    await runSqlite(`CREATE INDEX idx_Filters_HIFI ON Filters (HIFIPartNumber)`);
    await runSqlite(`CREATE INDEX idx_VF_FilterID ON VehicleFilters (FilterID)`);
    await runSqlite(`CREATE INDEX idx_VF_VehicleID ON VehicleFilters (MatchedVehicleID)`);
    await runSqlite(`CREATE INDEX idx_ServiceJobs_VehicleID ON ServiceJobs (VehicleID)`);
    await runSqlite(`CREATE INDEX idx_ServiceJobs_Date ON ServiceJobs (ServiceDate)`);

    console.log('SQLite schema and indexes created.');

    // --- Migrate Data from ACCDB ---
    const tablesToMigrate = [
      { name: 'Vehicles', idCol: 'VehicleID', cols: ['VehicleID', 'SequenceNo', 'EquipmentDescription', 'ECNumber', 'Brand', 'VehicleType', 'ModelNo', 'RegistrationNo', 'Capacity', 'YearOfManufacture', 'SerialNo', 'ChassisNo', 'EngineNo', 'GPSUnit', 'Site', 'Status'] },
      { name: 'Filters', idCol: 'FilterID', cols: ['FilterID', 'AnalysisRank', 'FilterCategory', 'OEMPartNumber', 'HIFIPartNumber', 'Description', 'TotalServiceCount', 'UniqueVehicleCount', 'TopVehicleMatch', 'MonthlyDemand', 'AnnualDemand', 'CompatibleFleetTypes', 'CrossReferences'] },
      { name: 'VehicleFilters', idCol: 'VehicleFilterID', cols: ['VehicleFilterID', 'FilterID', 'VehicleReference', 'MatchedECNumber', 'MatchedVehicleID'] },
      { name: 'FilterPrices', idCol: 'PriceID', cols: ['PriceID', 'SupplierFilterCode', 'Description', 'QuotedQty', 'UnitPriceLKR', 'TotalPriceLKR'] },
      { name: 'GenuinePrices', idCol: 'GenuinePriceID', cols: ['GenuinePriceID', 'HIFIEquivalent', 'GenuineBrand', 'RetailPriceExclVAT', 'VATAmount', 'SourcingPriceInclVAT'] },
      { name: 'Motorcycles', idCol: 'MotorcycleID', cols: ['MotorcycleID', 'ECNumber', 'Brand', 'VehicleType', 'ModelNo', 'RegistrationNo', 'Capacity', 'SerialNo', 'Site', 'Remark'] },
      { name: 'ServiceJobs', idCol: 'ServiceID', cols: ['ServiceID', 'VehicleID', 'ServiceDate', 'JobNo', 'MeterReading', 'NextServiceMeter', 'ServiceType', 'SiteLocation', 'UpkeepingStatus', 'RepairDetails'] },
      { name: 'ServiceOils', idCol: 'ServiceOilID', cols: ['ServiceOilID', 'ServiceID', 'OilName', 'OilType', 'ActionType', 'Quantity', 'Price'] },
      { name: 'ServiceFilters', idCol: 'ServiceFilterID', cols: ['ServiceFilterID', 'ServiceID', 'FilterCategory', 'FilterNo', 'ActionType', 'Price'] },
      { name: 'ServiceCosts', idCol: 'CostID', cols: ['CostID', 'ServiceID', 'CostDescription', 'Unit', 'Rate', 'Qty', 'Amount'] }
    ];

    for (let table of tablesToMigrate) {
      console.log(`Migrating table ${table.name}...`);
      const rows = await accdbConn.query(`SELECT * FROM ${table.name}`);
      console.log(`Found ${rows.length} rows in ${table.name}. Inserting into SQLite...`);
      
      if (rows.length === 0) continue;

      await insertTableRows(table, rows);
      
      // Verify count
      const row = await getSqliteVal(`SELECT COUNT(*) as count FROM ${table.name}`);
      console.log(`Verified: SQLite table ${table.name} has ${row.count} rows.`);
    }

    // --- Seed Settings ---
    console.log('Seeding settings...');
    const defaultSettings = [
      { key: 'labour_rate_under_threshold', value: '20' },
      { key: 'labour_rate_over_threshold', value: '15' },
      { key: 'labour_threshold', value: '10000' },
      { key: 'sundry_rate', value: '5' }
    ];
    for (let s of defaultSettings) {
      await runSqlite(`INSERT OR REPLACE INTO Settings (SettingKey, SettingValue) VALUES (?, ?)`, [s.key, s.value]);
    }
    console.log('Settings seeded.');

    // --- Seed Oils List ---
    console.log('Seeding oils list...');
    for (let oil of oilList) {
      await runSqlite(`INSERT OR REPLACE INTO OilsList (OilName, OilType, Price) VALUES (?, ?, ?)`, [oil, '', 0.0]);
    }
    console.log(`Oils list seeded with ${oilList.length} items.`);

    // --- Seed Filters List from Excel ---
    console.log('Reading Filters Prices.xlsx for filters list...');
    const excelConn = ADODB.open(`Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${excelPathFilters};Extended Properties="Excel 12.0 Xml;HDR=YES;IMEX=1";`, true);
    const excelRows = await excelConn.query('SELECT * FROM [Sheet1$]');
    console.log(`Found ${excelRows.length} rows in Filters Prices.xlsx. Importing into FiltersList...`);

    await new Promise((resolve, reject) => {
      sqliteDb.serialize(() => {
        sqliteDb.run('BEGIN TRANSACTION', (err) => {
          if (err) return reject(err);
        });
        const stmt = sqliteDb.prepare(`INSERT OR REPLACE INTO FiltersList (FilterCategory, FilterNo, Price) VALUES (?, ?, ?)`, (err) => {
          if (err) return reject(err);
        });
        
        let errorOccurred = false;
        for (let r of excelRows) {
          if (errorOccurred) break;
          const cat = r['Description'] || '';
          const code = r['Filter Code'] || '';
          const price = parseFloat(r['Price']) || parseFloat(r['Unit Price']) || 0.0;
          if (code || cat) {
            stmt.run([cat.trim(), code.trim(), price], (err) => {
              if (err && !errorOccurred) {
                errorOccurred = true;
                reject(err);
              }
            });
          }
        }
        stmt.finalize((err) => {
          if (err) return reject(err);
          sqliteDb.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
    });

    const row = await getSqliteVal(`SELECT COUNT(*) as count FROM FiltersList`);
    console.log(`FiltersList seeded successfully with ${row.count} rows.`);

    console.log('\n=============================================');
    console.log('MIGRATION SUCCESSFULLY COMPLETED!');
    console.log(`SQLite Database saved to: ${dbPathSqlite}`);
    console.log('=============================================');
    
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    sqliteDb.close();
  }
}

migrate();
