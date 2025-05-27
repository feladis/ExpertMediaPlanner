import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { ContentIdea } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function ContentEditorPage() {
  const [location] = useLocation();
  const ideaId = localStorage.getItem('selectedIdeaId') || null;
  const selectedPlatform = localStorage.getItem('selectedPlatform') || '';
  const expertId = localStorage.getItem('expertId') ? 
    parseInt(localStorage.getItem('expertId') as string, 10) : 
    1; // Default to expertId 1 for demo
  const { toast } = useToast();

  // Initialize content state
  const [content, setContent] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [status, setStatus] = useState<string>("draft");
  const [activeTab, setActiveTab] = useState<string>("edit");
  
  // Platform-specific styling
  const getPlatformColor = () => {
    switch(selectedPlatform.toLowerCase()) {
      case 'linkedin': return '#0077B5';
      case 'twitter': case 'x': return '#1DA1F2';
      case 'instagram': return 'linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D, #F56040, #F77737, #FCAF45, #FFDC80)';
      case 'facebook': return '#4267B2';
      case 'tiktok': return '#000000';
      case 'youtube': return '#FF0000';
      default: return '#0984E3';
    }
  };
  
  const getPlatformIcon = () => {
    switch(selectedPlatform.toLowerCase()) {
      case 'linkedin': return 'fa-linkedin';
      case 'twitter': case 'x': return 'fa-twitter';
      case 'instagram': return 'fa-instagram';
      case 'facebook': return 'fa-facebook';
      case 'tiktok': return 'fa-tiktok';
      case 'youtube': return 'fa-youtube';
      default: return 'fa-globe';
    }
  };

  // Fetch content idea details
  const { data: idea, isLoading } = useQuery<ContentIdea>({
    queryKey: [`/api/content-idea/${ideaId}`],
    queryFn: async () => {
      if (!ideaId) return null;
      const response = await fetch(`/api/content-idea/${ideaId}`);
      if (!response.ok) throw new Error('Failed to fetch content idea');
      return response.json();
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
    let template = `# ${idea.title || 'Untitled'}\n\n`;
    
    // Add introduction based on description
    template += `## Introduction\n${idea.description || 'Add your introduction here...'}\n\n`;
    
    // Add sections for each key point
    template += `## Key Points\n`;
    if (idea.keyPoints && idea.keyPoints.length > 0) {
      idea.keyPoints.forEach((point, index) => {
        template += `### ${index + 1}. ${point}\n`;
        template += `[Expand on this point here...]\n\n`;
      });
    } else {
      template += `[Add your key points here...]\n\n`;
    }
    
    // Add call to action
    template += `## Conclusion\n`;
    template += `[Add your conclusion and call to action here...]\n\n`;
    
    // Add sources
    template += `## Sources\n`;
    if (idea.sources && idea.sources.length > 0) {
      idea.sources.forEach(source => {
        template += `- ${source}\n`;
      });
    } else {
      template += `[Add your sources here...]\n`;
    }
    
    return template;
  };

  // Handle content saving
  const handleSave = (saveStatus: string) => {
    setStatus(saveStatus);
    // TODO: Save content to the database
    // This would typically call an API endpoint to save the content
    console.log("Saving content:", { title, content, status: saveStatus });
    
    // Show success message
    toast({
      title: saveStatus === 'draft' ? "Draft saved!" : "Content published!",
      description: saveStatus === 'draft' 
        ? "Your content draft has been saved." 
        : "Your content has been published successfully.",
      duration: 3000
    });
  };
  
  // Simple markdown preview parser
  const renderMarkdownPreview = () => {
    if (!content) return <div className="text-gray-400 italic">No content to preview</div>;
    
    // Split content into lines for processing
    const lines = content.split('\n');
    
    return (
      <div className="prose max-w-none">
        {lines.map((line, index) => {
          // Handle headings
          if (line.startsWith('# ')) {
            return <h1 key={index} className="text-2xl font-bold mt-4 mb-2">{line.substring(2)}</h1>;
          } else if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-bold mt-3 mb-2">{line.substring(3)}</h2>;
          } else if (line.startsWith('### ')) {
            return <h3 key={index} className="text-lg font-bold mt-2 mb-1">{line.substring(4)}</h3>;
          } 
          // Handle lists
          else if (line.startsWith('- ')) {
            return <li key={index} className="ml-5 list-disc">{line.substring(2)}</li>;
          } 
          // Handle empty lines as breaks
          else if (line.trim() === '') {
            return <div key={index} className="h-4"></div>;
          } 
          // Regular paragraphs
          else {
            return <p key={index} className="my-2">{line}</p>;
          }
        })}
      </div>
    );
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
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-[#2D3436]">Content Editor</h1>
          {selectedPlatform && (
            <div 
              className="ml-3 px-3 py-1 text-white rounded-full flex items-center" 
              style={{background: getPlatformColor()}}
            >
              <i className={`fab ${getPlatformIcon()} mr-1`}></i>
              <span className="capitalize">{selectedPlatform}</span>
            </div>
          )}
          {idea?.format && (
            <div className="ml-3 px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm">
              {idea.format}
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => window.history.back()}
            size="sm"
            className="text-gray-600"
          >
            <i className="fas fa-arrow-left mr-1"></i>
            Back to Ideas
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleSave('draft')}
            size="sm"
          >
            <i className="fas fa-save mr-1"></i>
            Save Draft
          </Button>
          <Button 
            style={{background: getPlatformColor()}}
            className="hover:opacity-90 text-white transition-opacity"
            onClick={() => handleSave('published')}
            size="sm"
          >
            <i className="fas fa-paper-plane mr-1"></i>
            Publish
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div 
              className="flex-shrink-0 rounded-full p-2" 
              style={{background: `${selectedPlatform ? getPlatformColor() : '#0984E3'}20`}} // 20 is for 20% opacity
            >
              <i 
                className={`fab ${getPlatformIcon()} text-xl`} 
                style={{color: getPlatformColor()}}
              ></i>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Platform:</span>
              <span className="text-sm ml-1 capitalize">{idea?.platform || selectedPlatform || 'Unknown'}</span>
            </div>
            <div className="ml-4">
              <span className="text-sm font-medium text-gray-600">Format:</span>
              <span className="text-sm ml-1">{idea?.format || 'Not specified'}</span>
            </div>
            <div className="ml-auto flex items-center">
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full mr-3">
                {status === 'draft' ? 'Draft' : 'Published'}
              </span>
              <span 
                className="text-xs px-2 py-1 rounded-full text-white"
                style={{background: getPlatformColor()}}
              >
                {idea?.platform === 'linkedin' ? 'LinkedIn Post' : 
                 idea?.platform === 'twitter' ? 'Twitter/X Post' : 
                 idea?.platform === 'instagram' ? 'Instagram Content' : 
                 `${idea?.platform || selectedPlatform || 'Social Media'} Content`}
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="edit" className="flex items-center">
            <i className="fas fa-edit mr-1"></i> Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center">
            <i className="fas fa-eye mr-1"></i> Preview
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="border p-0">
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[400px] border-0 focus:ring-0"
            placeholder="Write your content here..."
          />
        </TabsContent>
        
        <TabsContent value="preview" className="border p-4 min-h-[400px] bg-white">
          {renderMarkdownPreview()}
        </TabsContent>
      </Tabs>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
              Key Points
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              {idea?.keyPoints && idea.keyPoints.length > 0 ? (
                idea.keyPoints.map((point, idx) => (
                  <li key={idx} className="hover:bg-gray-50 p-1 rounded-sm transition-colors">{point}</li>
                ))
              ) : (
                <li className="text-gray-400 italic">No key points available</li>
              )}
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <i className="fas fa-book-open text-blue-500 mr-2"></i>
              Research Sources
            </h3>
            <div className="space-y-2">
              {idea?.sources && idea.sources.length > 0 ? (
                idea.sources.map((source, idx) => {
                  // Check if the source looks like a URL
                  const isUrl = source.startsWith('http://') || source.startsWith('https://') || source.startsWith('www.');
                  
                  if (isUrl) {
                    // Make sure URL has protocol
                    const cleanUrl = source.startsWith('www.') ? `https://${source}` : source;
                    
                    return (
                      <div key={idx} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-sm transition-colors group">
                        <i className="fas fa-external-link-alt text-[#0984E3] text-xs flex-shrink-0"></i>
                        <a 
                          href={cleanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#0984E3] hover:text-blue-700 hover:underline flex-1 break-all"
                        >
                          {source}
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                          onClick={() => {
                            navigator.clipboard.writeText(cleanUrl);
                            toast({
                              title: "Link copied!",
                              description: "The source link has been copied to your clipboard.",
                              duration: 2000
                            });
                          }}
                        >
                          <i className="fas fa-copy text-xs"></i>
                        </Button>
                      </div>
                    );
                  } else {
                    // Regular text source
                    return (
                      <div key={idx} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-sm transition-colors group">
                        <i className="fas fa-book text-gray-400 text-xs flex-shrink-0"></i>
                        <span className="text-sm text-gray-600 flex-1">{source}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                          onClick={() => {
                            navigator.clipboard.writeText(source);
                            toast({
                              title: "Text copied!",
                              description: "The source text has been copied to your clipboard.",
                              duration: 2000
                            });
                          }}
                        >
                          <i className="fas fa-copy text-xs"></i>
                        </Button>
                      </div>
                    );
                  }
                })
              ) : (
                <div className="text-gray-400 italic text-sm p-2">No sources available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6 flex justify-between items-center">
        <Button
          className="text-white transition-opacity"
          style={{background: getPlatformColor()}}
          onClick={() => handleSave(status)}
        >
          <i className="fas fa-save mr-2"></i>
          {status === 'draft' ? "Save Draft" : "Publish Content"}
        </Button>
        
        <div className="text-sm text-gray-500 flex items-center">
          <i className="fas fa-info-circle mr-1"></i>
          Content optimized for {selectedPlatform || idea?.platform || 'social media'}
        </div>
      </div>
    </div>
  );
}