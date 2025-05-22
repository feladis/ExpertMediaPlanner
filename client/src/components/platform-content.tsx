import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpertProfile } from "@shared/schema";

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

interface PlatformContentProps {
  topicId: number;
  expertId: number;
}

export default function PlatformContent({ topicId, expertId }: PlatformContentProps) {
  const [selectedPlatform, setSelectedPlatform] = useState("linkedin");
  
  // Fetch expert profile to get platforms
  const { data: expertProfile } = useQuery<ExpertProfile>({
    queryKey: [`/api/expert-profiles/${expertId}`],
    enabled: !!expertId
  });
  
  // Set default platform based on expert profile
  useEffect(() => {
    if (expertProfile?.platforms && expertProfile.platforms.length > 0) {
      setSelectedPlatform(expertProfile.platforms[0]);
    }
  }, [expertProfile]);
  
  const { data: contentIdeas = [], isLoading } = useQuery<ContentIdea[]>({
    queryKey: [`/api/content-ideas/${topicId}`, selectedPlatform],
    enabled: !!topicId
  });
  
  const filteredIdeas = contentIdeas.filter(
    (idea) => idea.platform === selectedPlatform
  );
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#2D3436]">Platform-Specific Content Ideas</h2>
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
                      <Button 
                        size="sm" 
                        className="inline-flex items-center px-3 py-1 text-xs"
                      >
                        Create Content
                      </Button>
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
