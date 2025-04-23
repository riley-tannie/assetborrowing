const bcrypt = require("bcrypt");
const mysql = require("mysql2");

// Set up MySQL connection
const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'noosytravel',
    database: 'webproject2'
});

// Connect to MySQL
con.connect((err) => {
    if (err) throw err;
    console.log("Connected to the database!");

    // Admin details
    const username = "admin";  // Username for the admin
    const password = "admin123!@#";  // Plain text password for the admin

    // Hash the password using bcrypt
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) throw err;

        // Insert the admin into the database
        const sql = "INSERT INTO admins (username, password) VALUES (?, ?)";
        con.query(sql, [username, hashedPassword], (err, result) => {
            if (err) throw err;
            console.log("Admin user created successfully:", result);
            con.end(); // Close the connection
        });
    });
});
