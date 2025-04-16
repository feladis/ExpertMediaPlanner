import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Expert } from "../App";
import ProfileWizard from "@/components/profile-wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface ContentIdeasProps {
  expert: Expert | null;
}

interface Topic {
  id: number;
  title: string;
  description: string;
  tags: string[];
}

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

export default function ContentIdeas({ expert }: ContentIdeasProps) {
  const [profileWizardOpen, setProfileWizardOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("linkedin");
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Fetch expert profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/expert-profiles/${expert?.id}`],
    enabled: !!expert?.id
  });
  
  // Fetch topics
  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: [`/api/topics/${expert?.id}`],
    enabled: !!expert?.id
  });
  
  // Set first topic as selected by default once loaded
  useEffect(() => {
    if (topics.length > 0 && !selectedTopic) {
      setSelectedTopic(topics[0].id);
    }
  }, [topics, selectedTopic]);
  
  // Fetch content ideas for selected topic and platform
  const { data: contentIdeas = [], isLoading: ideasLoading } = useQuery({
    queryKey: [`/api/content-ideas/${selectedTopic}`, selectedPlatform],
    enabled: !!selectedTopic
  });
  
  // Generate content ideas mutation
  const generateIdeasMutation = useMutation({
    mutationFn: async () => {
      if (!expert || !selectedTopic) return null;
      return apiRequest('POST', '/api/generate-content-ideas', {
        topicId: selectedTopic,
        platform: selectedPlatform,
        expertId: expert.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/content-ideas/${selectedTopic}`, selectedPlatform] 
      });
      toast({
        title: "Content ideas generated",
        description: `New ${selectedPlatform} content ideas have been created.`
      });
    },
    onError: (error) => {
      toast({
        title: "Error generating ideas",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Show profile wizard if profile doesn't exist
  useEffect(() => {
    if (expert && !expert.profileComplete && !profileLoading && !profile) {
      setProfileWizardOpen(true);
    }
  }, [expert, profile, profileLoading]);
  
  // Filter ideas by platform
  const filteredIdeas = contentIdeas.filter(
    (idea: ContentIdea) => idea.platform === selectedPlatform
  );
  
  // Toggle saved status for an idea
  const toggleSaved = (ideaId: number, currentSaved: boolean) => {
    apiRequest('PATCH', `/api/content-ideas/${ideaId}`, { saved: !currentSaved })
      .then(() => {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/content-ideas/${selectedTopic}`, selectedPlatform] 
        });
      })
      .catch((err) => {
        toast({
          title: "Error saving idea",
          description: err.message,
          variant: "destructive"
        });
      });
  };
  
  if (!expert) return null;
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[#2D3436]">Content Ideas</h1>
        <Button 
          className="inline-flex items-center bg-[#0984E3] hover:bg-blue-700"
          disabled={!selectedTopic || generateIdeasMutation.isPending}
          onClick={() => generateIdeasMutation.mutate()}
        >
          <i className="fas fa-magic mr-2"></i>
          Generate Ideas
        </Button>
      </div>
      
      {/* Topics selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#2D3436] mb-3">Select a Topic</h2>
        
        {topicsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, idx) => (
              <Skeleton key={idx} className="h-24 w-full" />
            ))}
          </div>
        ) : topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topics.map((topic: Topic) => (
              <Card 
                key={topic.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTopic === topic.id ? 'ring-2 ring-[#0984E3]' : ''
                }`}
                onClick={() => setSelectedTopic(topic.id)}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1 line-clamp-1">{topic.title}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{topic.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {topic.tags.slice(0, 2).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {topic.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">+{topic.tags.length - 2}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <div className="py-4">
              <div className="text-[#0984E3] mb-3">
                <i className="fas fa-lightbulb text-3xl"></i>
              </div>
              <h3 className="text-xl font-medium mb-2">No Topics Found</h3>
              <p className="text-gray-500 mb-4">
                Create topics from the dashboard to generate content ideas.
              </p>
              <Button 
                variant="outline"
                onClick={() => window.location.href = "/"}
              >
                Go to Dashboard
              </Button>
            </div>
          </Card>
        )}
      </div>
      
      {/* Platform tabs */}
      {selectedTopic && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle>Platform-Specific Content Ideas</CardTitle>
            <CardDescription>Select a platform to see tailored content suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="linkedin" onValueChange={setSelectedPlatform} value={selectedPlatform}>
              <TabsList className="mb-4">
                <TabsTrigger value="linkedin" className="flex items-center">
                  <i className="fab fa-linkedin mr-2"></i> LinkedIn
                </TabsTrigger>
                <TabsTrigger value="twitter" className="flex items-center">
                  <i className="fab fa-twitter mr-2"></i> Twitter
                </TabsTrigger>
                <TabsTrigger value="instagram" className="flex items-center">
                  <i className="fab fa-instagram mr-2"></i> Instagram
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="linkedin" className="mt-0">
                {renderIdeas(filteredIdeas, ideasLoading, toggleSaved)}
              </TabsContent>
              <TabsContent value="twitter" className="mt-0">
                {renderIdeas(filteredIdeas, ideasLoading, toggleSaved)}
              </TabsContent>
              <TabsContent value="instagram" className="mt-0">
                {renderIdeas(filteredIdeas, ideasLoading, toggleSaved)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      
      {/* Profile wizard dialog */}
      <ProfileWizard 
        open={profileWizardOpen} 
        onOpenChange={setProfileWizardOpen}
        expertId={expert.id}
        onProfileComplete={() => {}}
      />
    </div>
  );
}

function renderIdeas(ideas: ContentIdea[], isLoading: boolean, toggleSaved: (id: number, saved: boolean) => void) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, idx) => (
          <Card key={idx}>
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
        ))}
      </div>
    );
  }
  
  if (ideas.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">
          <i className="fas fa-lightbulb text-2xl text-[#0984E3] mb-3"></i>
          <p className="text-lg mb-2">No content ideas found</p>
          <p className="text-sm">Click "Generate Ideas" to create content suggestions</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {ideas.map((idea: ContentIdea) => (
        <Card key={idea.id} className="bg-white rounded-lg shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                <i className="fas fa-lightbulb text-blue-600"></i>
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
                  <Button 
                    size="sm" 
                    className="inline-flex items-center px-3 py-1 text-xs bg-[#0984E3]"
                  >
                    Create Content
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={idea.saved ? "text-yellow-500" : "text-gray-400 hover:text-gray-600"}
                    onClick={() => toggleSaved(idea.id, idea.saved)}
                  >
                    <i className={`fas fa-bookmark`}></i>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
