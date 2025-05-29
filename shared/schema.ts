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



// Research cache for Perplexity market intelligence
export const researchCache = pgTable("research_cache", {
  id: serial("id").primaryKey(),
  queryHash: text("query_hash").notNull().unique(), // MD5 hash of search query + params
  searchQuery: text("search_query").notNull(),
  expertId: integer("expert_id").references(() => experts.id, { onDelete: "cascade" }),
  primaryExpertise: text("primary_expertise").notNull(),
  expertiseKeywords: jsonb("expertise_keywords").$type<string[]>(),
  researchContent: text("research_content").notNull(), // Main research findings
  sources: jsonb("sources").$type<string[]>(), // Validated source URLs
  recencyFilter: text("recency_filter").notNull(), // 'week' | 'month' 
  qualityScore: doublePrecision("quality_score").default(0), // 0-100 source quality rating
  isValid: boolean("is_valid").default(true),
  usageCount: integer("usage_count").default(1), // Track reuse frequency
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // Smart expiry based on recency
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata").$type<{
    searchDuration: number;
    tokenUsage?: { prompt: number; completion: number };
    sourceValidation?: { total: number; valid: number };
  }>()
});

// Research usage tracking for analytics and optimization
export const researchUsage = pgTable("research_usage", {
  id: serial("id").primaryKey(),
  researchCacheId: integer("research_cache_id").references(() => researchCache.id, { onDelete: "cascade" }),
  expertId: integer("expert_id").references(() => experts.id, { onDelete: "cascade" }),
  usageType: text("usage_type").notNull(), // 'topic_generation' | 'content_ideas' | 'manual_review'
  topicsGenerated: integer("topics_generated").default(0),
  contentGenerated: integer("content_generated").default(0),
  userSatisfaction: integer("user_satisfaction"), // 1-5 rating if provided
  usedAt: timestamp("used_at").defaultNow()
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

// Schema for inserting research cache
export const insertResearchCacheSchema = createInsertSchema(researchCache).omit({
  id: true,
  usageCount: true,
  lastUsedAt: true,
  createdAt: true,
});

// Schema for inserting research usage
export const insertResearchUsageSchema = createInsertSchema(researchUsage).omit({
  id: true,
  usedAt: true,
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

// ❌ DEPRECATED: Legacy scraping system schemas - marked for removal
/*
export const insertScrapedContentSchema = createInsertSchema(scrapedContent);
export const insertExpertContentRelevanceSchema = createInsertSchema(expertContentRelevance);
export const insertScrapingTargetSchema = createInsertSchema(scrapingTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ScrapedContent = typeof scrapedContent.$inferSelect;
export type InsertScrapedContent = z.infer<typeof insertScrapedContentSchema>;
export type ExpertContentRelevance = typeof expertContentRelevance.$inferSelect;
export type InsertExpertContentRelevance = z.infer<typeof insertExpertContentRelevanceSchema>;
export type ScrapingTarget = typeof scrapingTargets.$inferSelect;
export type InsertScrapingTarget = z.infer<typeof insertScrapingTargetSchema>;
*/

// Active Perplexity research system types
export type ResearchCache = typeof researchCache.$inferSelect;
export type InsertResearchCache = z.infer<typeof insertResearchCacheSchema>;

export type ResearchUsage = typeof researchUsage.$inferSelect;
export type InsertResearchUsage = z.infer<typeof insertResearchUsageSchema>;