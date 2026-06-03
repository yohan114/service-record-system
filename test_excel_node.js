const ADODB = require('node-adodb');
const path = require('path');

const excelPath = path.join(__dirname, 'Service record.xlsx');
const excelConn = ADODB.open(`Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${excelPath};Extended Properties="Excel 12.0 Xml;HDR=YES;IMEX=1";`, true);

async function test() {
    try {
        const rows = await excelConn.query('SELECT TOP 5 * FROM [Summery$]');
        console.log(rows);
    } catch(e) {
        console.error(e);
    }
}
test();
