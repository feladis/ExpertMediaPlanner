import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertExpertSchema, 
  insertExpertProfileSchema, 
  insertTopicSchema,
  insertViewpointSchema,
  insertContentIdeaSchema,
  insertScheduledContentSchema 
} from "@shared/schema";
import { generateTopics, generateContentIdeas } from "./anthropic";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express, requireAuth?: (req: Request, res: Response, next: NextFunction) => void): Promise<Server> {
  // Error handling middleware
  const handleError = (err: any, res: Response) => {
    console.error(err);
    
    if (err instanceof ZodError) {
      return res.status(400).json({ 
        message: fromZodError(err).message 
      });
    }
    
    return res.status(500).json({ 
      message: err.message || 'Internal server error' 
    });
  };

  // Check auth status endpoint
  app.get('/api/auth/check', (req: Request, res: Response) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      res.json({ authenticated: true, user: req.user });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Experts API
  app.post('/api/experts', async (req: Request, res: Response) => {
    try {
      const data = insertExpertSchema.parse(req.body);
      const expert = await storage.createExpert(data);
      res.status(201).json(expert);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get('/api/experts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const expert = await storage.getExpert(id);
      
      if (!expert) {
        return res.status(404).json({ message: 'Expert not found' });
      }
      
      res.json(expert);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch('/api/experts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const expert = await storage.updateExpert(id, req.body);
      
      if (!expert) {
        return res.status(404).json({ message: 'Expert not found' });
      }
      
      res.json(expert);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Expert Profiles API
  app.post('/api/expert-profiles', async (req: Request, res: Response) => {
    try {
      const data = insertExpertProfileSchema.parse(req.body);
      const profile = await storage.createExpertProfile(data);
      res.status(201).json(profile);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get('/api/expert-profiles/:expertId', async (req: Request, res: Response) => {
    try {
      const expertId = parseInt(req.params.expertId);
      const profile = await storage.getExpertProfile(expertId);
      
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      
      res.json(profile);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch('/api/expert-profiles/:expertId', async (req: Request, res: Response) => {
    try {
      const expertId = parseInt(req.params.expertId);
      const profile = await storage.updateExpertProfile(expertId, req.body);
      
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      
      res.json(profile);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Topics API
  app.get('/api/topics/:expertId', async (req: Request, res: Response) => {
    try {
      const expertId = parseInt(req.params.expertId);
      const topics = await storage.getTopics(expertId);
      res.json(topics);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post('/api/topics', async (req: Request, res: Response) => {
    try {
      const data = insertTopicSchema.parse(req.body);
      const topic = await storage.createTopic(data);
      res.status(201).json(topic);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get('/api/topics/details/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const topic = await storage.getTopic(id);
      
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      res.json(topic);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch('/api/topics/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const topic = await storage.updateTopic(id, req.body);
      
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      res.json(topic);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete('/api/topics/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTopic(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Viewpoints API
  app.get('/api/viewpoints/:topicId', async (req: Request, res: Response) => {
    try {
      const topicId = parseInt(req.params.topicId);
      const viewpoints = await storage.getViewpoints(topicId);
      res.json(viewpoints);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post('/api/viewpoints', async (req: Request, res: Response) => {
    try {
      const data = insertViewpointSchema.parse(req.body);
      const viewpoint = await storage.createViewpoint(data);
      res.status(201).json(viewpoint);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Content Ideas API
  // Get content idea by ID - must be placed before the more generic route
  app.get('/api/content-idea/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const idea = await storage.getContentIdeaById(id);
      
      if (!idea) {
        return res.status(404).json({ message: 'Content idea not found' });
      }
      
      res.json(idea);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Get content ideas by topic ID
  app.get('/api/content-ideas/:topicId', async (req: Request, res: Response) => {
    try {
      const topicId = parseInt(req.params.topicId);
      const platform = req.query.platform as string | undefined;
      const ideas = await storage.getContentIdeas(topicId, platform);
      res.json(ideas);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post('/api/content-ideas', async (req: Request, res: Response) => {
    try {
      const data = insertContentIdeaSchema.parse(req.body);
      const idea = await storage.createContentIdea(data);
      res.status(201).json(idea);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch('/api/content-ideas/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const idea = await storage.updateContentIdea(id, req.body);
      
      if (!idea) {
        return res.status(404).json({ message: 'Content idea not found' });
      }
      
      res.json(idea);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Scheduled Content API
  app.get('/api/scheduled-content/:expertId', async (req: Request, res: Response) => {
    try {
      const expertId = parseInt(req.params.expertId);
      const scheduledContent = await storage.getScheduledContent(expertId);
      res.json(scheduledContent);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post('/api/scheduled-content', async (req: Request, res: Response) => {
    try {
      const data = insertScheduledContentSchema.parse(req.body);
      const content = await storage.createScheduledContent(data);
      res.status(201).json(content);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch('/api/scheduled-content/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const content = await storage.updateScheduledContent(id, req.body);
      
      if (!content) {
        return res.status(404).json({ message: 'Scheduled content not found' });
      }
      
      res.json(content);
    } catch (err) {
      handleError(err, res);
    }
  });

  // AI Topic Generation API
  app.post('/api/generate-topics', async (req: Request, res: Response) => {
    try {
      const { expertId, count } = req.body;
      
      if (!expertId) {
        return res.status(400).json({ message: 'Expert ID is required' });
      }
      
      // Get expert profile
      const profile = await storage.getExpertProfile(parseInt(expertId));
      
      if (!profile) {
        return res.status(404).json({ message: 'Expert profile not found' });
      }
      
      // Generate topics using Anthropic
      const topics = await generateTopics({
        primaryExpertise: profile.primaryExpertise || '',
        secondaryExpertise: profile.secondaryExpertise || [],
        expertiseKeywords: profile.expertiseKeywords || [],
        voiceTone: profile.voiceTone || [],
        personalBranding: profile.personalBranding || '',
        platforms: profile.platforms || [],
        targetAudience: profile.targetAudience || '',
        contentGoals: profile.contentGoals || [],
        count: count || 3
      });
      
      // Save topics and viewpoints to storage
      const savedTopics = [];
      
      for (const topic of topics) {
        const newTopic = await storage.createTopic({
          expertId: parseInt(expertId),
          title: topic.title,
          description: topic.description,
          category: topic.category,
          tags: topic.tags
        });
        
        // Create viewpoints for the topic
        if (topic.viewpoints && topic.viewpoints.length > 0) {
          for (const viewpoint of topic.viewpoints) {
            await storage.createViewpoint({
              topicId: newTopic.id,
              title: viewpoint.title,
              description: viewpoint.description
            });
          }
        }
        
        savedTopics.push(newTopic);
      }
      
      res.status(201).json(savedTopics);
    } catch (err) {
      handleError(err, res);
    }
  });

  // AI Content Idea Generation API
  app.post('/api/generate-content-ideas', async (req: Request, res: Response) => {
    try {
      const { topicId, platform, expertId } = req.body;
      
      if (!topicId || !platform || !expertId) {
        return res.status(400).json({ 
          message: 'Topic ID, platform, and expert ID are required' 
        });
      }
      
      // Get the topic and viewpoints
      const topic = await storage.getTopic(parseInt(topicId));
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      const viewpoints = await storage.getViewpoints(parseInt(topicId));
      
      // Get expert profile
      const profile = await storage.getExpertProfile(parseInt(expertId));
      if (!profile) {
        return res.status(404).json({ message: 'Expert profile not found' });
      }
      
      // Generate content ideas using Anthropic
      const contentIdeas = await generateContentIdeas({
        topic: topic.title,
        description: topic.description || '',
        platform,
        viewpoints: viewpoints.map(v => v.title),
        expertiseKeywords: profile.expertiseKeywords || [],
        voiceTone: profile.voiceTone || []
      });
      
      // Save content ideas to storage
      const savedIdeas = [];
      
      for (const idea of contentIdeas) {
        const newIdea = await storage.createContentIdea({
          topicId: parseInt(topicId),
          platform,
          title: idea.title,
          description: idea.description,
          format: idea.format,
          keyPoints: idea.keyPoints,
          sources: idea.sources
        });
        
        savedIdeas.push(newIdea);
      }
      
      res.status(201).json(savedIdeas);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Simple authentication for demo purposes
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      const expert = await storage.getExpertByUsername(username);
      
      if (!expert || expert.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      res.json({
        id: expert.id,
        username: expert.username,
        name: expert.name,
        role: expert.role,
        profileComplete: expert.profileComplete
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
