$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$geMap = @{
    "GE-02" = @("FC-232J", "C216", "C5809", "FA1071")
    "GE-10" = @("1R-1808", "JS-2031", "JS-1059", "JS-1042")
    "GE-34" = @("600-311-4510", "600-211-1340", "600-311-3510", "600-911-1161", "JS-3231A")
    "GE-35" = @("JS-2008", "F-6245")
    "GE-37" = @("C-1550", "JS-3005AB")
    "GE-53" = @("06020-46335")
    "GE-60" = @("O-2180", "O-2189", "DA-3025", "F-605")
    "GE-62" = @("C-1110", "26550065", "JS-3092A")
    "GE-69" = @("JS-2054", "FC-1503", "F-6245", "JS-3522A")
    "GE-82" = @("O-1301", "F-1303", "JS-3090A")
    "GE-83" = @("F-216", "D-778399")
    "GE-106"= @("JS-2052", "JS-3090AB")
    "GE-117"= @("06020-46335")
    "GE-118"= @("06020-46335")
    "GE-121"= @("1R-1808", "1R-0749", "423-8521")
}

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

function Get-Or-Create-Filter($filterCode) {
    $rs = $conn.Execute("SELECT FilterID FROM Filters WHERE OEMPartNumber = '$filterCode' OR HIFIPartNumber = '$filterCode'")
    if (-not $rs.EOF) {
        $id = $rs.Fields.Item("FilterID").Value
        $rs.Close()
        return $id
    }
    $rs.Close()

    Write-Host "Creating new filter: $filterCode"
    $sql = "INSERT INTO Filters (OEMPartNumber, Description, FilterCategory, CompatibleFleetTypes) VALUES ('$filterCode', 'Generator Filter', 'General Filter', 'Generator')"
    $conn.Execute($sql) | Out-Null

    $rs = $conn.Execute("SELECT TOP 1 FilterID FROM Filters WHERE OEMPartNumber = '$filterCode' ORDER BY FilterID DESC")
    $id = $rs.Fields.Item(0).Value
    $rs.Close()
    return $id
}

function Link-Filter($vehicleId, $filterId, $ecNumber) {
    if ([string]::IsNullOrWhiteSpace("$vehicleId") -or [string]::IsNullOrWhiteSpace("$filterId")) {
        Write-Host "ERROR: Invalid ID! V=$vehicleId F=$filterId"
        return $false
    }
    
    $query = "SELECT COUNT(*) FROM VehicleFilters WHERE MatchedVehicleID = $vehicleId AND FilterID = $filterId"
    $rs = $conn.Execute($query)
    $count = $rs.Fields.Item(0).Value
    $rs.Close()

    if ($count -eq 0) {
        $conn.Execute("INSERT INTO VehicleFilters (MatchedVehicleID, FilterID, MatchedECNumber, VehicleReference) VALUES ($vehicleId, $filterId, '$ecNumber', 'GE Auto-Link')") | Out-Null
        return $true
    }
    return $false
}

$conn.Execute("BEGIN TRANSACTION") | Out-Null
$linked = 0
$createdFilters = 0

foreach ($ge in $geMap.Keys) {
    $rs = $conn.Execute("SELECT VehicleID FROM Vehicles WHERE ECNumber = '$ge'")
    if ($rs.EOF) {
        Write-Host "Missing vehicle $ge, creating..."
        $conn.Execute("INSERT INTO Vehicles (SequenceNo, EquipmentDescription, ECNumber, Brand, VehicleType, Status) VALUES (999, 'GENERATOR', '$ge', 'GENERATOR', 'Generator', 'Active')") | Out-Null
        $rs2 = $conn.Execute("SELECT TOP 1 VehicleID FROM Vehicles WHERE ECNumber = '$ge' ORDER BY VehicleID DESC")
        $vId = $rs2.Fields.Item(0).Value
        $rs2.Close()
    } else {
        $vId = $rs.Fields.Item(0).Value
    }
    $rs.Close()

    $filters = $geMap[$ge]
    foreach ($f in $filters) {
        $fId = Get-Or-Create-Filter $f
        if ([string]::IsNullOrWhiteSpace("$fId")) { 
            Write-Host "FAILED to get ID for filter $f"
            continue 
        }
        if (Link-Filter $vId $fId $ge) {
            $linked++
            Write-Host "Linked $f (ID $fId) to $ge (ID $vId)"
        }
    }
}

$conn.Execute("COMMIT TRANSACTION") | Out-Null
$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null

Write-Host "Done. Added $linked links to Generators."
