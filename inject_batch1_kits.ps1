$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

$kits = @(
    # CAT 314C (ID 382)
    @{ Vid = 382; Cat = "Oil Filter"; Oem = "1R-0739"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3342" },
    @{ Vid = 382; Cat = "Fuel 1"; Oem = "1R-0751"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5324" },
    @{ Vid = 382; Cat = "Air Outer"; Oem = "131-8822"; Desc = "Primary Air Filter"; Cross = "Donaldson P532501" },
    @{ Vid = 382; Cat = "Hydraulic"; Oem = "1G-8878"; Desc = "Hydraulic Filter"; Cross = "Fleetguard HF6553" },

    # CAT 910E (ID 25)
    @{ Vid = 25; Cat = "Oil Filter"; Oem = "1R-1807"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3342" },
    @{ Vid = 25; Cat = "Fuel 1"; Oem = "1R-0750"; Desc = "Primary Fuel Filter"; Cross = "Fleetguard FF5320" },
    @{ Vid = 25; Cat = "Air Outer"; Oem = "110-6326"; Desc = "Primary Air Filter"; Cross = "Donaldson P531017" },
    
    # CAT 216B3 (ID 177)
    @{ Vid = 177; Cat = "Oil Filter"; Oem = "220-1523"; Desc = "Engine Oil Filter"; Cross = "Baldwin B7298" },
    @{ Vid = 177; Cat = "Fuel 1"; Oem = "156-1200"; Desc = "Fuel Water Separator"; Cross = "Donaldson P551421" },
    @{ Vid = 177; Cat = "Air Outer"; Oem = "274-1962"; Desc = "Air Filter Primary"; Cross = "Donaldson P828889" },
    
    # KOBELCO 200 / SK200 (ID 383)
    @{ Vid = 383; Cat = "Oil Filter"; Oem = "YN52V01016P1"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3664" },
    @{ Vid = 383; Cat = "Fuel 1"; Oem = "YN21P01068S003"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5527" },
    @{ Vid = 383; Cat = "Air Outer"; Oem = "YN11P00008S002"; Desc = "Air Filter Primary"; Cross = "Donaldson P532501" },
    @{ Vid = 383; Cat = "Hydraulic"; Oem = "YN52V01011P1"; Desc = "Hydraulic Return Filter"; Cross = "Fleetguard HF6553" },

    # KOBELCO SK115SR (ID 381)
    @{ Vid = 381; Cat = "Oil Filter"; Oem = "VA32G9000100"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3664" },
    @{ Vid = 381; Cat = "Fuel 1"; Oem = "VA34G6100010"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 381; Cat = "Air Outer"; Oem = "YN11P00009S002"; Desc = "Air Filter Primary"; Cross = "Donaldson P531017" },

    # HITACHI EX75UR-3 (ID 378)
    @{ Vid = 378; Cat = "Oil Filter"; Oem = "4231144"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3664" },
    @{ Vid = 378; Cat = "Fuel 1"; Oem = "4231143"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 378; Cat = "Air Outer"; Oem = "4150554"; Desc = "Air Filter Primary"; Cross = "Donaldson P181052" },
    @{ Vid = 378; Cat = "Hydraulic"; Oem = "4325820"; Desc = "Hydraulic Return Filter"; Cross = "Fleetguard HF6553" },

    # KOMATSU PC60 (ID 369)
    @{ Vid = 369; Cat = "Oil Filter"; Oem = "6736-51-5141"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3664" },
    @{ Vid = 369; Cat = "Fuel 1"; Oem = "6732-71-6111"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 369; Cat = "Air Outer"; Oem = "600-181-8360"; Desc = "Air Filter Primary"; Cross = "Donaldson P532501" },
    @{ Vid = 369; Cat = "Hydraulic"; Oem = "07063-01054"; Desc = "Hydraulic Filter"; Cross = "Fleetguard HF6553" },

    # KOMATSU WA100 (ID 27)
    @{ Vid = 27; Cat = "Oil Filter"; Oem = "600-211-2110"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF3342" },
    @{ Vid = 27; Cat = "Fuel 1"; Oem = "600-311-8293"; Desc = "Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 27; Cat = "Air Outer"; Oem = "600-181-8450"; Desc = "Air Filter Primary"; Cross = "Donaldson P532501" },

    # HYUNDAI 220LC-7 (ID 400)
    @{ Vid = 400; Cat = "Oil Filter"; Oem = "31E9-01260"; Desc = "Engine Oil Filter"; Cross = "Fleetguard LF9009" },
    @{ Vid = 400; Cat = "Fuel 1"; Oem = "11E1-70230"; Desc = "Fuel Water Separator"; Cross = "Fleetguard FS1000" },
    @{ Vid = 400; Cat = "Fuel 2"; Oem = "11E1-70140"; Desc = "Secondary Fuel Filter"; Cross = "Fleetguard FF5052" },
    @{ Vid = 400; Cat = "Air Outer"; Oem = "11N6-24140"; Desc = "Air Filter Primary"; Cross = "Donaldson P532501" },
    @{ Vid = 400; Cat = "Hydraulic"; Oem = "31E9-01280"; Desc = "Hydraulic Return Filter"; Cross = "Fleetguard HF6553" }
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
            $sqlInsertL = "INSERT INTO VehicleFilters (MatchedVehicleID, FilterID, VehicleReference) VALUES ($vid, $fid, 'Batch 1 Injection')"
            $conn.Execute($sqlInsertL) | Out-Null
            Write-Host "  -> Linked $oem to Vehicle $vid"
        } else {
            Write-Host "  -> Link already exists for Vehicle $vid"
        }
        $rsLink.Close()
    }
    
    $conn.CommitTrans()
    Write-Host "Successfully injected Batch 1 filter kits!" -ForegroundColor Green
} catch {
    $conn.RollbackTrans()
    Write-Host "Error occurred: $_" -ForegroundColor Red
}

$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null
