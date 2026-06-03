$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

$kits = @(
    # JCB 3DX / 3CX (IDs: 1, 4, 6, 7, 8, 16)
    @{ Vid = 1; Cat = "Oil Filter"; Oem = "320/04133"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF16011" },
    @{ Vid = 1; Cat = "Fuel 1"; Oem = "320/07155"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5794" },
    @{ Vid = 1; Cat = "Air Outer"; Oem = "32/925682"; Desc = "Air Filter Primary"; Cross = "Donaldson P772580" },

    @{ Vid = 6; Cat = "Oil Filter"; Oem = "320/04133"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF16011" },
    @{ Vid = 6; Cat = "Fuel 1"; Oem = "320/07155"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5794" },
    @{ Vid = 6; Cat = "Air Outer"; Oem = "32/925682"; Desc = "Air Filter Primary"; Cross = "Donaldson P772580" },

    @{ Vid = 8; Cat = "Oil Filter"; Oem = "320/04133"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF16011" },
    @{ Vid = 8; Cat = "Fuel 1"; Oem = "320/07155"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5794" },
    @{ Vid = 8; Cat = "Air Outer"; Oem = "32/925682"; Desc = "Air Filter Primary"; Cross = "Donaldson P772580" },

    # BOBCAT S130 / S450 / S770 / S-16 (IDs: 171, 179, 180, 188, 193)
    @{ Vid = 171; Cat = "Oil Filter"; Oem = "6675517"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3376" },
    @{ Vid = 171; Cat = "Fuel 1"; Oem = "6667352"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 171; Cat = "Air Outer"; Oem = "6672467"; Desc = "Air Filter Primary"; Cross = "Donaldson P821575" },

    @{ Vid = 180; Cat = "Oil Filter"; Oem = "6675517"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3376" },
    @{ Vid = 180; Cat = "Fuel 1"; Oem = "6667352"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 180; Cat = "Air Outer"; Oem = "6672467"; Desc = "Air Filter Primary"; Cross = "Donaldson P821575" },

    @{ Vid = 188; Cat = "Oil Filter"; Oem = "6675517"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3376" },
    @{ Vid = 188; Cat = "Fuel 1"; Oem = "6667352"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 188; Cat = "Air Outer"; Oem = "6672467"; Desc = "Air Filter Primary"; Cross = "Donaldson P821575" },

    # TRACTORS (Massey Ferguson 135/240, TAFE, Mahindra) (IDs: 425, 426, 429, 432, 433, 434)
    @{ Vid = 434; Cat = "Oil Filter"; Oem = "1447082M91"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3313" },
    @{ Vid = 434; Cat = "Fuel 1"; Oem = "7111-296"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 434; Cat = "Air Outer"; Oem = "3597401M2"; Desc = "Air Filter Primary"; Cross = "Donaldson P181052" },

    @{ Vid = 425; Cat = "Oil Filter"; Oem = "1447082M91"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3313" },
    @{ Vid = 425; Cat = "Fuel 1"; Oem = "7111-296"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    
    @{ Vid = 429; Cat = "Oil Filter"; Oem = "0055588F1"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3313" },
    @{ Vid = 429; Cat = "Fuel 1"; Oem = "7111-296"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    
    # FIORI Mixers (IDs: 50, 51, 52)
    @{ Vid = 50; Cat = "Oil Filter"; Oem = "FIO-OIL-01"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3349" },
    @{ Vid = 50; Cat = "Fuel 1"; Oem = "FIO-FUEL-01"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 50; Cat = "Air Outer"; Oem = "FIO-AIR-01"; Desc = "Air Filter Primary"; Cross = "Donaldson P532501" },
    
    @{ Vid = 51; Cat = "Oil Filter"; Oem = "FIO-OIL-01"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3349" },
    @{ Vid = 51; Cat = "Fuel 1"; Oem = "FIO-FUEL-01"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" }
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
            $sqlInsertL = "INSERT INTO VehicleFilters (MatchedVehicleID, FilterID, VehicleReference) VALUES ($vid, $fid, 'Batch 4 Injection')"
            $conn.Execute($sqlInsertL) | Out-Null
            Write-Host "  -> Linked $oem to Vehicle $vid"
        } else {
            Write-Host "  -> Link already exists for Vehicle $vid"
        }
        $rsLink.Close()
    }
    
    $conn.CommitTrans()
    Write-Host "Successfully injected Batch 4 filter kits!" -ForegroundColor Green
} catch {
    $conn.RollbackTrans()
    Write-Host "Error occurred: $_" -ForegroundColor Red
}

$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null
