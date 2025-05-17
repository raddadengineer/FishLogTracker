import express from 'express';
import { storage } from './storage';

// Create a router for public user data access
export const userPublicRouter = express.Router();

// Get a specific user by ID
userPublicRouter.get('/:id', async (req, res) => {
  try {
    console.log("Fetching user with ID:", req.params.id);
    console.log("Session user ID:", req.session?.userId);
    
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Get user's catches
userPublicRouter.get('/:id/catches', async (req, res) => {
  try {
    const userId = req.params.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const catches = await storage.getUserCatches(userId, limit);
    res.json(catches);
  } catch (error) {
    console.error("Error fetching user catches:", error);
    res.status(500).json({ message: "Failed to fetch user catches" });
  }
});

// Get user statistics
userPublicRouter.get('/:id/stats', async (req, res) => {
  try {
    const userId = req.params.id;
    const stats = await storage.getUserStats(userId);
    // Ensure we at least return empty stats if none found
    res.json(stats || { 
      totalCatches: 0, 
      uniqueSpecies: 0, 
      totalLikes: 0,
      largestCatch: null 
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ message: "Failed to fetch user stats" });
  }
});

// Get user's species breakdown
userPublicRouter.get('/:id/species', async (req, res) => {
  try {
    const userId = req.params.id;
    const breakdown = await storage.getSpeciesBreakdown(userId);
    // Ensure we return an array even if none found
    res.json({ counts: breakdown || [] });
  } catch (error) {
    console.error("Error fetching species breakdown:", error);
    res.status(500).json({ message: "Failed to fetch species breakdown" });
  }
});