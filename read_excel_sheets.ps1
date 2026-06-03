$file = 'd:\Yohan\Service record\Service record.xlsx'
$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$file;Extended Properties='Excel 12.0 Xml;HDR=YES;IMEX=1';"
$conn = New-Object -ComObject ADODB.Connection
$conn.Open($connStr)

$rs = $conn.OpenSchema(20) # adSchemaTables
while (-not $rs.EOF) {
    Write-Host $rs.Fields.Item('TABLE_NAME').Value
    $rs.MoveNext()
}
$conn.Close()
