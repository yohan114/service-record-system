$file = 'd:\Yohan\Service record\Service record.xlsx'
$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$file;Extended Properties='Excel 12.0 Xml;HDR=YES;IMEX=1';"
$conn = New-Object -ComObject ADODB.Connection
$conn.Open($connStr)

$rs = $conn.Execute("SELECT TOP 5 * FROM [Service summery$]")
Write-Host "--- Service summery$ ---"
while (-not $rs.EOF) {
    $row = @()
    for ($i=0; $i -lt $rs.Fields.Count; $i++) {
        $row += "$($rs.Fields.Item($i).Name): $($rs.Fields.Item($i).Value)"
    }
    Write-Host ($row -join " | ")
    $rs.MoveNext()
}
$rs.Close()

$rs2 = $conn.Execute("SELECT TOP 5 * FROM [Summery$]")
Write-Host "`n--- Summery$ ---"
while (-not $rs2.EOF) {
    $row = @()
    for ($i=0; $i -lt $rs2.Fields.Count; $i++) {
        $row += "$($rs2.Fields.Item($i).Name): $($rs2.Fields.Item($i).Value)"
    }
    Write-Host ($row -join " | ")
    $rs2.MoveNext()
}
$rs2.Close()

$conn.Close()
