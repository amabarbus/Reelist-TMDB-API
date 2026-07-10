require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

pool.on('connect', (client) => {
    client.query("SET client_encoding TO 'UTF8'").catch(err => console.error(err));
});

pool.connect()
    .then(() => console.log("Connected to PostgreSQL successfully!"))
    .catch(err => console.error("Database connection error", err.stack));

// CHECK USERNAME AVAILABILITY
app.get('/api/check-username', async (req, res) => {
    try {
        const { username } = req.query;

        if (!username) return res.json({ available: false, message: "" });
        if (username.length < 3) return res.json({ available: false, message: "Too short" });

        const result = await pool.query("SELECT id FROM users WHERE username = $1", [username]);

        if (result.rows.length > 0) {
            res.json({ available: false, message: "Taken" });
        } else {
            res.json({ available: true, message: "Available" });
        }
    } catch (err) {
        console.error("Error checking username:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// REGISTRATION ROUTE
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const userCheck = await pool.query("SELECT id FROM users WHERE email = $1 OR username = $2", [email, username]);
        if (userCheck.rows.length > 0) {
            return res.status(401).json({ error: "Email or username is already taken!" });
        }

        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(password, salt);

        const verifyToken = jwt.sign(
            { username, email, password_hash: bcryptPassword },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const verifyUrl = `http://localhost:3000/api/verify-email/${verifyToken}`;

        console.log("\n--- DEV VERIFY LINK ---\n" + verifyUrl + "\n-----------------------\n");

        console.log(`Attempting to send email to: ${email}...`);

        const info = await transporter.sendMail({
            from: `"Reelist" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Confirm your Reelist account",
            html: `
                <h3>Welcome to Reelist, ${username}!</h3>
                <p>Please click the link below to verify your email address and activate your account:</p>
                <a href="${verifyUrl}" style="display:inline-block; padding:10px 20px; background-color:#d97757; color:white; text-decoration:none; border-radius:5px;">Verify Account</a>
                <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
            `
        });

        console.log("Email sent successfully! Message ID:", info.messageId);

        res.json({
            message: "Registration successful! Please check your email to verify your account."
        });

    } catch (err) {
        console.error("Error in /register:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// FORGOT PASSWORD ROUTE
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const userCheck = await pool.query("SELECT id, username FROM users WHERE email = $1", [email]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: "No account found with that email address." });
        }

        const user = userCheck.rows[0];

        const resetToken = jwt.sign(
            { id: user.id, email: email },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

        await transporter.sendMail({
            from: `"Reelist" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Reset your Reelist password",
            html: `
                <h3>Hi ${user.username},</h3>
                <p>You requested a password reset. Click the button below to set a new password:</p>
                <a href="${resetUrl}" style="display:inline-block; padding:10px 20px; background-color:#d97757; color:white; text-decoration:none; border-radius:5px;">Reset Password</a>
                <p>This link will expire in 15 minutes. If you did not request this, please ignore this email.</p>
            `
        });

        res.json({ message: "Password reset link sent! Please check your email." });

    } catch (err) {
        console.error("Error in forgot password:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// RESET PASSWORD ROUTE
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        let decodedData;
        try {
            decodedData = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
        }

        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(newPassword, salt);

        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [bcryptPassword, decodedData.id]
        );

        res.json({ message: "Password updated successfully! You can now log in." });

    } catch (err) {
        console.error("Error resetting password:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// LOGIN ROUTE
app.post('/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = userResult.rows[0];

        if (!user.is_verified) {
            return res.status(403).json({ error: "Please check your email and verify your account before logging in." });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const expirationTime = rememberMe ? "30d" : "1h";

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: expirationTime }
        );

        res.json({
            message: "Login successful!",
            token: token,
            user: { id: user.id, username: user.username, email: user.email }
        });

    } catch (err) {
        console.error("Error in /login:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// VERIFY EMAIL ROUTE
app.get('/api/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;

        let decodedData;
        try {
            decodedData = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).send("Invalid or expired verification link. Please register again.");
        }

        const { username, email, password_hash } = decodedData;

        const checkExists = await pool.query("SELECT id FROM users WHERE email = $1 OR username = $2", [email, username]);
        if (checkExists.rows.length > 0) {
            return res.redirect('http://localhost:5173/login?verified=true');
        }

        const newUser = await pool.query(
            "INSERT INTO users (username, email, password_hash, is_verified) VALUES ($1, $2, $3, TRUE) RETURNING id",
            [username, email, password_hash]
        );

        await pool.query("INSERT INTO user_profiles (user_id, theme) VALUES ($1, $2)",
            [newUser.rows[0].id, 'warm-cream']
        );


        res.redirect('http://localhost:5173/login?verified=true');

    } catch (err) {
        console.error("Error verifying email:", err.message);
        res.status(500).send("Server Error during verification.");
    }
});

// JWT AUTHENTICATION MIDDLEWARE
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid or expired token." });

        req.user = user;
        next();
    });
};

// FETCH ALL TRACKED ITEMS
app.get('/api/tracked', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM tracked_items WHERE user_id = $1",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching tracked items:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// ADD OR UPDATE A TRACKED ITEM
app.post('/api/tracked', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            tmdb_id, media_type, title, poster_path, status, rating,
            watched_episodes, number_of_episodes, genres, runtime,
            episode_ratings, fav_characters, release_date
        } = req.body;

        const query = `
            INSERT INTO tracked_items 
                (user_id, tmdb_id, media_type, title, poster_path, status, rating, watched_episodes, number_of_episodes, genres, runtime, episode_ratings, fav_characters, release_date)
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (user_id, tmdb_id, media_type) 
            DO UPDATE SET 
                status = EXCLUDED.status,
                rating = EXCLUDED.rating,
                watched_episodes = EXCLUDED.watched_episodes,
                title = EXCLUDED.title,
                poster_path = EXCLUDED.poster_path,
                number_of_episodes = EXCLUDED.number_of_episodes,
                genres = EXCLUDED.genres,
                runtime = EXCLUDED.runtime,
                episode_ratings = EXCLUDED.episode_ratings,
                fav_characters = EXCLUDED.fav_characters,
                release_date = EXCLUDED.release_date
            RETURNING *;
        `;

        const values = [
            userId, tmdb_id, media_type, title, poster_path,
            status || 'planned', rating || null,
            watched_episodes ? JSON.stringify(watched_episodes) : null,
            number_of_episodes || null,
            genres ? JSON.stringify(genres) : null,
            runtime || null,
            episode_ratings ? JSON.stringify(episode_ratings) : null,
            fav_characters ? JSON.stringify(fav_characters) : null,
            release_date || null
        ];

        const result = await pool.query(query, values);
        res.json(result.rows[0]);

    } catch (err) {
        console.error("Error saving tracked item:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// SYNC VIEWING STREAK
app.put('/api/activity', authenticateToken, async (req, res) => {
    try {
        const { activeDays, currentStreak, longestStreak } = req.body;

        await pool.query(
            "UPDATE user_profiles SET active_days = $1, current_streak = $2, longest_streak = $3 WHERE user_id = $4",
            [
                JSON.stringify(activeDays),
                currentStreak || 0,
                longestStreak || 0,
                req.user.id
            ]
        );
        res.json({ message: "Activity streak synced" });
    } catch (err) {
        console.error("Error syncing activity:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// UPDATE USERNAME
app.put('/api/users/username', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { newUsername } = req.body;

        const check = await pool.query("SELECT id FROM users WHERE username = $1", [newUsername]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: "That username is already taken." });
        }

        const result = await pool.query(
            "UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, email",
            [newUsername, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "User not found in the database." });
        }

        const token = jwt.sign(
            { id: result.rows[0].id, username: result.rows[0].username },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            message: "Username updated successfully!",
            user: result.rows[0],
            token: token
        });

    } catch (err) {
        console.error("--- BACKEND CRASH ---", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// DELETE USER ACCOUNT
app.delete('/api/users/account', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user.id;

        await client.query("DELETE FROM user_profiles WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM tracked_items WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM users WHERE id = $1", [userId]);
        await client.query('COMMIT');
        res.json({ message: "Account deleted successfully." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error deleting account:", err.message);
        res.status(500).json({ error: "Server error during account deletion." });
    } finally {
        client.release();
    }
});

// UPDATE THEME
app.put('/api/users/theme', authenticateToken, async (req, res) => {
    try {
        const { theme } = req.body;
        await pool.query(`
            INSERT INTO user_profiles (user_id, theme) 
            VALUES ($1, $2) 
            ON CONFLICT (user_id) 
            DO UPDATE SET theme = EXCLUDED.theme
        `, [req.user.id, theme]);

        res.json({ message: "Theme updated successfully" });
    } catch (err) {
        console.error("Error saving theme:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// REMOVE A TRACKED ITEM
app.delete('/api/tracked/:tmdb_id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { tmdb_id } = req.params;
        const { media_type } = req.query;

        if (!media_type) {
            return res.status(400).json({ error: "media_type is required as a query parameter." });
        }

        const result = await pool.query(
            "DELETE FROM tracked_items WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3 RETURNING *",
            [userId, tmdb_id, media_type]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Item not found in your tracker." });
        }

        res.json({ message: "Item removed successfully.", deleted: result.rows[0] });

    } catch (err) {
        console.error("Error deleting tracked item:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// FETCH ALL CUSTOM LISTS & ITEMS
app.get('/api/lists', authenticateToken, async (req, res) => {
    try {
        const lists = await pool.query("SELECT id, name FROM custom_lists WHERE user_id = $1", [req.user.id]);

        const items = await pool.query(`
            SELECT cl.name as list_name, ti.tmdb_id, ti.media_type, ti.title, ti.poster_path 
            FROM custom_list_items cli
            JOIN custom_lists cl ON cli.list_id = cl.id
            JOIN tracked_items ti ON cli.tracked_item_id = ti.id
            WHERE cl.user_id = $1
        `, [req.user.id]);

        res.json({ lists: lists.rows, items: items.rows });
    } catch (err) {
        console.error("Error fetching lists:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// SEARCH FOR USERS
app.get('/api/users/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const result = await pool.query(`
            SELECT u.id, u.username, p.avatar, p.bio
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.username ILIKE $1
            LIMIT 20
        `, [`%${q}%`]);

        res.json(result.rows);
    } catch (err) {
        console.error("User search error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// PUBLIC USER PROFILE & TRACKED ITEMS
app.get('/api/users/:username', authenticateToken, async (req, res) => {
    try {
        const { username } = req.params;
        const currentUserId = req.user.id;

        const userRes = await pool.query(`
            SELECT u.id, u.username, p.name, p.bio, p.avatar, p.banner, 
                   p.current_streak, p.longest_streak, p.is_public,
                   (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id AND status = 'accepted') as followers_count,
                   (SELECT COUNT(*) FROM user_follows WHERE follower_id = u.id AND status = 'accepted') as following_count,
                   (SELECT status FROM user_follows WHERE follower_id = $2 AND following_id = u.id) as follow_status
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.username = $1
        `, [username, currentUserId]);

        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
        const userData = userRes.rows[0];

        const isPrivateAccess = userData.is_public === false && currentUserId !== userData.id && userData.follow_status !== 'accepted';

        if (isPrivateAccess) {
            userData.current_streak = 0;
            userData.longest_streak = 0;
            return res.json({ profile: userData, tracked: [], favourites: [], isPrivateAccess: true });
        }

        const trackedRes = await pool.query("SELECT * FROM tracked_items WHERE user_id = $1", [userData.id]);

        const favsRes = await pool.query(`
            SELECT ti.tmdb_id, ti.media_type, ti.title, ti.poster_path, ti.rating
            FROM custom_lists cl
            JOIN custom_list_items cli ON cl.id = cli.list_id
            JOIN tracked_items ti ON cli.tracked_item_id = ti.id
            WHERE cl.user_id = $1 AND cl.name = 'Favourites'
        `, [userData.id]);

        res.json({
            profile: userData,
            tracked: trackedRes.rows,
            favourites: favsRes.rows,
            isPrivateAccess: false
        });
    } catch (err) {
        console.error("Error fetching public profile:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// TOGGLE FOLLOW USER
app.post('/api/users/:username/follow', authenticateToken, async (req, res) => {
    try {
        const targetUsername = req.params.username;
        const followerId = req.user.id;

        const targetRes = await pool.query(
            "SELECT u.id, p.is_public FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.username = $1",
            [targetUsername]
        );
        if (targetRes.rows.length === 0) return res.status(404).json({ error: "User not found" });

        const followingId = targetRes.rows[0].id;
        const isPublic = targetRes.rows[0].is_public !== false; // defaults to true

        if (followerId === followingId) {
            return res.status(400).json({ error: "You cannot follow yourself." });
        }

        const checkRes = await pool.query(
            "SELECT status FROM user_follows WHERE follower_id = $1 AND following_id = $2",
            [followerId, followingId]
        );

        if (checkRes.rows.length > 0) {
            await pool.query("DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2", [followerId, followingId]);
            res.json({ action: "unfollowed" });
        } else {
            const status = isPublic ? 'accepted' : 'pending';
            await pool.query(
                "INSERT INTO user_follows (follower_id, following_id, status) VALUES ($1, $2, $3)",
                [followerId, followingId, status]
            );
            res.json({ action: status === 'accepted' ? "followed" : "requested" });
        }
    } catch (err) {
        console.error("Error toggling follow:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// FETCH FOLLOWERS OR FOLLOWING LIST
app.get('/api/users/:username/connections', authenticateToken, async (req, res) => {
    try {
        const { username } = req.params;
        const { type } = req.query;

        const userRes = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
        const targetId = userRes.rows[0].id;

        let query = "";
        if (type === 'followers') {
            query = `
                SELECT u.id, u.username, p.avatar, p.bio
                FROM user_follows f
                JOIN users u ON f.follower_id = u.id
                LEFT JOIN user_profiles p ON u.id = p.user_id
                WHERE f.following_id = $1 AND f.status = 'accepted'`;
        } else {
            query = `
                SELECT u.id, u.username, p.avatar, p.bio
                FROM user_follows f
                JOIN users u ON f.following_id = u.id
                LEFT JOIN user_profiles p ON u.id = p.user_id
                WHERE f.follower_id = $1 AND f.status = 'accepted'`;
        }

        const result = await pool.query(query, [targetId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// FETCH PENDING FOLLOW REQUESTS
app.get('/api/follow-requests', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT f.follower_id, u.username, p.avatar, p.name, f.is_seen
            FROM user_follows f
            JOIN users u ON f.follower_id = u.id
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE f.following_id = $1 AND f.status = 'pending'
        `, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching requests:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// MARK FOLLOW REQUESTS AS SEEN
app.put('/api/follow-requests/seen', authenticateToken, async (req, res) => {
    try {
        await pool.query("UPDATE user_follows SET is_seen = TRUE WHERE following_id = $1 AND status = 'pending'", [req.user.id]);
        res.json({ message: "Requests marked as seen" });
    } catch (err) {
        console.error("Error marking requests seen:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// APPROVE/DENY FOLLOW REQUEST
app.put('/api/follow-requests/:followerId', authenticateToken, async (req, res) => {
    try {
        const { followerId } = req.params;
        const { action } = req.body;

        if (action === 'approve') {
            await pool.query("UPDATE user_follows SET status = 'accepted' WHERE follower_id = $1 AND following_id = $2", [followerId, req.user.id]);
        } else {
            await pool.query("DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2", [followerId, req.user.id]);
        }
        res.json({ message: "Request updated" });
    } catch (err) {
        console.error("Error handling request:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// FETCH USER PROFILE SETTINGS
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.theme, p.name, p.bio, p.avatar, p.banner, p.active_days, p.current_streak, p.longest_streak, p.is_public,
                   (SELECT COUNT(*) FROM user_follows WHERE following_id = $1 AND status = 'accepted') as followers_count,
                   (SELECT COUNT(*) FROM user_follows WHERE follower_id = $1 AND status = 'accepted') as following_count
            FROM user_profiles p WHERE p.user_id = $1
        `, [req.user.id]);

        if (result.rows.length === 0) {
            return res.json({
                theme: 'warm-cream', name: '', bio: '', avatar: null, banner: null,
                active_days: null, current_streak: 0, longest_streak: 0,
                followers_count: 0, following_count: 0
            });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching profile:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// UPDATE FULL PROFILE
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { name, bio, avatar, banner, is_public } = req.body;

        await pool.query(`
            UPDATE user_profiles 
            SET name = $1, bio = $2, avatar = $3, banner = $4, is_public = $5 
            WHERE user_id = $6
        `, [name, bio, avatar, banner, is_public, req.user.id]);

        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error("Error updating profile:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// CREATE A NEW LIST
app.post('/api/lists', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const result = await pool.query(`
            INSERT INTO custom_lists (user_id, name) VALUES ($1, $2)
            ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id, name
        `, [req.user.id, name]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error creating list:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// TOGGLE ITEM IN LIST
app.post('/api/lists/toggle', authenticateToken, async (req, res) => {
    try {
        const { list_name, tmdb_id, media_type } = req.body;

        const listRes = await pool.query("SELECT id FROM custom_lists WHERE user_id = $1 AND name = $2", [req.user.id, list_name]);
        if (listRes.rows.length === 0) return res.status(404).json({ error: "List not found" });
        const listId = listRes.rows[0].id;

        const itemRes = await pool.query("SELECT id FROM tracked_items WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3", [req.user.id, tmdb_id, media_type]);
        if (itemRes.rows.length === 0) return res.status(404).json({ error: "Item not tracked yet" });
        const trackedItemId = itemRes.rows[0].id;

        const check = await pool.query("SELECT * FROM custom_list_items WHERE list_id = $1 AND tracked_item_id = $2", [listId, trackedItemId]);

        if (check.rows.length > 0) {
            await pool.query("DELETE FROM custom_list_items WHERE list_id = $1 AND tracked_item_id = $2", [listId, trackedItemId]);
            res.json({ action: "removed" });
        } else {
            await pool.query("INSERT INTO custom_list_items (list_id, tracked_item_id) VALUES ($1, $2)", [listId, trackedItemId]);
            res.json({ action: "added" });
        }
    } catch (err) {
        console.error("Error toggling list item:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// CREATE NOTIFICATION
app.post('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const { title, message } = req.body;

        const check = await pool.query(
            "SELECT * FROM user_notifications WHERE user_id = $1 AND title = $2 AND message = $3",
            [req.user.id, title, message]
        );

        if (check.rows.length > 0) {
            return res.json(check.rows[0]);
        }

        const result = await pool.query(
            "INSERT INTO user_notifications (user_id, title, message, read) VALUES ($1, $2, $3, false) RETURNING *",
            [req.user.id, title, message]
        );
        res.json(result.rows[0]);

    } catch (err) {
        console.error("Error saving notification:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// FETCH NOTIFICATIONS
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM user_notifications WHERE user_id = $1 ORDER BY created_at DESC",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching notifications:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// MARK ALL NOTIFICATIONS AS READ
app.put('/api/notifications/read', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            "UPDATE user_notifications SET read = true WHERE user_id = $1",
            [req.user.id]
        );
        res.json({ message: "Notifications marked as read" });
    } catch (err) {
        console.error("Error marking notifications read:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// CLEAR ALL NOTIFICATIONS
app.delete('/api/notifications', authenticateToken, async (req, res) => {
    try {
        await pool.query("DELETE FROM user_notifications WHERE user_id = $1", [req.user.id]);
        res.json({ message: "Notifications cleared" });
    } catch (err) {
        console.error("Error clearing notifications:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// FETCH COMMUNITY COMMENTS FOR AN ITEM
app.get('/api/comments/:media_type/:tmdb_id', authenticateToken, async (req, res) => {
    try {
        const { media_type, tmdb_id } = req.params;

        const result = await pool.query(`
            SELECT c.id, c.comment, c.created_at, u.username, c.likes, c.dislikes, c.parent_id, c.gif_url,
                   cr.reaction as user_reaction, up.avatar
            FROM item_comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN comment_reactions cr ON cr.comment_id = c.id AND cr.user_id = $3
            WHERE c.tmdb_id = $1 AND c.media_type = $2
            ORDER BY c.created_at DESC
        `, [tmdb_id, media_type, req.user.id]);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching comments:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// LIKE OR DISLIKE A COMMENT 
app.put('/api/comments/:id/react', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        const userId = req.user.id;

        const existing = await pool.query("SELECT reaction FROM comment_reactions WHERE user_id = $1 AND comment_id = $2", [userId, id]);

        if (existing.rows.length > 0) {
            const currentReaction = existing.rows[0].reaction;

            if (currentReaction === action) {
                await pool.query("DELETE FROM comment_reactions WHERE user_id = $1 AND comment_id = $2", [userId, id]);
                const column = action === 'like' ? 'likes' : 'dislikes';
                await pool.query(`UPDATE item_comments SET ${column} = GREATEST(${column} - 1, 0) WHERE id = $1`, [id]);
                return res.json({ message: "Reaction removed" });
            } else {
                await pool.query("UPDATE comment_reactions SET reaction = $1 WHERE user_id = $2 AND comment_id = $3", [action, userId, id]);
                if (action === 'like') {
                    await pool.query("UPDATE item_comments SET likes = likes + 1, dislikes = GREATEST(dislikes - 1, 0) WHERE id = $1", [id]);
                } else {
                    await pool.query("UPDATE item_comments SET dislikes = dislikes + 1, likes = GREATEST(likes - 1, 0) WHERE id = $1", [id]);
                }
                return res.json({ message: "Reaction switched" });
            }
        } else {
            await pool.query("INSERT INTO comment_reactions (user_id, comment_id, reaction) VALUES ($1, $2, $3)", [userId, id, action]);
            const column = action === 'like' ? 'likes' : 'dislikes';
            await pool.query(`UPDATE item_comments SET ${column} = ${column} + 1 WHERE id = $1`, [id]);
            return res.json({ message: "Reaction added" });
        }
    } catch (err) {
        console.error("Error reacting to comment:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// ADD A COMMUNITY COMMENT
app.post('/api/comments', authenticateToken, async (req, res) => {
    try {
        const { tmdb_id, media_type, comment, parent_id, gif_url } = req.body;

        await pool.query(`
            INSERT INTO item_comments (user_id, tmdb_id, media_type, comment, parent_id, gif_url)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [req.user.id, tmdb_id, media_type, comment, parent_id || null, gif_url || null]);

        res.json({ message: "Comment posted successfully" });
    } catch (err) {
        console.error("Error posting comment:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// VOTE FOR A CHARACTER
app.post('/api/vote/character', authenticateToken, async (req, res) => {
    const { media_type, tmdb_id, character_name } = req.body;

    if (!character_name) {
        await pool.query(`DELETE FROM character_votes WHERE user_id = $1 AND media_type = $2 AND tmdb_id = $3`,
            [req.user.id, media_type, tmdb_id]);
    } else {
        await pool.query(`
            INSERT INTO character_votes (user_id, media_type, tmdb_id, character_name)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, media_type, tmdb_id) 
            DO UPDATE SET character_name = EXCLUDED.character_name
        `, [req.user.id, media_type, tmdb_id, character_name]);
    }
    res.json({ message: "Vote status updated" });
});

// GLOBAL PERCENTAGES FOR CHARACTERS VOTING
app.get('/api/votes/:media_type/:tmdb_id', authenticateToken, async (req, res) => {
    const { media_type, tmdb_id } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                character_name, 
                (COUNT(*)::float * 100.0 / NULLIF((SELECT COUNT(*) FROM character_votes WHERE media_type = $1 AND tmdb_id = $2), 0)) as percentage
            FROM character_votes
            WHERE media_type = $1 AND tmdb_id = $2
            GROUP BY character_name
        `, [media_type, tmdb_id]);

        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});