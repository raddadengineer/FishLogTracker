import {
  users,
  catches,
  lakes,
  likes,
  comments,
  follows,
  type User,
  type UpsertUser,
  type Catch,
  type InsertCatch,
  type Lake,
  type InsertLake,
  type Comment,
  type InsertComment,
  type Like,
  type Follow,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, asc, isNull, or, count, like } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserFollowers(userId: string): Promise<User[]>;
  getUserFollowing(userId: string): Promise<User[]>;
  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  updateUserRole(userId: string, role: string): Promise<User>;
  
  // Catch operations
  createCatch(catchData: InsertCatch): Promise<Catch>;
  getCatch(id: number): Promise<Catch | undefined>;
  getUserCatches(userId: string, limit?: number): Promise<Catch[]>;
  getAllCatches(limit?: number, offset?: number): Promise<Catch[]>;
  updateCatch(id: number, catchData: Partial<InsertCatch>): Promise<Catch | undefined>;
  deleteCatch(id: number): Promise<void>;
  verifyCatch(id: number): Promise<Catch | undefined>;
  
  // Lake operations
  createLake(lakeData: InsertLake): Promise<Lake>;
  getLake(id: number): Promise<Lake | undefined>;
  getLakeByName(name: string): Promise<Lake | undefined>;
  getLakesByCoordinates(lat: number, lng: number, radiusKm: number): Promise<Lake[]>;
  getAllLakes(): Promise<Lake[]>;
  
  // Like operations
  likeCatch(userId: string, catchId: number): Promise<void>;
  unlikeCatch(userId: string, catchId: number): Promise<void>;
  isLiked(userId: string, catchId: number): Promise<boolean>;
  getCatchLikes(catchId: number): Promise<number>;
  
  // Comment operations
  addComment(commentData: InsertComment): Promise<Comment>;
  getCatchComments(catchId: number): Promise<Comment[]>;
  getUserComments(userId: string): Promise<Comment[]>;
  deleteComment(id: number, userId: string): Promise<void>;
  updateComment(id: number, userId: string, content: string): Promise<Comment | undefined>;
  
  // Stats operations
  getUserStats(userId: string): Promise<{ 
    totalCatches: number; 
    uniqueSpecies: number;
    totalLikes: number;
    largestCatch: Catch | null;
  }>;
  
  getSpeciesBreakdown(userId: string): Promise<{ species: string; count: number }[]>;
  getLakesBreakdown(userId: string): Promise<{ lake: string; count: number }[]>;
  getGlobalLeaderboard(criteria: 'catches' | 'species' | 'size', limit?: number): Promise<any[]>;
  getLakeLeaderboard(lakeId: number, criteria: 'catches' | 'species' | 'size', limit?: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserFollowers(userId: string): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
    
    return result.map(r => r.user);
  }

  async getUserFollowing(userId: string): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
    
    return result.map(r => r.user);
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    await db
      .insert(follows)
      .values({
        followerId,
        followingId,
      })
      .onConflictDoNothing();
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      );
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      );
    
    return !!result;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // Catch operations
  async createCatch(catchData: InsertCatch): Promise<Catch> {
    const [newCatch] = await db
      .insert(catches)
      .values(catchData)
      .returning();
    
    return newCatch;
  }

  async getCatch(id: number): Promise<any | undefined> {
    const [result] = await db
      .select({
        catch: catches,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl
        }
      })
      .from(catches)
      .leftJoin(users, eq(catches.userId, users.id))
      .where(eq(catches.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.catch,
      user: result.user
    };
  }

  async getUserCatches(userId: string, limit = 10): Promise<any[]> {
    const results = await db
      .select({
        catch: catches,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl
        }
      })
      .from(catches)
      .leftJoin(users, eq(catches.userId, users.id))
      .where(eq(catches.userId, userId))
      .orderBy(desc(catches.createdAt))
      .limit(limit);
    
    return results.map(result => ({
      ...result.catch,
      user: result.user
    }));
  }

  async getAllCatches(limit = 20, offset = 0): Promise<any[]> {
    // Join with users table to get user information
    const results = await db
      .select({
        catch: catches,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl
        }
      })
      .from(catches)
      .leftJoin(users, eq(catches.userId, users.id))
      .orderBy(desc(catches.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Transform results to include user object within catch object
    return results.map(result => ({
      ...result.catch,
      user: result.user
    }));
  }

  async updateCatch(id: number, catchData: Partial<InsertCatch>): Promise<Catch | undefined> {
    const [updatedCatch] = await db
      .update(catches)
      .set({
        ...catchData,
        updatedAt: new Date(),
      })
      .where(eq(catches.id, id))
      .returning();
    
    return updatedCatch;
  }

  async deleteCatch(id: number): Promise<void> {
    await db
      .delete(catches)
      .where(eq(catches.id, id));
  }

  async verifyCatch(id: number): Promise<Catch | undefined> {
    const [verifiedCatch] = await db
      .update(catches)
      .set({ isVerified: true })
      .where(eq(catches.id, id))
      .returning();
    
    return verifiedCatch;
  }

  // Lake operations
  async createLake(lakeData: InsertLake): Promise<Lake> {
    const [newLake] = await db
      .insert(lakes)
      .values(lakeData)
      .returning();
    
    return newLake;
  }

  async getLake(id: number): Promise<Lake | undefined> {
    const [lake] = await db
      .select()
      .from(lakes)
      .where(eq(lakes.id, id));
    
    return lake;
  }

  async getLakeByName(name: string): Promise<Lake | undefined> {
    const [lake] = await db
      .select()
      .from(lakes)
      .where(eq(lakes.name, name));
    
    return lake;
  }

  async getLakesByCoordinates(lat: number, lng: number, radiusKm: number): Promise<Lake[]> {
    // Haversine formula for finding lakes within radius
    const earthRadiusKm = 6371;
    const lakesWithinRadius = await db.execute(sql`
      SELECT * FROM lakes
      WHERE ${radiusKm} >= ${earthRadiusKm} * acos(
        cos(radians(${lat})) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(${lng})) + 
        sin(radians(${lat})) * sin(radians(latitude))
      )
    `);
    
    return lakesWithinRadius as Lake[];
  }

  async getAllLakes(): Promise<Lake[]> {
    return await db
      .select()
      .from(lakes)
      .orderBy(asc(lakes.name));
  }

  // Like operations
  async likeCatch(userId: string, catchId: number): Promise<void> {
    await db
      .insert(likes)
      .values({
        userId,
        catchId,
      })
      .onConflictDoNothing();
  }

  async unlikeCatch(userId: string, catchId: number): Promise<void> {
    await db
      .delete(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.catchId, catchId)
        )
      );
  }

  async isLiked(userId: string, catchId: number): Promise<boolean> {
    const [result] = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.catchId, catchId)
        )
      );
    
    return !!result;
  }

  async getCatchLikes(catchId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(likes)
      .where(eq(likes.catchId, catchId));
    
    return result?.count || 0;
  }

  // Comment operations
  async addComment(commentData: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(commentData)
      .returning();
    
    return newComment;
  }

  async getCatchComments(catchId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.catchId, catchId))
      .orderBy(asc(comments.createdAt));
  }

  async getUserComments(userId: string): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.userId, userId))
      .orderBy(desc(comments.createdAt));
  }

  async deleteComment(id: number, userId: string): Promise<void> {
    await db
      .delete(comments)
      .where(
        and(
          eq(comments.id, id),
          eq(comments.userId, userId)
        )
      );
  }

  async updateComment(id: number, userId: string, content: string): Promise<Comment | undefined> {
    const [updatedComment] = await db
      .update(comments)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(comments.id, id),
          eq(comments.userId, userId)
        )
      )
      .returning();
    
    return updatedComment;
  }

  // Stats operations
  async getUserStats(userId: string): Promise<{ 
    totalCatches: number; 
    uniqueSpecies: number;
    totalLikes: number;
    largestCatch: Catch | null;
  }> {
    // Get total catches
    const [catchesCount] = await db
      .select({ count: count() })
      .from(catches)
      .where(eq(catches.userId, userId));
    
    // Get unique species count
    const uniqueSpeciesResult = await db.execute(sql`
      SELECT COUNT(DISTINCT species) as count 
      FROM catches 
      WHERE user_id = ${userId}
    `);
    
    // Properly parse the result from PostgreSQL
    const uniqueSpeciesCount = uniqueSpeciesResult && uniqueSpeciesResult.rows 
      ? uniqueSpeciesResult.rows[0]?.count || 0 
      : uniqueSpeciesResult[0]?.count || 0;
    
    // Get total likes on user's catches
    const [likesResult] = await db
      .select({ count: count() })
      .from(likes)
      .innerJoin(catches, eq(likes.catchId, catches.id))
      .where(eq(catches.userId, userId));
    
    // Get largest catch by size
    const [largestCatch] = await db
      .select()
      .from(catches)
      .where(eq(catches.userId, userId))
      .orderBy(desc(catches.size))
      .limit(1);
    
    return {
      totalCatches: catchesCount?.count || 0,
      uniqueSpecies: Number(uniqueSpeciesCount),
      totalLikes: likesResult?.count || 0,
      largestCatch: largestCatch || null,
    };
  }

  async getSpeciesBreakdown(userId: string): Promise<{ species: string; count: number }[]> {
    const speciesBreakdown = await db.execute(sql`
      SELECT species, COUNT(*) as count
      FROM catches
      WHERE user_id = ${userId}
      GROUP BY species
      ORDER BY count DESC
    `);
    
    return speciesBreakdown as { species: string; count: number }[];
  }

  async getLakesBreakdown(userId: string): Promise<{ lake: string; count: number }[]> {
    const lakesBreakdown = await db.execute(sql`
      SELECT COALESCE(lake_name, 'Unknown Location') as lake, COUNT(*) as count
      FROM catches
      WHERE user_id = ${userId}
      GROUP BY lake
      ORDER BY count DESC
    `);
    
    return lakesBreakdown as { lake: string; count: number }[];
  }

  async getGlobalLeaderboard(criteria: 'catches' | 'species' | 'size', limit = 10): Promise<any[]> {
    if (criteria === 'catches') {
      // Most catches
      const leaderboard = await db.execute(sql`
        SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", COUNT(c.id) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT ${limit}
      `);
      return leaderboard.rows || [];
    } else if (criteria === 'species') {
      // Most diverse species
      const leaderboard = await db.execute(sql`
        SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", COUNT(DISTINCT c.species) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT ${limit}
      `);
      return leaderboard.rows || [];
    } else {
      // Largest catch
      const leaderboard = await db.execute(sql`
        SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", c.species, c.size, c.catch_date as "catchDate"
        FROM users u
        JOIN catches c ON u.id = c.user_id
        ORDER BY c.size DESC
        LIMIT ${limit}
      `);
      return leaderboard.rows || [];
    }
  }

  async getLakeLeaderboard(lakeId: number, criteria: 'catches' | 'species' | 'size', limit = 10): Promise<any[]> {
    if (criteria === 'catches') {
      // Most catches in specific lake
      const leaderboard = await db.execute(sql`
        SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", COUNT(c.id) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        WHERE c.lake_id = ${lakeId}
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT ${limit}
      `);
      return leaderboard.rows || [];
    } else if (criteria === 'species') {
      // Most diverse species in specific lake
      const leaderboard = await db.execute(sql`
        SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", COUNT(DISTINCT c.species) as count
        FROM users u
        JOIN catches c ON u.id = c.user_id
        WHERE c.lake_id = ${lakeId}
        GROUP BY u.id, u.username, u.profile_image_url
        ORDER BY count DESC
        LIMIT ${limit}
      `);
      return leaderboard.rows || [];
    } else {
      // Largest catch in specific lake
      const leaderboard = await db.execute(sql`
        SELECT u.id, u.username, u.profile_image_url as "profileImageUrl", c.species, c.size, c.catch_date as "catchDate"
        FROM users u
        JOIN catches c ON u.id = c.user_id
        WHERE c.lake_id = ${lakeId}
        ORDER BY c.size DESC
        LIMIT ${limit}
      `);
      return leaderboard.rows || [];
    }
  }
}

export const storage = new DatabaseStorage();
