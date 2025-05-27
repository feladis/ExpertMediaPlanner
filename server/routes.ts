import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertExpertSchema, 
  insertExpertProfileSchema, 
  insertTopicSchema,
  insertViewpointSchema,
  insertContentIdeaSchema,
  insertScheduledContentSchema,
  insertScrapedContentSchema,
  insertScrapingTargetSchema
} from "@shared/schema";
import { generateTopics, generateContentIdeas } from "./anthropic";
import { WebScraper, calculateRelevanceScore } from "./scraping";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Replit Authentication
  app.post('/api/auth/replit', async (req: Request, res: Response) => {
    try {
      // Use Replit environment variables as primary source, fallback to headers
      const replitUserId = process.env.REPLIT_USERID || req.headers['x-replit-user-id'] as string;
      const replitUserName = process.env.REPLIT_USER || req.headers['x-replit-user-name'] as string;
      
      console.log('All Request Headers:', Object.keys(req.headers));
      console.log('Replit Auth Headers:', { 
        replitUserId, 
        replitUserName, 
        userAgent: req.headers['user-agent'],
        host: req.headers.host,
        allHeaders: req.headers
      });
      
      if (!replitUserId || !replitUserName || replitUserId.trim() === '' || replitUserName.trim() === '') {
        console.log('Missing or empty Replit authentication headers');
        return res.status(401).json({ 
          message: 'Replit authentication headers not found. This may require additional Replit Auth configuration.',
          debug: { 
            replitUserId, 
            replitUserName,
            availableHeaders: Object.keys(req.headers),
            envVars: {
              hasReplitUserId: !!process.env.REPLIT_USER_ID,
              hasReplitUserName: !!process.env.REPLIT_USER_NAME
            }
          }
        });
      }
      
      // Check if expert already exists by Replit ID first, then by username
      let expert = await storage.getExpertByReplitId(replitUserId);
      
      if (!expert) {
        expert = await storage.getExpertByUsername(replitUserName);
      }
      
      if (!expert) {
        // Create new expert from Replit user data
        expert = await storage.createExpert({
          username: replitUserName,
          name: replitUserName,
          role: 'Content Creator',
          password: '', // No password needed for Replit auth
          replitId: replitUserId,
          profileComplete: false
        });
      } else if (!expert.replitId) {
        // Update existing expert with Replit ID
        expert = await storage.updateExpert(expert.id, { replitId: replitUserId });
      }
      
      res.json({
        id: expert.id,
        username: expert.username,
        name: expert.name,
        role: expert.role,
        profileComplete: expert.profileComplete,
        profileImage: expert.profileImage
      });
    } catch (err) {
      console.error('Replit auth error:', err);
      handleError(err, res);
    }
  });

  // Simple authentication for demo purposes (keep for fallback)
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
        profileComplete: expert.profileComplete,
        profileImage: expert.profileImage
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Web Scraping and RAG System Routes
  
  // Get scraped content
  app.get('/api/scraped-content', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const content = await storage.getScrapedContent(limit, offset);
      res.json(content);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Scrape a single URL
  app.post('/api/scrape-url', async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }

      const scraper = new WebScraper();
      const result = await scraper.scrapeUrl(url);
      
      if (result.success && result.content) {
        // Save to database
        const savedContent = await storage.createScrapedContent(result.content);
        res.json({ success: true, content: savedContent });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get relevant content for an expert
  app.get('/api/relevant-content/:expertId', async (req: Request, res: Response) => {
    try {
      const expertId = parseInt(req.params.expertId);
      const limit = parseInt(req.query.limit as string) || 5;
      
      const relevantContent = await storage.getRelevantContentForExpert(expertId, limit);
      res.json(relevantContent);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Calculate and save relevance for expert
  app.post('/api/calculate-relevance', async (req: Request, res: Response) => {
    try {
      const { expertId, scrapedContentId } = req.body;
      
      if (!expertId || !scrapedContentId) {
        return res.status(400).json({ message: 'Expert ID and Scraped Content ID are required' });
      }

      const expert = await storage.getExpert(expertId);
      const expertProfile = await storage.getExpertProfile(expertId);
      const scrapedContent = await storage.getScrapedContentById(scrapedContentId);
      
      if (!expert || !expertProfile || !scrapedContent) {
        return res.status(404).json({ message: 'Expert, profile, or content not found' });
      }

      const relevanceScore = calculateRelevanceScore(scrapedContent, expertProfile);
      
      const relevanceData = {
        expertId,
        scrapedContentId,
        relevanceScore,
        matchedKeywords: []
      };

      const savedRelevance = await storage.createExpertContentRelevance(relevanceData);
      res.json(savedRelevance);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get scraping targets
  app.get('/api/scraping-targets', async (req: Request, res: Response) => {
    try {
      const targets = await storage.getScrapingTargets();
      res.json(targets);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Create scraping target
  app.post('/api/scraping-targets', async (req: Request, res: Response) => {
    try {
      const validatedData = insertScrapingTargetSchema.parse(req.body);
      const target = await storage.createScrapingTarget(validatedData);
      res.status(201).json(target);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Bulk scrape from targets
  app.post('/api/bulk-scrape', async (req: Request, res: Response) => {
    try {
      const { expertId } = req.body;
      
      const targets = await storage.getActiveScrapingTargets();
      const scraper = new WebScraper();
      
      const results = [];
      
      for (const target of targets) {
        try {
          const result = await scraper.scrapeUrl(target.url);
          
          if (result.success && result.content) {
            // Check if content already exists
            const existing = await storage.getScrapedContentByUrl(target.url);
            
            if (!existing) {
              // Save new content
              const savedContent = await storage.createScrapedContent(result.content);
              
              // If expertId provided, calculate relevance
              if (expertId) {
                const expertProfile = await storage.getExpertProfile(expertId);
                if (expertProfile) {
                  const relevanceScore = calculateRelevanceScore(savedContent, expertProfile);
                  await storage.createExpertContentRelevance({
                    expertId,
                    scrapedContentId: savedContent.id!,
                    relevanceScore,
                    matchedKeywords: []
                  });
                }
              }
              
              results.push({ url: target.url, success: true, contentId: savedContent.id });
            } else {
              results.push({ url: target.url, success: true, message: 'Content already exists' });
            }
          } else {
            results.push({ url: target.url, success: false, error: result.error });
          }
        } catch (error) {
          results.push({ url: target.url, success: false, error: 'Scraping failed' });
        }
      }
      
      res.json({ results, totalProcessed: targets.length });
    } catch (err) {
      handleError(err, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
