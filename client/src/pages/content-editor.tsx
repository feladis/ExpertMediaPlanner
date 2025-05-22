import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { ContentIdea } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContentEditorPage() {
  const [location] = useLocation();
  const queryParams = new URLSearchParams(location.split('?')[1] || '');
  const ideaId = queryParams.get('ideaId');
  const expertId = localStorage.getItem('expertId') ? 
    parseInt(localStorage.getItem('expertId') as string, 10) : 
    1; // Default to expertId 1 for demo

  // Initialize content state
  const [content, setContent] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [status, setStatus] = useState<string>("draft");

  // Fetch content idea details
  const { data: idea, isLoading } = useQuery<ContentIdea>({
    queryKey: [`/api/content-ideas/details/${ideaId}`],
    queryFn: async () => {
      if (!ideaId) return null;
      const response = await fetch(`/api/content-ideas/${ideaId}`);
      if (!response.ok) throw new Error('Failed to fetch content idea');
      const ideas = await response.json();
      return ideas.find((i: ContentIdea) => i.id === parseInt(ideaId));
    },
    enabled: !!ideaId
  });

  // When idea loads, pre-populate editor
  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      
      // Create initial content template based on the idea
      const template = generateContentTemplate(idea);
      setContent(template);
    }
  }, [idea]);

  // Generate a template based on the content idea
  const generateContentTemplate = (idea: ContentIdea) => {
    let template = `# ${idea.title}\n\n`;
    
    // Add introduction based on description
    template += `## Introduction\n${idea.description}\n\n`;
    
    // Add sections for each key point
    template += `## Key Points\n`;
    idea.keyPoints.forEach((point, index) => {
      template += `### ${index + 1}. ${point}\n`;
      template += `[Expand on this point here...]\n\n`;
    });
    
    // Add call to action
    template += `## Conclusion\n`;
    template += `[Add your conclusion and call to action here...]\n\n`;
    
    // Add sources
    template += `## Sources\n`;
    idea.sources.forEach(source => {
      template += `- ${source}\n`;
    });
    
    return template;
  };

  // Handle content saving
  const handleSave = (saveStatus: string) => {
    setStatus(saveStatus);
    // TODO: Save content to the database
    // This would typically call an API endpoint to save the content
    console.log("Saving content:", { title, content, status: saveStatus });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[#2D3436] mb-6">Content Editor</h1>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-2/3 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!idea && !isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[#2D3436] mb-6">Content Editor</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-gray-500">
              <i className="fas fa-exclamation-circle text-2xl text-[#0984E3] mb-3"></i>
              <p className="text-lg mb-2">No content idea selected</p>
              <p className="text-sm mb-4">Please select a content idea to edit from the platform content page</p>
              <Button 
                onClick={() => window.location.href = '/platform-content'}
                className="bg-[#0984E3] hover:bg-blue-700 text-white"
              >
                Go to Content Ideas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#2D3436]">Content Editor</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => handleSave('draft')}
          >
            Save Draft
          </Button>
          <Button 
            className="bg-[#0984E3] hover:bg-blue-700 text-white"
            onClick={() => handleSave('published')}
          >
            Publish
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
              <i className={`fas fa-${idea?.platform === 'linkedin' ? 'linkedin' : idea?.platform === 'twitter' ? 'twitter' : 'instagram'} text-blue-600`}></i>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Platform:</span>
              <span className="text-sm ml-1 capitalize">{idea?.platform}</span>
            </div>
            <div className="ml-4">
              <span className="text-sm font-medium text-gray-600">Format:</span>
              <span className="text-sm ml-1">{idea?.format}</span>
            </div>
            <div className="ml-auto">
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                {status === 'draft' ? 'Draft' : 'Published'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full"
          placeholder="Enter content title"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          Content
        </label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[400px]"
          placeholder="Write your content here..."
        />
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Reference Material</h3>
        <div className="text-xs text-gray-600">
          <p className="mb-2"><strong>Description:</strong> {idea?.description}</p>
          
          <p className="mb-1"><strong>Key Points:</strong></p>
          <ul className="list-disc list-inside mb-2">
            {idea?.keyPoints.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
          
          <p className="mb-1"><strong>Sources:</strong></p>
          <ul className="list-disc list-inside">
            {idea?.sources.map((source, idx) => (
              <li key={idx}>{source}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}