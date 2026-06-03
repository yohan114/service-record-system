$ErrorActionPreference = 'Stop'

$dbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$dbConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;"
$dbConn = New-Object -ComObject ADODB.Connection
$dbConn.Open($dbConnStr)

# 1. Load Vehicles
$vehicles = @()
$rsVeh = $dbConn.Execute("SELECT VehicleID, ECNumber, RegistrationNo, Brand, ModelNo, VehicleType FROM Vehicles")
while (-not $rsVeh.EOF) {
    $vehicles += [PSCustomObject]@{
        VehicleID = $rsVeh.Fields.Item("VehicleID").Value
        ECNumber = [string]$rsVeh.Fields.Item("ECNumber").Value
        RegistrationNo = [string]$rsVeh.Fields.Item("RegistrationNo").Value
    }
    $rsVeh.MoveNext()
}
$rsVeh.Close()

# Helper to find VehicleID
function Find-VehicleID {
    param([string]$vehMachineNo)
    
    if ([string]::IsNullOrWhiteSpace($vehMachineNo)) { return $null }
    
    $vehMachineNo = $vehMachineNo.Trim().ToUpper()
    
    # Check exact match
    foreach ($v in $vehicles) {
        if (-not [string]::IsNullOrWhiteSpace($v.ECNumber) -and $vehMachineNo -match [regex]::Escape($v.ECNumber.ToUpper())) {
            return $v.VehicleID
        }
        if (-not [string]::IsNullOrWhiteSpace($v.RegistrationNo) -and $vehMachineNo -match [regex]::Escape($v.RegistrationNo.ToUpper())) {
            return $v.VehicleID
        }
    }
    return $null
}

# 2. Connect to Excel
$exPath = "d:\Yohan\Service record\Service record.xlsx"
$exConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$exPath;Extended Properties='Excel 12.0 Xml;HDR=YES;IMEX=1';"
$exConn = New-Object -ComObject ADODB.Connection
$exConn.Open($exConnStr)

# We will write missing vehicles to a log
$missingLog = "d:\Yohan\Service record\missing_vehicles_log.txt"
"Unmatched Vehicles from Excel:" | Out-File $missingLog -Encoding UTF8

$rsEx = $exConn.Execute("SELECT * FROM [Summery$]")

$countSuccess = 0
$countMissing = 0
$countErrors = 0

while (-not $rsEx.EOF) {
    $rawDate = $rsEx.Fields.Item("Date").Value
    $jobNo = [string]$rsEx.Fields.Item("job no#").Value
    $vehRaw = [string]$rsEx.Fields.Item("Vehicle/Machine No").Value
    $site = [string]$rsEx.Fields.Item("Site").Value
    $sm = [string]$rsEx.Fields.Item("S#M").Value
    $nsm = [string]$rsEx.Fields.Item("N#S#M").Value
    $remarks = [string]$rsEx.Fields.Item("Remarks").Value
    
    $oilFilter = [string]$rsEx.Fields.Item("oil Filter").Value
    $fuel1 = [string]$rsEx.Fields.Item("Fuel 1").Value
    $fuel2 = [string]$rsEx.Fields.Item("Fuel 2(W/Sep)").Value
    $lineFilter = [string]$rsEx.Fields.Item("Line filter").Value
    $airInner = [string]$rsEx.Fields.Item("Air inner").Value
    $airOuter = [string]$rsEx.Fields.Item("Air Outer").Value
    $gearTrans = [string]$rsEx.Fields.Item("Gear/trans").Value
    $hyFilter = [string]$rsEx.Fields.Item("Hy# Filter").Value

    $rsEx.MoveNext()
    
    if ([string]::IsNullOrWhiteSpace($vehRaw)) { continue }

    $vehID = Find-VehicleID -vehMachineNo $vehRaw

    if ($null -eq $vehID) {
        "$vehRaw (Date: $rawDate)" | Out-File $missingLog -Append -Encoding UTF8
        $countMissing++
        continue
    }
    
    # Parse date
    $sDate = ""
    if ($rawDate -is [datetime]) {
        $sDate = $rawDate.ToString("yyyy-MM-dd")
    } else {
        if ($rawDate -match "(\d{1,2})\.(\d{1,2})\.(\d{4})") {
            $sDate = "$($matches[3])-$($matches[2])-$($matches[1])"
        } elseif (-not [string]::IsNullOrWhiteSpace($rawDate)) {
            try {
                $sDate = [datetime]::Parse($rawDate).ToString("yyyy-MM-dd")
            } catch {
                $sDate = ""
            }
        }
    }
    if ([string]::IsNullOrWhiteSpace($sDate)) { $sDate = '1900-01-01' } # fallback

    $escJobNo = $jobNo.Replace("'", "''").Substring(0, [math]::Min($jobNo.Length, 50))
    $escSite = $site.Replace("'", "''")
    $escSM = $sm.Replace("'", "''").Substring(0, [math]::Min($sm.Length, 50))
    $escNSM = $nsm.Replace("'", "''").Substring(0, [math]::Min($nsm.Length, 50))
    $escRemarks = $remarks.Replace("'", "''")

    $sqlJob = "INSERT INTO ServiceJobs (VehicleID, ServiceDate, JobNo, MeterReading, NextServiceMeter, SiteLocation, RepairDetails) VALUES ($vehID, '$sDate', '$escJobNo', '$escSM', '$escNSM', '$escSite', '$escRemarks')"

    try {
        $null = $dbConn.Execute($sqlJob)
        $rsId = $dbConn.Execute("SELECT @@IDENTITY")
        $serviceId = $rsId.Fields.Item(0).Value
        $rsId.Close()

        # Insert Filters
        $filtersToInsert = @(
            @{ Cat = 'Oil Filter'; Val = $oilFilter },
            @{ Cat = 'Fuel 1'; Val = $fuel1 },
            @{ Cat = 'Fuel 2'; Val = $fuel2 },
            @{ Cat = 'Line Filter'; Val = $lineFilter },
            @{ Cat = 'Air Inner'; Val = $airInner },
            @{ Cat = 'Air Outer'; Val = $airOuter },
            @{ Cat = 'Gear/Trans'; Val = $gearTrans },
            @{ Cat = 'Hy Filter'; Val = $hyFilter }
        )

        foreach ($f in $filtersToInsert) {
            if (-not [string]::IsNullOrWhiteSpace($f.Val)) {
                $escFVal = $f.Val.Replace("'", "''")
                $sqlF = "INSERT INTO ServiceFilters (ServiceID, FilterNo, FilterCategory) VALUES ($serviceId, '$escFVal', '$($f.Cat)')"
                $null = $dbConn.Execute($sqlF)
            }
        }
        $countSuccess++
    } catch {
        Write-Host "Error inserting job for $vehRaw : $($_.Exception.Message)"
        $countErrors++
    }
}
$rsEx.Close()
$exConn.Close()
$dbConn.Close()

Write-Host "Migration Complete!"
Write-Host "Success: $countSuccess"
Write-Host "Missing Vehicles: $countMissing"
Write-Host "Errors: $countErrors"
