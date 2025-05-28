/**
 * Anthropic Service - Fixed Clean Implementation
 * Uses Master Perplexity Service for cached research data
 */

import Anthropic from '@anthropic-ai/sdk';
import { masterPerplexityService } from './services/master-perplexity-clean';

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
  try {
    const count = params.count || 3;
    const expertId = 2; // Felipe's expert ID from the console logs
    
    console.log(`🎯 Generating topics for ${params.primaryExpertise} expert using clean architecture`);
    
    const systemPrompt = `You are a strategic content planning assistant for field experts.

Your task is to generate ${count} highly relevant content topics that:

1. Are directly inspired by recent content trends and discussions from the provided research insights
2. Are fully aligned with the expert's positioning, voice tone, audience, and strategic goals
3. Are optimized for the social media platforms the expert uses
4. Help the expert bring fresh, relevant conversations into their content, positioning them as a thought leader
5. Offer actionable insights, valuable perspectives, or practical advice that resonate with the expert's audience

For each topic, provide:
- A concise title (5-8 words)
- A brief description (1-2 sentences explaining the topic's focus)
- A content category (e.g., Thought Leadership, Educational, Trend Analysis, Opinion, Case Study)
- 3-5 relevant tags for discoverability and organization
- Source reference: indicate which part of the research insights inspired this topic
- 5 strategic viewpoints (angles the expert could take). For each viewpoint:
  - A title (3-6 words)
  - A brief description (1 sentence)

Ensure each suggestion is deeply connected to the recent content landscape, but always filtered through the lens of the expert's goals and brand. Strive for diversity in content formats or approaches where relevant (e.g., tutorial, opinion post, trend analysis, or storytelling).

Your response MUST be formatted as a valid JSON object with this structure:
{
  "topics": [
    {
      "title": "Title of the topic",
      "description": "Brief description of the topic",
      "category": "Category name",
      "tags": ["tag1", "tag2", "tag3"],
      "source": "reference to the research insight that inspired this topic",
      "viewpoints": [
        {
          "title": "Viewpoint 1 title",
          "description": "Description of viewpoint 1"
        }
        // more viewpoints...
      ]
    }
    // more topics...
  ]
}`;

    // 1. Get research from Master Perplexity Service (uses cache intelligently)
    const researchResult = await masterPerplexityService.conductExpertResearch(expertId);
    
    console.log(`📊 Research ready - Quality: ${researchResult.qualityScore}%, Sources: ${researchResult.sources.length}`);

    // 2. Generate topics using Anthropic with the research data
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
      temperature: 0.7
    });

    // Extract and parse the response
    if (response.content[0].type !== 'text') {
      throw new Error('Expected text response from Anthropic');
    }
    
    const content = response.content[0].text;
    console.log(`✅ Topics generated successfully`);

    // Clean up the JSON response
    let cleanContent = content;
    
    // Remove markdown code block markers if present
    if (content.startsWith('```')) {
      const startIndex = content.indexOf('\n') + 1;
      const endIndex = content.lastIndexOf('```');
      if (endIndex > startIndex) {
        cleanContent = content.substring(startIndex, endIndex).trim();
      } else {
        cleanContent = content.substring(startIndex).trim();
      }
    }
    
    // Fix common JSON issues
    let fixedContent = cleanContent;
    
    // Fix unterminated strings
    if (fixedContent.includes('"') && !fixedContent.match(/"[^"]*$/)) {
      const lastQuoteIndex = fixedContent.lastIndexOf('"');
      const afterLastQuote = fixedContent.substring(lastQuoteIndex + 1);
      
      if (afterLastQuote && !afterLastQuote.includes('"')) {
        fixedContent = fixedContent.substring(0, lastQuoteIndex + 1) + '"';
      }
    }
    
    // Balance brackets
    const openBrackets = (fixedContent.match(/\{/g) || []).length;
    const closeBrackets = (fixedContent.match(/\}/g) || []).length;
    const openArrays = (fixedContent.match(/\[/g) || []).length;
    const closeArrays = (fixedContent.match(/\]/g) || []).length;
    
    if (openBrackets > closeBrackets) {
      const missing = openBrackets - closeBrackets;
      fixedContent = fixedContent + '}'.repeat(missing);
    }
    if (openArrays > closeArrays) {
      const missing = openArrays - closeArrays;
      fixedContent = fixedContent + ']'.repeat(missing);
    }
    
    // Remove trailing commas
    fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');
    
    // Parse the response
    const result = JSON.parse(fixedContent);
    const topics = result.topics || [];
    
    console.log(`📊 Generated ${topics.length} topics successfully`);
    return topics;

  } catch (error: any) {
    console.error('❌ Topic generation failed:', error);
    throw new Error(`Failed to generate topics: ${error?.message || 'Unknown error'}`);
  }
}

export async function generateContentIdeas(params: ContentIdeaGenerationParams): Promise<ContentIdeaResult[]> {
  try {
    const expertId = params.expertId || 2;
    
    console.log(`🎯 Generating content ideas for topic: ${params.topic}`);
    
    // Get fresh research data for this specific content generation
    const researchResult = await masterPerplexityService.conductExpertResearch(expertId);
    
    const systemPrompt = `You are a content ideation specialist for field experts.

Generate 3-5 specific, actionable content ideas for the given topic and platform.

Each idea should:
1. Be platform-optimized (${params.platform})
2. Incorporate the expert's voice tone and keywords
3. Reference real sources and current trends
4. Provide clear, implementable key points
5. Be designed to engage the target audience effectively

Your response MUST be formatted as a valid JSON object:
{
  "ideas": [
    {
      "title": "Specific content title",
      "description": "Brief description of the content approach",
      "format": "Content format (post, carousel, video, etc.)",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "sources": ["source 1", "source 2"]
    }
  ]
}`;

    const userPrompt = `Topic: ${params.topic}
Description: ${params.description}
Platform: ${params.platform}
Viewpoints to explore: ${params.viewpoints.join(', ')}
Expert keywords: ${params.expertiseKeywords.join(', ')}
Voice tone: ${params.voiceTone.join(', ')}

Current market research:
${researchResult.content}

Additional context: ${params.additionalContext || 'None'}
Real sources available: ${params.realSources?.join(', ') || 'None'}

Generate specific content ideas that leverage this research data and align with the expert's positioning.`;

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
      temperature: 0.8
    });

    if (response.content[0].type !== 'text') {
      throw new Error('Expected text response from Anthropic');
    }
    
    const content = response.content[0].text;
    
    // Clean and parse JSON response
    let cleanContent = content;
    if (content.startsWith('```')) {
      const startIndex = content.indexOf('\n') + 1;
      const endIndex = content.lastIndexOf('```');
      if (endIndex > startIndex) {
        cleanContent = content.substring(startIndex, endIndex).trim();
      } else {
        cleanContent = content.substring(startIndex).trim();
      }
    }
    
    const result = JSON.parse(cleanContent);
    const ideas = result.ideas || [];
    
    console.log(`✅ Generated ${ideas.length} content ideas`);
    return ideas;

  } catch (error: any) {
    console.error('❌ Content idea generation failed:', error);
    throw new Error(`Failed to generate content ideas: ${error?.message || 'Unknown error'}`);
  }
}