$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

$sql = "SELECT DISTINCT Brand, ModelNo, EquipmentDescription FROM Vehicles ORDER BY Brand, ModelNo"
$rs = $conn.Execute($sql)

Write-Host "Unique Vehicle Models:"
while (-not $rs.EOF) {
    $brand = $rs.Fields.Item("Brand").Value
    $model = $rs.Fields.Item("ModelNo").Value
    $desc = $rs.Fields.Item("EquipmentDescription").Value
    Write-Host "$brand | $model | $desc"
    $rs.MoveNext()
}

$rs.Close()
$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null
