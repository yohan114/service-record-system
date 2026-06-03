$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

$kits = @(
    # HAMM 311D (ID: 63)
    @{ Vid = 63; Cat = "Oil Filter"; Oem = "W950/26"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3349" },
    @{ Vid = 63; Cat = "Fuel 1"; Oem = "WK723"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5488" },
    @{ Vid = 63; Cat = "Air Outer"; Oem = "C16400"; Desc = "Air Filter Primary"; Cross = "Donaldson P777868" },

    # DYNAPAC CA250D / CA30D / CC142 II / CC1300 / CP-201W (IDs: 65, 68, 81, 83, 147)
    @{ Vid = 65; Cat = "Oil Filter"; Oem = "3903264"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3349" },
    @{ Vid = 65; Cat = "Fuel 1"; Oem = "3903640"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 65; Cat = "Fuel 2"; Oem = "3930942"; Desc = "Fuel Water Separator"; Cross = "Fleetguard FS1212" },
    @{ Vid = 65; Cat = "Air Outer"; Oem = "4700949774"; Desc = "Air Filter Primary"; Cross = "Donaldson P532501" },

    @{ Vid = 68; Cat = "Oil Filter"; Oem = "3903264"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3349" },
    @{ Vid = 68; Cat = "Fuel 1"; Oem = "3903640"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 68; Cat = "Air Outer"; Oem = "4700949774"; Desc = "Air Filter Primary"; Cross = "Donaldson P532501" },

    @{ Vid = 81; Cat = "Oil Filter"; Oem = "3903264"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3349" },
    @{ Vid = 81; Cat = "Fuel 1"; Oem = "3903640"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },

    @{ Vid = 83; Cat = "Oil Filter"; Oem = "3903264"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3349" },
    @{ Vid = 83; Cat = "Fuel 1"; Oem = "3903640"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },

    # BOMAG BW138 (IDs: 82, 86)
    @{ Vid = 82; Cat = "Oil Filter"; Oem = "05739141"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3462" },
    @{ Vid = 82; Cat = "Fuel 1"; Oem = "05710645"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 82; Cat = "Air Outer"; Oem = "05730044"; Desc = "Air Filter Primary"; Cross = "Donaldson P827653" },

    @{ Vid = 86; Cat = "Oil Filter"; Oem = "05739141"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3462" },
    @{ Vid = 86; Cat = "Fuel 1"; Oem = "05710645"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 86; Cat = "Air Outer"; Oem = "05730044"; Desc = "Air Filter Primary"; Cross = "Donaldson P827653" },

    # CASE CX220C / 1107EXD (IDs: 401, 60)
    @{ Vid = 401; Cat = "Oil Filter"; Oem = "84436125"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF16015" },
    @{ Vid = 401; Cat = "Fuel 1"; Oem = "84436126"; Desc = "Fuel Filter"; Cross = "Fleetguard FS19914" },
    @{ Vid = 401; Cat = "Air Outer"; Oem = "87682993"; Desc = "Air Filter Primary"; Cross = "Donaldson P785390" },

    @{ Vid = 60; Cat = "Oil Filter"; Oem = "84436125"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF16015" },
    @{ Vid = 60; Cat = "Fuel 1"; Oem = "84436126"; Desc = "Fuel Filter"; Cross = "Fleetguard FS19914" },

    # SAKAI Rollers (IDs: 57, 66, 92, 115, 117, 145, 152, 153)
    @{ Vid = 57; Cat = "Oil Filter"; Oem = "1-13240-023-0"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3704" },
    @{ Vid = 57; Cat = "Fuel 1"; Oem = "1-13240-079-0"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 57; Cat = "Air Outer"; Oem = "1-14215-055-0"; Desc = "Air Filter Primary"; Cross = "Donaldson P181052" },
    
    @{ Vid = 153; Cat = "Oil Filter"; Oem = "1-13240-023-0"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3704" },
    @{ Vid = 153; Cat = "Fuel 1"; Oem = "1-13240-079-0"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 153; Cat = "Air Outer"; Oem = "1-14215-055-0"; Desc = "Air Filter Primary"; Cross = "Donaldson P181052" }
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
            $sqlInsertL = "INSERT INTO VehicleFilters (MatchedVehicleID, FilterID, VehicleReference) VALUES ($vid, $fid, 'Batch 3 Injection')"
            $conn.Execute($sqlInsertL) | Out-Null
            Write-Host "  -> Linked $oem to Vehicle $vid"
        } else {
            Write-Host "  -> Link already exists for Vehicle $vid"
        }
        $rsLink.Close()
    }
    
    $conn.CommitTrans()
    Write-Host "Successfully injected Batch 3 filter kits!" -ForegroundColor Green
} catch {
    $conn.RollbackTrans()
    Write-Host "Error occurred: $_" -ForegroundColor Red
}

$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null
