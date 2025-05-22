import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ContentCard from "@/components/content-card";
import ProfileWizard from "@/components/profile-wizard";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Expert } from "../App";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  expert: Expert | null;
}

// Will be used if we need additional schemas for the dashboard page

export default function Dashboard({ expert }: DashboardProps) {
  const [profileWizardOpen, setProfileWizardOpen] = useState(false);
  const { toast } = useToast();
  const currentDate = new Date();
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  
  const formattedDate = weekStart.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  // Check if expert profile exists
  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: [`/api/expert-profiles/${expert?.id}`],
    enabled: !!expert?.id
  });
  
  // Query topics
  const { data: topics = [], isLoading: topicsLoading } = useQuery<any>({
    queryKey: [`/api/topics/${expert?.id}`],
    enabled: !!expert?.id
  });
  
  // Generate topics mutation
  const generateTopicsMutation = useMutation({
    mutationFn: async () => {
      if (!expert) return null;
      // Send the request and wait for the response
      const response = await apiRequest('POST', '/api/generate-topics', { expertId: expert.id });
      // Parse the JSON response
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate the topics query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/topics/${expert?.id}`] });
      toast({
        title: "Topics generated",
        description: `${data.length} new content topics have been created for you.`
      });
    },
    onError: (error: any) => {
      console.error("Topic generation error:", error);
      toast({
        title: "Error generating topics",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Show profile wizard if profile is not complete
  useEffect(() => {
    if (expert && !expert.profileComplete && !profileLoading && !profile) {
      setProfileWizardOpen(true);
    }
  }, [expert, profile, profileLoading]);
  
  const handleProfileComplete = () => {
    // Update the expert object with profileComplete=true
    onLogin({
      ...expert,
      profileComplete: true
    });
  };
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[#2D3436]">Content Dashboard</h1>
        <div className="flex space-x-3">
          <Button 
            className="inline-flex items-center bg-[#0984E3] hover:bg-blue-700"
            onClick={() => generateTopicsMutation.mutate()}
            disabled={generateTopicsMutation.isPending || !expert.profileComplete}
          >
            <i className="fas fa-magic mr-2"></i>
            Generate Weekly Topics
          </Button>
          {/* Add Content button removed as requested */}
        </div>
      </div>

      {/* Profile completion alert - shown for new users */}
      {!expert.profileComplete && (
        <Alert className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-full p-3">
                <i className="fas fa-user-edit text-[#0984E3] text-xl"></i>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-[#2D3436]">Complete your expert profile</h2>
                <AlertDescription className="text-sm text-gray-500">
                  Set up your expertise areas and voice tone to generate more relevant content ideas.
                </AlertDescription>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <Button 
                className="inline-flex items-center bg-[#00B894] hover:bg-green-700"
                onClick={() => setProfileWizardOpen(true)}
              >
                Complete Profile
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={35} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">Profile completion: 35%</p>
          </div>
        </Alert>
      )}

      {/* Weekly Content Strategy Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2D3436]">Weekly Content Strategy</h2>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">Week of {formattedDate}</span>
            <button className="text-[#0984E3] hover:text-blue-700">
              <i className="fas fa-calendar-alt"></i>
            </button>
          </div>
        </div>
        
        {topicsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, idx) => (
              <Card key={idx} className="h-64 animate-pulse">
                <div className="bg-blue-200 h-16"></div>
                <CardContent className="p-4 space-y-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(topics) && topics.map((topic: any) => (
              <ContentCard 
                key={topic.id} 
                topic={topic} 
                expertId={expert.id} 
              />
            ))}
            {console.log("Rendering topics:", topics)}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <div className="py-6">
              <div className="text-[#0984E3] mb-3">
                <i className="fas fa-lightbulb text-3xl"></i>
              </div>
              <h3 className="text-xl font-medium mb-2">No Topics Yet</h3>
              <p className="text-gray-500 mb-4">
                Generate topics based on your profile to start planning your content.
              </p>
              <Button 
                className="bg-[#0984E3]"
                onClick={() => generateTopicsMutation.mutate()}
                disabled={generateTopicsMutation.isPending || !expert.profileComplete}
              >
                <i className="fas fa-magic mr-2"></i>
                Generate Topics
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Platform-Specific Content Ideas section removed - now has its own page */}
      
      {/* Profile wizard dialog */}
      <ProfileWizard 
        open={profileWizardOpen} 
        onOpenChange={setProfileWizardOpen}
        expertId={expert.id}
        onProfileComplete={handleProfileComplete}
      />
    </div>
  );
}
