import type { Express } from "express";
import { smartResearchService } from './services/smart-research';
import { researchCacheService } from './services/research-cache';

/**
 * Register comprehensive research intelligence routes
 */
export function registerResearchRoutes(app: Express) {
  
  /**
   * GET /api/research/comprehensive/:expertId
   * Get comprehensive multi-angle market intelligence for an expert
   */
  app.get('/api/research/comprehensive/:expertId', async (req, res) => {
    try {
      const expertId = parseInt(req.params.expertId);
      
      // Get expert profile for research context
      const expert = await storage.getExpert(expertId);
      const profile = await storage.getExpertProfile(expertId);
      
      if (!expert || !profile) {
        return res.status(404).json({ message: 'Expert or profile not found' });
      }

      console.log(`🧠 Generating comprehensive research for expert ${expertId}`);

      const research = await smartResearchService.generateComprehensiveResearch({
        expertId,
        primaryExpertise: profile.primaryExpertise || '',
        expertiseKeywords: profile.expertiseKeywords || [],
        targetAudience: profile.targetAudience || '',
        platforms: profile.platforms || [],
        recencyFilter: req.query.recency as 'week' | 'month' || 'week'
      });

      res.json({
        expertId,
        research,
        metadata: {
          qualityScore: research.qualityScore,
          sourceCount: research.sources.length,
          generatedAt: new Date(),
          recency: req.query.recency || 'week'
        }
      });

    } catch (error: any) {
      console.error('Comprehensive research failed:', error);
      
      if (error.message?.includes('market intelligence unavailable')) {
        return res.status(503).json({ 
          message: 'Real-time market intelligence unavailable',
          detail: 'Please configure your research API key to access current industry discussions',
          requiresApiKey: true
        });
      }
      
      res.status(500).json({ 
        message: 'Research generation failed',
        detail: error.message 
      });
    }
  });

  /**
   * GET /api/research/history/:expertId
   * Get research history for an expert
   */
  app.get('/api/research/history/:expertId', async (req, res) => {
    try {
      const expertId = parseInt(req.params.expertId);
      const limit = parseInt(req.query.limit as string) || 10;

      const history = await researchCacheService.getResearchHistory(expertId, limit);
      
      res.json({
        expertId,
        history: history.map(item => ({
          id: item.id,
          content: item.content.substring(0, 200) + '...', // Preview only
          sources: item.sources.slice(0, 3), // Top 3 sources
          qualityScore: item.qualityScore,
          usageCount: item.usageCount,
          isExpired: item.isExpired
        })),
        total: history.length
      });

    } catch (error: any) {
      console.error('Research history failed:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve research history',
        detail: error.message 
      });
    }
  });

  /**
   * GET /api/research/analytics/:expertId
   * Get research performance analytics
   */
  app.get('/api/research/analytics/:expertId', async (req, res) => {
    try {
      const expertId = parseInt(req.params.expertId);

      const analytics = await smartResearchService.getResearchAnalytics(expertId);
      const cacheStats = await researchCacheService.getCacheStats(expertId);

      res.json({
        expertId,
        analytics: {
          ...analytics,
          cache: cacheStats
        },
        recommendations: generateResearchRecommendations(analytics, cacheStats)
      });

    } catch (error: any) {
      console.error('Research analytics failed:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve research analytics',
        detail: error.message 
      });
    }
  });

  /**
   * POST /api/research/cleanup
   * Clean up expired research entries
   */
  app.post('/api/research/cleanup', async (req, res) => {
    try {
      const cleanedCount = await researchCacheService.cleanupExpired();
      
      res.json({
        message: 'Research cleanup completed',
        cleanedEntries: cleanedCount,
        timestamp: new Date()
      });

    } catch (error: any) {
      console.error('Research cleanup failed:', error);
      res.status(500).json({ 
        message: 'Research cleanup failed',
        detail: error.message 
      });
    }
  });
}

/**
 * Generate research optimization recommendations
 */
function generateResearchRecommendations(
  analytics: any, 
  cacheStats: any
): string[] {
  const recommendations: string[] = [];

  if (cacheStats.hitRate < 30) {
    recommendations.push('Consider broader keyword strategies to improve research reuse');
  }

  if (analytics.averageQuality < 70) {
    recommendations.push('Focus on higher-authority sources to improve research quality');
  }

  if (analytics.totalSearches > 50 && cacheStats.hitRate > 70) {
    recommendations.push('Excellent cache efficiency! Your research strategy is well-optimized');
  }

  if (recommendations.length === 0) {
    recommendations.push('Research performance is optimized - continue current strategy');
  }

  return recommendations;
}