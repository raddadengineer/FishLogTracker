import express from 'express';
import multer from 'multer';
import { sql } from 'drizzle-orm';
import { requireAdminSession, requireSessionAuth } from './auth';
import { storage } from './storage';
import { db } from './db';
import { users, catches, lakes, likes, comments, follows, sessions } from '@shared/schema';

export const adminRouter = express.Router();

// Configure multer for file uploads (large JSON backups may include catch photos as base64)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB
});

// First admin bootstrap: must run before requireAdminSession (no admin yet)
adminRouter.post('/setup', requireSessionAuth, async (req, res) => {
  try {
    const adminUsers = await storage.getAdminUsers();

    if (adminUsers.length > 0) {
      return res.status(403).json({ message: 'Admin already exists' });
    }

    const userId = req.headers['user-id'] as string;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const adminUser = await storage.updateUserRole(userId, 'admin');

    res.status(200).json({
      message: 'Admin account created successfully',
      user: adminUser,
    });
  } catch (error) {
    console.error('Error creating admin account:', error);
    res.status(500).json({ message: 'Failed to create admin account' });
  }
});

adminRouter.use(requireAdminSession);

// Get all users
adminRouter.get('/users', async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// Update user role
adminRouter.patch('/users/:userId/role', async (req, res) => {
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

// Verify a catch
adminRouter.patch('/catches/:id/verify', async (req, res) => {
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
adminRouter.get('/export', async (req, res) => {
  try {
    console.log('Starting database export...');
    
    // Export all data from each table
    const [allUsers, allCatches, allLakes, allLikes, allComments, allFollows] = await Promise.all([
      db.select().from(users),
      db.select().from(catches),
      db.select().from(lakes),
      db.select().from(likes),
      db.select().from(comments),
      db.select().from(follows),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.1',
      data: {
        users: allUsers,
        catches: allCatches,
        lakes: allLakes,
        likes: allLikes,
        comments: allComments,
        follows: allFollows,
      },
      metadata: {
        recordCount: {
          users: allUsers.length,
          catches: allCatches.length,
          lakes: allLakes.length,
          likes: allLikes.length,
          comments: allComments.length,
          follows: allFollows.length,
        },
      },
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

// Import database — full replace (users, follows, sessions, and all app tables)
adminRouter.post('/import', upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file provided' });
    }

    console.log('Starting database import...');

    const backupData = JSON.parse(req.file.buffer.toString('utf8'));

    if (!backupData.data || backupData.version == null) {
      return res.status(400).json({ message: 'Invalid backup file format' });
    }

    const verNum = parseFloat(String(backupData.version));
    if (!Number.isFinite(verNum) || verNum < 1 || verNum >= 2) {
      return res.status(400).json({
        message: `Unsupported backup version: ${String(backupData.version)} (expected 1.x)`,
      });
    }

    const {
      users: usersData = [],
      catches: catchesData = [],
      lakes: lakesData = [],
      likes: likesData = [],
      comments: commentsData = [],
      follows: followsData = [],
    } = backupData.data;

    if (!Array.isArray(usersData)) {
      return res.status(400).json({ message: 'Backup must include a users array' });
    }

    if (usersData.length === 0) {
      return res.status(400).json({
        message: 'Refusing empty restore: backup must contain at least one user.',
      });
    }

    let recordsImported = 0;

    await db.transaction(async (tx) => {
      await tx.delete(comments);
      await tx.delete(likes);
      await tx.delete(follows);
      await tx.delete(catches);
      await tx.delete(lakes);
      await tx.delete(sessions);
      await tx.delete(users);

      console.log('Cleared existing data, importing full backup...');

      if (usersData.length > 0) {
        await tx.insert(users).values(usersData);
        recordsImported += usersData.length;
      }

      if (lakesData.length > 0) {
        await tx.insert(lakes).values(lakesData);
        recordsImported += lakesData.length;
      }

      if (catchesData.length > 0) {
        await tx.insert(catches).values(catchesData);
        recordsImported += catchesData.length;
      }

      if (likesData.length > 0) {
        await tx.insert(likes).values(likesData);
        recordsImported += likesData.length;
      }

      if (commentsData.length > 0) {
        await tx.insert(comments).values(commentsData);
        recordsImported += commentsData.length;
      }

      if (followsData.length > 0) {
        await tx.insert(follows).values(followsData);
        recordsImported += followsData.length;
      }

      await tx.execute(
        sql.raw(
          `SELECT setval(pg_get_serial_sequence('lakes', 'id'), COALESCE((SELECT MAX(id) FROM lakes), 1))`,
        ),
      );
      await tx.execute(
        sql.raw(
          `SELECT setval(pg_get_serial_sequence('catches', 'id'), COALESCE((SELECT MAX(id) FROM catches), 1))`,
        ),
      );
      await tx.execute(
        sql.raw(
          `SELECT setval(pg_get_serial_sequence('comments', 'id'), COALESCE((SELECT MAX(id) FROM comments), 1))`,
        ),
      );

      console.log(`Database import completed: ${recordsImported} rows imported`);
    });

    res.json({
      message:
        'Full database restored. All sessions were cleared; sign in again with an account from the backup.',
      recordsImported,
    });
  } catch (error) {
    console.error('Error importing database:', error);
    const message = error instanceof Error ? error.message : 'Import failed';
    res.status(500).json({
      message: 'Failed to import database',
      error: message,
    });
  }
});