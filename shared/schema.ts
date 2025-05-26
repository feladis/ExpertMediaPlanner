import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User/Expert profile table
export const experts = pgTable("experts", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role"),
  profileComplete: boolean("profile_complete").default(false),
  profileImage: text("profile_image"),
});

// Expert profile details
export const expertProfiles = pgTable("expert_profiles", {
  id: serial("id").primaryKey(),
  expertId: integer("expert_id").notNull().references(() => experts.id),
  primaryExpertise: text("primary_expertise"),
  secondaryExpertise: jsonb("secondary_expertise").$type<string[]>(),
  expertiseKeywords: jsonb("expertise_keywords").$type<string[]>(),
  voiceTone: jsonb("voice_tone").$type<string[]>(),
  personalBranding: text("personal_branding"),
  platforms: jsonb("platforms").$type<string[]>(),
  informationSources: jsonb("information_sources").$type<{name: string, url: string}[]>(),
  targetAudience: text("target_audience"),
  contentGoals: jsonb("content_goals").$type<string[]>()
});

// Content topics
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  expertId: integer("expert_id").notNull().references(() => experts.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  status: text("status").default("active"),
  trending: boolean("trending").default(false),
  engagement: text("engagement").default("normal"),
  isRecommended: boolean("is_recommended").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  tags: jsonb("tags").$type<string[]>(),
});

// Strategic viewpoints for topics
export const viewpoints = pgTable("viewpoints", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => topics.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
});

// Platform-specific content ideas
export const contentIdeas = pgTable("content_ideas", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => topics.id),
  platform: text("platform").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  format: text("format"),
  keyPoints: jsonb("key_points").$type<string[]>(),
  sources: jsonb("sources").$type<string[]>(),
  saved: boolean("saved").default(false),
});

// Scheduled content
export const scheduledContent = pgTable("scheduled_content", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => topics.id),
  expertId: integer("expert_id").notNull().references(() => experts.id),
  platform: text("platform").notNull(),
  contentType: text("content_type").notNull(),
  title: text("title").notNull(),
  status: text("status").default("draft"),
  scheduledDate: timestamp("scheduled_date"),
  content: text("content"),
});

// Schema for inserting new experts
export const insertExpertSchema = createInsertSchema(experts).omit({
  id: true,
  profileComplete: true,
  profileImage: true,
});

// Schema for inserting expert profiles
export const insertExpertProfileSchema = createInsertSchema(expertProfiles).omit({
  id: true,
});

// Schema for inserting topics
export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
  status: true,
  trending: true,
  engagement: true,
  isRecommended: true,
});

// Schema for inserting viewpoints
export const insertViewpointSchema = createInsertSchema(viewpoints).omit({
  id: true,
});

// Schema for inserting content ideas
export const insertContentIdeaSchema = createInsertSchema(contentIdeas).omit({
  id: true,
  saved: true,
});

// Schema for inserting scheduled content
export const insertScheduledContentSchema = createInsertSchema(scheduledContent).omit({
  id: true,
  status: true,
});

// Export types
export type Expert = typeof experts.$inferSelect;
export type InsertExpert = z.infer<typeof insertExpertSchema>;

export type ExpertProfile = typeof expertProfiles.$inferSelect;
export type InsertExpertProfile = z.infer<typeof insertExpertProfileSchema>;

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

export type Viewpoint = typeof viewpoints.$inferSelect;
export type InsertViewpoint = z.infer<typeof insertViewpointSchema>;

export type ContentIdea = typeof contentIdeas.$inferSelect;
export type InsertContentIdea = z.infer<typeof insertContentIdeaSchema>;

export type ScheduledContent = typeof scheduledContent.$inferSelect;
export type InsertScheduledContent = z.infer<typeof insertScheduledContentSchema>;