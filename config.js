const mysql = require('mysql2');

const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'noosytravel',
    database: 'webproject2'
});

module.exports = con;