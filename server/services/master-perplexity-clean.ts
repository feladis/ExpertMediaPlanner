/**
 * Master Perplexity Service - Implementação Final Clean
 * Seguindo exatamente o guia de integração fornecido
 */

import crypto from 'crypto';
import { perplexityService } from './perplexity';
import { storage } from '../storage';
import { db } from '../db';
import { researchCache } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import type { ExpertProfile } from '@shared/schema';

export interface ExpertResearchResult {
  id: string;
  content: string;
  sources: string[];
  qualityScore: number;
  expertId: number;
  createdAt: Date;
  metadata: {
    searchDuration: number;
    tokenUsage?: any;
    sourceValidation: {
      total: number;
      valid: number;
    };
  };
}

export class MasterPerplexityService {
  private readonly CACHE_TTL_HOURS = 24; // 24 horas conforme especificado

  /**
   * 1. Chave de cache baseada no hash do perfil
   */
  private buildCacheKey(profile: ExpertProfile): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        id: profile.id,
        expertise: profile.primaryExpertise,
        keywords: profile.expertiseKeywords,
        sources: profile.informationSources
      }))
      .digest('hex');
    return `research:${profile.id}:${hash}`;
  }

  /**
   * 2. Construir consulta profunda baseada no perfil
   */
  private buildDeepQuery(profile: ExpertProfile): string {
    const parts: string[] = [];
    
    if (profile.primaryExpertise) {
      parts.push(`latest trends in ${profile.primaryExpertise}`);
    }
    
    if (profile.expertiseKeywords?.length) {
      parts.push(`focusing on ${profile.expertiseKeywords.join(', ')}`);
    }
    
    if (profile.targetAudience) {
      parts.push(`relevant for ${profile.targetAudience}`);
    }
    
    if (profile.platforms?.length) {
      parts.push(`suitable for ${profile.platforms.join(' and ')}`);
    }
    
    if (profile.contentGoals?.length) {
      parts.push(`with focus on ${profile.contentGoals.join(', ')}`);
    }
    
    return parts.join(' ') || 'latest industry insights';
  }

  /**
   * 3. Verificar cache primeiro, executar pesquisa apenas se necessário
   */
  private async getCachedResearch(cacheKey: string): Promise<ExpertResearchResult | null> {
    try {
      const results = await db
        .select()
        .from(researchCache)
        .where(eq(researchCache.queryHash, cacheKey))
        .orderBy(desc(researchCache.createdAt))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const cached = results[0];
      const ageInHours = (Date.now() - new Date(cached.createdAt).getTime()) / (1000 * 60 * 60);

      // Retornar se dados < 24 horas
      if (ageInHours <= this.CACHE_TTL_HOURS) {
        return {
          id: cached.queryHash,
          content: cached.researchContent,
          sources: cached.sources || [],
          qualityScore: cached.qualityScore,
          expertId: cached.expertId || 0,
          createdAt: cached.createdAt,
          metadata: cached.metadata || {
            searchDuration: 0,
            sourceValidation: { total: 0, valid: 0 }
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached research:', error);
      return null;
    }
  }

  /**
   * 4. Armazenar resultado no cache
   */
  private async storeResearch(cacheKey: string, result: ExpertResearchResult, profile: ExpertProfile, query: string): Promise<void> {
    try {
      await db.insert(researchCache).values({
        queryHash: cacheKey,
        searchQuery: query,
        expertId: result.expertId,
        primaryExpertise: profile.primaryExpertise,
        expertiseKeywords: profile.expertiseKeywords || [],
        researchContent: result.content,
        sources: result.sources,
        qualityScore: result.qualityScore,
        metadata: result.metadata,
        createdAt: new Date(),
        usageCount: 1
      });
      
      console.log(`✅ Research stored in cache: ${cacheKey}`);
    } catch (error) {
      console.error('Failed to store research:', error);
    }
  }

  /**
   * 5. Método principal: executar pesquisa expert completa
   */
  public async conductExpertResearch(expertId: number): Promise<ExpertResearchResult> {
    const start = Date.now();
    
    console.log(`🔍 Starting expert research for ID: ${expertId}`);
    
    // Buscar perfil do expert
    const profile = await storage.getExpertProfile(expertId);
    if (!profile) {
      throw new Error(`Expert profile not found: ${expertId}`);
    }

    const cacheKey = this.buildCacheKey(profile);
    
    // Verificar cache primeiro
    const cached = await this.getCachedResearch(cacheKey);
    if (cached) {
      console.log(`✅ Using cached research (age: ${Math.round((Date.now() - cached.createdAt.getTime()) / 3600000)}h)`);
      return cached;
    }

    console.log(`🔄 Executing fresh research for expert ${expertId}`);

    // Construir consulta profunda
    const deepQuery = this.buildDeepQuery(profile);
    console.log(`📝 Deep query: ${deepQuery}`);

    try {
      // Chamada única para Perplexity (sem filtros de domínio conforme solicitado)
      const response = await perplexityService.search(deepQuery, {
        recency: 'week',
        maxResults: 10
      });

      // Calcular quality score simples
      const qualityScore = response.sources && response.sources.length > 0 
        ? Math.min(100, response.sources.length * 10)
        : 50;

      // Conteúdo aprimorado
      const enhancedContent = [
        `**Research for ${profile.primaryExpertise} Expert**`,
        `Query: ${deepQuery}`,
        ``,
        response.content
      ].join('\n');

      // Estruturar resultado
      const result: ExpertResearchResult = {
        id: cacheKey,
        content: enhancedContent,
        sources: response.sources || [],
        qualityScore: Math.round(qualityScore),
        expertId,
        createdAt: new Date(),
        metadata: {
          searchDuration: Date.now() - start,
          tokenUsage: response.usage,
          sourceValidation: {
            total: response.sources?.length || 0,
            valid: response.sources?.length || 0
          }
        }
      };

      // Armazenar no cache
      await this.storeResearch(cacheKey, result, profile, deepQuery);
      
      console.log(`✅ Research complete - Quality: ${result.qualityScore}%, Duration: ${result.metadata.searchDuration}ms`);
      
      return result;

    } catch (error) {
      console.error(`❌ Research failed for expert ${expertId}:`, error);
      throw new Error(`Research execution failed: ${error.message}`);
    }
  }
}

export const masterPerplexityService = new MasterPerplexityService();