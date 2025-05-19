import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { LoginCredentials, RegisterData } from "@shared/authTypes";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

// Create a session object and add to request
export function createSession(req: Request, userId: string, role: string) {
  if (!req.session) {
    req.session = {} as any;
  }
  
  // Set session variables
  (req.session as any).userId = userId;
  (req.session as any).role = role;
  (req.session as any).isAuthenticated = true;
  
  console.log("Session created for user:", userId);
  console.log("Session data:", req.session);
}

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log("Authentication check - Session data:", req.session);
  
  if (req.session && (req.session as any).isAuthenticated) {
    // Add user ID to request headers for use in routes
    req.headers['user-id'] = (req.session as any).userId;
    console.log("User authenticated:", (req.session as any).userId);
    return next();
  }
  
  // Check localStorage fallback authentication from request headers
  if (req.headers['x-auth-user-id']) {
    console.log("Using fallback auth from headers:", req.headers['x-auth-user-id']);
    req.headers['user-id'] = req.headers['x-auth-user-id'] as string;
    return next();
  }
  
  console.log("Authentication failed - no valid session");
  return res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is an admin
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First check session authentication
    if (req.session && (req.session as any).isAuthenticated && (req.session as any).role === "admin") {
      console.log("Admin authenticated via session:", (req.session as any).userId);
      req.headers['user-id'] = (req.session as any).userId;
      return next();
    }
    
    // If session auth fails, check for fallback authentication from headers
    if (req.headers['x-auth-user-id'] && req.headers['x-auth-user-role'] === 'admin') {
      console.log("Admin authenticated via headers:", req.headers['x-auth-user-id']);
      req.headers['user-id'] = req.headers['x-auth-user-id'] as string;
      return next();
    }
    
    // If both authentication methods fail, return unauthorized
    console.log("Admin authentication failed - no valid session or headers");
    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error("Admin authorization error:", error);
    res.status(500).json({ message: "Server error during authorization check" });
  }
};

// Middleware to check if user is a moderator or admin
export const isModeratorOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First check session authentication
    if (req.session && (req.session as any).isAuthenticated) {
      if ((req.session as any).role === "moderator" || (req.session as any).role === "admin") {
        req.headers['user-id'] = (req.session as any).userId;
        return next();
      }
    }
    
    // If session auth fails, check for fallback authentication from headers
    if (req.headers['x-auth-user-id'] && 
       (req.headers['x-auth-user-role'] === 'moderator' || req.headers['x-auth-user-role'] === 'admin')) {
      req.headers['user-id'] = req.headers['x-auth-user-id'] as string;
      return next();
    }
    
    // If both authentication methods fail, return unauthorized
    return res.status(403).json({ message: "Forbidden: Moderator or admin access required" });
  } catch (error) {
    console.error("Moderator/Admin authorization error:", error);
    res.status(500).json({ message: "Server error during authorization check" });
  }
};

// Login handler
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginCredentials;
    
    // Check for default admin account (admin@example.com/admin)
    if (email === "admin@example.com" && password === "admin") {
      // Check if default admin exists in DB, if not create it
      const [adminUser] = await db.select().from(users).where(eq(users.email, "admin@example.com"));
      
      if (!adminUser) {
        const passwordHash = await bcrypt.hash("admin", 10);
        const [newAdmin] = await db.insert(users).values({
          id: uuidv4(),
          username: "admin",
          email: "admin@example.com",
          passwordHash: passwordHash,
          role: "admin"
        }).returning();
        
        createSession(req, newAdmin.id, newAdmin.role);
        return res.status(200).json({ message: "Login successful", user: {
          id: newAdmin.id,
          username: newAdmin.username,
          email: newAdmin.email,
          role: newAdmin.role
        }});
      } else {
        createSession(req, adminUser.id, adminUser.role);
        return res.status(200).json({ message: "Login successful", user: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role
        }});
      }
    }
    
    // Normal user login
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    createSession(req, user.id, user.role);
    
    return res.status(200).json({ message: "Login successful", user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }});
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
};

// Register handler
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body as RegisterData;
    
    // Check if email already exists
    const [existingEmail] = await db.select().from(users).where(eq(users.email, email));
    if (existingEmail) {
      return res.status(400).json({ message: "Email already in use" });
    }
    
    // Check if username already exists
    const [existingUsername] = await db.select().from(users).where(eq(users.username, username));
    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }
    
    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    const [newUser] = await db.insert(users).values({
      id: userId,
      username,
      email,
      passwordHash,
      role: "user"
    }).returning();
    
    createSession(req, newUser.id, newUser.role);
    
    return res.status(201).json({ message: "Registration successful", user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    }});
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Server error during registration" });
  }
};

// Logout handler
export const logout = (req: Request, res: Response) => {
  if (req.session) {
    (req.session as any).isAuthenticated = false;
    (req.session as any).userId = undefined;
    (req.session as any).role = undefined;
  }
  return res.status(200).json({ message: "Logout successful" });
};

// Current user handler
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.session || !(req.session as any).userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    
    if (!user) {
      if (req.session) {
        (req.session as any).isAuthenticated = false;
        (req.session as any).userId = undefined;
        (req.session as any).role = undefined;
      }
      return res.status(401).json({ message: "User not found" });
    }
    
    // Return user without password hash
    const { passwordHash, ...safeUser } = user;
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(500).json({ message: "Server error fetching user data" });
  }
};