$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

$filterCode = "600-311-4510"

$rs = $conn.Execute("SELECT FilterID FROM Filters WHERE OEMPartNumber = '$filterCode' OR HIFIPartNumber = '$filterCode'")
if (-not $rs.EOF) {
    $id = $rs.Fields.Item("FilterID").Value
    Write-Host "Found ID: $id (Type: $($id.GetType().Name))"
} else {
    Write-Host "Not found"
}
$rs.Close()

$conn.Close()
