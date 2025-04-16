import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";

interface Viewpoint {
  id: number;
  topicId: number;
  title: string;
  description: string;
}

interface Topic {
  id: number;
  title: string;
  description: string;
  tags: string[];
  trending: boolean;
  engagement: string;
  isRecommended: boolean;
}

interface ContentCardProps {
  topic: Topic;
  expertId: number;
}

export default function ContentCard({ topic, expertId }: ContentCardProps) {
  const [viewpointsExpanded, setViewpointsExpanded] = useState(false);
  
  // Fetch viewpoints for this topic
  const { data: viewpoints = [], isLoading: viewpointsLoading } = useQuery({
    queryKey: [`/api/viewpoints/${topic.id}`],
    enabled: !!topic.id
  });
  
  // Create content idea mutation
  const createContentIdeaMutation = useMutation({
    mutationFn: async (platform: string) => {
      return apiRequest('POST', '/api/generate-content-ideas', {
        topicId: topic.id,
        platform,
        expertId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content-ideas/${topic.id}`] });
    }
  });
  
  const getStatusBadge = () => {
    if (topic.trending) {
      return <span className="bg-white text-[#0984E3] text-xs font-semibold px-2 py-1 rounded">Trending</span>;
    }
    if (topic.engagement === "high") {
      return <span className="bg-white text-[#0984E3] text-xs font-semibold px-2 py-1 rounded">High Engagement</span>;
    }
    if (topic.isRecommended) {
      return <span className="bg-white text-[#0984E3] text-xs font-semibold px-2 py-1 rounded">Recommended</span>;
    }
    return null;
  };
  
  const handleCreateContent = (platform: string) => {
    createContentIdeaMutation.mutate(platform);
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-[#0984E3] p-4 text-white">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">{topic.title}</h3>
          <div className="flex items-center">
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <p className="text-sm text-gray-600 mb-4">{topic.description}</p>
        
        <div className="mb-4">
          <button 
            className="flex items-center justify-between w-full text-left text-sm font-medium text-[#0984E3]"
            onClick={() => setViewpointsExpanded(!viewpointsExpanded)}
          >
            <span>5 Strategic Viewpoints</span>
            <i className={`fas fa-chevron-${viewpointsExpanded ? 'up' : 'down'}`}></i>
          </button>
          
          {viewpointsExpanded && !viewpointsLoading && (
            <div className="mt-2 space-y-2">
              {viewpoints.map((viewpoint: Viewpoint) => (
                <div key={viewpoint.id} className="bg-gray-50 p-2 rounded text-sm">
                  <p className="font-medium text-[#2D3436]">{viewpoint.title}</p>
                  <p className="text-gray-600 text-xs">{viewpoint.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-wrap">
            {topic.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                <i className="fas fa-hashtag mr-1 text-xs"></i>
                {tag}
              </Badge>
            ))}
          </div>
          <button className="text-[#0984E3] hover:text-blue-700">
            <i className="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </CardContent>
      
      <Separator />
      
      <CardFooter className="border-t border-gray-200 bg-gray-50 p-3">
        <div className="flex justify-between items-center w-full">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="inline-flex items-center text-xs"
              onClick={() => handleCreateContent("linkedin")}
              disabled={createContentIdeaMutation.isPending}
            >
              <i className="fab fa-linkedin text-blue-600 mr-1"></i>
              Create
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="inline-flex items-center text-xs"
              onClick={() => handleCreateContent("twitter")}
              disabled={createContentIdeaMutation.isPending}
            >
              <i className="fab fa-twitter text-blue-400 mr-1"></i>
              Create
            </Button>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            <i className="fas fa-calendar-plus mr-1"></i>
            Schedule
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
