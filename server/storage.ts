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
  createContentIdea(idea: InsertContentIdea): Promise<ContentIdea>;
  updateContentIdea(id: number, data: Partial<ContentIdea>): Promise<ContentIdea | undefined>;
  
  // Scheduled Content methods
  getScheduledContent(expertId: number): Promise<ScheduledContent[]>;
  createScheduledContent(content: InsertScheduledContent): Promise<ScheduledContent>;
  updateScheduledContent(id: number, data: Partial<ScheduledContent>): Promise<ScheduledContent | undefined>;
}

export class MemStorage implements IStorage {
  private experts: Map<number, Expert>;
  private expertProfiles: Map<number, ExpertProfile>;
  private topics: Map<number, Topic>;
  private viewpoints: Map<number, Viewpoint>;
  private contentIdeas: Map<number, ContentIdea>;
  private scheduledContent: Map<number, ScheduledContent>;
  
  private expertId: number;
  private profileId: number;
  private topicId: number;
  private viewpointId: number;
  private ideaId: number;
  private scheduledId: number;

  constructor() {
    this.experts = new Map();
    this.expertProfiles = new Map();
    this.topics = new Map();
    this.viewpoints = new Map();
    this.contentIdeas = new Map();
    this.scheduledContent = new Map();
    
    this.expertId = 1;
    this.profileId = 1;
    this.topicId = 1;
    this.viewpointId = 1;
    this.ideaId = 1;
    this.scheduledId = 1;
    
    // Add initial demo data
    this.createExpert({
      username: "demo",
      password: "password",
      name: "Dr. Sarah Johnson",
      role: "Marketing Expert"
    });
  }

  // Expert methods
  async getExpert(id: number): Promise<Expert | undefined> {
    return this.experts.get(id);
  }

  async getExpertByUsername(username: string): Promise<Expert | undefined> {
    return Array.from(this.experts.values()).find(
      (expert) => expert.username === username,
    );
  }

  async createExpert(expert: InsertExpert): Promise<Expert> {
    const id = this.expertId++;
    const newExpert: Expert = { ...expert, id, profileComplete: false };
    this.experts.set(id, newExpert);
    return newExpert;
  }
  
  async updateExpert(id: number, data: Partial<Expert>): Promise<Expert | undefined> {
    const expert = this.experts.get(id);
    if (!expert) return undefined;
    
    const updatedExpert = { ...expert, ...data };
    this.experts.set(id, updatedExpert);
    return updatedExpert;
  }

  // Expert Profile methods
  async getExpertProfile(expertId: number): Promise<ExpertProfile | undefined> {
    return Array.from(this.expertProfiles.values()).find(
      (profile) => profile.expertId === expertId
    );
  }

  async createExpertProfile(profile: InsertExpertProfile): Promise<ExpertProfile> {
    const id = this.profileId++;
    const newProfile: ExpertProfile = { ...profile, id };
    this.expertProfiles.set(id, newProfile);
    
    // Mark the expert's profile as complete
    const expert = this.experts.get(profile.expertId);
    if (expert) {
      this.updateExpert(profile.expertId, { ...expert, profileComplete: true });
    }
    
    return newProfile;
  }
  
  async updateExpertProfile(expertId: number, data: Partial<ExpertProfile>): Promise<ExpertProfile | undefined> {
    const profile = Array.from(this.expertProfiles.values()).find(
      (p) => p.expertId === expertId
    );
    
    if (!profile) return undefined;
    
    const updatedProfile = { ...profile, ...data };
    this.expertProfiles.set(profile.id, updatedProfile);
    return updatedProfile;
  }

  // Topic methods
  async getTopics(expertId: number): Promise<Topic[]> {
    return Array.from(this.topics.values()).filter(
      (topic) => topic.expertId === expertId
    );
  }

  async getTopic(id: number): Promise<Topic | undefined> {
    return this.topics.get(id);
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const id = this.topicId++;
    const newTopic: Topic = { 
      ...topic, 
      id, 
      createdAt: new Date(),
      status: "active",
      trending: Math.random() > 0.7,
      engagement: Math.random() > 0.6 ? "high" : "normal",
      isRecommended: Math.random() > 0.8,
    };
    this.topics.set(id, newTopic);
    return newTopic;
  }
  
  async updateTopic(id: number, data: Partial<Topic>): Promise<Topic | undefined> {
    const topic = this.topics.get(id);
    if (!topic) return undefined;
    
    const updatedTopic = { ...topic, ...data };
    this.topics.set(id, updatedTopic);
    return updatedTopic;
  }
  
  async deleteTopic(id: number): Promise<boolean> {
    return this.topics.delete(id);
  }

  // Viewpoint methods
  async getViewpoints(topicId: number): Promise<Viewpoint[]> {
    return Array.from(this.viewpoints.values()).filter(
      (viewpoint) => viewpoint.topicId === topicId
    );
  }

  async createViewpoint(viewpoint: InsertViewpoint): Promise<Viewpoint> {
    const id = this.viewpointId++;
    const newViewpoint: Viewpoint = { ...viewpoint, id };
    this.viewpoints.set(id, newViewpoint);
    return newViewpoint;
  }

  // Content Idea methods
  async getContentIdeas(topicId: number, platform?: string): Promise<ContentIdea[]> {
    return Array.from(this.contentIdeas.values()).filter(
      (idea) => idea.topicId === topicId && (!platform || idea.platform === platform)
    );
  }

  async createContentIdea(idea: InsertContentIdea): Promise<ContentIdea> {
    const id = this.ideaId++;
    const newIdea: ContentIdea = { ...idea, id, saved: false };
    this.contentIdeas.set(id, newIdea);
    return newIdea;
  }
  
  async updateContentIdea(id: number, data: Partial<ContentIdea>): Promise<ContentIdea | undefined> {
    const idea = this.contentIdeas.get(id);
    if (!idea) return undefined;
    
    const updatedIdea = { ...idea, ...data };
    this.contentIdeas.set(id, updatedIdea);
    return updatedIdea;
  }

  // Scheduled Content methods
  async getScheduledContent(expertId: number): Promise<ScheduledContent[]> {
    return Array.from(this.scheduledContent.values()).filter(
      (content) => content.expertId === expertId
    );
  }

  async createScheduledContent(content: InsertScheduledContent): Promise<ScheduledContent> {
    const id = this.scheduledId++;
    const newScheduled: ScheduledContent = { ...content, id, status: "draft" };
    this.scheduledContent.set(id, newScheduled);
    return newScheduled;
  }
  
  async updateScheduledContent(id: number, data: Partial<ScheduledContent>): Promise<ScheduledContent | undefined> {
    const content = this.scheduledContent.get(id);
    if (!content) return undefined;
    
    const updatedContent = { ...content, ...data };
    this.scheduledContent.set(id, updatedContent);
    return updatedContent;
  }
}

export const storage = new MemStorage();
