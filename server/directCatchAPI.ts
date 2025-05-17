import express from 'express';
import { storage } from './storage';
import { z } from 'zod';
import { insertCatchSchema } from '@shared/schema';

// Create a separate express router for direct catch API access
export const directCatchRouter = express.Router();

// Simple catch creation endpoint - no authentication required
directCatchRouter.post('/create', async (req, res) => {
  try {
    console.log("Direct catch API called with body:", req.body);
    
    // Extract user ID if provided, otherwise use a default
    const userId = req.body.userId || '32a4819a-ee2b-4e91-aa42-d313eb2214ba';
    
    // Convert certain data types to match our schema requirements 
    const catchData = {
      userId: userId,
      species: req.body.species || 'Largemouth Bass',
      size: req.body.size?.toString() || '12',
      photos: req.body.photos || [],
      lakeName: req.body.lakeName || null,
      lakeId: req.body.lakeId || null,
      latitude: req.body.latitude ? Number(req.body.latitude) : null,
      longitude: req.body.longitude ? Number(req.body.longitude) : null,
      temperature: req.body.temperature?.toString() || null,
      depth: req.body.depth?.toString() || null,
      weight: req.body.weight?.toString() || null,
      lure: req.body.lure || null,
      weatherData: req.body.weatherData || null,
      comments: req.body.comments || null,
      catchDate: req.body.catchDate ? new Date(req.body.catchDate) : new Date()
    };
    
    // Validate with our schema
    try {
      insertCatchSchema.parse(catchData);
    } catch (validationError) {
      console.error("Validation error:", validationError);
      return res.status(400).json({ 
        message: "Invalid catch data format", 
        errors: validationError
      });
    }
    
    console.log("Processed catch data:", catchData);
    
    // Create the catch in the database
    const newCatch = await storage.createCatch(catchData);
    console.log("Catch created successfully:", newCatch);
    
    // Invalidate any cached queries
    res.status(201).json({
      message: "Catch created successfully!",
      catch: newCatch
    });
  } catch (error) {
    console.error("Error in direct catch API:", error);
    res.status(500).json({ message: "Failed to create catch", error: String(error) });
  }
});