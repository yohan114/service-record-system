<#
.SYNOPSIS
    Exports Access database tables to a JavaScript data file for the HTML search interface.
#>

$DbPath   = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$OutPath  = "d:\Yohan\Service record\vehicle_filter_data.js"
$ConnStr  = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

function Escape-JS([string]$text) {
    if ([string]::IsNullOrEmpty($text)) { return "" }
    return $text.Replace('\', '\\').Replace('"', '\"').Replace("`r", '').Replace("`n", '\n').Replace("`t", '\t')
}

function Read-Table($conn, [string]$sql) {
    $rs = $conn.Execute($sql)
    $rows = @()
    while (-not $rs.EOF) {
        $row = @{}
        for ($i = 0; $i -lt $rs.Fields.Count; $i++) {
            $fname = $rs.Fields.Item($i).Name
            $val = $rs.Fields.Item($i).Value
            if ($null -eq $val) { $val = "" }
            $row[$fname] = $val
        }
        $rows += $row
        $rs.MoveNext()
    }
    $rs.Close()
    return $rows
}

Write-Host "=== Exporting Database to JS ===" -ForegroundColor Cyan

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

# Read all tables
Write-Host "Reading Vehicles..."
$vehicles = Read-Table $conn "SELECT * FROM Vehicles ORDER BY VehicleID"

Write-Host "Reading Filters..."
$filters = Read-Table $conn "SELECT * FROM Filters ORDER BY AnalysisRank"

Write-Host "Reading VehicleFilters..."
$vfLinks = Read-Table $conn "SELECT * FROM VehicleFilters ORDER BY FilterID"

Write-Host "Reading FilterPrices..."
$prices = Read-Table $conn "SELECT * FROM FilterPrices ORDER BY PriceID"

Write-Host "Reading GenuinePrices..."
$genuinePrices = Read-Table $conn "SELECT * FROM GenuinePrices ORDER BY GenuinePriceID"

Write-Host "Reading Motorcycles..."
$motorcycles = Read-Table $conn "SELECT * FROM Motorcycles ORDER BY MotorcycleID"

$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null

# Build JavaScript output
$sb = [System.Text.StringBuilder]::new()
$sb.AppendLine("// Vehicle Filter Database - Exported Data") | Out-Null
$sb.AppendLine("// Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')") | Out-Null
$sb.AppendLine("") | Out-Null

# --- Vehicles ---
$sb.AppendLine("const DB_VEHICLES = [") | Out-Null
for ($i = 0; $i -lt $vehicles.Count; $i++) {
    $v = $vehicles[$i]
    $comma = if ($i -lt $vehicles.Count - 1) { "," } else { "" }
    $sb.AppendLine("  {id:$($v.VehicleID),seq:$($v.SequenceNo),desc:`"$(Escape-JS $v.EquipmentDescription)`",ec:`"$(Escape-JS $v.ECNumber)`",brand:`"$(Escape-JS $v.Brand)`",type:`"$(Escape-JS $v.VehicleType)`",model:`"$(Escape-JS $v.ModelNo)`",reg:`"$(Escape-JS $v.RegistrationNo)`",cap:`"$(Escape-JS $v.Capacity)`",year:`"$(Escape-JS $v.YearOfManufacture)`",serial:`"$(Escape-JS $v.SerialNo)`",chassis:`"$(Escape-JS $v.ChassisNo)`",engine:`"$(Escape-JS $v.EngineNo)`",gps:`"$(Escape-JS $v.GPSUnit)`",site:`"$(Escape-JS $v.Site)`"}$comma") | Out-Null
}
$sb.AppendLine("];") | Out-Null
$sb.AppendLine("") | Out-Null

function Safe-Num($val) {
    if ([string]::IsNullOrEmpty("$val")) { return 0 }
    return $val
}

# --- Filters ---
$sb.AppendLine("const DB_FILTERS = [") | Out-Null
for ($i = 0; $i -lt $filters.Count; $i++) {
    $f = $filters[$i]
    $comma = if ($i -lt $filters.Count - 1) { "," } else { "" }
    $rank = Safe-Num $f.AnalysisRank
    $svc = Safe-Num $f.TotalServiceCount
    $veh = Safe-Num $f.UniqueVehicleCount
    $md = Safe-Num $f.MonthlyDemand
    $ad = Safe-Num $f.AnnualDemand
    $sb.AppendLine("  {id:$($f.FilterID),rank:$rank,cat:`"$(Escape-JS $f.FilterCategory)`",oem:`"$(Escape-JS $f.OEMPartNumber)`",hifi:`"$(Escape-JS $f.HIFIPartNumber)`",desc:`"$(Escape-JS $f.Description)`",svcCount:$svc,vehCount:$veh,topMatch:`"$(Escape-JS $f.TopVehicleMatch)`",monthlyD:$md,annualD:$ad,fleet:`"$(Escape-JS $f.CompatibleFleetTypes)`",crossRef:`"$(Escape-JS $f.CrossReferences)`"}$comma") | Out-Null
}
$sb.AppendLine("];") | Out-Null
$sb.AppendLine("") | Out-Null

# --- Vehicle-Filter Links ---
$sb.AppendLine("const DB_VF_LINKS = [") | Out-Null
for ($i = 0; $i -lt $vfLinks.Count; $i++) {
    $l = $vfLinks[$i]
    $comma = if ($i -lt $vfLinks.Count - 1) { "," } else { "" }
    $vid = if ($l.MatchedVehicleID -and $l.MatchedVehicleID -ne [System.DBNull]::Value) { $l.MatchedVehicleID } else { 0 }
    $sb.AppendLine("  {fid:$($l.FilterID),ref:`"$(Escape-JS $l.VehicleReference)`",ec:`"$(Escape-JS $l.MatchedECNumber)`",vid:$vid}$comma") | Out-Null
}
$sb.AppendLine("];") | Out-Null
$sb.AppendLine("") | Out-Null

# --- Prices ---
$sb.AppendLine("const DB_PRICES = [") | Out-Null
for ($i = 0; $i -lt $prices.Count; $i++) {
    $p = $prices[$i]
    $comma = if ($i -lt $prices.Count - 1) { "," } else { "" }
    $sb.AppendLine("  {id:$($p.PriceID),code:`"$(Escape-JS $p.SupplierFilterCode)`",desc:`"$(Escape-JS $p.Description)`",qty:$($p.QuotedQty),unit:$($p.UnitPriceLKR),total:$($p.TotalPriceLKR)}$comma") | Out-Null
}
$sb.AppendLine("];") | Out-Null
$sb.AppendLine("") | Out-Null

# --- Genuine Prices ---
$sb.AppendLine("const DB_GENUINE_PRICES = [") | Out-Null
for ($i = 0; $i -lt $genuinePrices.Count; $i++) {
    $g = $genuinePrices[$i]
    $comma = if ($i -lt $genuinePrices.Count - 1) { "," } else { "" }
    $sb.AppendLine("  {id:$($g.GenuinePriceID),hifi:`"$(Escape-JS $g.HIFIEquivalent)`",brand:`"$(Escape-JS $g.GenuineBrand)`",retail:$($g.RetailPriceExclVAT),vat:$($g.VATAmount),sourcing:$($g.SourcingPriceInclVAT)}$comma") | Out-Null
}
$sb.AppendLine("];") | Out-Null
$sb.AppendLine("") | Out-Null

# --- Motorcycles ---
$sb.AppendLine("const DB_MOTORCYCLES = [") | Out-Null
for ($i = 0; $i -lt $motorcycles.Count; $i++) {
    $m = $motorcycles[$i]
    $comma = if ($i -lt $motorcycles.Count - 1) { "," } else { "" }
    $sb.AppendLine("  {id:$($m.MotorcycleID),ec:`"$(Escape-JS $m.ECNumber)`",brand:`"$(Escape-JS $m.Brand)`",type:`"$(Escape-JS $m.VehicleType)`",model:`"$(Escape-JS $m.ModelNo)`",reg:`"$(Escape-JS $m.RegistrationNo)`",cap:`"$(Escape-JS $m.Capacity)`",serial:`"$(Escape-JS $m.SerialNo)`",site:`"$(Escape-JS $m.Site)`",remark:`"$(Escape-JS $m.Remark)`"}$comma") | Out-Null
}
$sb.AppendLine("];") | Out-Null

# Write to file
$sb.ToString() | Out-File -FilePath $OutPath -Encoding UTF8
$fileSize = (Get-Item $OutPath).Length / 1KB

Write-Host ""
Write-Host "=== Export Complete ===" -ForegroundColor Green
Write-Host "File: $OutPath" -ForegroundColor White
Write-Host "Size: $([Math]::Round($fileSize, 1)) KB" -ForegroundColor White
Write-Host "Vehicles: $($vehicles.Count)" -ForegroundColor White
Write-Host "Filters: $($filters.Count)" -ForegroundColor White
Write-Host "Links: $($vfLinks.Count)" -ForegroundColor White
Write-Host "Prices: $($prices.Count) supplier + $($genuinePrices.Count) genuine" -ForegroundColor White
Write-Host "Motorcycles: $($motorcycles.Count)" -ForegroundColor White
