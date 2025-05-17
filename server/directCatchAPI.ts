import express from 'express';
import { storage } from './storage';

// Create a separate express router for direct catch API access
export const directCatchRouter = express.Router();

// Simple catch creation endpoint - no authentication required
directCatchRouter.post('/create', async (req, res) => {
  try {
    console.log("Direct catch API called with body:", req.body);
    
    // Extract user ID if provided, otherwise use a default
    const userId = req.body.userId || '32a4819a-ee2b-4e91-aa42-d313eb2214ba';
    
    // Prepare catch data with required fields
    const catchData = {
      userId,
      species: req.body.species || 'Largemouth Bass', // Default species if none provided
      size: (req.body.size || '12').toString(), // Size as string per schema
      weight: req.body.weight ? req.body.weight.toString() : undefined,
      lakeName: req.body.lakeName || undefined,
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : undefined,
      temperature: req.body.temperature ? parseFloat(req.body.temperature) : undefined,
      depth: req.body.depth ? parseFloat(req.body.depth) : undefined,
      lure: req.body.lure || undefined,
      comments: req.body.comments || undefined,
      catchDate: req.body.catchDate || new Date().toISOString(),
      verified: false
    };
    
    console.log("Processed catch data:", catchData);
    
    // Create the catch in the database
    const newCatch = await storage.createCatch(catchData);
    console.log("Catch created successfully:", newCatch);
    
    res.status(201).json({
      message: "Catch created successfully!",
      catch: newCatch
    });
  } catch (error) {
    console.error("Error in direct catch API:", error);
    res.status(500).json({ message: "Failed to create catch" });
  }
});