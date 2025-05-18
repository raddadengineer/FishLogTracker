const express = require('express');
const { Pool } = require('pg');

// Create router
const router = express.Router();

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper function to format error responses
function formatError(error) {
  console.error('Direct Leaderboard API Error:', error);
  return { error: error.message || 'An error occurred' };
}

// Global leaderboard
router.get('/global', async (req, res) => {
  try {
    const criteria = req.query.criteria || 'catches';
    const limit = parseInt(req.query.limit) || 10;
    
    if (!['catches', 'species', 'size'].includes(criteria)) {
      return res.status(400).json({ error: 'Invalid criteria. Must be one of: catches, species, size' });
    }
    
    let query;
    
    if (criteria === 'catches') {
      query = `
        SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", COUNT(c.id) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT $1
      `;
    } else if (criteria === 'species') {
      query = `
        SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", COUNT(DISTINCT c.species) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT $1
      `;
    } else {
      query = `
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
    }
    
    const result = await pool.query(query, [limit]);
    res.json(result.rows || []);
  } catch (error) {
    res.status(500).json(formatError(error));
  }
});

// Lake specific leaderboard
router.get('/lake/:id', async (req, res) => {
  try {
    const lakeId = parseInt(req.params.id);
    const criteria = req.query.criteria || 'catches';
    const limit = parseInt(req.query.limit) || 10;
    
    if (isNaN(lakeId)) {
      return res.status(400).json({ error: 'Invalid lake ID' });
    }
    
    if (!['catches', 'species', 'size'].includes(criteria)) {
      return res.status(400).json({ error: 'Invalid criteria. Must be one of: catches, species, size' });
    }
    
    let query;
    
    if (criteria === 'catches') {
      query = `
        SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", COUNT(c.id) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        WHERE c.lake_id = $1
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT $2
      `;
    } else if (criteria === 'species') {
      query = `
        SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", COUNT(DISTINCT c.species) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        WHERE c.lake_id = $1
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT $2
      `;
    } else {
      query = `
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
        WHERE c.lake_id = $1 AND c.size IS NOT NULL
        ORDER BY c.size DESC
        LIMIT $2
      `;
    }
    
    const result = await pool.query(query, [lakeId, limit]);
    res.json(result.rows || []);
  } catch (error) {
    res.status(500).json(formatError(error));
  }
});

module.exports = router;