const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const multer = require("multer");
const path = require('path');
const router = express.Router();
const con = require('./config/config');
const bodyParser = require('body-parser');


const app = express();
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/assets/images/assetImages/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });


app.get('/check-request', (req, res) => {
    const { email, assetId } = req.query;

    if (!email || !assetId) {
        return res.status(400).json({ error: 'Missing email or assetId' });
    }

    const emailPrefix = email.split('@')[0];
    const emailLike = `${emailPrefix}@%`;

    const getUserSql = `SELECT id FROM users WHERE email LIKE ?`;
    con.query(getUserSql, [emailLike], (err, userResults) => {
        if (err) {
            console.error('Database error (getUserSql):', err); // Log the error
            return res.status(500).json({ error: 'Database error', details: err.message });
        }

        if (userResults.length === 0) {
            return res.json({ exists: false, reason: 'User not found' });
        }

        const userId = userResults[0].id;

        const checkRequestSql = `SELECT request_id FROM borrow_requests WHERE student_id = ? AND asset_id = ? AND status = 'pending'`;
        con.query(checkRequestSql, [userId, assetId], (err, requestResults) => {
            if (err) {
                console.error('Database error (checkRequestSql):', err); // Log the error
                return res.status(500).json({ error: 'Database error', details: err.message });
            }

            if (requestResults.length > 0) {
                res.json({ exists: true });
            } else {
                res.json({ exists: false });
            }
        });
    });
});



// ================== Register Route ==================
app.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: "All fields are required." });
    }

    // Check email domain
    if (!email.toLowerCase().endsWith('@lamduan.mfu.ac.th')) {
        return res.status(400).json({ error: "Please use Lamduan Mail" });
    }

    // Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the unified 'users' table
    const sql = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
    con.query(sql, [username, email, hashedPassword, role], (err) => {
        if (err) return res.status(500).json({ error: `Error registering ${role}.` });
        res.status(201).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} registration successful!` });
    });
});


// Middleware
app.use(bodyParser.json());

// Endpoint to handle admin login
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;

    // Query to find the admin by username
    const sql = "SELECT * FROM admins WHERE username = ?";
    con.query(sql, [username], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (result.length === 0) {
            return res.status(401).json({ success: false, message: 'Incorrect username or password' });
        }

        // Check if the password matches
        bcrypt.compare(password, result[0].password, (err, isMatch) => {
            if (err) return res.status(500).json({ error: 'Error comparing passwords' });

            if (isMatch) {
                res.json({ success: true, message: 'Login successful' });
            } else {
                res.status(401).json({ success: false, message: 'Incorrect password' });
            }
        });
    });
});

// Add user (lecturer/staff)
app.post('/admin/add-user', (req, res) => {
    const { username, email, password, role } = req.body;

    // Check if the email already exists
    const checkEmailSql = "SELECT * FROM users WHERE email = ?";
    con.query(checkEmailSql, [email], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (result.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash the password before saving it
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ error: 'Error hashing password' });
            }

            // SQL query to insert the new user
            const sql = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)";
            con.query(sql, [username, email, hashedPassword, role], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({ success: true, message: 'User added successfully' });
            });
        });
    });
});



/*
http://localhost:3000/admin/add-user
{
    "username": "John Doe",
    "email": "johndoe@lamduan.mfu.ac.th",
    "password": "jd1234",
    "role": "lecturer"
}
*/


// ================== Login Route ==================
app.post('/login', (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ error: "All fields are required." });
    }

    // Validate email domain based on role
    if (role === "student") {
        if (!email.toLowerCase().endsWith('@lamduan.mfu.ac.th')) {
            return res.status(400).json({ error: "Students must use a Lamduan Mail." });
        }
    } else if (role === "lecturer" || role === "staff") {
        if (!email.toLowerCase().endsWith('@mfu.ac.th')) {
            return res.status(400).json({ error: "Lecturers and Staff must use an MFU Mail." });
        }
    } else {
        return res.status(400).json({ error: "Invalid role selected." });
    }

    // Query the database to get user data
    const sql = 'SELECT id, username, email, password FROM users WHERE email = ? AND role = ?';
    con.query(sql, [email, role], async (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error." });
        }

        if (result.length === 0) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const user = result[0];

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        let userId;
        if (role === "student") {
            userId = user.email.split('@')[0]; // Extract part before @ for students
        } else {
            userId = user.id; // Use DB ID for lecturers and staff
        }

        res.status(200).json({
            message: "Login successful!",
            user: {
                username: user.username,
                id: userId,
                email: user.email,
                role: role
            }
        });
    });
});

// Add Category Route
app.post('/add-category', (req, res) => {
    const { category_id, category_name, description } = req.body;

    if (!category_id || !category_name || !description) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const created_at = new Date();
    const updated_at = created_at;

    // SQL query to insert the new category
    const sql = "INSERT INTO categories (category_id, category_name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)";
    con.query(sql, [category_id, category_name, description, created_at, updated_at], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, message: 'Category added successfully' });
    });
});

app.post('/api/categories', (req, res) => {
    const { category_name, description } = req.body;

    if (!category_name || !description) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const created_at = new Date();
    const updated_at = created_at;

    const sql = "INSERT INTO categories (category_name, description, created_at, updated_at) VALUES (?, ?, ?, ?)";
    con.query(sql, [category_name, description, created_at, updated_at], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Category added successfully' });
    });
});

app.put('/api/categories/:id', (req, res) => {
    const { category_name, description } = req.body;
    const { id } = req.params;

    if (!category_name || !description) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const updated_at = new Date();

    const sql = "UPDATE categories SET category_name = ?, description = ?, updated_at = ? WHERE category_id = ?";
    con.query(sql, [category_name, description, updated_at, id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.json({ success: true, message: 'Category updated successfully' });
    });
});

app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM categories WHERE category_id = ?";
    con.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.json({ success: true, message: 'Category deleted successfully' });
    });
});

/*

*/

// Edit Category Route
app.put('/edit-category/:category_id', (req, res) => {
    const { category_name, description } = req.body;
    const { category_id } = req.params;

    if (!category_name || !description) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const updated_at = new Date();

    const sql = "UPDATE categories SET category_name = ?, description = ?, updated_at = ? WHERE category_id = ?";
    con.query(sql, [category_name, description, updated_at, category_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ success: true, message: 'Category updated successfully' });
    });
});
// Delete Category Route
app.delete('/admin/delete-category/:category_id', (req, res) => {
    const { category_id } = req.params;

    // SQL query to delete the category
    const sql = "DELETE FROM categories WHERE category_id = ?";
    con.query(sql, [category_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ success: true, message: 'Category deleted successfully' });
    });
});
// ================== Get Categories Route ==================
app.get('/get-all-categories', (req, res) => {
    const sql = "SELECT * FROM categories";
    con.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'No categories found' });
        }

        res.json({
            success: true,
            categories: result
        });
    });
});

// ================== Add Assets ==================
app.post('/add-asset', upload.single('image'), (req, res) => {
    const { name, description, status, category_id, created_by } = req.body;
    const imageFile = req.file;

    const image_path = imageFile ? `/public/assets/images/assetImages//${imageFile.filename}` : null;

    if (!name || !status || !category_id || !created_by) {
        return res.status(400).json({ error: "All required fields must be provided." });
    }

    const created_at = new Date();
    const updated_at = new Date();

    // SQL query to insert new asset into the assets table
    const sql = "INSERT INTO assets (name, description, image_path, status, category_id, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    con.query(sql, [name, description, image_path, status, category_id, created_by, created_at, updated_at], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({
            success: true,
            message: 'Asset added successfully',
            asset_id: result.insertId
        });
    });
});

// ================== Edit Assets ==================
app.put('/edit-asset/:asset_id', upload.single('image'), (req, res) => {
    const { asset_id } = req.params;
    const { name, description, status, category_id, created_by } = req.body;

    if (!name || !status || !category_id || !created_by) {
        return res.status(400).json({ error: "All required fields must be provided." });
    }

    const updated_at = new Date();
    const image_path = req.file
        ? `/assets/images/assetImages/${req.file.filename}`
        : req.body.image_path || null;

    const sql = `
      UPDATE assets 
      SET name = ?, description = ?, image_path = ?, status = ?, category_id = ?, created_by = ?, updated_at = ?
      WHERE asset_id = ?
    `;

    con.query(
        sql,
        [name, description, image_path, status, category_id, created_by, updated_at, asset_id],
        (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (result.affectedRows === 0)
                return res.status(404).json({ error: 'Asset not found' });

            res.json({ success: true, message: 'Asset updated successfully', asset_id });
        }
    );
});
// ================== Disable Assets ==================
app.put('/disable-asset/:asset_id', (req, res) => {
    const { asset_id } = req.params;  // Retrieve asset_id from URL parameter

    // SQL query to disable the asset by changing its status to 'disabled'
    const sql = `UPDATE assets SET status = 'disabled', updated_at = ? WHERE asset_id = ?`;

    const updated_at = new Date();

    con.query(sql, [updated_at, asset_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json({
            success: true,
            message: 'Asset disabled successfully',
            asset_id: asset_id
        });
    });
});
// ================ Enable Assets ================
app.put('/enable-asset/:asset_id', (req, res) => {
    const { asset_id } = req.params;
    const sql = `UPDATE assets SET status = 'available', updated_at = ? WHERE asset_id = ?`;
    const updated_at = new Date();

    con.query(sql, [updated_at, asset_id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (result.affectedRows === 0)
            return res.status(404).json({ error: 'Asset not found' });

        res.json({
            success: true,
            message: 'Asset enabled successfully',
            asset_id: asset_id
        });
    });
});


// ================== Show Assets ==================
app.get('/api/assets', (req, res) => {
    const query = "SELECT asset_id, name, status, image_path FROM assets";
    con.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result); // Send back the asset data
    });
});


// ================== Request Assets Students ==================
app.post("/student/request-asset", (req, res) => {
    const { student_id, asset_id, borrow_date, return_date, student_reason } = req.body;

    // Assuming the email domain is fixed
    const emailDomain = "@lamduan.mfu.ac.th";
    const email = student_id + emailDomain;

    console.log("Full email being checked:", email);

    con.beginTransaction(err => {
        if (err) {
            console.error("Transaction error:", err);
            return res.status(500).json({ error: "Database transaction error" });
        }

        // 1. Get user ID
        const checkUserQuery = `SELECT id FROM users WHERE email = ?`;
        con.query(checkUserQuery, [email], (err, result) => {
            if (err) {
                return con.rollback(() => {
                    console.error("Database error:", err);
                    res.status(500).json({ error: "Database error, please try again." });
                });
            }

            if (result.length === 0) {
                return con.rollback(() => {
                    res.status(404).json({ error: "User not found with the given email." });
                });
            }

            const userId = result[0].id;

            // 2. Insert borrow request
            const insertQuery = `
                INSERT INTO borrow_requests (student_id, asset_id, borrow_date, return_date, student_reason)
                VALUES (?, ?, ?, ?, ?)
            `;

            con.query(insertQuery, [userId, asset_id, borrow_date, return_date, student_reason], (err, result) => {
                if (err) {
                    return con.rollback(() => {
                        console.error("Database error during insertion:", err);
                        res.status(500).json({ error: "Database error, please try again." });
                    });
                }

                // 3. Update asset status to 'pending'
                const updateAssetQuery = `UPDATE assets SET status = 'pending' WHERE asset_id = ?`;
                con.query(updateAssetQuery, [asset_id], (err, result) => {
                    if (err) {
                        return con.rollback(() => {
                            console.error("Error updating asset status:", err);
                            res.status(500).json({ error: "Error updating asset status" });
                        });
                    }

                    // Commit the transaction
                    con.commit(err => {
                        if (err) {
                            return con.rollback(() => {
                                console.error("Commit error:", err);
                                res.status(500).json({ error: "Failed to complete request process" });
                            });
                        }
                        res.status(200).json({ 
                            success: true, 
                            message: "Request submitted successfully!" 
                        });
                    });
                });
            });
        });
    });
});
// ================== Approve or Disapprove ==================
app.put('/approve-or-disapprove', (req, res) => {
    console.log(req.body);  // Log the request data for debugging

    const { request_id, status, lecturer_id, reason } = req.body;

    if (!request_id || !status || !lecturer_id) {
        return res.status(400).json({ error: "Request ID, status, and lecturer ID are required." });
    }

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'approved' or 'rejected'." });
    }

    // Start a database transaction
    con.beginTransaction(err => {
        if (err) {
            console.log("Transaction Error:", err);
            return res.status(500).json({ error: "Database transaction error." });
        }

        // First, get the asset_id from the borrow request
        const getAssetSql = `SELECT asset_id FROM borrow_requests WHERE request_id = ?`;
        con.query(getAssetSql, [request_id], (err, result) => {
            if (err) {
                return con.rollback(() => {
                    console.log("Error fetching asset:", err);
                    res.status(500).json({ error: "Database error fetching asset." });
                });
            }

            if (result.length === 0) {
                return con.rollback(() => {
                    res.status(404).json({ error: "Request not found." });
                });
            }

            const asset_id = result[0].asset_id;

            // Update the borrow request status (using approved/rejected)
            const updateRequestSql = `
                UPDATE borrow_requests
                SET status = ?, approved_by = ?, lecturer_reason = ?, updated_at = ?
                WHERE request_id = ? AND status = 'pending'
            `;
            
            const updateFields = {
                status: status,  // This stays 'approved'/'rejected' for the request
                approved_by: lecturer_id,
                lecturer_reason: reason || null,
                updated_at: new Date()
            };

            con.query(updateRequestSql, 
                [updateFields.status, updateFields.approved_by, updateFields.lecturer_reason, updateFields.updated_at, request_id], 
                (err, result) => {
                    if (err) {
                        return con.rollback(() => {
                            console.log("Error updating request:", err);
                            res.status(500).json({ error: "Database error updating request." });
                        });
                    }

                    if (result.affectedRows === 0) {
                        return con.rollback(() => {
                            res.status(404).json({ error: "Request not found or already processed." });
                        });
                    }

                    // Update the asset status (using borrowed/available)
                    const newAssetStatus = status === 'approved' ? 'borrowed' : 'available';
                    const updateAssetSql = `UPDATE assets SET status = ? WHERE asset_id = ?`;
                    
                    con.query(updateAssetSql, [newAssetStatus, asset_id], (err, result) => {
                        if (err) {
                            return con.rollback(() => {
                                console.log("Error updating asset:", err);
                                res.status(500).json({ error: "Database error updating asset status." });
                            });
                        }

                        if (result.affectedRows === 0) {
                            return con.rollback(() => {
                                res.status(404).json({ error: "Asset not found." });
                            });
                        }

                        // Commit the transaction
                        con.commit(err => {
                            if (err) {
                                return con.rollback(() => {
                                    console.log("Commit Error:", err);
                                    res.status(500).json({ error: "Database commit error." });
                                });
                            }

                            res.json({
                                success: true,
                                message: `Request ${status} successfully! Asset status updated to ${newAssetStatus}.`,
                                request_id: request_id,
                                asset_status: newAssetStatus
                            });
                        });
                    });
                });
        });
    });
});
// ======================== dashboard Route ========================
app.get('/dashboard/data', (req, res) => {
    const sql = 'SELECT asset_id, name, description, status, category_id FROM assets';
    con.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.status(200).json(result);
    });
});

// ======================== HISTORY Route ========================
app.get("/api/history", (req, res) => {
    const { userId, role } = req.query;

    let sql = `
        SELECT 
            h.history_id,
            a.name AS asset_name,
            DATE_FORMAT(h.borrow_date, '%Y-%m-%d') AS borrow_date,
            DATE_FORMAT(h.return_date, '%Y-%m-%d') AS return_date,
            s.username AS student_name,
            ap.username AS approver_name,
            rp.username AS receiver_name,
            h.approved_by_role,
            h.return_received_by_role,
            CASE 
                WHEN h.return_received_by IS NULL THEN 'Borrowed'
                ELSE 'Returned'
            END AS status
        FROM history h
        JOIN assets a ON h.asset_id = a.asset_id
        JOIN users s ON h.student_id = s.id
        LEFT JOIN users ap ON h.approved_by = ap.id
        LEFT JOIN users rp ON h.return_received_by = rp.id
    `;

    let params = [];

    if (role === "student") {
        sql += " WHERE s.id = ? ORDER BY h.borrow_date DESC";
        params.push(userId);
    } else if (role === "lecturer") {
        sql += " WHERE h.approved_by = ? ORDER BY h.borrow_date DESC";
        params.push(userId);
    } else if (role === "staff") {
        sql += " ORDER BY h.borrow_date DESC";
    }

    con.query(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching history" });
        }

        res.json(rows);
    });
});




// New endpoint to get user ID from email
app.get('/api/get-user-id', (req, res) => {
    const { email, role } = req.query;

    if (!email || !role) {
        return res.status(400).json({ error: "Email and role are required" });
    }

    let sql;

    if (role === "student") {
        // For students, use the email to fetch the user ID
        sql = 'SELECT id FROM users WHERE email LIKE ?';
        con.query(sql, [email + '%'], (err, result) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            res.json({ userId: result[0].id });
        });
    } else if (role === "lecturer" || role === "staff") {
        // For lecturers and staff, their user ID is directly available
        sql = 'SELECT id FROM users WHERE email = ?';
        con.query(sql, [email], (err, result) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: "Lecturer/Staff not found" });
            }

            res.json({ userId: result[0].id });
        });
    } else {
        return res.status(400).json({ error: "Invalid role" });
    }
});

app.get("/api/categories", (req, res) => {
    const sql = `SELECT category_id, category_name FROM categories ORDER BY category_name`;

    con.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(result);
    });
});

app.get('/api/asset/:asset_id', (req, res) => {
    const { asset_id } = req.params;
    const sql = `SELECT * FROM assets WHERE asset_id = ?`;
    con.query(sql, [asset_id], (err, result) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (result.length === 0) return res.status(404).json({ error: "Asset not found" });
        res.json(result[0]);
    });
});

// ======================== Return Route ========================
app.post('/api/return-asset', (req, res) => {
    const { assetId, returnedBy } = req.body;

    if (!assetId || !returnedBy) {
        return res.status(400).json({
            success: false,
            message: "Asset ID and staff ID are required"
        });
    }

    con.beginTransaction(err => {
        if (err) {
            console.error('Transaction error:', err);
            return res.status(500).json({
                success: false,
                message: "Database transaction error"
            });
        }

        // 1. First get the borrower information
        con.query(
            `SELECT 
                u.username AS borrower_name,
                h.borrow_date
             FROM history h
             JOIN users u ON h.student_id = u.id
             WHERE h.asset_id = ? AND h.return_received_by IS NULL`,
            [assetId],
            (err, historyResults) => {
                if (err) {
                    return con.rollback(() => {
                        console.error('History fetch error:', err);
                        res.status(500).json({
                            success: false,
                            message: "Failed to fetch borrowing history"
                        });
                    });
                }

                if (historyResults.length === 0) {
                    return con.rollback(() => {
                        res.status(404).json({
                            success: false,
                            message: "No active borrowing record found for this asset"
                        });
                    });
                }

                const borrowerInfo = historyResults[0];

                // 2. Update asset status to 'available'
                con.query(
                    'UPDATE assets SET status = "available" WHERE asset_id = ?',
                    [assetId],
                    (err, result) => {
                        if (err) {
                            return con.rollback(() => {
                                console.error('Asset update error:', err);
                                res.status(500).json({
                                    success: false,
                                    message: "Failed to update asset status"
                                });
                            });
                        }

                        // 3. Update history record (mark as received)
                        con.query(
                            `UPDATE history SET 
                                return_received_by = ?,
                                return_received_by_role = 'staff',
                                return_date = NOW()
                            WHERE asset_id = ? AND return_received_by IS NULL`,
                            [returnedBy, assetId],
                            (err, result) => {
                                if (err) {
                                    return con.rollback(() => {
                                        console.error('History update error:', err);
                                        res.status(500).json({
                                            success: false,
                                            message: "Failed to update history"
                                        });
                                    });
                                }

                                // 4. Update borrow_requests status to 'returned'
                                con.query(
                                    'UPDATE borrow_requests SET status = "returned" WHERE asset_id = ? AND status = "approved"',
                                    [assetId],
                                    (err, result) => {
                                        if (err) {
                                            return con.rollback(() => {
                                                console.error('Borrow request update error:', err);
                                                res.status(500).json({
                                                    success: false,
                                                    message: "Failed to update borrow request status"
                                                });
                                            });
                                        }

                                        // Commit the transaction
                                        con.commit(err => {
                                            if (err) {
                                                return con.rollback(() => {
                                                    console.error('Commit error:', err);
                                                    res.status(500).json({
                                                        success: false,
                                                        message: "Failed to complete return process"
                                                    });
                                                });
                                            }
                                            res.json({
                                                success: true,
                                                message: "Asset returned successfully",
                                                borrower: borrowerInfo.borrower_name,
                                                borrow_date: borrowerInfo.borrow_date,
                                                return_date: new Date().toISOString()
                                            });
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
});


app.get('/api/borrowed-assets', (req, res) => {
    const sql = `
        SELECT 
            a.asset_id,
            a.name AS asset_name,
            u.username AS student_name,
            u.email AS student_email,
            DATE_FORMAT(h.borrow_date, '%Y-%m-%d') AS borrow_date,
            ap.username AS approver_name,
            h.approved_by,
            h.return_date
        FROM history h
        JOIN assets a ON h.asset_id = a.asset_id
        JOIN users u ON h.student_id = u.id
        LEFT JOIN users ap ON h.approved_by = ap.id
        WHERE h.return_received_by IS NULL
        ORDER BY h.borrow_date DESC
    `;

    con.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }

        res.json(results.map(item => ({
            asset_id: item.asset_id,
            name: item.asset_name,
            student_name: item.student_name,
            student_email: item.student_email,
            borrow_date: item.borrow_date,
            approver_name: item.approver_name
        })));
    });
});
// ======================== approve - disapprove route========================
app.get('/api/borrow-requests', (req, res) => {
    const sql = `
        SELECT 
            br.request_id,
            br.borrow_date,
            br.return_date,
            br.status,
            br.student_reason,
            br.lecturer_reason,
            br.asset_id,
            a.name AS asset_name,
            u1.username AS student_name,
            u2.username AS lecturer_name
        FROM borrow_requests br
        JOIN users u1 ON br.student_id = u1.id
        LEFT JOIN users u2 ON br.approved_by = u2.id
        JOIN assets a ON br.asset_id = a.asset_id
    `;

    con.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true, data: results });
    });
});


app.put('/api/borrow-requests/:id', (req, res) => {
    const requestId = req.params.id;
    const { status, lecturer_reason, lecturer_id } = req.body;

    const updateRequest = `
        UPDATE borrow_requests 
        SET status = ?, lecturer_reason = ?, approved_by = ?, updated_at = NOW()
        WHERE request_id = ?
    `;

    con.query(updateRequest, [status, lecturer_reason, lecturer_id, requestId], (err) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to update request" });

        const getRequest = `SELECT * FROM borrow_requests WHERE request_id = ?`;
        con.query(getRequest, [requestId], (err, rows) => {
            if (err || rows.length === 0) {
                return res.status(500).json({ success: false, message: "Failed to fetch request" });
            }

            const request = rows[0];
            const assetStatus = (status === 'approved') ? 'borrowed' : 'available';

            const updateAsset = `
                UPDATE assets 
                SET status = ?, updated_at = NOW()
                WHERE asset_id = ?
            `;

            con.query(updateAsset, [assetStatus, request.asset_id], (err) => {
                if (err) return res.status(500).json({ success: false, message: "Failed to update asset" });

                if (status === 'approved') {
                    const insertHistory = `
                        INSERT INTO history 
                        (student_id, asset_id, borrow_date, return_date, approved_by, approved_by_role, created_at)
                        VALUES (?, ?, ?, ?, ?, 'lecturer', NOW())
                    `;
                    con.query(insertHistory, [
                        request.student_id,
                        request.asset_id,
                        request.borrow_date,
                        request.return_date,
                        lecturer_id
                    ], (err) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: "Failed to insert into history" });
                        }
                        return res.json({ success: true, message: "Request approved and logged in history" });
                    });
                } else {
                    return res.json({ success: true, message: "Request rejected and asset available" });
                }
            });
        });
    });
});



app.get('/api/borrow-requests-student', (req, res) => {
    const rawUserId = req.query.userId; // From sessionStorage
    if (!rawUserId) return res.status(400).json({ success: false, message: "Missing userId" });

    const email = `${rawUserId}@lamduan.mfu.ac.th`;

    // Fetch real student ID
    const getUserIdSql = 'SELECT id FROM users WHERE email = ? AND role = "student"';
    con.query(getUserIdSql, [email], (err, userResult) => {
        if (err || userResult.length === 0) {
            console.error(err);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const studentId = userResult[0].id;

        const sql = `
            SELECT br.request_id, br.status, br.return_date, a.name AS asset_name
            FROM borrow_requests br
            JOIN assets a ON br.asset_id = a.asset_id
            WHERE br.student_id = ?
            ORDER BY br.created_at DESC
        `;

        con.query(sql, [studentId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: "Database error" });
            }

            res.json({ success: true, data: result });
        });
    });
});



// ======================== Request Route ========================
app.get("/api/requests", (req, res) => {
    const sql = `
        SELECT a.asset_id, a.name, a.description, a.image_path, a.status, a.category_id, ca.category_name
        FROM assets a
        LEFT JOIN categories ca ON a.category_id = ca.category_id
    `;

    con.query(sql, (err, result) => {
        if (err) {
            res.status(500).json({ error: "Database error" });
        } else {
            res.json(result);
        }
    });
});

app.post("/api/request", (req, res) => {
    const { userId, aID, brDate, rtDate, reason } = req.body;

    if (!userId || !aID || !brDate || !rtDate || !reason) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const sql = `INSERT INTO borrow_requests (student_id, asset_id, borrow_date, return_date, student_reason, status) VALUES (?, ?, ?, ?, ?, 'pending')`;

    con.query(sql, [userId, aID, brDate, rtDate, reason], (err) => {
        if (err) {
            res.status(500).json({ error: "Failed to insert borrow request" });
        } else {
            res.status(201).json({ message: "Request submitted successfully" });
        }
    });
});

// ======================== List Route ========================
app.get('/api/assets/status', (req, res) => {
    const sql = `
        SELECT status, COUNT(*) AS count
        FROM assets
        GROUP BY status
    `;
    con.query(sql, (err, results) => {
        if (err) {
            console.error("Query error:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
        res.json(results);
    });
});

// Route: Asset status trends over past 7 days
app.get('/api/assets/trends', (req, res) => {
    const sql = `
        SELECT
            DATE(updated_at) AS date,
            SUM(status = 'available') AS available,
            SUM(status = 'pending') AS pending,
            SUM(status = 'borrowed') AS borrowed,
            SUM(status = 'disabled') AS disabled
        FROM assets
        WHERE updated_at >= CURDATE() - INTERVAL 6 DAY
        GROUP BY DATE(updated_at)
        ORDER BY DATE(updated_at)
    `;
    con.query(sql, (err, results) => {
        if (err) {
            console.error("Trend query error:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
        res.json(results);
    });
});

// ======================== Root Route ========================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'registration.html'));
});

app.get('/assets', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'assets.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/assets', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'assets.html'));
});

app.get('/return', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'return.html'));
});

app.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'history.html'));
});

app.get('/request', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'requests.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/requestPage', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'requestPage.html'));
});

app.get('/list', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'list.html'));
});

app.get('/edit-asset', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'edit-asset.html'));
});

app.get('/add-asset', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'add-asset.html'));
});

app.get('/add-category', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'add-categories.html'));
});



// ======================== Start Server ========================
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
