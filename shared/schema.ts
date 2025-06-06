import {
  pgTable,
  text,
  serial,
  varchar,
  doublePrecision,
  timestamp,
  integer,
  boolean,
  json,
  jsonb,
  decimal,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  }
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").notNull().unique(),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  role: varchar("role").default("user").notNull(), // user, moderator, admin
});

export const usersRelations = relations(users, ({ many }) => ({
  catches: many(catches),
  followers: many(follows, { relationName: "following" }),
  following: many(follows, { relationName: "followers" }),
}));

// Follows table (for follow/following functionality)
export const follows = pgTable(
  "follows",
  {
    followerId: varchar("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: varchar("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.followerId, table.followingId] }),
    };
  }
);

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "followers",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

// Lakes table
export const lakes = pgTable("lakes", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lakesRelations = relations(lakes, ({ many }) => ({
  catches: many(catches),
}));

// Fish catches table
export const catches = pgTable("catches", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  species: varchar("species").notNull(),
  size: decimal("size", { precision: 5, scale: 2 }).notNull(), // in inches
  weight: decimal("weight", { precision: 5, scale: 2 }), // in pounds
  lakeId: integer("lake_id").references(() => lakes.id),
  lakeName: varchar("lake_name"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  temperature: decimal("temperature", { precision: 5, scale: 2 }), // water temperature
  depth: decimal("depth", { precision: 5, scale: 2 }), // depth in feet
  lure: varchar("lure"), // lure or bait used
  weatherData: json("weather_data"),
  comments: text("comments"),
  photoData: json("photo_data"), // Store photo metadata and base64 data
  catchDate: timestamp("catch_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isVerified: boolean("is_verified").default(false),
});

export const catchesRelations = relations(catches, ({ one, many }) => ({
  user: one(users, {
    fields: [catches.userId],
    references: [users.id],
  }),
  lake: one(lakes, {
    fields: [catches.lakeId],
    references: [lakes.id],
  }),
  likes: many(likes),
  comments: many(comments),
}));

// Likes table
export const likes = pgTable(
  "likes",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    catchId: integer("catch_id")
      .notNull()
      .references(() => catches.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.catchId] }),
    };
  }
);

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  catch: one(catches, {
    fields: [likes.catchId],
    references: [catches.id],
  }),
}));

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  catchId: integer("catch_id")
    .notNull()
    .references(() => catches.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  catch: one(catches, {
    fields: [comments.catchId],
    references: [catches.id],
  }),
}));

// Schema validation
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = insertUserSchema.partial({
  passwordHash: true
});

export const insertCatchSchema = createInsertSchema(catches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVerified: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLakeSchema = createInsertSchema(lakes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCatch = z.infer<typeof insertCatchSchema>;
export type Catch = typeof catches.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertLake = z.infer<typeof insertLakeSchema>;
export type Lake = typeof lakes.$inferSelect;

export type Like = typeof likes.$inferSelect;
export type Follow = typeof follows.$inferSelect;
