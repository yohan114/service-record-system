const ADODB = require('node-adodb');
const path = require('path');
const dbPath = path.join(__dirname, 'VehicleFilterDB.accdb');
const connection = ADODB.open(`Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${dbPath};`, true);

async function test() {
    try {
        await connection.query("SELECT * FROM Vehicles WHERE VehicleID = undefined");
        console.log("Success");
    } catch (e) {
        console.log("Caught error:", e.message);
    }
}
test();
