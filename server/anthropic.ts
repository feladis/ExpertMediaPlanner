import Anthropic from '@anthropic-ai/sdk';
import { storage } from './storage';
import { ExpertProfile, ScrapedContent } from '@shared/schema';
import { perplexityService } from './services/perplexity';
import { sourceValidator } from './services/source-validator';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'default-key',
});

// Helper function to enhance content generation with Perplexity research
async function getPerplexityResearch(query: string, options: { recency?: 'week' | 'month' } = {}): Promise<string> {
  if (!perplexityService.isEnabled()) {
    return ''; // Return empty string if Perplexity is not available
  }

  try {
    console.log(`🔍 Enhancing with Perplexity research: ${query}`);
    const result = await perplexityService.search(query, {
      recency: options.recency || 'week',
      maxResults: 3
    });

    // Validate sources if available
    if (result.sources && result.sources.length > 0) {
      const validatedSources = await sourceValidator.validateBatch(result.sources);
      const validSources = validatedSources
        .filter(v => v.isValid)
        .map(v => v.url)
        .slice(0, 3); // Keep only top 3 valid sources

      return `Current research insights: ${result.content}\n\nSources: ${validSources.join(', ')}`;
    }

    return `Current research insights: ${result.content}`;
  } catch (error) {
    console.warn('Perplexity research failed, continuing with Anthropic only:', error);
    return ''; // Fail gracefully
  }
}

interface TopicGenerationParams {
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

interface TopicResult {
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
  try {
    const count = params.count || 3;
    
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

    // Get real-time market intelligence as the foundation
    const researchQuery = `latest trends ${params.primaryExpertise} ${params.expertiseKeywords.slice(0, 3).join(' ')}`;
    const perplexityResearch = await getPerplexityResearch(researchQuery, { recency: 'week' });

    let userPrompt = '';

    // Prioritize research insights as the foundation
    if (perplexityResearch) {
      userPrompt = `Based on the following recent content insights from trusted sources (last 7 days):

${perplexityResearch}

And considering my expert profile:
- Primary expertise: ${params.primaryExpertise}
- Secondary expertise: ${params.secondaryExpertise.join(', ')}
- Expertise keywords: ${params.expertiseKeywords.join(', ')}
- Voice tone: ${params.voiceTone.join(', ')}
- Personal branding: ${params.personalBranding}
- Platforms: ${params.platforms.join(', ')}
- Target audience: ${params.targetAudience}
- Content goals: ${params.contentGoals.join(', ')}

Please generate strategic content topics that translate these current market discussions into content opportunities aligned with my positioning and goals.`;
    } else {
      userPrompt = `Please generate strategic content topics based on my profile:
- Primary expertise: ${params.primaryExpertise}
- Secondary expertise: ${params.secondaryExpertise.join(', ')}
- Expertise keywords: ${params.expertiseKeywords.join(', ')}
- Voice tone: ${params.voiceTone.join(', ')}
- Personal branding: ${params.personalBranding}
- Platforms: ${params.platforms.join(', ')}
- Target audience: ${params.targetAudience}
- Content goals: ${params.contentGoals.join(', ')}

Note: No recent research insights available. Focus on evergreen topics within my expertise area.`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    });

    // Extract text content from the response
    if (response.content[0].type !== 'text') {
      throw new Error('Expected text response from Anthropic');
    }
    
    const content = response.content[0].text;
    
    try {
      // Clean up the content in case it's wrapped in markdown code blocks
      let cleanContent = content;
      
      // Remove markdown code block markers if present
      if (content.startsWith('```')) {
        // Find the first newline after ```json or ```
        const startIndex = content.indexOf('\n') + 1;
        // Find the closing ```
        const endIndex = content.lastIndexOf('```');
        if (endIndex > startIndex) {
          cleanContent = content.substring(startIndex, endIndex).trim();
        } else {
          // If no closing ```, remove the opening ```json or ``` line
          cleanContent = content.substring(startIndex).trim();
        }
      }
      
      // Try to fix truncated JSON
      let fixedContent = cleanContent;
      
      // Fix unterminated strings by finding the last quote and completing it
      if (fixedContent.includes('"') && !fixedContent.match(/"[^"]*$/)) {
        // Find the last incomplete string and close it
        const lastQuoteIndex = fixedContent.lastIndexOf('"');
        const afterLastQuote = fixedContent.substring(lastQuoteIndex + 1);
        
        // If there's content after the last quote without a closing quote, truncate it
        if (afterLastQuote && !afterLastQuote.includes('"')) {
          fixedContent = fixedContent.substring(0, lastQuoteIndex + 1) + '"';
        }
      }
      
      // Count open and close brackets to detect truncation
      const openBrackets = (fixedContent.match(/\{/g) || []).length;
      const closeBrackets = (fixedContent.match(/\}/g) || []).length;
      const openArrays = (fixedContent.match(/\[/g) || []).length;
      const closeArrays = (fixedContent.match(/\]/g) || []).length;
      
      // Add missing closing brackets and arrays
      if (openBrackets > closeBrackets) {
        const missing = openBrackets - closeBrackets;
        fixedContent = fixedContent + '}'.repeat(missing);
      }
      if (openArrays > closeArrays) {
        const missing = openArrays - closeArrays;
        fixedContent = fixedContent + ']'.repeat(missing);
      }
      
      // Remove any trailing commas that might cause issues
      fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');
      
      // Attempt to parse the JSON
      const result = JSON.parse(fixedContent);
      return result.topics || [];
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Raw content (first 500 chars):', content.substring(0, 500));
      throw new Error('Failed to parse response from Anthropic');
    }
  } catch (error: any) {
    console.error('Error generating topics:', error);
    throw new Error(`Failed to generate topics: ${error?.message || 'Unknown error'}`);
  }
}

interface ContentIdeaGenerationParams {
  topic: string;
  description: string;
  platform: string;
  viewpoints: string[];
  expertiseKeywords: string[];
  voiceTone: string[];
  expertId?: number;
  additionalContext?: string;   // NEW: Real-time Perplexity context
  realSources?: string[];       // NEW: Authentic sources from Perplexity
}

interface ContentIdeaResult {
  title: string;
  description: string;
  format: string;
  keyPoints: string[];
  sources: string[];
}

export async function generateContentIdeas(params: ContentIdeaGenerationParams): Promise<ContentIdeaResult[]> {
  try {
    // Enhance with Perplexity research for the specific topic
    const topicResearchQuery = `${params.topic} ${params.description} ${params.expertiseKeywords.slice(0, 2).join(' ')}`;
    const perplexityResearch = await getPerplexityResearch(topicResearchQuery, { recency: 'week' });

    // Step 1: Get real scraped content and information sources
    let realSources: string[] = [];
    let contextSection = '';
    
    if (params.expertId) {
      try {
        const expertProfile = await storage.getExpertProfile(params.expertId);
        if (expertProfile) {
          // Get relevant scraped content that matches expert's expertise
          const relevantContent = await storage.getRelevantContentForExpert(expertProfile.expertId, 5);
          
          if (relevantContent.length > 0) {
            contextSection = `\n\nREAL INDUSTRY CONTENT TO REFERENCE:\n${relevantContent.map(content => 
              `- "${content.title}" from ${content.domain} (${content.url})
                Summary: ${content.summary || 'No summary available'}
                Keywords: ${content.keywords?.join(', ') || 'No keywords'}`
            ).join('\n\n')}\n`;
            
            // Extract real URLs for sources
            realSources = relevantContent.map(content => content.url);
          }
          
          // Add information sources from expert profile
          if (expertProfile.informationSources && expertProfile.informationSources.length > 0) {
            const profileSources = expertProfile.informationSources
              .filter(source => source.url)
              .map(source => source.url);
            
            realSources.push(...profileSources);
            
            const infoSourcesText = expertProfile.informationSources
              .filter(source => source.url)
              .map(source => `- ${source.name}: ${source.url}`)
              .join('\n');
            
            if (infoSourcesText) {
              contextSection += `\n\nEXPERT'S TRUSTED SOURCES:\n${infoSourcesText}\n`;
            }
          }
        }
      } catch (error) {
        console.log('Error retrieving expert content:', error.message);
      }
    }

    // Add Perplexity research to context if available
    if (perplexityResearch) {
      contextSection += `\n\nCURRENT TOPIC RESEARCH:\n${perplexityResearch}\n`;
    }

    const systemPrompt = `You are a strategic content planning assistant for field experts. Generate 2 content ideas for a specific social media platform based on a topic. Each content idea should:
1. Be optimized for the platform: ${params.platform}
2. Be relevant to the topic and its description
3. Consider the expert's keywords and voice tone
4. Include the provided viewpoints when applicable

${params.additionalContext ? `

RECENT INFORMATION CONTEXT (last 7 days):
${params.additionalContext}

Use this recent information to generate relevant content ideas.` : ''}

STRICT SOURCE REQUIREMENTS:
${params.realSources && params.realSources.length > 0 ? 
  `You have access to these REAL URLs ONLY:
${params.realSources.slice(0, 8).join('\n')}

MANDATORY: You MUST ONLY select from these exact URLs. DO NOT create any new URLs. DO NOT modify these URLs. If none of these URLs seem relevant, use "No relevant sources available".` :
  realSources.length > 0 ? 
    `You have access to these REAL URLs ONLY:
${realSources.slice(0, 8).join('\n')}

MANDATORY: You MUST ONLY select from these exact URLs. DO NOT create any new URLs. DO NOT modify these URLs. If none of these URLs seem relevant, use "No relevant sources available".` :
    `NO SOURCES AVAILABLE: Since no scraped content exists, you MUST use exactly this text for all sources: "No sources available - manual research required"`}

FORBIDDEN: Never create URLs like hbr.org/..., mit.edu/..., mckinsey.com/... or any other fake URLs.

Your response MUST be formatted as a valid JSON object with this structure:
{
  "contentIdeas": [
    {
      "title": "Idea title",
      "description": "Brief description of the idea",
      "format": "Format type (post, article, etc.)",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
      "sources": ["Use ONLY exact URLs from above list OR 'No sources available - manual research required'"]
    }
  ]
}`;

    const userPrompt = `Please generate content ideas for this topic on ${params.platform}:
- Topic: ${params.topic}
- Description: ${params.description}
- Viewpoints to consider: ${params.viewpoints.join(', ')}
- My expertise keywords: ${params.expertiseKeywords.join(', ')}
- My voice tone: ${params.voiceTone.join(', ')}
${contextSection}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    });

    // Extract text content from the response
    if (response.content[0].type !== 'text') {
      throw new Error('Expected text response from Anthropic');
    }
    
    const content = response.content[0].text;
    
    try {
      // Clean up the content in case it's wrapped in markdown code blocks
      let cleanContent = content;
      
      // Remove markdown code block markers if present
      const jsonRegex = /```(?:json)?([\s\S]*?)```/;
      const match = content.match(jsonRegex);
      if (match && match[1]) {
        cleanContent = match[1].trim();
      }
      
      // Attempt to parse the JSON
      const result = JSON.parse(cleanContent);
      return result.contentIdeas || [];
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Raw content:', content);
      throw new Error('Failed to parse response from Anthropic');
    }
  } catch (error: any) {
    console.error('Error generating content ideas:', error);
    throw new Error(`Failed to generate content ideas: ${error?.message || 'Unknown error'}`);
  }
}
