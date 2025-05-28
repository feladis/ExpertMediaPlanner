import { 
  Expert, InsertExpert, 
  ExpertProfile, InsertExpertProfile,
  Topic, InsertTopic,
  Viewpoint, InsertViewpoint,
  ContentIdea, InsertContentIdea,
  ScheduledContent, InsertScheduledContent,
  ScrapedContent, InsertScrapedContent,
  ExpertContentRelevance, InsertExpertContentRelevance,
  ScrapingTarget, InsertScrapingTarget,
  experts, expertProfiles, topics, viewpoints, contentIdeas, scheduledContent,
  scrapedContent, expertContentRelevance, scrapingTargets
} from "@shared/schema";

export interface IStorage {
  // Expert methods
  getExpert(id: number): Promise<Expert | undefined>;
  getExpertByUsername(username: string): Promise<Expert | undefined>;
  createExpert(expert: InsertExpert): Promise<Expert>;
  updateExpert(id: number, data: Partial<Expert>): Promise<Expert | undefined>;

  // Expert Profile methods
  getExpertProfile(expertId: number): Promise<ExpertProfile | undefined>;
  createExpertProfile(profile: InsertExpertProfile): Promise<ExpertProfile>;
  updateExpertProfile(expertId: number, data: Partial<ExpertProfile>): Promise<ExpertProfile | undefined>;

  // Topic methods
  getTopics(expertId: number): Promise<Topic[]>;
  getTopic(id: number): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: number, data: Partial<Topic>): Promise<Topic | undefined>;
  deleteTopic(id: number): Promise<boolean>;

  // Viewpoint methods
  getViewpoints(topicId: number): Promise<Viewpoint[]>;
  createViewpoint(viewpoint: InsertViewpoint): Promise<Viewpoint>;

  // Content Idea methods
  getContentIdeas(topicId: number, platform?: string): Promise<ContentIdea[]>;
  getContentIdeaById(id: number): Promise<ContentIdea | undefined>;
  createContentIdea(idea: InsertContentIdea): Promise<ContentIdea>;
  updateContentIdea(id: number, data: Partial<ContentIdea>): Promise<ContentIdea | undefined>;

  // Scheduled Content methods
  getScheduledContent(expertId: number): Promise<ScheduledContent[]>;
  createScheduledContent(content: InsertScheduledContent): Promise<ScheduledContent>;
  updateScheduledContent(id: number, data: Partial<ScheduledContent>): Promise<ScheduledContent | undefined>;

  // Scraped Content methods
  getScrapedContent(limit?: number, offset?: number): Promise<ScrapedContent[]>;
  getScrapedContentById(id: number): Promise<ScrapedContent | undefined>;
  getScrapedContentByUrl(url: string): Promise<ScrapedContent | undefined>;
  getScrapedContentByHash(hash: string): Promise<ScrapedContent | undefined>;
  createScrapedContent(content: InsertScrapedContent): Promise<ScrapedContent>;
  updateScrapedContent(id: number, data: Partial<ScrapedContent>): Promise<ScrapedContent | undefined>;
  deleteScrapedContent(id: number): Promise<boolean>;
  getRecentScrapedContent(days?: number): Promise<ScrapedContent[]>;
  getFreshScrapedContent(url: string, maxAgeHours: number): Promise<ScrapedContent | undefined>;

  // Expert Content Relevance methods
  getExpertContentRelevance(expertId: number, limit?: number): Promise<ExpertContentRelevance[]>;
  createExpertContentRelevance(relevance: InsertExpertContentRelevance): Promise<ExpertContentRelevance>;
  getRelevantContentForExpert(expertId: number, limit?: number): Promise<ScrapedContent[]>;

  // Scraping Target methods
  getScrapingTargets(): Promise<ScrapingTarget[]>;
  getActiveScrapingTargets(): Promise<ScrapingTarget[]>;
  createScrapingTarget(target: InsertScrapingTarget): Promise<ScrapingTarget>;
  updateScrapingTarget(id: number, data: Partial<ScrapingTarget>): Promise<ScrapingTarget | undefined>;

  // Content Count methods
  getContentCountForExpert(expertId: number): Promise<number>;
}

import { db } from './db';
import { and, eq, desc, gte, inArray, sql } from 'drizzle-orm';

export class DatabaseStorage implements IStorage {
  // Expert methods
  async getExpert(id: number): Promise<Expert | undefined> {
    const [expert] = await db.select().from(experts).where(eq(experts.id, id));
    return expert;
  }

  async getExpertByUsername(username: string): Promise<Expert | undefined> {
    const [expert] = await db.select().from(experts).where(eq(experts.username, username));
    return expert;
  }

  async getExpertByReplitId(replitId: string): Promise<Expert | undefined> {
    const [expert] = await db.select().from(experts).where(eq(experts.replitId, replitId));
    return expert;
  }

  async createExpert(expert: InsertExpert): Promise<Expert> {
    // The insert method in drizzle expects a single object, not an array
    const [newExpert] = await db.insert(experts).values(expert).returning();
    return newExpert;
  }

  async updateExpert(id: number, data: Partial<Expert>): Promise<Expert | undefined> {
    const [updatedExpert] = await db.update(experts)
      .set(data)
      .where(eq(experts.id, id))
      .returning();
    return updatedExpert;
  }

  // Expert Profile methods
  async getExpertProfile(expertId: number): Promise<ExpertProfile | undefined> {
    const [profile] = await db.select()
      .from(expertProfiles)
      .where(eq(expertProfiles.expertId, expertId));
    return profile;
  }

  async createExpertProfile(profile: InsertExpertProfile): Promise<ExpertProfile> {
    // Extract array types to ensure proper formatting
    const formattedProfile = {
      ...profile,
      secondaryExpertise: Array.isArray(profile.secondaryExpertise) ? profile.secondaryExpertise : [],
      expertiseKeywords: Array.isArray(profile.expertiseKeywords) ? profile.expertiseKeywords : [],
      voiceTone: Array.isArray(profile.voiceTone) ? profile.voiceTone : [],
      platforms: Array.isArray(profile.platforms) ? profile.platforms : [],
      informationSources: Array.isArray(profile.informationSources) ? profile.informationSources : [],
      contentGoals: Array.isArray(profile.contentGoals) ? profile.contentGoals : []
    };

    const [newProfile] = await db.insert(expertProfiles)
      .values(formattedProfile)
      .returning();

    // Mark the expert's profile as complete
    await this.updateExpert(profile.expertId, { profileComplete: true });

    // AUTO-SYNC: Convert information sources to scraping targets
    if (formattedProfile.informationSources && formattedProfile.informationSources.length > 0) {
      try {
        const { profileScrapingSync } = await import('./profile-scraping-sync');
        await profileScrapingSync.syncExpertSources(profile.expertId);
        console.log(`Auto-synced ${formattedProfile.informationSources.length} sources to scraping targets for expert ${profile.expertId}`);
      } catch (error) {
        console.error('Error auto-syncing scraping targets:', error);
      }
    }

    return newProfile;
  }

  async updateExpertProfile(expertId: number, data: Partial<ExpertProfile>): Promise<ExpertProfile | undefined> {
    const [updatedProfile] = await db.update(expertProfiles)
      .set(data)
      .where(eq(expertProfiles.expertId, expertId))
      .returning();

    // AUTO-SYNC: Re-sync information sources if they were updated
    if (updatedProfile && data.informationSources) {
      try {
        const { profileScrapingSync } = await import('./profile-scraping-sync');
        await profileScrapingSync.syncExpertSources(expertId);
        console.log(`Re-synced information sources to scraping targets for expert ${expertId}`);
      } catch (error) {
        console.error('Error re-syncing scraping targets:', error);
      }
    }

    return updatedProfile;
  }

  // Topic methods
  async getTopics(expertId: number): Promise<Topic[]> {
    return db.select()
      .from(topics)
      .where(eq(topics.expertId, expertId));
  }

  async getTopic(id: number): Promise<Topic | undefined> {
    const [topic] = await db.select()
      .from(topics)
      .where(eq(topics.id, id));
    return topic;
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    // Add some randomness for trending/engagement like the in-memory version
    const fullTopic = {
      expertId: topic.expertId,
      title: topic.title,
      description: topic.description,
      category: topic.category,
      tags: topic.tags || [],
      trending: Math.random() > 0.7,
      engagement: Math.random() > 0.6 ? "high" : "normal",
      isRecommended: Math.random() > 0.8,
      status: "active"
    };

    const [newTopic] = await db.insert(topics)
      .values(fullTopic)
      .returning();
    return newTopic;
  }

  async updateTopic(id: number, data: Partial<Topic>): Promise<Topic | undefined> {
    const [updatedTopic] = await db.update(topics)
      .set(data)
      .where(eq(topics.id, id))
      .returning();
    return updatedTopic;
  }

  async deleteTopic(id: number): Promise<boolean> {
    const result = await db.delete(topics)
      .where(eq(topics.id, id))
      .returning({ id: topics.id });
    return result.length > 0;
  }

  // Viewpoint methods
  async getViewpoints(topicId: number): Promise<Viewpoint[]> {
    return db.select()
      .from(viewpoints)
      .where(eq(viewpoints.topicId, topicId));
  }

  async createViewpoint(viewpoint: InsertViewpoint): Promise<Viewpoint> {
    const [newViewpoint] = await db.insert(viewpoints)
      .values(viewpoint)
      .returning();
    return newViewpoint;
  }

  // Content Idea methods
  async getContentIdeas(topicId: number, platform?: string): Promise<ContentIdea[]> {
    if (platform) {
      return db.select()
        .from(contentIdeas)
        .where(and(
          eq(contentIdeas.topicId, topicId),
          eq(contentIdeas.platform, platform)
        ));
    } else {
      return db.select()
        .from(contentIdeas)
        .where(eq(contentIdeas.topicId, topicId));
    }
  }

  async getContentIdeaById(id: number): Promise<ContentIdea | undefined> {
    const [idea] = await db.select()
      .from(contentIdeas)
      .where(eq(contentIdeas.id, id));
    return idea;
  }

  async createContentIdea(idea: InsertContentIdea): Promise<ContentIdea> {
    const formattedIdea = {
      title: idea.title,
      topicId: idea.topicId,
      platform: idea.platform,
      description: idea.description,
      format: idea.format,
      keyPoints: idea.keyPoints || [],
      sources: idea.sources || [],
      saved: false
    };

    const [newIdea] = await db.insert(contentIdeas)
      .values(formattedIdea)
      .returning();
    return newIdea;
  }

  async updateContentIdea(id: number, data: Partial<ContentIdea>): Promise<ContentIdea | undefined> {
    const [updatedIdea] = await db.update(contentIdeas)
      .set(data)
      .where(eq(contentIdeas.id, id))
      .returning();
    return updatedIdea;
  }

  // Scheduled Content methods
  async getScheduledContent(expertId: number): Promise<ScheduledContent[]> {
    return db.select()
      .from(scheduledContent)
      .where(eq(scheduledContent.expertId, expertId));
  }

  async createScheduledContent(content: InsertScheduledContent): Promise<ScheduledContent> {
    const [newContent] = await db.insert(scheduledContent)
      .values({
        ...content,
        status: "draft"
      })
      .returning();
    return newContent;
  }

  async updateScheduledContent(id: number, data: Partial<ScheduledContent>): Promise<ScheduledContent | undefined> {
    const [updatedContent] = await db.update(scheduledContent)
      .set(data)
      .where(eq(scheduledContent.id, id))
      .returning();
    return updatedContent;
  }

  // Scraped Content methods
  async getScrapedContent(limit = 50, offset = 0): Promise<ScrapedContent[]> {
    return await db.select()
      .from(scrapedContent)
      .where(eq(scrapedContent.status, 'active'))
      .limit(limit)
      .offset(offset);
  }

  async getScrapedContentById(id: number): Promise<ScrapedContent | undefined> {
    const [content] = await db.select()
      .from(scrapedContent)
      .where(eq(scrapedContent.id, id));
    return content;
  }

  async getScrapedContentByUrl(url: string): Promise<ScrapedContent | undefined> {
    const [content] = await db.select()
      .from(scrapedContent)
      .where(eq(scrapedContent.url, url));
    return content;
  }

  async getScrapedContentByHash(hash: string): Promise<ScrapedContent | undefined> {
    const [content] = await db.select()
      .from(scrapedContent)
      .where(eq(scrapedContent.contentHash, hash));
    return content;
  }

  async createScrapedContent(content: InsertScrapedContent): Promise<ScrapedContent> {
    const [newContent] = await db.insert(scrapedContent)
      .values(content)
      .returning();
    return newContent;
  }

  async updateScrapedContent(id: number, data: Partial<ScrapedContent>): Promise<ScrapedContent | undefined> {
    const [updatedContent] = await db.update(scrapedContent)
      .set(data)
      .where(eq(scrapedContent.id, id))
      .returning();
    return updatedContent;
  }

  async deleteScrapedContent(id: number): Promise<boolean> {
    const result = await db.delete(scrapedContent)
      .where(eq(scrapedContent.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getRecentScrapedContent(days = 7): Promise<ScrapedContent[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db.select()
      .from(scrapedContent)
      .where(and(
        eq(scrapedContent.status, 'active'),
        // gte(scrapedContent.scrapedDate, cutoffDate)
      ))
      .orderBy(scrapedContent.scrapedDate);
  }

  async getFreshScrapedContent(url: string, maxAgeHours: number): Promise<ScrapedContent | undefined> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);

    const [content] = await db.select()
      .from(scrapedContent)
      .where(and(
        eq(scrapedContent.url, url),
        eq(scrapedContent.status, 'active'),
        gte(scrapedContent.scrapedDate, cutoffTime)
      ))
      .orderBy(desc(scrapedContent.scrapedDate))
      .limit(1);

    return content;
  }

  // Expert Content Relevance methods
  async getExpertContentRelevance(expertId: number, limit = 20): Promise<ExpertContentRelevance[]> {
    return await db.select()
      .from(expertContentRelevance)
      .where(eq(expertContentRelevance.expertId, expertId))
      .limit(limit);
  }

  async createExpertContentRelevance(relevance: InsertExpertContentRelevance): Promise<ExpertContentRelevance> {
    const [newRelevance] = await db.insert(expertContentRelevance)
      .values({
        expertId: relevance.expertId,
        scrapedContentId: relevance.scrapedContentId,
        relevanceScore: relevance.relevanceScore,
        matchedKeywords: relevance.matchedKeywords || []
      })
      .returning();
    return newRelevance;
  }

  async getRelevantContentForExpert(expertId: number, limit = 5): Promise<ScrapedContent[]> {
    // Get content ordered by relevance score for this expert
    const relevantContent = await db.select({
      scrapedContent
    })
      .from(expertContentRelevance)
      .innerJoin(scrapedContent, eq(expertContentRelevance.scrapedContentId, scrapedContent.id))
      .where(and(
        eq(expertContentRelevance.expertId, expertId),
        eq(scrapedContent.status, 'active')
      ))
      .orderBy(expertContentRelevance.relevanceScore)
      .limit(limit);

    return relevantContent.map(row => row.scrapedContent);
  }

  // Scraping Target methods
  async getScrapingTargets(): Promise<ScrapingTarget[]> {
    return await db.select().from(scrapingTargets);
  }

  async getScrapingTargetByDomain(domain: string): Promise<ScrapingTarget | undefined> {
    const results = await db
      .select()
      .from(scrapingTargets)
      .where(eq(scrapingTargets.domain, domain))
      .limit(1);

    return results[0];
  }

  async updateScrapingTarget(id: number, data: Partial<InsertScrapingTarget>): Promise<ScrapingTarget | null> {
    const results = await db
      .update(scrapingTargets)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(scrapingTargets.id, id))
      .returning();

    return results[0] || null;
  }

  async getScrapedContentByUrl(url: string): Promise<ScrapedContent | null> {
    const [content] = await db.select()
      .from(scrapedContent)
      .where(eq(scrapedContent.url, url))
      .limit(1);
    return content || null;
  }

  async updateScrapedContent(id: number, updates: Partial<InsertScrapedContent>): Promise<ScrapedContent> {
    const [updated] = await db.update(scrapedContent)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scrapedContent.id, id))
      .returning();
    return updated;
  }

  async getTopic(id: number): Promise<Topic | null> {
    const [topic] = await db.select()
      .from(topics)
      .where(eq(topics.id, id))
      .limit(1);
    return topic || null;
  }

  async getScrapedContentById(id: number): Promise<ScrapedContent | null> {
    const [content] = await db.select()
      .from(scrapedContent)
      .where(eq(scrapedContent.id, id))
      .limit(1);
    return content || null;
  }

  async getActiveScrapingTargets(): Promise<ScrapingTarget[]> {
    return await db.select()
      .from(scrapingTargets)
      .where(eq(scrapingTargets.isActive, true));
  }

  async createScrapingTarget(target: InsertScrapingTarget): Promise<ScrapingTarget> {
    const [newTarget] = await db.insert(scrapingTargets)
      .values(target)
      .returning();
    return newTarget;
  }

  async updateScrapingTarget(id: number, data: Partial<ScrapingTarget>): Promise<ScrapingTarget | undefined> {
    const [updatedTarget] = await db.update(scrapingTargets)
      .set(data)
      .where(eq(scrapingTargets.id, id))
      .returning();
    return updatedTarget;
  }

  // Content Count methods
  async getContentCountForExpert(expertId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(expertContentRelevance)
      .innerJoin(scrapedContent, eq(expertContentRelevance.scrapedContentId, scrapedContent.id))
      .where(and(
        eq(expertContentRelevance.expertId, expertId),
        eq(scrapedContent.status, 'active')
      ));
    
    return result[0]?.count || 0;
  }
}

// Create a DatabaseStorage instance to use instead of MemStorage
export const storage = new DatabaseStorage();

// Create a demo user if it doesn't exist
(async () => {
  try {
    const demoUser = await storage.getExpertByUsername("demo");
    if (!demoUser) {
      await storage.createExpert({
        username: "demo",
        password: "password", // Default password for the demo user
        name: "John Smith",
        role: "Marketing Consultant"
      });

      // Update the profileComplete status after creation
      const demoCreated = await storage.getExpertByUsername("demo");
      if (demoCreated) {
        await storage.updateExpert(demoCreated.id, { profileComplete: false });
      }
      console.log("Created demo user");
    }
  } catch (error) {
    console.error("Error initializing demo user:", error);
  }
})();