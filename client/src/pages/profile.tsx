import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { Expert } from "../App";
import ProfileWizard from "@/components/profile-wizard";
import ProfileEditor from "@/components/profile-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface ProfilePageProps {
  expert: Expert | null;
  onExpertUpdate?: (expert: Expert) => void;
}

export default function ProfilePage({ expert, onExpertUpdate }: ProfilePageProps) {
  const [profileWizardOpen, setProfileWizardOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [currentExpert, setCurrentExpert] = useState<Expert | null>(expert);
  const { toast } = useToast();
  
  // Fetch expert profile
  const { data: profile, isLoading } = useQuery<any>({
    queryKey: [`/api/expert-profiles/${expert?.id}`],
    enabled: !!expert?.id
  });
  
  // Show profile wizard if profile doesn't exist
  useEffect(() => {
    if (expert && !expert.profileComplete && !isLoading && !profile) {
      setProfileWizardOpen(true);
    }
  }, [expert, profile, isLoading]);
  
  // Update expert state when prop changes
  useEffect(() => {
    setCurrentExpert(expert);
  }, [expert]);
  
  // Handle the personal information update
  const handleProfileUpdate = (updatedExpert: Expert) => {
    setCurrentExpert(updatedExpert);
    // Update the parent component's expert state too
    if (onExpertUpdate) {
      onExpertUpdate(updatedExpert);
    }
    toast({
      title: "Profile Updated",
      description: "Your personal information has been successfully updated.",
      duration: 3000
    });
  };
  
  if (!currentExpert) return null;
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[#2D3436]">My Profile</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="inline-flex items-center text-[#0984E3]"
            onClick={() => setProfileEditorOpen(true)}
          >
            <span className="mr-2">✏️</span>
            Edit Personal Info
          </Button>
          {profile && (
            <Button 
              variant="outline" 
              className="inline-flex items-center text-[#0984E3]"
              onClick={() => setProfileWizardOpen(true)}
            >
              <span className="mr-2">🔧</span>
              Edit Expertise
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Expert details card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Expert Details</CardTitle>
            <CardDescription>Your professional information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                {currentExpert.profileImage ? (
                  <AvatarImage src={currentExpert.profileImage} alt={currentExpert.name} />
                ) : (
                  <AvatarFallback className="bg-[#0984E3] text-white text-xl">
                    {currentExpert.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <h3 className="text-lg font-medium">{currentExpert.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{currentExpert.role}</p>
              
              {isLoading ? (
                <div className="w-full space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : profile ? (
                <div className="w-full mt-4">
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-1">Primary Expertise</h4>
                    <p className="text-sm text-gray-600">{profile.primaryExpertise}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-1">Secondary Expertise</h4>
                    <div className="flex flex-wrap gap-1">
                      {profile.secondaryExpertise?.map((expertise: string, index: number) => (
                        <Badge key={index} variant="outline" className="bg-blue-50">
                          {expertise}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-1">Voice Tone</h4>
                    <div className="flex flex-wrap gap-1">
                      {profile.voiceTone?.map((tone: string, index: number) => (
                        <Badge key={index} variant="outline" className="bg-green-50">
                          {tone}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">Profile not set up yet</p>
                  <Button 
                    onClick={() => setProfileWizardOpen(true)}
                    className="bg-[#0984E3]"
                  >
                    Complete Profile
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Content strategy card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Content Strategy</CardTitle>
            <CardDescription>Your content preferences and audience targeting</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : profile ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Personal Branding Statement</h3>
                  <p className="text-sm text-gray-600 italic">
                    "{profile.personalBranding}"
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Target Audience</h3>
                  <p className="text-sm text-gray-600">
                    {profile.targetAudience}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Preferred Platforms</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.platforms?.map((platform: string, index: number) => (
                      <div key={index} className="flex items-center bg-gray-100 rounded px-3 py-1 text-sm">
                        <i className={`fab fa-${platform.toLowerCase()} mr-2 text-[#0984E3]`}></i>
                        {platform}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Content Goals</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.contentGoals?.map((goal: string, index: number) => (
                      <Badge key={index} className="bg-[#0984E3] text-white hover:bg-[#0984E3]">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Expertise Keywords</h3>
                  <div className="flex flex-wrap gap-1">
                    {profile.expertiseKeywords?.map((keyword: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Trusted Information Sources</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {profile.informationSources?.map((source: {name: string, url: string}, index: number) => (
                      <li key={index}>
                        {source.name}
                        {source.url && (
                          <span className="text-[#0984E3] ml-1">
                            (<a href={source.url} target="_blank" rel="noopener noreferrer">link</a>)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-[#0984E3] mb-3">
                  <i className="fas fa-user-edit text-3xl"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">No Profile Data</h3>
                <p className="text-gray-500 mb-4">
                  Complete your expert profile to see your content strategy summary.
                </p>
                <Button 
                  onClick={() => setProfileWizardOpen(true)}
                  className="bg-[#0984E3]"
                >
                  Complete Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Profile wizard dialog */}
      <ProfileWizard 
        open={profileWizardOpen} 
        onOpenChange={setProfileWizardOpen}
        expertId={currentExpert.id}
        onProfileComplete={() => {}}
      />
      
      {/* Personal information editor dialog */}
      <ProfileEditor 
        open={profileEditorOpen}
        onOpenChange={setProfileEditorOpen}
        expert={currentExpert}
        onProfileUpdated={handleProfileUpdate}
      />
    </div>
  );
}
