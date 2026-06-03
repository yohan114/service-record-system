$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"
$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

try {
    $rs = $conn.Execute("SELECT TOP 50 * FROM ServiceJobs ORDER BY ServiceDate DESC")
    Write-Host "Success"
    $rs.Close()
} catch {
    Write-Host "Error 1: $($_.Exception.Message)"
}

try {
    $rs = $conn.Execute("SELECT * FROM ServiceOils WHERE ServiceID IN (1)")
    Write-Host "Success"
    $rs.Close()
} catch {
    Write-Host "Error 2: $($_.Exception.Message)"
}

$conn.Close()
