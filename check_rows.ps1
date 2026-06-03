$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

try {
    $rs = $conn.Execute("SELECT * FROM ServiceJobs")
    $count = 0
    while (-not $rs.EOF) {
        Write-Host "ServiceID: $($rs.Fields.Item('ServiceID').Value)"
        $count++
        $rs.MoveNext()
    }
    Write-Host "Total jobs: $count"
    $rs.Close()
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
$conn.Close()
