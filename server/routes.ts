import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getWeatherData } from "./services/openWeatherService";
import { insertCatchSchema, insertCommentSchema, insertLakeSchema, users as usersTable } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  login,
  register,
  logout, 
  getCurrentUser,
  isAuthenticated,
  isAdmin,
  isModeratorOrAdmin
} from "./auth";
import { allowPublicAccess } from "./publicRoutes";
import { directCatchRouter } from "./directCatchAPI";
import { publicCatchRouter } from "./publicCatchRoutes";
import { userPublicRouter } from "./userPublicRoutes";
import { leaderboardRouter } from "./leaderboardRoutes";
import { adminRouter } from "./adminRoutes";

// Create a router for direct leaderboard API
import { Router } from 'express';
import { Pool } from '@neondatabase/serverless';

const directLeaderboardRouter = Router();

// Use the database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Global leaderboard - most catches
directLeaderboardRouter.get('/global', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const criteria = req.query.criteria || 'catches';
    
    let query = '';
    
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
    } else if (criteria === 'size') {
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
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5, // Maximum 5 files
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// We're now using auth.ts middleware for authentication/authorization

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use("/uploads", isAuthenticated, express.static(path.join(process.cwd(), "uploads")));

  // Auth routes
  app.post("/api/auth/login", login);
  app.post("/api/auth/register", register);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/user", getCurrentUser);
  
  // Add profile update endpoint
  app.patch('/api/user/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { firstName, lastName, bio, profileImageUrl } = req.body;
      
      // Get current user to preserve username
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user profile
      const updatedUser = await storage.upsertUser({
        id: userId,
        username: currentUser.username, // Keep the existing username
        firstName,
        lastName,
        bio,
        profileImageUrl
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  // Direct catch API - no authentication required
  app.use("/api/direct-catch", directCatchRouter);
  
  // Public catch routes - no authentication required
  app.use("/api/public-catches", publicCatchRouter);
  
  // Public user routes - no authentication required
  app.use("/api/users", userPublicRouter);
  
  // New leaderboard routes - no authentication required
  app.use("/api/leaderboard/v2", leaderboardRouter);
  
  // Direct leaderboard routes using plain JavaScript
  app.use("/api/leaderboard/direct", directLeaderboardRouter);
  
  // Add an endpoint to get all users (for admin page)
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(usersTable);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Admin routes
  app.use('/api/admin', adminRouter);
  
  // Legacy admin user route - can be removed once the new router is working
  app.get('/api/admin/users-legacy', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(usersTable);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Admin account creation route
  app.post('/api/admin/setup', async (req, res) => {
    try {
      // First check if any admin exists
      const adminUsers = await db.select().from(usersTable).where(eq(usersTable.role, "admin")).limit(1);
      
      if (adminUsers.length > 0) {
        return res.status(403).json({ message: "Admin already exists" });
      }
      
      // Get the current user from the session
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Promote the user to admin
      const adminUser = await storage.updateUserRole(userId, "admin");
      
      res.status(200).json({ 
        message: "Admin account created successfully", 
        user: adminUser 
      });
    } catch (error) {
      console.error("Error creating admin account:", error);
      res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  // User routes - public access for user profiles
  app.get("/api/users/:id", allowPublicAccess, async (req, res) => {
    try {
      const userId = req.params.id;
      
      // For testing and debugging
      console.log("Fetching user with ID:", userId);
      console.log("Session user ID:", (req.session as any)?.userId);
      
      // If the ID is 'me', use the logged-in user's ID
      const userIdToFetch = userId === 'me' ? (req.session as any)?.userId : userId;
      
      if (!userIdToFetch) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userIdToFetch);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user without sensitive information
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/users/:id/stats", allowPublicAccess, async (req, res) => {
    try {
      const userId = req.params.id;
      const stats = await storage.getUserStats(userId);
      
      // Always return a consistent stats object with default values
      const formattedStats = {
        totalCatches: stats?.totalCatches || 0, 
        uniqueSpecies: stats?.uniqueSpecies || 0, 
        totalLikes: stats?.totalLikes || 0,
        largestCatch: stats?.largestCatch || null 
      };
      
      res.json(formattedStats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.get("/api/users/:id/species", allowPublicAccess, async (req, res) => {
    try {
      const userId = req.params.id;
      const speciesBreakdown = await storage.getSpeciesBreakdown(userId);
      
      // Always return a formatted array (even if empty) for consistent client handling
      res.json(Array.isArray(speciesBreakdown) ? speciesBreakdown : []);
    } catch (error) {
      console.error("Error fetching species breakdown:", error);
      res.status(500).json({ message: "Failed to fetch species breakdown" });
    }
  });

  app.get("/api/users/:id/lakes", allowPublicAccess, async (req, res) => {
    try {
      const userId = req.params.id;
      const lakesBreakdown = await storage.getLakesBreakdown(userId);
      
      // Always return a formatted array (even if empty) for consistent client handling
      res.json(Array.isArray(lakesBreakdown) ? lakesBreakdown : []);
    } catch (error) {
      console.error("Error fetching lakes breakdown:", error);
      res.status(500).json({ message: "Failed to fetch lakes breakdown" });
    }
  });

  // Following routes
  app.post("/api/users/:id/follow", allowPublicAccess, async (req, res) => {
    try {
      const followingId = req.params.id;
      const followerId = req.body.followerId || req.headers['user-id'] as string;
      
      if (!followerId) {
        return res.status(400).json({ message: "Follower ID is required" });
      }
      
      if (followerId === followingId) {
        return res.status(400).json({ message: "You cannot follow yourself" });
      }
      
      await storage.followUser(followerId, followingId);
      res.status(200).json({ message: "Successfully followed user" });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.delete("/api/users/:id/follow", allowPublicAccess, async (req, res) => {
    try {
      const followingId = req.params.id;
      const followerId = req.body.followerId || req.headers['user-id'] as string || req.query.followerId as string;
      
      if (!followerId) {
        return res.status(400).json({ message: "Follower ID is required" });
      }
      
      await storage.unfollowUser(followerId, followingId);
      res.status(200).json({ message: "Successfully unfollowed user" });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  app.get("/api/users/:id/followers", allowPublicAccess, async (req, res) => {
    try {
      const userId = req.params.id;
      const followers = await storage.getUserFollowers(userId);
      res.json(followers);
    } catch (error) {
      console.error("Error fetching followers:", error);
      res.status(500).json({ message: "Failed to fetch followers" });
    }
  });

  app.get("/api/users/:id/following", allowPublicAccess, async (req, res) => {
    try {
      const userId = req.params.id;
      const following = await storage.getUserFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error("Error fetching following:", error);
      res.status(500).json({ message: "Failed to fetch following" });
    }
  });

  app.get("/api/users/:id/is-following", allowPublicAccess, async (req, res) => {
    try {
      const followingId = req.params.id;
      const followerId = req.query.followerId as string || req.headers['user-id'] as string;
      
      if (!followerId) {
        return res.json({ isFollowing: false });
      }
      
      const isFollowing = await storage.isFollowing(followerId, followingId);
      res.json({ isFollowing });
    } catch (error) {
      console.error("Error checking following status:", error);
      res.status(500).json({ message: "Failed to check following status" });
    }
  });

  // Catch routes
  app.post("/api/catches", allowPublicAccess, upload.array("photos", 5), async (req, res) => {
    try {
      // Add user ID from header
      req.body.userId = req.headers['user-id'] as string;
      
      // Process uploaded photos
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        req.body.photos = files.map(file => `/uploads/${file.filename}`);
      }
      
      // Get weather data if coordinates are provided
      if (req.body.latitude && req.body.longitude) {
        try {
          const weatherData = await getWeatherData(req.body.latitude, req.body.longitude);
          req.body.weatherData = weatherData;
        } catch (weatherError) {
          console.error("Error fetching weather data:", weatherError);
          // Continue without weather data
        }
      }
      
      // Convert string values to numbers and handle date conversion
      if (req.body.size) req.body.size = parseFloat(req.body.size);
      if (req.body.weight) req.body.weight = parseFloat(req.body.weight);
      if (req.body.latitude) req.body.latitude = parseFloat(req.body.latitude);
      if (req.body.longitude) req.body.longitude = parseFloat(req.body.longitude);
      if (req.body.temperature) req.body.temperature = parseFloat(req.body.temperature);
      if (req.body.depth) req.body.depth = parseFloat(req.body.depth);
      if (req.body.lakeId) req.body.lakeId = parseInt(req.body.lakeId);
      
      // Convert catchDate string to Date object
      if (req.body.catchDate) {
        req.body.catchDate = new Date(req.body.catchDate);
      }
      
      // Parse weatherData if it's a string
      if (req.body.weatherData && typeof req.body.weatherData === 'string') {
        try {
          req.body.weatherData = JSON.parse(req.body.weatherData);
        } catch (e) {
          req.body.weatherData = null;
        }
      }
      
      // Validate using schema
      const result = insertCatchSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid catch data", 
          errors: result.error.errors 
        });
      }
      
      const newCatch = await storage.createCatch(result.data);
      res.status(201).json(newCatch);
    } catch (error) {
      console.error("Error creating catch:", error);
      res.status(500).json({ message: "Failed to create catch" });
    }
  });

  app.get("/api/catches", allowPublicAccess, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Get catches from storage
      const catches = await storage.getAllCatches(limit, offset);

      // If user information isn't available in catches, fetch and add it
      if (catches && catches.length > 0 && !catches[0].user) {
        const catchesWithUsers = await Promise.all(catches.map(async (catchItem) => {
          const user = await storage.getUser(catchItem.userId);
          return {
            ...catchItem,
            user: user ? {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl
            } : null
          };
        }));
        return res.json(catchesWithUsers);
      }
      
      // Otherwise just return the catches as is
      res.json(catches);
    } catch (error) {
      console.error("Error fetching catches:", error);
      res.status(500).json({ message: "Failed to fetch catches" });
    }
  });

  app.get("/api/catches/:id", isAuthenticated, async (req, res) => {
    try {
      const catchId = parseInt(req.params.id);
      const fishCatch = await storage.getCatch(catchId);
      
      if (!fishCatch) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      res.json(fishCatch);
    } catch (error) {
      console.error("Error fetching catch:", error);
      res.status(500).json({ message: "Failed to fetch catch" });
    }
  });

  // Add PATCH route for catch updates
  app.patch("/api/catches/:id", allowPublicAccess, upload.array("photos", 5), async (req, res) => {
    try {
      const catchId = parseInt(req.params.id);
      const userId = req.body.userId || req.headers['user-id'] as string;
      
      // Get existing catch to check ownership
      const existingCatch = await storage.getCatch(catchId);
      if (!existingCatch) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      // Process uploaded photos
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        req.body.photos = files.map(file => `/uploads/${file.filename}`);
      }
      
      // Convert string values to numbers
      if (req.body.size) req.body.size = parseFloat(req.body.size);
      if (req.body.weight) req.body.weight = parseFloat(req.body.weight);
      if (req.body.latitude) req.body.latitude = parseFloat(req.body.latitude);
      if (req.body.longitude) req.body.longitude = parseFloat(req.body.longitude);
      if (req.body.temperature) req.body.temperature = parseFloat(req.body.temperature);
      if (req.body.depth) req.body.depth = parseFloat(req.body.depth);
      if (req.body.lakeId) req.body.lakeId = parseInt(req.body.lakeId);
      
      // Update catch
      const updatedCatch = await storage.updateCatch(catchId, req.body);
      
      if (!updatedCatch) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      res.json(updatedCatch);
    } catch (error) {
      console.error("Error updating catch:", error);
      res.status(500).json({ message: "Failed to update catch" });
    }
  });

  app.put("/api/catches/:id", isAuthenticated, upload.array("photos", 5), async (req, res) => {
    try {
      const catchId = parseInt(req.params.id);
      const userId = req.headers['user-id'] as string;
      
      // Get existing catch to check ownership
      const existingCatch = await storage.getCatch(catchId);
      if (!existingCatch) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      // Check if user owns the catch or is admin/moderator
      if (existingCatch.userId !== userId) {
        const user = await storage.getUser(userId);
        if (!user || (user.role !== "admin" && user.role !== "moderator")) {
          return res.status(403).json({ message: "Not authorized to update this catch" });
        }
      }
      
      // Process uploaded photos
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        // If there are new photos, add them to existing ones
        const newPhotoPaths = files.map(file => `/uploads/${file.filename}`);
        req.body.photos = [...(existingCatch.photos || []), ...newPhotoPaths];
      }
      
      // Convert string values to numbers
      if (req.body.size) req.body.size = parseFloat(req.body.size);
      if (req.body.weight) req.body.weight = parseFloat(req.body.weight);
      if (req.body.latitude) req.body.latitude = parseFloat(req.body.latitude);
      if (req.body.longitude) req.body.longitude = parseFloat(req.body.longitude);
      if (req.body.temperature) req.body.temperature = parseFloat(req.body.temperature);
      if (req.body.depth) req.body.depth = parseFloat(req.body.depth);
      if (req.body.lakeId) req.body.lakeId = parseInt(req.body.lakeId);
      
      // Update catch
      const updatedCatch = await storage.updateCatch(catchId, req.body);
      
      if (!updatedCatch) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      res.json(updatedCatch);
    } catch (error) {
      console.error("Error updating catch:", error);
      res.status(500).json({ message: "Failed to update catch" });
    }
  });

  // Add endpoint for users to verify their own catches
  app.patch("/api/catches/:id/verify", isAuthenticated, async (req, res) => {
    try {
      const catchId = parseInt(req.params.id);
      const userId = req.headers['user-id'] as string || (req.session as any)?.userId;
      const userRole = (req.session as any)?.role || req.headers['x-auth-user-role'] as string;
      
      // Get the catch from the database
      const catchItem = await storage.getCatch(catchId);
      
      if (!catchItem) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      // Check if user is the owner of the catch or has admin/moderator role
      const isOwner = catchItem.userId === userId;
      const isAdminOrModerator = userRole === 'admin' || userRole === 'moderator';
      
      if (!isOwner && !isAdminOrModerator) {
        return res.status(403).json({ message: "You can only verify your own catches" });
      }
      
      // Verify the catch
      const verifiedCatch = await storage.verifyCatch(catchId);
      
      res.json(verifiedCatch);
    } catch (error) {
      console.error("Error verifying catch:", error);
      res.status(500).json({ message: "Failed to verify catch" });
    }
  });

  app.delete("/api/catches/:id", isAuthenticated, async (req, res) => {
    try {
      const catchId = parseInt(req.params.id);
      const userId = req.headers['user-id'] as string;
      
      // Get existing catch to check ownership
      const existingCatch = await storage.getCatch(catchId);
      if (!existingCatch) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      // Check if user owns the catch or is admin/moderator
      if (existingCatch.userId !== userId) {
        const user = await storage.getUser(userId);
        if (!user || (user.role !== "admin" && user.role !== "moderator")) {
          return res.status(403).json({ message: "Not authorized to delete this catch" });
        }
      }
      
      await storage.deleteCatch(catchId);
      res.status(200).json({ message: "Catch deleted successfully" });
    } catch (error) {
      console.error("Error deleting catch:", error);
      res.status(500).json({ message: "Failed to delete catch" });
    }
  });

  app.get("/api/users/:id/catches", allowPublicAccess, async (req, res) => {
    try {
      const userId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const catches = await storage.getUserCatches(userId, limit);
      res.json(catches);
    } catch (error) {
      console.error("Error fetching user catches:", error);
      res.status(500).json({ message: "Failed to fetch user catches" });
    }
  });

  // Verification route for moderators and admins
  app.post("/api/catches/:id/verify", isModeratorOrAdmin, async (req, res) => {
    try {
      const catchId = parseInt(req.params.id);
      const verifiedCatch = await storage.verifyCatch(catchId);
      
      if (!verifiedCatch) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      res.json(verifiedCatch);
    } catch (error) {
      console.error("Error verifying catch:", error);
      res.status(500).json({ message: "Failed to verify catch" });
    }
  });

  // Lake routes
  app.post("/api/lakes", isAuthenticated, async (req, res) => {
    try {
      // Validate using schema
      const result = insertLakeSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid lake data", 
          errors: result.error.errors 
        });
      }
      
      const newLake = await storage.createLake(result.data);
      res.status(201).json(newLake);
    } catch (error) {
      console.error("Error creating lake:", error);
      res.status(500).json({ message: "Failed to create lake" });
    }
  });

  app.get("/api/lakes", allowPublicAccess, async (req, res) => {
    try {
      const lakes = await storage.getAllLakes();
      res.json(lakes);
    } catch (error) {
      console.error("Error fetching lakes:", error);
      res.status(500).json({ message: "Failed to fetch lakes" });
    }
  });

  app.get("/api/lakes/:id", isAuthenticated, async (req, res) => {
    try {
      const lakeId = parseInt(req.params.id);
      const lake = await storage.getLake(lakeId);
      
      if (!lake) {
        return res.status(404).json({ message: "Lake not found" });
      }
      
      res.json(lake);
    } catch (error) {
      console.error("Error fetching lake:", error);
      res.status(500).json({ message: "Failed to fetch lake" });
    }
  });

  app.get("/api/lakes/search", isAuthenticated, async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = parseFloat(req.query.radius as string) || 10; // Default 10km radius
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }
      
      const nearbyLakes = await storage.getLakesByCoordinates(lat, lng, radius);
      res.json(nearbyLakes);
    } catch (error) {
      console.error("Error searching lakes:", error);
      res.status(500).json({ message: "Failed to search lakes" });
    }
  });

  // Like routes
  app.post("/api/catches/:id/like", isAuthenticated, async (req, res) => {
    try {
      const catchId = parseInt(req.params.id);
      const userId = req.headers['user-id'] as string;
      
      await storage.likeCatch(userId, catchId);
      const likesCount = await storage.getCatchLikes(catchId);
      
      res.json({ liked: true, likes: likesCount });
    } catch (error) {
      console.error("Error liking catch:", error);
      res.status(500).json({ message: "Failed to like catch" });
    }
  });

  app.delete("/api/catches/:id/like", isAuthenticated, async (req, res) => {
    try {
      const catchId = parseInt(req.params.id);
      const userId = req.headers['user-id'] as string;
      
      await storage.unlikeCatch(userId, catchId);
      const likesCount = await storage.getCatchLikes(catchId);
      
      res.json({ liked: false, likes: likesCount });
    } catch (error) {
      console.error("Error unliking catch:", error);
      res.status(500).json({ message: "Failed to unlike catch" });
    }
  });

  app.get("/api/catches/:id/like", isAuthenticated, async (req, res) => {
    try {
      const catchId = parseInt(req.params.id);
      const userId = req.headers['user-id'] as string;
      
      const isLiked = await storage.isLiked(userId, catchId);
      const likesCount = await storage.getCatchLikes(catchId);
      
      res.json({ liked: isLiked, likes: likesCount });
    } catch (error) {
      console.error("Error checking like status:", error);
      res.status(500).json({ message: "Failed to check like status" });
    }
  });

  // Comment routes
  app.post("/api/catches/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const catchId = parseInt(req.params.id);
      const userId = req.headers['user-id'] as string;
      
      // Create comment object
      const commentData = {
        userId,
        catchId,
        content: req.body.content,
      };
      
      // Validate using schema
      const result = insertCommentSchema.safeParse(commentData);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid comment data", 
          errors: result.error.errors 
        });
      }
      
      const newComment = await storage.addComment(result.data);
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  app.get("/api/catches/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const catchId = parseInt(req.params.id);
      const comments = await storage.getCatchComments(catchId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.put("/api/comments/:id", isAuthenticated, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const userId = req.headers['user-id'] as string;
      const content = req.body.content;
      
      if (!content || content.trim() === "") {
        return res.status(400).json({ message: "Comment content cannot be empty" });
      }
      
      const updatedComment = await storage.updateComment(commentId, userId, content);
      
      if (!updatedComment) {
        return res.status(404).json({ message: "Comment not found or you're not authorized to edit it" });
      }
      
      res.json(updatedComment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  app.delete("/api/comments/:id", isAuthenticated, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const userId = req.headers['user-id'] as string;
      
      await storage.deleteComment(commentId, userId);
      res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Leaderboard routes
  app.get("/api/leaderboard", allowPublicAccess, async (req, res) => {
    try {
      const criteria = (req.query.criteria as string) || 'catches';
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!['catches', 'species', 'size'].includes(criteria)) {
        return res.status(400).json({ message: "Invalid criteria" });
      }
      
      const leaderboard = await storage.getGlobalLeaderboard(criteria as 'catches' | 'species' | 'size', limit);
      console.log('Leaderboard data for criteria:', criteria, JSON.stringify(leaderboard));
      
      // Always return a valid array, even if empty
      res.json(leaderboard || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });
  
  app.get("/api/leaderboard/:criteria", isAuthenticated, async (req, res) => {
    try {
      const criteria = req.params.criteria as 'catches' | 'species' | 'size';
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!['catches', 'species', 'size'].includes(criteria)) {
        return res.status(400).json({ message: "Invalid criteria" });
      }
      
      const leaderboard = await storage.getGlobalLeaderboard(criteria, limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/lakes/:id/leaderboard", allowPublicAccess, async (req, res) => {
    try {
      const lakeId = parseInt(req.params.id);
      const criteria = (req.query.criteria as string) || 'catches';
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!['catches', 'species', 'size'].includes(criteria)) {
        return res.status(400).json({ message: "Invalid criteria" });
      }
      
      const leaderboard = await storage.getLakeLeaderboard(lakeId, criteria as 'catches' | 'species' | 'size', limit);
      console.log('Lake leaderboard data for criteria:', criteria, JSON.stringify(leaderboard));
      
      // Always return a valid array, even if empty
      res.json(leaderboard || []);
    } catch (error) {
      console.error("Error fetching lake leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch lake leaderboard" });
    }
  });
  
  app.get("/api/lakes/:id/leaderboard/:criteria", isAuthenticated, async (req, res) => {
    try {
      const lakeId = parseInt(req.params.id);
      const criteria = req.params.criteria as 'catches' | 'species' | 'size';
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!['catches', 'species', 'size'].includes(criteria)) {
        return res.status(400).json({ message: "Invalid criteria" });
      }
      
      const leaderboard = await storage.getLakeLeaderboard(lakeId, criteria, limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching lake leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch lake leaderboard" });
    }
  });

  // Admin routes
  app.put("/api/admin/users/:id/role", isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { role } = req.body;
      
      if (!role || !['user', 'moderator', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.updateUserRole(userId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Weather API - accessible without authentication
  app.get("/api/weather", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }
      
      const weatherData = await getWeatherData(lat, lng);
      res.json(weatherData);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      res.status(500).json({ message: "Failed to fetch weather data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
