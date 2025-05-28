/**
 * Master Perplexity Service - Pesquisa profunda e armazenamento
 * Implementação baseada no guia de integração Perplexity & Anthropic
 */

import crypto from 'crypto';
import { perplexityService } from './perplexity';
import { sourceValidator } from './source-validator';
import { researchCacheService } from './research-cache-clean';
import { storage } from '../storage';
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
    tokenUsage?: {
      prompt_tokens: number;
      completion_tokens: number;
    };
    sourceValidation: {
      total: number;
      valid: number;
      invalidUrls: string[];
    };
  };
}

export class PerplexityMasterService {
  private readonly API_TIMEOUT = 15000;
  private readonly CACHE_TTL = 24 * 3600000; // 24 horas

  /**
   * 1. Chave de cache gerada a partir de hash do perfil
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
   * 2. Construir consulta profunda baseada no perfil do expert
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
   * 3. Conduzir pesquisa expert completa
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
    
    // 4. Verificar cache (só executa pesquisa se dados > 24h)
    const cached = await researchCacheService.get(cacheKey);
    if (cached && Date.now() - new Date(cached.createdAt).getTime() < this.CACHE_TTL) {
      console.log(`✅ Using cached research for expert ${expertId} (age: ${Math.round((Date.now() - new Date(cached.createdAt).getTime()) / 3600000)}h)`);
      return cached;
    }

    console.log(`🔄 Executing fresh research for expert ${expertId}`);

    // 5. Construir consulta profunda
    const deepQuery = this.buildDeepQuery(profile);
    console.log(`📝 Deep query: ${deepQuery}`);

    try {
      // 6. Chamada Perplexity sem filtros de domínio (conforme solicitado)
      const response = await perplexityService.search(deepQuery, {
        recency: 'week',
        maxResults: 10
      });

      // 7. Validar fontes se houver
      let validation = { valid: [], invalid: [] };
      if (response.sources && response.sources.length > 0) {
        const validationResults = await sourceValidator.validateSources(response.sources);
        validation = {
          valid: response.sources.filter((_, index) => validationResults > 70), // Assuming threshold
          invalid: response.sources.filter((_, index) => validationResults <= 70)
        };
      }

      // 8. Calcular quality score baseado em fontes válidas
      const qualityScore = validation.valid.length > 0 
        ? Math.min(100, (validation.valid.length / (response.sources?.length || 1)) * 100)
        : 50; // Score mínimo se não houver fontes

      // 9. Conteúdo aprimorado
      const enhancedContent = [
        `**Research for ${profile.primaryExpertise} Expert**`,
        `Query: ${deepQuery}`,
        ``,
        response.content
      ].join('\n');

      // 10. Estruturar resultado
      const result: ExpertResearchResult = {
        id: cacheKey,
        content: enhancedContent,
        sources: validation.valid,
        qualityScore: Math.round(qualityScore),
        expertId,
        createdAt: new Date(),
        metadata: {
          searchDuration: Date.now() - start,
          tokenUsage: response.usage,
          sourceValidation: {
            total: response.sources?.length || 0,
            valid: validation.valid.length,
            invalidUrls: validation.invalid
          }
        }
      };

      // 11. Armazenar no cache
      await researchCacheService.store(cacheKey, result);
      
      console.log(`✅ Research complete for expert ${expertId} - Quality: ${result.qualityScore}%, Duration: ${result.metadata.searchDuration}ms`);
      
      return result;

    } catch (error) {
      console.error(`❌ Research failed for expert ${expertId}:`, error);
      throw new Error(`Research execution failed: ${error.message}`);
    }
  }

  /**
   * 12. Verificar se há dados frescos no cache
   */
  public async hasRecentResearch(expertId: number): Promise<boolean> {
    try {
      const profile = await storage.getExpertProfile(expertId);
      if (!profile) return false;

      const cacheKey = this.buildCacheKey(profile);
      const cached = await researchCacheService.get(cacheKey);
      
      return cached && Date.now() - new Date(cached.createdAt).getTime() < this.CACHE_TTL;
    } catch {
      return false;
    }
  }
}

export const perplexityMasterService = new PerplexityMasterService();