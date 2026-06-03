$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

try {
    # Insert a dummy record
    $conn.Execute("INSERT INTO ServiceJobs (VehicleID, ServiceDate, SiteLocation) VALUES (1, '2023-01-01', 'Test')")
    
    # Fetch identity
    $rs = $conn.Execute("SELECT @@IDENTITY")
    $id = $rs.Fields.Item(0).Value
    Write-Host "Inserted ID: $id"
    $rs.Close()
    
    # Delete it
    $conn.Execute("DELETE FROM ServiceJobs WHERE ServiceID = $id")
    Write-Host "Deleted dummy record."
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
$conn.Close()
