$MachineListPath = "d:\Yohan\Service record\MACHINE LIST 2022.11.10.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wbMachine = $excel.Workbooks.Open($MachineListPath)
$ws = $wbMachine.Worksheets.Item("Sheet1")
Write-Host "Data in Sheet1:"

for ($r = 1; $r -le 10; $r++) {
    $row = ""
    for ($c = 1; $c -le 8; $c++) {
        $cell = $ws.Cells.Item($r, $c)
        if ($null -ne $cell) {
            $row += "$($cell.Text) | "
        }
    }
    Write-Host $row
}

$wbMachine.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
