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
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface DashboardProps {
  expert: Expert | null;
  onLogin: (expert: Expert) => void;
  authLoading?: boolean;
}

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Dashboard({ expert, onLogin, authLoading }: DashboardProps) {
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

  // Login form
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "demo",
      password: "password"
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (values: z.infer<typeof loginSchema>) => {
      const response = await apiRequest('POST', '/api/login', values);
      return response.json();
    },
    onSuccess: (data: any) => {
      onLogin(data);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.name}!`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle login form submission
  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(values);
  }

  // Check if expert profile exists
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/expert-profiles/${expert?.id}`],
    enabled: !!expert?.id
  });

  // Get topics for the current expert
  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: [`/api/topics/${expert?.id}`],
    enabled: !!expert?.id
  });

  // Generate topics mutation
  const generateTopicsMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Profile required');
      
      const response = await apiRequest('POST', '/api/generate-topics', {
        expertId: expert?.id,
        primaryExpertise: profile.primaryExpertise,
        secondaryExpertise: profile.secondaryExpertise || [],
        expertiseKeywords: profile.expertiseKeywords || [],
        voiceTone: profile.voiceTone || [],
        personalBranding: profile.personalBranding,
        platforms: profile.platforms || [],
        targetAudience: profile.targetAudience,
        contentGoals: profile.contentGoals || [],
        count: 8
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/topics/${expert?.id}`] });
      toast({
        title: "Topics Generated",
        description: "New content topics have been generated based on your profile."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Show loading while authentication is in progress
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0984E3] mx-auto mb-4"></div>
              <h2 className="text-xl font-medium text-[#2D3436]">Authenticating with Replit...</h2>
              <p className="text-gray-500 mt-2">Please wait while we set up your account</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If authentication failed and no expert exists, show welcome message
  if (!expert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-[#0984E3] mb-3">
                <span className="text-3xl">🔑</span>
              </div>
              <h2 className="text-2xl font-bold text-[#2D3436]">Authentication Required</h2>
              <p className="text-gray-500 mt-2">
                Please ensure you're accessing this app from within your Replit environment for automatic authentication.
              </p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  This app uses Replit's built-in authentication system. No manual login required when running on Replit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show profile wizard if profile is not complete
  useEffect(() => {
    if (expert && !expert.profileComplete && !profileLoading && !profile) {
      setProfileWizardOpen(true);
    }
  }, [expert, profile, profileLoading]);

  const handleProfileComplete = () => {
    // Update the expert object with profileComplete=true
    if (expert) {
      onLogin({
        ...expert,
        profileComplete: true
      });
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[#2D3436]">Topic Ideas</h1>
        <div className="flex space-x-3">
          <Button 
            className="inline-flex items-center bg-[#0984E3] hover:bg-blue-700"
            onClick={() => generateTopicsMutation.mutate()}
            disabled={generateTopicsMutation.isPending || !expert?.profileComplete}
          >
            <span className="mr-2">✨</span>
            Generate Weekly Topics
          </Button>
        </div>
      </div>

      {/* Profile completion alert - shown for new users */}
      {expert && !expert.profileComplete && (
        <Alert className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-full p-3">
                <span className="text-[#0984E3] text-xl">👤</span>
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
              <span>📅</span>
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
        ) : Array.isArray(topics) && topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic: any) => (
              <ContentCard 
                key={topic.id} 
                topic={topic} 
                expertId={expert.id} 
              />
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <div className="py-6">
              <div className="text-[#0984E3] mb-3">
                <span className="text-3xl">💡</span>
              </div>
              <h3 className="text-xl font-medium mb-2">No Topics Yet</h3>
              <p className="text-gray-500 mb-4">
                Generate topics based on your profile to start planning your content.
              </p>
              <Button 
                className="bg-[#0984E3]"
                onClick={() => generateTopicsMutation.mutate()}
                disabled={generateTopicsMutation.isPending || !expert?.profileComplete}
              >
                <span className="mr-2">✨</span>
                Generate Topics
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Profile wizard dialog */}
      {expert && (
        <ProfileWizard 
          open={profileWizardOpen} 
          onOpenChange={setProfileWizardOpen}
          expertId={expert.id}
          onProfileComplete={handleProfileComplete}
        />
      )}
    </div>
  );
}