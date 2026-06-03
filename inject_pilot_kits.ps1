$DbPath = "d:\Yohan\Service record\VehicleFilterDB.accdb"
$ConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"

$conn = New-Object -ComObject ADODB.Connection
$conn.Open($ConnStr)

$kits = @(
    # JCB 3DX
    @{ Vid = 1; Cat = "Oil Filter"; Oem = "320/04134"; Desc = "Engine Oil Filter" },
    @{ Vid = 1; Cat = "Fuel 1"; Oem = "320/A7088"; Desc = "Fuel Water Separator" },
    @{ Vid = 1; Cat = "Fuel 2"; Oem = "320/A7170"; Desc = "Secondary Fuel Filter" },
    @{ Vid = 1; Cat = "Air Outer"; Oem = "32/915801"; Desc = "Air Filter Primary" },
    @{ Vid = 1; Cat = "Air Inner"; Oem = "32/915802"; Desc = "Air Filter Safety" },
    @{ Vid = 1; Cat = "Hydraulic"; Oem = "40/300893"; Desc = "Hydraulic Filter" },
    @{ Vid = 1; Cat = "Transmission"; Oem = "581/18063"; Desc = "Transmission Filter" },

    # HYUNDAI R220LC-9S
    @{ Vid = 393; Cat = "Oil Filter"; Oem = "31N8-01360"; Desc = "Engine Oil Filter" },
    @{ Vid = 393; Cat = "Fuel 1"; Oem = "11E1-70230"; Desc = "Fuel Water Separator" },
    @{ Vid = 393; Cat = "Fuel 2"; Oem = "11E1-70140"; Desc = "Secondary Fuel Filter" },
    @{ Vid = 393; Cat = "Air Outer"; Oem = "11N6-24140"; Desc = "Air Filter Primary" },
    @{ Vid = 393; Cat = "Air Inner"; Oem = "11N6-24150"; Desc = "Air Filter Safety" },
    @{ Vid = 393; Cat = "Hydraulic"; Oem = "31Q6-01280"; Desc = "Hydraulic Return Filter" },
    @{ Vid = 393; Cat = "Hydraulic Pilot"; Oem = "31N6-01270"; Desc = "Pilot Filter" },

    # BOB CAT S450
    @{ Vid = 180; Cat = "Oil Filter"; Oem = "6678233"; Desc = "Engine Oil Filter" },
    @{ Vid = 180; Cat = "Fuel 1"; Oem = "6667352"; Desc = "Fuel Filter" },
    @{ Vid = 180; Cat = "Air Outer"; Oem = "7286322"; Desc = "Air Filter Primary" },
    @{ Vid = 180; Cat = "Air Inner"; Oem = "7286323"; Desc = "Air Filter Safety" },
    @{ Vid = 180; Cat = "Hydraulic"; Oem = "6692337"; Desc = "Hydraulic Filter" },

    # VOLVO EC210V
    @{ Vid = 365; Cat = "Oil Filter"; Oem = "478736"; Desc = "Engine Oil Filter" },
    @{ Vid = 365; Cat = "Fuel 1"; Oem = "11110683"; Desc = "Fuel Water Separator" },
    @{ Vid = 365; Cat = "Fuel 2"; Oem = "14506524"; Desc = "Secondary Fuel Filter" },
    @{ Vid = 365; Cat = "Air Outer"; Oem = "11110175"; Desc = "Air Filter Primary" },
    @{ Vid = 365; Cat = "Air Inner"; Oem = "11110176"; Desc = "Air Filter Safety" },
    @{ Vid = 365; Cat = "Hydraulic"; Oem = "14506889"; Desc = "Hydraulic Filter" },

    # KOMATSU PC120
    @{ Vid = 379; Cat = "Oil Filter"; Oem = "6736-51-5142"; Desc = "Engine Oil Filter" },
    @{ Vid = 379; Cat = "Fuel 1"; Oem = "6732-71-6111"; Desc = "Fuel Filter" },
    @{ Vid = 379; Cat = "Air Outer"; Oem = "600-181-8360"; Desc = "Air Filter Primary" },
    @{ Vid = 379; Cat = "Air Inner"; Oem = "600-181-8370"; Desc = "Air Filter Safety" },
    @{ Vid = 379; Cat = "Hydraulic"; Oem = "07063-01100"; Desc = "Hydraulic Filter" }
)

$conn.BeginTrans()

try {
    foreach ($k in $kits) {
        $vid = $k.Vid
        $oem = $k.Oem
        $cat = $k.Cat
        $desc = $k.Desc

        # 1. Check if filter exists
        $sqlCheck = "SELECT FilterID FROM Filters WHERE OEMPartNumber = '$oem'"
        $rs = $conn.Execute($sqlCheck)
        
        $fid = $null
        if (-not $rs.EOF) {
            $fid = $rs.Fields.Item("FilterID").Value
            Write-Host "Filter $oem exists (ID: $fid)"
        } else {
            # Insert filter
            $sqlInsertF = "INSERT INTO Filters (OEMPartNumber, FilterCategory, Description) VALUES ('$oem', '$cat', '$desc')"
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
            $sqlInsertL = "INSERT INTO VehicleFilters (MatchedVehicleID, FilterID, VehicleReference) VALUES ($vid, $fid, 'Pilot Batch Injected')"
            $conn.Execute($sqlInsertL) | Out-Null
            Write-Host "  -> Linked $oem to Vehicle $vid"
        } else {
            Write-Host "  -> Link already exists"
        }
        $rsLink.Close()
    }
    
    $conn.CommitTrans()
    Write-Host "Successfully injected pilot filter kits!" -ForegroundColor Green
} catch {
    $conn.RollbackTrans()
    Write-Host "Error occurred: $_" -ForegroundColor Red
}

$conn.Close()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($conn) | Out-Null
