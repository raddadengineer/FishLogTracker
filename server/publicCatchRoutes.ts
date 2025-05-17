import express from 'express';
import { storage } from './storage';

// Create a router for public access to catch data
export const publicCatchRouter = express.Router();

// Get all catches without requiring authentication
publicCatchRouter.get('/all', async (req, res) => {
  try {
    console.log("Fetching all catches publicly");
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const catches = await storage.getAllCatches(limit, offset);
    console.log(`Found ${catches.length} catches`);
    
    res.json(catches);
  } catch (error) {
    console.error("Error fetching public catches:", error);
    res.status(500).json({ message: "Failed to fetch catches" });
  }
});

// Get a specific catch by ID without requiring authentication
publicCatchRouter.get('/:id', async (req, res) => {
  try {
    const catchId = parseInt(req.params.id);
    if (isNaN(catchId)) {
      return res.status(400).json({ message: "Invalid catch ID" });
    }
    
    const catchData = await storage.getCatch(catchId);
    if (!catchData) {
      return res.status(404).json({ message: "Catch not found" });
    }
    
    res.json(catchData);
  } catch (error) {
    console.error("Error fetching public catch:", error);
    res.status(500).json({ message: "Failed to fetch catch" });
  }
});