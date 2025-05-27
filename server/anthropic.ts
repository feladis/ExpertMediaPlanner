import Anthropic from '@anthropic-ai/sdk';
import { storage } from './storage';
import { ExpertProfile, ScrapedContent } from '@shared/schema';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'default-key',
});

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
    
    const systemPrompt = `You are a strategic content planning assistant for field experts. Generate ${count} content topics based on the expert's profile. Each topic should:
1. Be highly relevant to the expert's primary and secondary expertise
2. Consider their expertise keywords, voice tone, and personal branding
3. Be optimized for the platforms they use
4. Target their specific audience
5. Support their content goals

For each topic, include:
- A concise title (5-8 words)
- A brief description (1-2 sentences)
- A category
- 3-5 relevant tags
- 5 strategic viewpoints that provide different angles or perspectives on the topic (each with title and brief description)

Your response MUST be formatted as a valid JSON object with this structure:
{
  "topics": [
    {
      "title": "Title of the topic",
      "description": "Brief description of the topic",
      "category": "Category name",
      "tags": ["tag1", "tag2", "tag3"],
      "viewpoints": [
        {
          "title": "Viewpoint 1 title",
          "description": "Description of viewpoint 1"
        },
        // more viewpoints...
      ]
    },
    // more topics...
  ]
}`;

    const userPrompt = `Please generate strategic content topics based on my profile:
- Primary expertise: ${params.primaryExpertise}
- Secondary expertise: ${params.secondaryExpertise.join(', ')}
- Expertise keywords: ${params.expertiseKeywords.join(', ')}
- Voice tone: ${params.voiceTone.join(', ')}
- Personal branding: ${params.personalBranding}
- Platforms: ${params.platforms.join(', ')}
- Target audience: ${params.targetAudience}
- Content goals: ${params.contentGoals.join(', ')}`;

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

    const systemPrompt = `You are a strategic content planning assistant for field experts. Generate 2 content ideas for a specific social media platform based on a topic. Each content idea should:
1. Be optimized for the platform: ${params.platform}
2. Be relevant to the topic and its description
3. Consider the expert's keywords and voice tone
4. Include the provided viewpoints when applicable

${realSources.length > 0 ? 
  `CRITICAL: You MUST ONLY use these real URLs as sources (DO NOT create fake URLs):
${realSources.slice(0, 8).join('\n')}

Choose the most relevant URLs from this list for each content idea.` :
  `CRITICAL: No real sources are available. Use "No sources available - manual research required" as sources.`}

Your response MUST be formatted as a valid JSON object with this structure:
{
  "contentIdeas": [
    {
      "title": "Idea title",
      "description": "Brief description of the idea",
      "format": "Format type (post, article, etc.)",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
      "sources": ["ONLY use URLs from the provided list above OR 'No sources available - manual research required'"]
    },
    // more ideas...
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
