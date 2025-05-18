import express from 'express';
import { isAdmin } from './auth';
import { storage } from './storage';

export const adminRouter = express.Router();

// Get all users
adminRouter.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// Update user role
adminRouter.patch('/users/:userId/role', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const updatedUser = await storage.updateUserRole(userId, role);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// Setup first admin account
adminRouter.post('/setup', async (req, res) => {
  try {
    // Check if any admin exists
    const adminUsers = await storage.getAdminUsers();
    
    if (adminUsers.length > 0) {
      return res.status(403).json({ message: 'Admin already exists' });
    }
    
    // Get the current user from the session
    const userId = req.headers['user-id'] as string;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Promote the user to admin
    const adminUser = await storage.updateUserRole(userId, 'admin');
    
    res.status(200).json({ 
      message: 'Admin account created successfully', 
      user: adminUser 
    });
  } catch (error) {
    console.error('Error creating admin account:', error);
    res.status(500).json({ message: 'Failed to create admin account' });
  }
});

// Verify a catch
adminRouter.patch('/catches/:id/verify', isAdmin, async (req, res) => {
  try {
    const catchId = parseInt(req.params.id);
    
    const verifiedCatch = await storage.verifyCatch(catchId);
    
    if (!verifiedCatch) {
      return res.status(404).json({ message: 'Catch not found' });
    }
    
    res.json(verifiedCatch);
  } catch (error) {
    console.error('Error verifying catch:', error);
    res.status(500).json({ message: 'Failed to verify catch' });
  }
});