$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

Write-Host "Searching Filters for Generators..."
$rs = $conn.Execute("SELECT FilterID, OEMPartNumber, HIFIPartNumber, Description, CompatibleFleetTypes FROM Filters WHERE Description LIKE '%Generator%' OR CompatibleFleetTypes LIKE '%Generator%' OR TopVehicleMatch LIKE '%Generator%' OR CompatibleFleetTypes LIKE '%Denyo%' OR Description LIKE '%Denyo%'")

while (-not $rs.EOF) {
    Write-Host "$($rs.Fields.Item('FilterID').Value) | $($rs.Fields.Item('OEMPartNumber').Value) | $($rs.Fields.Item('HIFIPartNumber').Value) | $($rs.Fields.Item('Description').Value) | $($rs.Fields.Item('CompatibleFleetTypes').Value)"
    $rs.MoveNext()
}

$rs.Close()
$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null
