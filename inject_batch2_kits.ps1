$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

$kits = @(
    # ASHOK LEYLAND (Dump Trucks & Bowsers & Mixers)
    # IDs: 39 (Tusker), 206 (Comet Super), 269 (Comet), 271 (Tipper), 289 (Taurus), 290, 294, 357, 358, 408, 411
    @{ Vid = 39; Cat = "Oil Filter"; Oem = "AL-F2052100"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3704" },
    @{ Vid = 39; Cat = "Fuel 1"; Oem = "AL-F7033400"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5320" },
    @{ Vid = 39; Cat = "Fuel 2"; Oem = "AL-F7033500"; Desc = "Secondary Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 39; Cat = "Air Outer"; Oem = "AL-F8A02700"; Desc = "Air Filter Primary"; Cross = "Donaldson P532501" },
    
    @{ Vid = 289; Cat = "Oil Filter"; Oem = "AL-F2052100"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3704" },
    @{ Vid = 289; Cat = "Fuel 1"; Oem = "AL-F7033400"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5320" },
    @{ Vid = 289; Cat = "Air Outer"; Oem = "AL-F8A02700"; Desc = "Air Filter Primary"; Cross = "Donaldson P532501" },

    @{ Vid = 269; Cat = "Oil Filter"; Oem = "AL-F2052100"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3704" },
    @{ Vid = 269; Cat = "Fuel 1"; Oem = "AL-F7033400"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5320" },
    @{ Vid = 269; Cat = "Air Outer"; Oem = "AL-F8A02700"; Desc = "Air Filter Primary"; Cross = "Donaldson P532501" },

    # ISUZU (Giga, Forward, Mixers, Boom Trucks)
    # IDs: 35, 37, 208, 215, 216, 222, 255, 353, 361
    @{ Vid = 353; Cat = "Oil Filter"; Oem = "1-13240-023-0"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3704" },
    @{ Vid = 353; Cat = "Fuel 1"; Oem = "1-13240-079-0"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 353; Cat = "Air Outer"; Oem = "1-14215-055-0"; Desc = "Air Filter Primary"; Cross = "Donaldson P181052" },

    @{ Vid = 216; Cat = "Oil Filter"; Oem = "1-13240-023-0"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3704" },
    @{ Vid = 216; Cat = "Fuel 1"; Oem = "1-13240-079-0"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 216; Cat = "Air Outer"; Oem = "1-14215-055-0"; Desc = "Air Filter Primary"; Cross = "Donaldson P181052" },

    @{ Vid = 37; Cat = "Oil Filter"; Oem = "1-13240-023-0"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3704" },
    @{ Vid = 37; Cat = "Fuel 1"; Oem = "1-13240-079-0"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 37; Cat = "Air Outer"; Oem = "1-14215-055-0"; Desc = "Air Filter Primary"; Cross = "Donaldson P181052" },

    # HINO (Profia, FS1EWY)
    # IDs: 218, 359
    @{ Vid = 359; Cat = "Oil Filter"; Oem = "15607-1010"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3314" },
    @{ Vid = 359; Cat = "Fuel 1"; Oem = "23304-78090"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 359; Cat = "Air Outer"; Oem = "17801-2550"; Desc = "Air Filter Primary"; Cross = "Donaldson P531017" },
    
    @{ Vid = 218; Cat = "Oil Filter"; Oem = "15607-1010"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3314" },
    @{ Vid = 218; Cat = "Fuel 1"; Oem = "23304-78090"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 218; Cat = "Air Outer"; Oem = "17801-2550"; Desc = "Air Filter Primary"; Cross = "Donaldson P531017" },

    # EICHER (Terra 16, Dump Trucks)
    # IDs: 42, 284, 298
    @{ Vid = 42; Cat = "Oil Filter"; Oem = "EI-1002"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3704" },
    @{ Vid = 42; Cat = "Fuel 1"; Oem = "EI-1004"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5320" },
    
    @{ Vid = 284; Cat = "Oil Filter"; Oem = "EI-1002"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3704" },
    @{ Vid = 284; Cat = "Fuel 1"; Oem = "EI-1004"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5320" }
)

$conn.BeginTrans()

try {
    foreach ($k in $kits) {
        $vid = $k.Vid
        $oem = $k.Oem
        $cat = $k.Cat
        $desc = $k.Desc
        $cross = $k.Cross

        # 1. Check if filter exists
        $sqlCheck = "SELECT FilterID, CrossReferences FROM Filters WHERE OEMPartNumber = '$oem'"
        $rs = $conn.Execute($sqlCheck)
        
        $fid = $null
        if (-not $rs.EOF) {
            $fid = $rs.Fields.Item("FilterID").Value
            $existCross = $rs.Fields.Item("CrossReferences").Value
            Write-Host "Filter $oem exists (ID: $fid)"
            
            # Update CrossRefs if new
            if (-not [string]::IsNullOrEmpty($cross) -and $existCross -notmatch $cross) {
                $newCross = if ([string]::IsNullOrEmpty($existCross)) { $cross } else { "$existCross, $cross" }
                $sqlUpdate = "UPDATE Filters SET CrossReferences = '$newCross' WHERE FilterID = $fid"
                $conn.Execute($sqlUpdate) | Out-Null
            }
        } else {
            # Insert filter
            $sqlInsertF = "INSERT INTO Filters (OEMPartNumber, FilterCategory, Description, CrossReferences) VALUES ('$oem', '$cat', '$desc', '$cross')"
            $conn.Execute($sqlInsertF) | Out-Null
            
            # Get new ID
            $rsNew = $conn.Execute("SELECT @@IDENTITY")
            $fid = $rsNew.Fields.Item(0).Value
            Write-Host "Created new filter $oem (ID: $fid)"
            $rsNew.Close()
        }
        $rs.Close()

        # 2. Check if link exists
        $sqlCheckLink = "SELECT VehicleFilterID FROM VehicleFilters WHERE MatchedVehicleID = $vid AND FilterID = $fid"
        $rsLink = $conn.Execute($sqlCheckLink)
        
        if ($rsLink.EOF) {
            # Insert link
            $sqlInsertL = "INSERT INTO VehicleFilters (MatchedVehicleID, FilterID, VehicleReference) VALUES ($vid, $fid, 'Batch 2 Injection')"
            $conn.Execute($sqlInsertL) | Out-Null
            Write-Host "  -> Linked $oem to Vehicle $vid"
        } else {
            Write-Host "  -> Link already exists for Vehicle $vid"
        }
        $rsLink.Close()
    }
    
    $conn.CommitTrans()
    Write-Host "Successfully injected Batch 2 filter kits!" -ForegroundColor Green
} catch {
    $conn.RollbackTrans()
    Write-Host "Error occurred: $_" -ForegroundColor Red
}

$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null
