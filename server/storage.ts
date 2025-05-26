import { 
  Expert, InsertExpert, 
  ExpertProfile, InsertExpertProfile,
  Topic, InsertTopic,
  Viewpoint, InsertViewpoint,
  ContentIdea, InsertContentIdea,
  ScheduledContent, InsertScheduledContent,
  experts, expertProfiles, topics, viewpoints, contentIdeas, scheduledContent
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
}

import { db } from './db';
import { eq, and } from 'drizzle-orm';

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
      secondaryExpertise: profile.secondaryExpertise || [],
      expertiseKeywords: profile.expertiseKeywords || [],
      voiceTone: profile.voiceTone || [],
      platforms: profile.platforms || [],
      informationSources: profile.informationSources || [],
      contentGoals: profile.contentGoals || []
    };

    const [newProfile] = await db.insert(expertProfiles)
      .values(formattedProfile)
      .returning();
    
    // Mark the expert's profile as complete
    await this.updateExpert(profile.expertId, { profileComplete: true });
    
    return newProfile;
  }
  
  async updateExpertProfile(expertId: number, data: Partial<ExpertProfile>): Promise<ExpertProfile | undefined> {
    const [updatedProfile] = await db.update(expertProfiles)
      .set(data)
      .where(eq(expertProfiles.expertId, expertId))
      .returning();
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
      ...topic,
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
    const [newIdea] = await db.insert(contentIdeas)
      .values({
        ...idea,
        saved: false
      })
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
