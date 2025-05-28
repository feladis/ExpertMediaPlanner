/**
 * Anthropic Service - Clean Implementation
 * Consome dados do cache e gera tópicos estratégicos
 */

import Anthropic from '@anthropic-ai/sdk';
import { masterPerplexityService } from './services/master-perplexity-clean';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'default-key',
});

export interface TopicGenerationParams {
  primaryExpertise: string;
  secondaryExpertise: string[];
  expertiseKeywords: string[];
  voiceTone: string[];
  personalBranding: string;
  platforms: string[];
  targetAudience: string;
  contentGoals: string[];
  count?: number;
}

export interface TopicResult {
  title: string;
  description: string;
  category: string;
  tags: string[];
  viewpoints: {
    title: string;
    description: string;
  }[];
}

export async function generateTopics(params: TopicGenerationParams): Promise<TopicResult[]> {
  const count = params.count || 5;
  const expertId = 1; // TODO: Pass this from the calling function

  const systemPrompt = `You are a strategic content planning assistant for field experts. Your role is to analyze current market intelligence and generate highly relevant, strategic content topics.

CRITICAL REQUIREMENTS:
1. Base ALL topic suggestions on real market intelligence provided
2. Reference specific insights from the research in each topic
3. Align topics with expert's positioning and content goals
4. Ensure topics are platform-appropriate and audience-relevant
5. Focus on thought leadership opportunities

Output Format - JSON array with exactly this structure:
{
  "topics": [
    {
      "title": "string",
      "description": "string", 
      "category": "string",
      "tags": ["string"],
      "viewpoints": [
        {
          "title": "string",
          "description": "string"
        }
      ]
    }
  ]
}

Generate exactly ${count} topics. Each topic must directly reference and build upon the market intelligence provided.`;

  console.log(`🎯 Generating topics for ${params.primaryExpertise} expert using clean architecture`);
  
  try {
    // 1. MASTER PERPLEXITY: Verificar cache e executar pesquisa se necessário
    const researchResult = await masterPerplexityService.conductExpertResearch(expertId);
    
    console.log(`📊 Research ready - Quality: ${researchResult.qualityScore}%, Sources: ${researchResult.sources.length}`);

    // 2. ANTHROPIC: Consumir dados do cache e gerar tópicos
    const userPrompt = `Based on expert research data from the last 24 hours:

${researchResult.content}

RESEARCH METADATA:
- Quality Score: ${researchResult.qualityScore}%
- Valid Sources: ${researchResult.sources.length}
- Search Duration: ${researchResult.metadata.searchDuration}ms

Expert Profile Context:
- Primary expertise: ${params.primaryExpertise}
- Secondary expertise: ${params.secondaryExpertise.join(', ')}
- Expertise keywords: ${params.expertiseKeywords.join(', ')}
- Voice tone: ${params.voiceTone.join(', ')}
- Personal branding: ${params.personalBranding}
- Platforms: ${params.platforms.join(', ')}
- Target audience: ${params.targetAudience}
- Content goals: ${params.contentGoals.join(', ')}

Generate strategic content topics that translate this market intelligence into actionable content opportunities for this expert's positioning and goals.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const responseText = response.content[0]?.text || '';
    console.log(`✅ Topics generated successfully`);

    try {
      const parsedResponse = JSON.parse(responseText);
      return parsedResponse.topics || [];
    } catch (parseError) {
      console.error('Failed to parse Anthropic response:', parseError);
      throw new Error('Failed to generate properly formatted topics');
    }

  } catch (error) {
    console.error('❌ Topic generation failed:', error);
    throw new Error(`Unable to generate topics: ${error.message}`);
  }
}