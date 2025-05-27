import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpertProfile } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface ContentIdea {
  id: number;
  topicId: number;
  platform: string;
  title: string;
  description: string;
  format: string;
  keyPoints: string[];
  sources: string[];
  saved: boolean;
}

export default function PlatformContentPage() {
  const [selectedPlatform, setSelectedPlatform] = useState("linkedin");
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  
  // Get the expert ID from localStorage (set when logging in) or use default ID 2 for current user
  const expertId = localStorage.getItem('expertId') ? 
    parseInt(localStorage.getItem('expertId') as string, 10) : 
    2; // Default to expertId 2 for current user Felipe
  
  // Fetch expert profile to get platforms
  const { data: expertProfile } = useQuery<ExpertProfile>({
    queryKey: [`/api/expert-profiles/${expertId}`],
    enabled: !!expertId
  });
  
  // Fetch all topics for this expert
  const { data: topics = [] } = useQuery<any[]>({
    queryKey: [`/api/topics/${expertId}`],
    enabled: !!expertId
  });
  
  // Set default platform based on expert profile
  useEffect(() => {
    if (expertProfile?.platforms && expertProfile.platforms.length > 0) {
      setSelectedPlatform(expertProfile.platforms[0]);
    }
  }, [expertProfile]);
  
  // Set initial selected topic to "All Topics" by default
  useEffect(() => {
    if (Array.isArray(topics) && topics.length > 0 && selectedTopicId === null) {
      // Keep as null for "All Topics" initially
      setSelectedTopicId(null);
    }
  }, [topics]);
  
  // Fetch content ideas for selected topic (or all topics) and platform
  const { data: contentIdeas = [], isLoading } = useQuery<ContentIdea[]>({
    queryKey: [`/api/content-ideas/${selectedTopicId || 'all'}`, selectedPlatform, expertId],
    enabled: true,
    queryFn: async () => {
      if (selectedTopicId) {
        // Fetch ideas for a specific topic
        const response = await fetch(`/api/content-ideas/${selectedTopicId}`);
        if (!response.ok) throw new Error('Failed to fetch content ideas');
        return response.json();
      } else {
        // Fetch ideas from all topics for this expert
        const allIdeas: ContentIdea[] = [];
        
        if (Array.isArray(topics) && topics.length > 0) {
          for (const topic of topics) {
            try {
              const response = await fetch(`/api/content-ideas/${topic.id}`);
              if (response.ok) {
                const topicIdeas = await response.json();
                if (Array.isArray(topicIdeas)) {
                  allIdeas.push(...topicIdeas);
                }
              }
            } catch (error) {
              console.error(`Error fetching ideas for topic ${topic.id}:`, error);
            }
          }
        }
        
        return allIdeas;
      }
    }
  });
  
  const filteredIdeas = contentIdeas.filter(
    (idea) => idea.platform === selectedPlatform
  );

  console.log(`Filtering for platform: ${selectedPlatform}`, { 
    totalIdeas: contentIdeas.length, 
    filteredIdeas: filteredIdeas.length,
    selectedTopicId 
  });
  
  // Function to handle topic change
  const handleTopicChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (event.target.value === "all") {
      setSelectedTopicId(null); // Use null to indicate "all topics"
    } else if (event.target.value) {
      setSelectedTopicId(parseInt(event.target.value, 10));
    } else {
      setSelectedTopicId(null);
    }
  };
  
  // Create content idea mutation
  const createContentIdeaMutation = useMutation({
    mutationFn: async () => {
      // If "All Topics" is selected, we need to pick the first topic as we need a specific topic for generation
      const topicId = selectedTopicId || (topics.length > 0 ? topics[0].id : null);
      
      if (!topicId || !selectedPlatform) {
        throw new Error("Please select a topic and platform");
      }
      
      return apiRequest('POST', '/api/generate-content-ideas', {
        topicId: topicId,
        platform: selectedPlatform,
        expertId
      });
    },
    onSuccess: () => {
      // Invalidate queries for the specific topic and also for all topics view
      if (selectedTopicId) {
        queryClient.invalidateQueries({ queryKey: [`/api/content-ideas/${selectedTopicId}`] });
      } else {
        // Invalidate all topic queries by using prefix
        queryClient.invalidateQueries({ queryKey: [`/api/content-ideas/`] });
      }
      
      toast({
        title: "Success!",
        description: `New content ideas for ${selectedPlatform} created successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create content ideas: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#2D3436] mb-6">Platform-Specific Content Ideas</h1>
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <label htmlFor="topic-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select a Topic
          </label>
          <Button 
            variant="default" 
            size="sm" 
            className="bg-[#0984E3] hover:bg-blue-700 text-white mb-2"
            onClick={() => createContentIdeaMutation.mutate()}
            disabled={createContentIdeaMutation.isPending || !selectedTopicId}
          >
            {createContentIdeaMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Generating...
              </>
            ) : (
              <>
                <i className="fas fa-plus mr-2"></i>
                Create Content Ideas
              </>
            )}
          </Button>
        </div>
        <select
          id="topic-select"
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={selectedTopicId || "all"}
          onChange={handleTopicChange}
        >
          <option value="all">All Topics</option>
          {Array.isArray(topics) && topics.length > 0 ? (
            topics.map((topic: any) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))
          ) : (
            <option value="">No topics available</option>
          )}
        </select>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#2D3436]">Content Ideas</h2>
        <div className="flex items-center space-x-2">
          {expertProfile?.platforms?.includes("linkedin") && (
            <Button
              variant="outline"
              size="sm"
              className={`text-xs ${selectedPlatform === "linkedin" 
                ? "text-[#0984E3] border-[#0984E3]" 
                : "text-gray-500 border-gray-300"}`}
              onClick={() => setSelectedPlatform("linkedin")}
            >
              <i className="fab fa-linkedin mr-1"></i>
              LinkedIn
            </Button>
          )}
          {expertProfile?.platforms?.includes("twitter") && (
            <Button
              variant="outline"
              size="sm"
              className={`text-xs ${selectedPlatform === "twitter" 
                ? "text-[#0984E3] border-[#0984E3]" 
                : "text-gray-500 border-gray-300"}`}
              onClick={() => setSelectedPlatform("twitter")}
            >
              <i className="fab fa-twitter mr-1"></i>
              Twitter
            </Button>
          )}
          {expertProfile?.platforms?.includes("instagram") && (
            <Button
              variant="outline"
              size="sm"
              className={`text-xs ${selectedPlatform === "instagram" 
                ? "text-[#0984E3] border-[#0984E3]" 
                : "text-gray-500 border-gray-300"}`}
              onClick={() => setSelectedPlatform("instagram")}
            >
              <i className="fab fa-instagram mr-1"></i>
              Instagram
            </Button>
          )}
          {expertProfile?.platforms?.includes("facebook") && (
            <Button
              variant="outline"
              size="sm"
              className={`text-xs ${selectedPlatform === "facebook" 
                ? "text-[#0984E3] border-[#0984E3]" 
                : "text-gray-500 border-gray-300"}`}
              onClick={() => setSelectedPlatform("facebook")}
            >
              <i className="fab fa-facebook mr-1"></i>
              Facebook
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          // Loading skeletons
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                  <div className="ml-4 flex-1">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-4 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-20 w-full mb-4" />
                    <div className="flex justify-between">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                  <div className="ml-4 flex-1">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-4 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-20 w-full mb-4" />
                    <div className="flex justify-between">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : filteredIdeas.length > 0 ? (
          filteredIdeas.map((idea) => (
            <Card key={idea.id} className="bg-white rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                    <i className={`fas fa-${selectedPlatform === 'linkedin' ? 'lightbulb' : 'chart-line'} text-blue-600`}></i>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="font-medium text-[#2D3436] mb-1">{idea.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{idea.description}</p>
                    
                    <div className="text-xs text-gray-500 mb-3">
                      <span className="font-medium">Best format:</span> {idea.format}
                    </div>
                    
                    <div className="text-xs bg-gray-50 p-2 rounded mb-3">
                      <div className="font-medium text-gray-700 mb-1">Key points to include:</div>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {idea.keyPoints.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <i className="fas fa-link mr-1"></i>
                      <span>Sources: {idea.sources.join(', ')}</span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <a 
                        href="/content-editor" 
                        onClick={(e) => {
                          e.preventDefault();
                          // Store both the idea ID and platform for better context
                          localStorage.setItem('selectedIdeaId', idea.id.toString());
                          localStorage.setItem('selectedPlatform', idea.platform);
                          
                          // Show success message
                          toast({
                            title: "Opening editor",
                            description: `Preparing content for ${idea.title}`,
                            duration: 1000
                          });
                          
                          // Force navigation after a very short delay
                          setTimeout(() => {
                            document.location.href = '/content-editor';
                          }, 50);
                        }}
                        className="inline-flex items-center px-3 py-1 text-xs bg-[#0984E3] hover:bg-blue-700 text-white rounded-md"
                      >
                        <i className="fas fa-edit mr-1"></i>
                        Create Content
                      </a>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-bookmark"></i>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-2 text-center py-8 bg-white rounded-lg shadow-sm">
            <div className="text-gray-500">
              <i className="fas fa-lightbulb text-2xl text-[#0984E3] mb-3"></i>
              <p className="text-lg mb-2">No content ideas found for {selectedPlatform}</p>
              <p className="text-sm">Generate ideas by clicking "Create" on a content topic card</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}