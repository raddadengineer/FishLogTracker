import { Request, Response, NextFunction } from "express";

// A dummy middleware that allows public access
export const allowPublicAccess = (req: Request, res: Response, next: NextFunction) => {
  // If there's an auth header from localStorage, use it (for edit permissions)
  if (req.headers['x-auth-user-id']) {
    req.headers['user-id'] = req.headers['x-auth-user-id'] as string;
  }
  
  // Always proceed with the request
  next();
};