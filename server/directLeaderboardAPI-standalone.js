// Direct leaderboard API endpoint (standalone)
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

// Create a standalone Express app for direct leaderboard access
const app = express();

// Enable CORS for all routes
app.use(cors());

// Enable JSON parsing
app.use(express.json());

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Global leaderboard - most catches
app.get('/most-catches', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const query = `
      SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", COUNT(c.id) as count
      FROM users u
      JOIN catches c ON u.id = c.user_id
      GROUP BY u.id, u.username, u.profile_image_url
      ORDER BY count DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching most catches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Global leaderboard - most species
app.get('/most-species', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const query = `
      SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", COUNT(DISTINCT c.species) as count
      FROM users u
      JOIN catches c ON u.id = c.user_id
      GROUP BY u.id, u.username, u.profile_image_url
      ORDER BY count DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching most species:', error);
    res.status(500).json({ error: error.message });
  }
});

// Global leaderboard - largest catches
app.get('/largest-catches', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.profile_image_url as "profileImageUrl", 
        c.species, 
        c.size,
        c.weight,
        c.catch_date as "catchDate"
      FROM users u
      JOIN catches c ON u.id = c.user_id
      WHERE c.size IS NOT NULL
      ORDER BY c.size DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching largest catches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = 3333;
app.listen(PORT, () => {
  console.log(`Direct leaderboard API running on port ${PORT}`);
});