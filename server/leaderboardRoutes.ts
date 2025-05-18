import express from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { allowPublicAccess } from './publicRoutes';

export const leaderboardRouter = express.Router();

// Public access global leaderboard endpoint
leaderboardRouter.get('/global', allowPublicAccess, async (req, res) => {
  try {
    const criteria = (req.query.criteria as string) || 'catches';
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!['catches', 'species', 'size'].includes(criteria)) {
      return res.status(400).json({ message: "Invalid criteria" });
    }
    
    let leaderboardData: any = [];
    
    if (criteria === 'catches') {
      // Most catches
      const result = await db.execute(sql`
        SELECT 
          u.id, 
          u.username, 
          u.profile_image_url as "profileImageUrl", 
          COUNT(c.id) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT ${limit}
      `);
      leaderboardData = result.rows;
    } else if (criteria === 'species') {
      // Most species variety
      const result = await db.execute(sql`
        SELECT 
          u.id, 
          u.username, 
          u.profile_image_url as "profileImageUrl", 
          COUNT(DISTINCT c.species) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT ${limit}
      `);
      leaderboardData = result.rows;
    } else {
      // Largest catch
      const result = await db.execute(sql`
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
        LIMIT ${limit}
      `);
      leaderboardData = result.rows;
    }
    
    console.log('Direct leaderboard query results:', JSON.stringify(leaderboardData));
    res.json(leaderboardData || []);
  } catch (error) {
    console.error("Error fetching direct leaderboard:", error);
    res.status(500).json({ message: "Failed to fetch leaderboard data" });
  }
});

// Public access lake specific leaderboard
leaderboardRouter.get('/lake/:id', allowPublicAccess, async (req, res) => {
  try {
    const lakeId = parseInt(req.params.id);
    const criteria = (req.query.criteria as string) || 'catches';
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!['catches', 'species', 'size'].includes(criteria)) {
      return res.status(400).json({ message: "Invalid criteria" });
    }
    
    let leaderboardData: any = [];
    
    if (criteria === 'catches') {
      // Most catches at this lake
      const result = await db.execute(sql`
        SELECT 
          u.id, 
          u.username, 
          u.profile_image_url as "profileImageUrl", 
          COUNT(c.id) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        WHERE c.lake_id = ${lakeId}
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT ${limit}
      `);
      leaderboardData = result.rows;
    } else if (criteria === 'species') {
      // Most species variety at this lake
      const result = await db.execute(sql`
        SELECT 
          u.id, 
          u.username, 
          u.profile_image_url as "profileImageUrl", 
          COUNT(DISTINCT c.species) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        WHERE c.lake_id = ${lakeId}
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT ${limit}
      `);
      leaderboardData = result.rows;
    } else {
      // Largest catch at this lake
      const result = await db.execute(sql`
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
        WHERE c.lake_id = ${lakeId} AND c.size IS NOT NULL
        ORDER BY c.size DESC
        LIMIT ${limit}
      `);
      leaderboardData = result.rows;
    }
    
    console.log('Direct lake leaderboard query results:', JSON.stringify(leaderboardData));
    res.json(leaderboardData || []);
  } catch (error) {
    console.error("Error fetching direct lake leaderboard:", error);
    res.status(500).json({ message: "Failed to fetch lake leaderboard data" });
  }
});