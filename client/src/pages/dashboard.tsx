import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ContentCard from "@/components/content-card";
// PlatformContent import removed - now has its own page
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
}

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Dashboard({ expert, onLogin }: DashboardProps) {
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
    onSuccess: (data) => {
      onLogin(data);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.name}!`
      });
    },
    onError: (error) => {
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

  // Query topics
  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: [`/api/topics/${expert?.id}`],
    enabled: !!expert?.id,
    onSuccess: (data) => {
      console.log("Topics loaded:", data);
    }
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
    onError: (error) => {
      console.error("Topic generation error:", error);
      toast({
        title: "Error generating topics",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // If no expert exists, show login form
  if (!expert) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F6FA]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex justify-center mb-6">
              <div className="text-xl font-semibold text-[#2D3436] flex items-center">
                <i className="fas fa-brain mr-2 text-[#0984E3]"></i>
                ExpertPlanner
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center mb-6">Login to Your Account</h1>
            
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-3 text-center">
                Authenticate with your Replit account for seamless access
              </p>
              <div className="flex justify-center">
                <script 
                  dangerouslySetInnerHTML={{
                    __html: `
                      document.addEventListener('DOMContentLoaded', function() {
                        if (window.location !== window.parent.location) {
                          // We're in an iframe (Replit environment)
                          const script = document.createElement('script');
                          script.src = 'https://auth.util.repl.co/script.js';
                          script.setAttribute('authed', 'location.reload()');
                          document.body.appendChild(script);
                        }
                      });
                    `
                  }}
                />
              </div>
            </div>
            
            <div className="text-center mb-4">
              <span className="text-sm text-gray-500">Or use demo credentials:</span>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-[#0984E3]"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Demo credentials are pre-filled (username: demo, password: password)</p>
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