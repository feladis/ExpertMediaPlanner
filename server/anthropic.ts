import Anthropic from '@anthropic-ai/sdk';

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
- 5 strategic viewpoints that provide different angles or perspectives on the topic (each with title and brief description)`;

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
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.content[0].text;
    const result = JSON.parse(content);
    
    return result.topics || [];
  } catch (error) {
    console.error('Error generating topics:', error);
    throw new Error(`Failed to generate topics: ${error.message}`);
  }
}

interface ContentIdeaGenerationParams {
  topic: string;
  description: string;
  platform: string;
  viewpoints: string[];
  expertiseKeywords: string[];
  voiceTone: string[];
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
    const systemPrompt = `You are a strategic content planning assistant for field experts. Generate 2 content ideas for a specific social media platform based on a topic. Each content idea should:
1. Be optimized for the platform: ${params.platform}
2. Be relevant to the topic and its description
3. Consider the expert's keywords and voice tone
4. Include the provided viewpoints when applicable

For each idea, include:
- A catchy title that works for the platform
- A brief description
- Recommended format (post, article, thread, etc.)
- 3-5 key points to include
- 2-3 suggested reference sources (prestigious publications, research papers, etc.)`;

    const userPrompt = `Please generate content ideas for this topic on ${params.platform}:
- Topic: ${params.topic}
- Description: ${params.description}
- Viewpoints to consider: ${params.viewpoints.join(', ')}
- My expertise keywords: ${params.expertiseKeywords.join(', ')}
- My voice tone: ${params.voiceTone.join(', ')}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.content[0].text;
    const result = JSON.parse(content);
    
    return result.contentIdeas || [];
  } catch (error) {
    console.error('Error generating content ideas:', error);
    throw new Error(`Failed to generate content ideas: ${error.message}`);
  }
}
