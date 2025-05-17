import { Request, Response, NextFunction } from "express";

// Middleware that allows public access but captures auth information
export const allowPublicAccess = (req: Request, res: Response, next: NextFunction) => {
  console.log("Public access middleware - headers:", req.headers);
  
  // If there's an auth header from localStorage, use it (for edit permissions)
  if (req.headers['x-auth-user-id']) {
    req.headers['user-id'] = req.headers['x-auth-user-id'] as string;
    console.log("Using user ID from headers:", req.headers['user-id']);
  } else if (req.body && req.body.userId) {
    // If the userId is in the request body, use that
    req.headers['user-id'] = req.body.userId;
    console.log("Using user ID from body:", req.body.userId);
  } else {
    // Default to a test user ID if available in request headers
    const testUserId = req.headers['x-test-user-id'];
    if (testUserId) {
      req.headers['user-id'] = testUserId as string;
      console.log("Using test user ID:", testUserId);
    } else {
      console.log("No user ID available");
    }
  }
  
  // Always proceed with the request
  next();
};