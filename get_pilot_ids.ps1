$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"
$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

$queries = @(
    "SELECT ID, EC, Brand, ModelNo FROM Vehicles WHERE Brand = 'JCB' AND ModelNo = '3DX' ORDER BY ID",
    "SELECT ID, EC, Brand, ModelNo FROM Vehicles WHERE Brand = 'HYUNDAI' AND ModelNo = 'R220LC-9S' ORDER BY ID",
    "SELECT ID, EC, Brand, ModelNo FROM Vehicles WHERE Brand = 'BOB CAT' AND ModelNo = 'S-450' ORDER BY ID",
    "SELECT ID, EC, Brand, ModelNo FROM Vehicles WHERE Brand = 'VOLVO' ORDER BY ID",
    "SELECT ID, EC, Brand, ModelNo FROM Vehicles WHERE Brand = 'KOMATSU' AND ModelNo = 'PC-120-6EO' ORDER BY ID"
)

foreach ($q in $queries) {
    Write-Host "Running: $q"
    $rs = $conn.Execute($q)
    while (-not $rs.EOF) {
        $id = $rs.Fields.Item("ID").Value
        $ec = $rs.Fields.Item("EC").Value
        $brand = $rs.Fields.Item("Brand").Value
        $model = $rs.Fields.Item("ModelNo").Value
        Write-Host "  -> ID: $id | EC: $ec | $brand $model"
        $rs.MoveNext()
    }
    $rs.Close()
}

$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null
