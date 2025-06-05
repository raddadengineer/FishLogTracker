import express from 'express';
import multer from 'multer';
import { isAdmin } from './auth';
import { storage } from './storage';
import { db } from './db';
import { users, catches, lakes, likes, comments } from '@shared/schema';

export const adminRouter = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

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

// Export database
adminRouter.get('/export', isAdmin, async (req, res) => {
  try {
    console.log('Starting database export...');
    
    // Export all data from each table
    const [allUsers, allCatches, allLakes, allLikes, allComments] = await Promise.all([
      db.select().from(users),
      db.select().from(catches),
      db.select().from(lakes),
      db.select().from(likes),
      db.select().from(comments)
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        users: allUsers,
        catches: allCatches,
        lakes: allLakes,
        likes: allLikes,
        comments: allComments
      },
      metadata: {
        recordCount: {
          users: allUsers.length,
          catches: allCatches.length,
          lakes: allLakes.length,
          likes: allLikes.length,
          comments: allComments.length
        }
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="fish-tracker-backup-${new Date().toISOString().split('T')[0]}.json"`);
    
    console.log(`Database export completed: ${JSON.stringify(exportData.metadata.recordCount)}`);
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting database:', error);
    res.status(500).json({ message: 'Failed to export database' });
  }
});

// Import database
adminRouter.post('/import', isAdmin, upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file provided' });
    }

    console.log('Starting database import...');
    
    const backupData = JSON.parse(req.file.buffer.toString('utf8'));
    
    // Validate backup file structure
    if (!backupData.data || !backupData.version) {
      return res.status(400).json({ message: 'Invalid backup file format' });
    }

    const { users: usersData, catches: catchesData, lakes: lakesData, likes: likesData, comments: commentsData } = backupData.data;

    // Start transaction
    await db.transaction(async (tx) => {
      // Clear existing data (in reverse order of dependencies)
      await tx.delete(comments);
      await tx.delete(likes);
      await tx.delete(catches);
      await tx.delete(lakes);
      // Don't delete users as it would break authentication
      
      console.log('Cleared existing data, importing new data...');

      let recordsImported = 0;

      // Import lakes first (no dependencies)
      if (lakesData && lakesData.length > 0) {
        await tx.insert(lakes).values(lakesData);
        recordsImported += lakesData.length;
      }

      // Import catches (depends on users and lakes)
      if (catchesData && catchesData.length > 0) {
        await tx.insert(catches).values(catchesData);
        recordsImported += catchesData.length;
      }

      // Import likes (depends on users and catches)
      if (likesData && likesData.length > 0) {
        await tx.insert(likes).values(likesData);
        recordsImported += likesData.length;
      }

      // Import comments (depends on users and catches)
      if (commentsData && commentsData.length > 0) {
        await tx.insert(comments).values(commentsData);
        recordsImported += commentsData.length;
      }

      console.log(`Database import completed: ${recordsImported} records imported`);
    });

    res.json({ 
      message: 'Database imported successfully',
      recordsImported: backupData.metadata?.recordCount ? 
        Object.values(backupData.metadata.recordCount).reduce((a: number, b: number) => a + b, 0) - (usersData?.length || 0) :
        'Unknown'
    });
  } catch (error) {
    console.error('Error importing database:', error);
    res.status(500).json({ 
      message: 'Failed to import database',
      error: error.message 
    });
  }
});