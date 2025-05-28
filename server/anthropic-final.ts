/**
 * Anthropic Service - Final Clean Implementation
 * Consome dados do Master Perplexity Service e gera tópicos estratégicos
 */

import Anthropic from '@anthropic-ai/sdk';

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

export interface ContentIdeaGenerationParams {
  topic: string;
  description: string;
  platform: string;
  viewpoints: string[];
  expertiseKeywords: string[];
  voiceTone: string[];
  expertId?: number;
  additionalContext?: string;
  realSources?: string[];
}

export interface ContentIdeaResult {
  title: string;
  description: string;
  format: string;
  keyPoints: string[];
  sources: string[];
}

export async function generateTopics(params: TopicGenerationParams): Promise<TopicResult[]> {
  const count = params.count || 5;

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

  console.log(`🎯 Generating topics for ${params.primaryExpertise} expert`);

  // Para agora, usar dados do perfil do expert diretamente
  // TODO: Integrar com Master Perplexity Service quando chave API estiver disponível
  const userPrompt = `Based on expert profile and current market context:

Expert Profile Context:
- Primary expertise: ${params.primaryExpertise}
- Secondary expertise: ${params.secondaryExpertise.join(', ')}
- Expertise keywords: ${params.expertiseKeywords.join(', ')}
- Voice tone: ${params.voiceTone.join(', ')}
- Personal branding: ${params.personalBranding}
- Platforms: ${params.platforms.join(', ')}
- Target audience: ${params.targetAudience}
- Content goals: ${params.contentGoals.join(', ')}

Generate strategic content topics that align with this expert's positioning and goals. Each topic should be relevant for current market discussions and position the expert as a thought leader.`;

  try {
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

    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '';
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

export async function generateContentIdeas(params: ContentIdeaGenerationParams): Promise<ContentIdeaResult[]> {
  const systemPrompt = `You are a content strategy assistant helping experts create engaging, platform-specific content ideas.

Generate 3-5 content ideas based on the provided topic and context. Each idea should be:
1. Platform-appropriate for ${params.platform}
2. Aligned with the expert's voice and keywords
3. Actionable and specific
4. Include relevant sources when available

Format as JSON:
{
  "ideas": [
    {
      "title": "string",
      "description": "string",
      "format": "string",
      "keyPoints": ["string"],
      "sources": ["string"]
    }
  ]
}`;

  const userPrompt = `Topic: ${params.topic}
Description: ${params.description}
Platform: ${params.platform}
Viewpoints: ${params.viewpoints.join(', ')}
Keywords: ${params.expertiseKeywords.join(', ')}
Voice Tone: ${params.voiceTone.join(', ')}
${params.additionalContext ? `Additional Context: ${params.additionalContext}` : ''}
${params.realSources ? `Real Sources: ${params.realSources.join(', ')}` : ''}

Generate content ideas that leverage these elements effectively.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '';
    
    try {
      const parsedResponse = JSON.parse(responseText);
      return parsedResponse.ideas || [];
    } catch (parseError) {
      console.error('Failed to parse content ideas response:', parseError);
      throw new Error('Failed to generate properly formatted content ideas');
    }

  } catch (error) {
    console.error('❌ Content idea generation failed:', error);
    throw new Error(`Unable to generate content ideas: ${error.message}`);
  }
}