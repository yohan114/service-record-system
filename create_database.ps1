<#
.SYNOPSIS
    Vehicle Filter Database Creator
    Creates a Microsoft Access database and populates it from two Excel files.

.DESCRIPTION
    Reads vehicle data from "MACHINE LIST 2022.11.10.xlsx" and filter data from
    "Filter_Analysis_Report_Master_V2.xlsx", creates 6 normalized tables in an
    Access .accdb file, and builds all relationships.

.NOTES
    Requires: Microsoft Access Database Engine (ACE OLEDB 12.0)
    Author: Vehicle Filter DB System
    Date: 2026-05-29
#>

# ============================================================
# CONFIGURATION
# ============================================================

$DbPath            = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$MachineListPath    = "d:\Yohan\Service record\MACHINE LIST 2022.11.10.xlsx"
$FilterAnalysisPath = "d:\Yohan\Service record\Filter_Analysis_Report_Master_V2.xlsx"
$ConnStr            = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

# ============================================================
# HELPER FUNCTIONS
# ============================================================

function Escape-SQL([string]$text) {
    if ([string]::IsNullOrEmpty($text)) { return "" }
    return $text.Replace("'", "''")
}

function Get-CellText($ws, [int]$row, [int]$col) {
    $cell = $ws.Cells.Item($row, $col)
    if ($null -eq $cell) { return "" }
    $t = $cell.Text
    if ([string]::IsNullOrEmpty($t)) { return "" }
    return $t.Trim()
}

function Parse-Number([string]$text) {
    if ([string]::IsNullOrEmpty($text)) { return 0 }
    $text = $text.Replace(",", "").Trim()
    $num = 0.0
    if ([double]::TryParse($text, [ref]$num)) { return $num }
    return 0
}

function Parse-Int([string]$text) {
    if ([string]::IsNullOrEmpty($text)) { return 0 }
    $text = $text.Replace(",", "").Trim()
    $num = 0
    if ([int]::TryParse($text, [ref]$num)) { return $num }
    return 0
}

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host ">> $msg" -ForegroundColor Cyan
    Write-Host ("-" * 60) -ForegroundColor DarkGray
}

function Write-OK([string]$msg) {
    Write-Host "   [OK] $msg" -ForegroundColor Green
}

function Write-Warn([string]$msg) {
    Write-Host "   [!] $msg" -ForegroundColor Yellow
}

function Write-Err([string]$msg) {
    Write-Host "   [ERROR] $msg" -ForegroundColor Red
}

# ============================================================
# STEP 1: CREATE DATABASE FILE
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   VEHICLE FILTER DATABASE CREATOR" -ForegroundColor Cyan
Write-Host "   Edward & Christie - Fleet Filter Management System" -ForegroundColor DarkCyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Step "Step 1: Creating Access Database"

if (Test-Path $DbPath) {
    Remove-Item $DbPath -Force
    Write-Warn "Removed existing database."
}

try {
    $catalog = New-Object -ComObject ADOX.Catalog
    $catalog.Create($ConnStr)
    $connTemp = $catalog.ActiveConnection
    $connTemp.Close()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($catalog) | Out-Null
    Write-OK "Database created: $DbPath"
} catch {
    Write-Err "Failed to create database: $_"
    Write-Host "   Ensure Microsoft Access Database Engine (ACE) is installed." -ForegroundColor Yellow
    exit 1
}

# ============================================================
# STEP 2: CREATE TABLES
# ============================================================

Write-Step "Step 2: Creating Tables"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

# --- Vehicles ---
$conn.Execute("
CREATE TABLE Vehicles (
    VehicleID AUTOINCREMENT PRIMARY KEY,
    SequenceNo INTEGER,
    EquipmentDescription TEXT(255),
    ECNumber TEXT(50),
    Brand TEXT(100),
    VehicleType TEXT(100),
    ModelNo TEXT(100),
    RegistrationNo TEXT(50),
    Capacity TEXT(50),
    YearOfManufacture TEXT(20),
    SerialNo TEXT(100),
    ChassisNo TEXT(100),
    EngineNo TEXT(100),
    GPSUnit TEXT(10),
    Site TEXT(255),
    Status TEXT(20) DEFAULT 'Active'
)
") | Out-Null
Write-OK "Vehicles table"

# --- Filters ---
$conn.Execute("
CREATE TABLE Filters (
    FilterID AUTOINCREMENT PRIMARY KEY,
    AnalysisRank INTEGER,
    FilterCategory TEXT(100),
    OEMPartNumber TEXT(100),
    HIFIPartNumber TEXT(100),
    Description MEMO,
    TotalServiceCount INTEGER,
    UniqueVehicleCount INTEGER,
    TopVehicleMatch TEXT(100),
    MonthlyDemand DOUBLE,
    AnnualDemand DOUBLE,
    CompatibleFleetTypes TEXT(255),
    CrossReferences MEMO
)
") | Out-Null
Write-OK "Filters table"

# --- VehicleFilters (Many-to-Many Junction) ---
$conn.Execute("
CREATE TABLE VehicleFilters (
    VehicleFilterID AUTOINCREMENT PRIMARY KEY,
    FilterID INTEGER,
    VehicleReference TEXT(100),
    MatchedECNumber TEXT(50),
    MatchedVehicleID INTEGER
)
") | Out-Null
Write-OK "VehicleFilters junction table"

# --- FilterPrices ---
$conn.Execute("
CREATE TABLE FilterPrices (
    PriceID AUTOINCREMENT PRIMARY KEY,
    SupplierFilterCode TEXT(100),
    Description TEXT(255),
    QuotedQty INTEGER,
    UnitPriceLKR DOUBLE,
    TotalPriceLKR DOUBLE
)
") | Out-Null
Write-OK "FilterPrices table"

# --- GenuinePrices ---
$conn.Execute("
CREATE TABLE GenuinePrices (
    GenuinePriceID AUTOINCREMENT PRIMARY KEY,
    HIFIEquivalent TEXT(100),
    GenuineBrand TEXT(255),
    RetailPriceExclVAT DOUBLE,
    VATAmount DOUBLE,
    SourcingPriceInclVAT DOUBLE
)
") | Out-Null
Write-OK "GenuinePrices table"

# --- Motorcycles ---
$conn.Execute("
CREATE TABLE Motorcycles (
    MotorcycleID AUTOINCREMENT PRIMARY KEY,
    ECNumber TEXT(50),
    Brand TEXT(100),
    VehicleType TEXT(100),
    ModelNo TEXT(100),
    RegistrationNo TEXT(50),
    Capacity TEXT(50),
    SerialNo TEXT(100),
    Site TEXT(255),
    Remark TEXT(255)
)
") | Out-Null
Write-OK "Motorcycles table"

# --- Indexes ---
$conn.Execute("CREATE INDEX idx_Vehicles_EC ON Vehicles (ECNumber)") | Out-Null
$conn.Execute("CREATE INDEX idx_Vehicles_Reg ON Vehicles (RegistrationNo)") | Out-Null
$conn.Execute("CREATE INDEX idx_Filters_OEM ON Filters (OEMPartNumber)") | Out-Null
$conn.Execute("CREATE INDEX idx_Filters_HIFI ON Filters (HIFIPartNumber)") | Out-Null
$conn.Execute("CREATE INDEX idx_Filters_Cat ON Filters (FilterCategory)") | Out-Null
$conn.Execute("CREATE INDEX idx_VF_FilterID ON VehicleFilters (FilterID)") | Out-Null
$conn.Execute("CREATE INDEX idx_VF_VehicleID ON VehicleFilters (MatchedVehicleID)") | Out-Null
$conn.Execute("CREATE INDEX idx_VF_EC ON VehicleFilters (MatchedECNumber)") | Out-Null
Write-OK "Indexes created"

# ============================================================
# STEP 3: OPEN EXCEL AND READ DATA
# ============================================================

Write-Step "Step 3: Opening Excel Files"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wbMachine = $excel.Workbooks.Open($MachineListPath)
Write-OK "Opened Machine List"

$wbFilter = $excel.Workbooks.Open($FilterAnalysisPath)
Write-OK "Opened Filter Analysis"

# ============================================================
# STEP 4: INSERT VEHICLES
# ============================================================

Write-Step "Step 4: Importing Vehicles from Machine List"

$wsVehicles = $wbMachine.Worksheets.Item("Sheet2")
$totalVehicleRows = $wsVehicles.UsedRange.Rows.Count
Write-Host "   Total rows in sheet: $totalVehicleRows"

# Build vehicle lookup tables
$ecLookup = @{}    # E&C Number -> VehicleID
$regLookup = @{}   # Registration No -> VehicleID

$vehicleCount = 0
$lastEquipDesc = ""
$conn.Execute("BEGIN TRANSACTION") | Out-Null

for ($r = 4; $r -le $totalVehicleRows; $r++) {
    $ecNum = Get-CellText $wsVehicles $r 3
    
    # Skip empty rows
    if ([string]::IsNullOrEmpty($ecNum)) { continue }
    
    # Carry forward equipment description
    $equipDesc = Get-CellText $wsVehicles $r 2
    if (-not [string]::IsNullOrEmpty($equipDesc)) {
        $lastEquipDesc = $equipDesc
    } else {
        $equipDesc = $lastEquipDesc
    }
    
    $seqNo      = Parse-Int (Get-CellText $wsVehicles $r 1)
    $brand      = Get-CellText $wsVehicles $r 4
    $vType      = Get-CellText $wsVehicles $r 5
    $modelNo    = Get-CellText $wsVehicles $r 6
    $regNo      = Get-CellText $wsVehicles $r 7
    $capacity   = Get-CellText $wsVehicles $r 8
    $year       = Get-CellText $wsVehicles $r 9
    $serialNo   = Get-CellText $wsVehicles $r 10
    $chassisNo  = Get-CellText $wsVehicles $r 11
    $engineNo   = Get-CellText $wsVehicles $r 12
    $gpsUnit    = Get-CellText $wsVehicles $r 13
    $site       = Get-CellText $wsVehicles $r 14
    
    $sql = "INSERT INTO Vehicles (SequenceNo, EquipmentDescription, ECNumber, Brand, VehicleType, ModelNo, RegistrationNo, Capacity, YearOfManufacture, SerialNo, ChassisNo, EngineNo, GPSUnit, Site) VALUES ($seqNo, '$(Escape-SQL $equipDesc)', '$(Escape-SQL $ecNum)', '$(Escape-SQL $brand)', '$(Escape-SQL $vType)', '$(Escape-SQL $modelNo)', '$(Escape-SQL $regNo)', '$(Escape-SQL $capacity)', '$(Escape-SQL $year)', '$(Escape-SQL $serialNo)', '$(Escape-SQL $chassisNo)', '$(Escape-SQL $engineNo)', '$(Escape-SQL $gpsUnit)', '$(Escape-SQL $site)')"
    
    try {
        $conn.Execute($sql) | Out-Null
        $vehicleCount++
        
        # Get the auto-generated ID
        $rs = $conn.Execute("SELECT @@IDENTITY")
        $vID = $rs.Fields.Item(0).Value
        $rs.Close()
        
        # Build lookup tables
        if (-not [string]::IsNullOrEmpty($ecNum)) {
            $ecLookup[$ecNum.ToUpper()] = $vID
        }
        if (-not [string]::IsNullOrEmpty($regNo)) {
            $regLookup[$regNo.ToUpper()] = $vID
        }
    } catch {
        Write-Warn "Row $r skipped: $_"
    }
    
    if ($vehicleCount % 100 -eq 0) {
        Write-Host "   ... $vehicleCount vehicles imported" -ForegroundColor DarkGray
    }
}

$conn.Execute("COMMIT TRANSACTION") | Out-Null
Write-OK "$vehicleCount vehicles imported"
Write-Host "   Lookup tables: $($ecLookup.Count) E&C numbers, $($regLookup.Count) registrations" -ForegroundColor DarkGray

# ============================================================
# STEP 5: INSERT FILTERS (from Advanced Filter Analysis)
# ============================================================

Write-Step "Step 5: Importing Filters from Advanced Filter Analysis"

$wsFilters = $wbFilter.Worksheets.Item("Advanced Filter Analysis")
$totalFilterRows = $wsFilters.UsedRange.Rows.Count
Write-Host "   Total rows in sheet: $totalFilterRows"

# Also open Full Fleet Requirements for demand data
$wsFleet = $wbFilter.Worksheets.Item("Full Fleet Requirements")
$totalFleetRows = $wsFleet.UsedRange.Rows.Count

# Build demand lookup from Full Fleet Requirements (HIFI code -> demand data)
$demandLookup = @{}
for ($r = 2; $r -le $totalFleetRows; $r++) {
    $hifi = Get-CellText $wsFleet $r 2
    if ([string]::IsNullOrEmpty($hifi)) { continue }
    $demandLookup[$hifi.ToUpper()] = @{
        MonthlyDemand = Parse-Number (Get-CellText $wsFleet $r 7)
        AnnualDemand  = Parse-Number (Get-CellText $wsFleet $r 8)
        FleetTypes    = Get-CellText $wsFleet $r 9
        CrossRefs     = Get-CellText $wsFleet $r 5
    }
}
Write-Host "   Demand data loaded for $($demandLookup.Count) filters" -ForegroundColor DarkGray

# Store filter data + vehicle lists for junction table parsing
$filterData = @()
$filterCount = 0
$conn.Execute("BEGIN TRANSACTION") | Out-Null

for ($r = 2; $r -le $totalFilterRows; $r++) {
    $oem = Get-CellText $wsFilters $r 3
    $hifi = Get-CellText $wsFilters $r 4
    
    # Skip empty rows
    if ([string]::IsNullOrEmpty($oem) -and [string]::IsNullOrEmpty($hifi)) { continue }
    
    $rank      = Parse-Int (Get-CellText $wsFilters $r 1)
    $category  = Get-CellText $wsFilters $r 2
    $desc      = Get-CellText $wsFilters $r 5
    $svcCount  = Parse-Int (Get-CellText $wsFilters $r 6)
    $vehCount  = Parse-Int (Get-CellText $wsFilters $r 7)
    $topMatch  = Get-CellText $wsFilters $r 8
    $allVehicles = Get-CellText $wsFilters $r 9
    
    # Get demand data from Full Fleet Requirements
    $monthlyD = 0.0
    $annualD  = 0.0
    $fleetTypes = ""
    $crossRefs = ""
    $hifiKey = $hifi.ToUpper()
    if ($demandLookup.ContainsKey($hifiKey)) {
        $d = $demandLookup[$hifiKey]
        $monthlyD  = $d.MonthlyDemand
        $annualD   = $d.AnnualDemand
        $fleetTypes = $d.FleetTypes
        $crossRefs  = $d.CrossRefs
    }
    
    $sql = "INSERT INTO Filters (AnalysisRank, FilterCategory, OEMPartNumber, HIFIPartNumber, Description, TotalServiceCount, UniqueVehicleCount, TopVehicleMatch, MonthlyDemand, AnnualDemand, CompatibleFleetTypes, CrossReferences) VALUES ($rank, '$(Escape-SQL $category)', '$(Escape-SQL $oem)', '$(Escape-SQL $hifi)', '$(Escape-SQL $desc)', $svcCount, $vehCount, '$(Escape-SQL $topMatch)', $monthlyD, $annualD, '$(Escape-SQL $fleetTypes)', '$(Escape-SQL $crossRefs)')"
    
    try {
        $conn.Execute($sql) | Out-Null
        $filterCount++
        
        $rs = $conn.Execute("SELECT @@IDENTITY")
        $fID = $rs.Fields.Item(0).Value
        $rs.Close()
        
        # Store for junction table parsing
        $filterData += @{ FilterID = $fID; VehicleList = $allVehicles }
    } catch {
        Write-Warn "Filter row $r skipped: $_"
    }
    
    if ($filterCount % 200 -eq 0) {
        Write-Host "   ... $filterCount filters imported" -ForegroundColor DarkGray
    }
}

$conn.Execute("COMMIT TRANSACTION") | Out-Null
Write-OK "$filterCount filters imported"

# ============================================================
# STEP 6: PARSE AND INSERT VEHICLE-FILTER RELATIONSHIPS
# ============================================================

Write-Step "Step 6: Building Vehicle-Filter Junction Table"

$junctionCount = 0
$matchedCount = 0
$unmatchedCount = 0
$batchSize = 500
$batchCounter = 0

$conn.Execute("BEGIN TRANSACTION") | Out-Null

foreach ($fd in $filterData) {
    $fID = $fd.FilterID
    $vehicleList = $fd.VehicleList
    
    if ([string]::IsNullOrEmpty($vehicleList)) { continue }
    
    # Split by comma
    $vehicleRefs = $vehicleList -split ","
    $seenECs = @{}  # Deduplicate per filter
    
    foreach ($ref in $vehicleRefs) {
        $ref = $ref.Trim()
        if ([string]::IsNullOrEmpty($ref)) { continue }
        if ($ref.Length -lt 2) { continue }
        
        # Parse: "REG_NO (EC_NUM)" or just "CODE"
        $matchedEC = ""
        $matchedVID = 0
        
        if ($ref -match '^\s*(.+?)\s*\(\s*([^)]+?)\s*\)\s*$') {
            # Has parentheses: outer = registration, inner = E&C
            $outerPart = $Matches[1].Trim()
            $innerPart = $Matches[2].Trim()
            
            # Try inner (E&C) first
            if ($ecLookup.ContainsKey($innerPart.ToUpper())) {
                $matchedEC = $innerPart
                $matchedVID = $ecLookup[$innerPart.ToUpper()]
            }
            # Try outer (Registration)
            elseif ($regLookup.ContainsKey($outerPart.ToUpper())) {
                $matchedEC = $innerPart
                $matchedVID = $regLookup[$outerPart.ToUpper()]
            }
            # Try inner as registration
            elseif ($regLookup.ContainsKey($innerPart.ToUpper())) {
                $matchedEC = $innerPart
                $matchedVID = $regLookup[$innerPart.ToUpper()]
            }
            else {
                $matchedEC = $innerPart
            }
        } else {
            # No parentheses — try as E&C, then as registration
            $code = $ref.Trim()
            if ($ecLookup.ContainsKey($code.ToUpper())) {
                $matchedEC = $code
                $matchedVID = $ecLookup[$code.ToUpper()]
            }
            elseif ($regLookup.ContainsKey($code.ToUpper())) {
                $matchedEC = $code
                $matchedVID = $regLookup[$code.ToUpper()]
            }
            else {
                $matchedEC = $code
            }
        }
        
        # Deduplicate per filter
        $dedupKey = "$fID|$($matchedEC.ToUpper())"
        if ($seenECs.ContainsKey($dedupKey)) { continue }
        $seenECs[$dedupKey] = $true
        
        # Truncate reference if too long
        if ($ref.Length -gt 100) { $ref = $ref.Substring(0, 100) }
        if ($matchedEC.Length -gt 50) { $matchedEC = $matchedEC.Substring(0, 50) }
        
        $vidStr = if ($matchedVID -gt 0) { "$matchedVID" } else { "NULL" }
        
        $sql = "INSERT INTO VehicleFilters (FilterID, VehicleReference, MatchedECNumber, MatchedVehicleID) VALUES ($fID, '$(Escape-SQL $ref)', '$(Escape-SQL $matchedEC)', $vidStr)"
        
        try {
            $conn.Execute($sql) | Out-Null
            $junctionCount++
            if ($matchedVID -gt 0) { $matchedCount++ } else { $unmatchedCount++ }
        } catch {
            # Silently skip bad entries
        }
        
        $batchCounter++
        if ($batchCounter -ge $batchSize) {
            $conn.Execute("COMMIT TRANSACTION") | Out-Null
            $conn.Execute("BEGIN TRANSACTION") | Out-Null
            $batchCounter = 0
        }
    }
    
    if ($junctionCount % 5000 -eq 0 -and $junctionCount -gt 0) {
        Write-Host "   ... $junctionCount links created ($matchedCount matched)" -ForegroundColor DarkGray
    }
}

$conn.Execute("COMMIT TRANSACTION") | Out-Null
Write-OK "$junctionCount vehicle-filter links created"
Write-Host "   Matched to known vehicles: $matchedCount" -ForegroundColor Green
Write-Host "   Unmatched references: $unmatchedCount" -ForegroundColor Yellow

# ============================================================
# STEP 7: INSERT PRICE DATA
# ============================================================

Write-Step "Step 7: Importing Price Data"

# --- Supplier Prices ---
$wsPrices = $wbFilter.Worksheets.Item("Price Reference")
$totalPriceRows = $wsPrices.UsedRange.Rows.Count
$priceCount = 0

$conn.Execute("BEGIN TRANSACTION") | Out-Null

for ($r = 2; $r -le $totalPriceRows; $r++) {
    $code = Get-CellText $wsPrices $r 2
    if ([string]::IsNullOrEmpty($code)) { continue }
    
    $desc   = Get-CellText $wsPrices $r 3
    $qty    = Parse-Int (Get-CellText $wsPrices $r 4)
    $unitP  = Parse-Number (Get-CellText $wsPrices $r 5)
    $totalP = Parse-Number (Get-CellText $wsPrices $r 6)
    
    $sql = "INSERT INTO FilterPrices (SupplierFilterCode, Description, QuotedQty, UnitPriceLKR, TotalPriceLKR) VALUES ('$(Escape-SQL $code)', '$(Escape-SQL $desc)', $qty, $unitP, $totalP)"
    
    try {
        $conn.Execute($sql) | Out-Null
        $priceCount++
    } catch {
        Write-Warn "Price row $r skipped: $_"
    }
}

$conn.Execute("COMMIT TRANSACTION") | Out-Null
Write-OK "$priceCount supplier prices imported"

# --- Genuine Prices ---
$wsGenuine = $wbFilter.Worksheets.Item("Genuine Price Reference")
$totalGenuineRows = $wsGenuine.UsedRange.Rows.Count
$genuineCount = 0

$conn.Execute("BEGIN TRANSACTION") | Out-Null

for ($r = 2; $r -le $totalGenuineRows; $r++) {
    $hifi = Get-CellText $wsGenuine $r 2
    if ([string]::IsNullOrEmpty($hifi)) { continue }
    
    $brand     = Get-CellText $wsGenuine $r 3
    $retailP   = Parse-Number (Get-CellText $wsGenuine $r 4)
    $vatAmt    = Parse-Number (Get-CellText $wsGenuine $r 5)
    $sourcingP = Parse-Number (Get-CellText $wsGenuine $r 6)
    
    $sql = "INSERT INTO GenuinePrices (HIFIEquivalent, GenuineBrand, RetailPriceExclVAT, VATAmount, SourcingPriceInclVAT) VALUES ('$(Escape-SQL $hifi)', '$(Escape-SQL $brand)', $retailP, $vatAmt, $sourcingP)"
    
    try {
        $conn.Execute($sql) | Out-Null
        $genuineCount++
    } catch {
        Write-Warn "Genuine price row $r skipped: $_"
    }
}

$conn.Execute("COMMIT TRANSACTION") | Out-Null
Write-OK "$genuineCount genuine prices imported"

# ============================================================
# STEP 8: INSERT MOTORCYCLES
# ============================================================

Write-Step "Step 8: Importing Motorcycles"

$wsMotor = $wbMachine.Worksheets.Item("Sheet4")
$totalMotorRows = $wsMotor.UsedRange.Rows.Count
$motorCount = 0

$conn.Execute("BEGIN TRANSACTION") | Out-Null

for ($r = 3; $r -le $totalMotorRows; $r++) {
    $ecNum = Get-CellText $wsMotor $r 2
    if ([string]::IsNullOrEmpty($ecNum)) { continue }
    
    $brand   = Get-CellText $wsMotor $r 3
    $vType   = Get-CellText $wsMotor $r 4
    $modelNo = Get-CellText $wsMotor $r 5
    $regNo   = Get-CellText $wsMotor $r 6
    $cap     = Get-CellText $wsMotor $r 7
    $serNo   = Get-CellText $wsMotor $r 8
    $site    = Get-CellText $wsMotor $r 9
    $remark  = Get-CellText $wsMotor $r 10
    
    $sql = "INSERT INTO Motorcycles (ECNumber, Brand, VehicleType, ModelNo, RegistrationNo, Capacity, SerialNo, Site, Remark) VALUES ('$(Escape-SQL $ecNum)', '$(Escape-SQL $brand)', '$(Escape-SQL $vType)', '$(Escape-SQL $modelNo)', '$(Escape-SQL $regNo)', '$(Escape-SQL $cap)', '$(Escape-SQL $serNo)', '$(Escape-SQL $site)', '$(Escape-SQL $remark)')"
    
    try {
        $conn.Execute($sql) | Out-Null
        $motorCount++
    } catch {
        Write-Warn "Motorcycle row $r skipped: $_"
    }
}

$conn.Execute("COMMIT TRANSACTION") | Out-Null
Write-OK "$motorCount motorcycles imported"

# ============================================================
# STEP 9: VERIFY COUNTS
# ============================================================

Write-Step "Step 9: Verifying Database"

$tables = @("Vehicles", "Filters", "VehicleFilters", "FilterPrices", "GenuinePrices", "Motorcycles")
foreach ($tbl in $tables) {
    $rs = $conn.Execute("SELECT COUNT(*) FROM [$tbl]")
    $cnt = $rs.Fields.Item(0).Value
    $rs.Close()
    Write-Host "   $tbl : $cnt rows" -ForegroundColor White
}

# ============================================================
# STEP 10: CLEANUP
# ============================================================

Write-Step "Step 10: Cleanup"

$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null

$wbMachine.Close($false)
$wbFilter.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-OK "All connections closed"

# ============================================================
# SUMMARY
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   DATABASE CREATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   File: $DbPath" -ForegroundColor White
Write-Host "   Vehicles:        $vehicleCount" -ForegroundColor White
Write-Host "   Filters:         $filterCount" -ForegroundColor White
Write-Host "   Vehicle-Filter:  $junctionCount links ($matchedCount matched)" -ForegroundColor White
Write-Host "   Supplier Prices: $priceCount" -ForegroundColor White
Write-Host "   Genuine Prices:  $genuineCount" -ForegroundColor White
Write-Host "   Motorcycles:     $motorCount" -ForegroundColor White
Write-Host ""
Write-Host "   You can now open VehicleFilterDB.accdb in Microsoft Access." -ForegroundColor Cyan
Write-Host ""
