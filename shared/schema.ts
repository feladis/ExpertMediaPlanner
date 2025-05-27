import { pgTable, text, serial, integer, boolean, jsonb, timestamp, doublePrecision } from "drizzle-orm/pg-core";
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
  replitId: text("replit_id").unique(),
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

// Scraped content tables for RAG system
export const scrapedContent = pgTable("scraped_content", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  author: text("author"),
  publishedDate: timestamp("published_date"),
  scrapedDate: timestamp("scraped_date").defaultNow(),
  contentHash: text("content_hash").notNull().unique(),
  domain: text("domain").notNull(),
  wordCount: integer("word_count").default(0),
  relevanceScore: doublePrecision("relevance_score").default(0),
  status: text("status").notNull().default("active"), // active, archived, failed
  keywords: jsonb("keywords").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const expertContentRelevance = pgTable("expert_content_relevance", {
  id: serial("id").primaryKey(),
  expertId: integer("expert_id").references(() => experts.id, { onDelete: "cascade" }),
  scrapedContentId: integer("scraped_content_id").references(() => scrapedContent.id, { onDelete: "cascade" }),
  relevanceScore: real("relevance_score").notNull(),
  matchedKeywords: jsonb("matched_keywords").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow()
});

export const scrapingTargets = pgTable("scraping_targets", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  baseUrl: text("base_url").notNull(),
  isActive: boolean("is_active").default(true),
  lastScrapedAt: timestamp("last_scraped_at"),
  scrapingFrequency: integer("scraping_frequency").default(24), // hours
  rateLimit: integer("rate_limit").default(2000), // milliseconds between requests
  maxPages: integer("max_pages").default(10),
  selectors: jsonb("selectors"), // CSS selectors for title, content, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
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

// Scraped content schemas
export const insertScrapedContentSchema = createInsertSchema(scrapedContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpertContentRelevanceSchema = createInsertSchema(expertContentRelevance).omit({
  id: true,
  createdAt: true,
});

export const insertScrapingTargetSchema = createInsertSchema(scrapingTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Scraped content types
export type ScrapedContent = typeof scrapedContent.$inferSelect;
export type InsertScrapedContent = z.infer<typeof insertScrapedContentSchema>;

export type ExpertContentRelevance = typeof expertContentRelevance.$inferSelect;
export type InsertExpertContentRelevance = z.infer<typeof insertExpertContentRelevanceSchema>;

export type ScrapingTarget = typeof scrapingTargets.$inferSelect;
export type InsertScrapingTarget = z.infer<typeof insertScrapingTargetSchema>;