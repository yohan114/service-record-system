$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

function Execute-SQL($sql) {
    try {
        $conn.Execute($sql) | Out-Null
        Write-Host "SUCCESS: $sql"
    } catch {
        Write-Host "FAILED: $sql"
        Write-Host $_.Exception.Message
    }
}

Write-Host "Migrating Database to support Service Tracking..."

$sql1 = @"
CREATE TABLE ServiceJobs (
    ServiceID AUTOINCREMENT PRIMARY KEY,
    VehicleID INT,
    ServiceDate DATETIME,
    JobNo VARCHAR(255),
    MeterReading VARCHAR(255),
    NextServiceMeter VARCHAR(255),
    ServiceType VARCHAR(255),
    SiteLocation VARCHAR(255),
    UpkeepingStatus VARCHAR(50),
    RepairDetails LONGTEXT
);
"@
Execute-SQL $sql1

$sql2 = @"
CREATE TABLE ServiceOils (
    ServiceOilID AUTOINCREMENT PRIMARY KEY,
    ServiceID INT,
    OilName VARCHAR(255),
    OilType VARCHAR(255),
    ActionType VARCHAR(50),
    Quantity DOUBLE,
    Price CURRENCY
);
"@
Execute-SQL $sql2

$sql3 = @"
CREATE TABLE ServiceFilters (
    ServiceFilterID AUTOINCREMENT PRIMARY KEY,
    ServiceID INT,
    FilterCategory VARCHAR(255),
    FilterNo VARCHAR(255),
    ActionType VARCHAR(50),
    Price CURRENCY
);
"@
Execute-SQL $sql3

$sql4 = @"
CREATE TABLE ServiceCosts (
    CostID AUTOINCREMENT PRIMARY KEY,
    ServiceID INT,
    CostDescription VARCHAR(255),
    Unit VARCHAR(50),
    Rate CURRENCY,
    Qty DOUBLE,
    Amount CURRENCY
);
"@
Execute-SQL $sql4

$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null

Write-Host "Migration complete!"
