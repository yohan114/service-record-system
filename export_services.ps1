<#
.SYNOPSIS
    Optional one-time migration helper (Windows only).
    Exports every service record from the old Microsoft Access database
    (VehicleFilterDB.accdb) into seed_data/services_export.json.

.DESCRIPTION
    Run this ONCE on the Windows machine that still has the Access database if you
    want to migrate the records you entered through the old app instead of the
    Excel "Summery" sheet.

    When seed_data/services_export.json is present, `npm run seed` imports from it
    and SKIPS the Excel history import, so you never get duplicate records.

    Requires the Microsoft Access Database Engine (ACE OLEDB 12.0).
#>

$ErrorActionPreference = 'Stop'
$dbPath  = Join-Path $PSScriptRoot 'VehicleFilterDB.accdb'
$outPath = Join-Path $PSScriptRoot 'seed_data\services_export.json'
$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;"

if (-not (Test-Path $dbPath)) { Write-Host "Access DB not found: $dbPath" -ForegroundColor Red; exit 1 }
if (-not (Test-Path (Split-Path $outPath))) { New-Item -ItemType Directory -Path (Split-Path $outPath) | Out-Null }

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($connStr)

function Read-Table($sql) {
    $rs = $conn.Execute($sql)
    $rows = @()
    while (-not $rs.EOF) {
        $o = [ordered]@{}
        foreach ($f in $rs.Fields) { $o[$f.Name] = $f.Value }
        $rows += [PSCustomObject]$o
        $rs.MoveNext()
    }
    $rs.Close()
    return $rows
}

Write-Host "Reading service tables from Access..."
$jobs    = Read-Table "SELECT * FROM ServiceJobs"
$oils    = Read-Table "SELECT * FROM ServiceOils"
$filters = Read-Table "SELECT * FROM ServiceFilters"
$costs   = Read-Table "SELECT * FROM ServiceCosts"
$conn.Close()

# Group children by ServiceID
$oilsBy    = $oils    | Group-Object ServiceID -AsHashTable -AsString
$filtersBy = $filters | Group-Object ServiceID -AsHashTable -AsString
$costsBy   = $costs   | Group-Object ServiceID -AsHashTable -AsString

$export = foreach ($j in $jobs) {
    $sid = [string]$j.ServiceID
    [ordered]@{
        VehicleID        = $j.VehicleID
        VehicleLabel     = $j.VehicleLabel
        ServiceDate      = if ($j.ServiceDate -is [datetime]) { $j.ServiceDate.ToString('yyyy-MM-dd') } else { [string]$j.ServiceDate }
        JobNo            = [string]$j.JobNo
        MeterReading     = [string]$j.MeterReading
        NextServiceMeter = [string]$j.NextServiceMeter
        ServiceType      = [string]$j.ServiceType
        SiteLocation     = [string]$j.SiteLocation
        UpkeepingStatus  = [string]$j.UpkeepingStatus
        RepairDetails    = [string]$j.RepairDetails
        oils    = @($oilsBy[$sid]    | ForEach-Object { @{ OilName=$_.OilName; OilType=$_.OilType; ActionType=$_.ActionType; Quantity=$_.Quantity; Price=$_.Price } })
        filters = @($filtersBy[$sid] | ForEach-Object { @{ FilterCategory=$_.FilterCategory; FilterNo=$_.FilterNo; ActionType=$_.ActionType; Price=$_.Price } })
        costs   = @($costsBy[$sid]   | ForEach-Object { @{ CostDescription=$_.CostDescription; Unit=$_.Unit; Rate=$_.Rate; Qty=$_.Qty; Amount=$_.Amount } })
    }
}

$export | ConvertTo-Json -Depth 6 | Out-File $outPath -Encoding UTF8
Write-Host "Exported $($jobs.Count) service records to $outPath" -ForegroundColor Green
Write-Host "Now run:  npm run seed" -ForegroundColor Cyan
