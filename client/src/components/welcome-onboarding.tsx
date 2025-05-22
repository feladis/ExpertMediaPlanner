import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Expert } from "../App";
import ProfileWizard from "./profile-wizard";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, ChevronRight, UserCheck } from "lucide-react";

interface WelcomeOnboardingProps {
  expert: Expert;
  onCompleted: () => void;
}

const steps = [
  {
    id: "welcome",
    title: "Welcome to ExpertPlanner",
    description: "Your AI-powered content strategy assistant"
  },
  {
    id: "profile",
    title: "Set Up Your Expert Profile",
    description: "Tell us about your expertise and content goals"
  },
  {
    id: "dashboard",
    title: "Explore Your Dashboard",
    description: "Generate content ideas based on your expertise"
  }
];

export default function WelcomeOnboarding({ expert, onCompleted }: WelcomeOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [profileWizardOpen, setProfileWizardOpen] = useState(false);
  const { toast } = useToast();
  
  // Progress calculation
  const progress = ((currentStep + 1) / steps.length) * 100;
  
  // Auto-open profile wizard when reaching the profile step
  useEffect(() => {
    if (currentStep === 1) {
      setProfileWizardOpen(true);
    }
  }, [currentStep]);
  
  const handleNextStep = () => {
    // For the profile step, the ProfileWizard handles the progression
    if (currentStep === 1) {
      setProfileWizardOpen(true);
      return;
    }
    
    // If we're at the last step, call onCompleted
    if (currentStep === steps.length - 1) {
      toast({
        title: "Onboarding complete!",
        description: "You're ready to start generating content ideas.",
        duration: 3000
      });
      onCompleted();
      return;
    }
    
    // Otherwise, move to the next step
    setCurrentStep(currentStep + 1);
  };
  
  const handleProfileComplete = () => {
    // When profile is completed, close the wizard and go to the next step
    setProfileWizardOpen(false);
    setCurrentStep(2); // Move to dashboard step
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">
              {steps[currentStep].title}
            </CardTitle>
            <div className="text-sm font-medium">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          <CardDescription className="text-base">
            {steps[currentStep].description}
          </CardDescription>
          <Progress value={progress} className="mt-2" />
        </CardHeader>
        
        <CardContent className="pt-0">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 flex flex-col items-center text-center">
                  <div className="bg-blue-100 p-3 rounded-full mb-4">
                    <UserCheck className="h-6 w-6 text-[#0984E3]" />
                  </div>
                  <h3 className="font-medium mb-2">Create your profile</h3>
                  <p className="text-sm text-gray-500">Define your expertise and target audience</p>
                </Card>
                
                <Card className="p-4 flex flex-col items-center text-center">
                  <div className="bg-blue-100 p-3 rounded-full mb-4">
                    <svg className="h-6 w-6 text-[#0984E3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="font-medium mb-2">Generate topics</h3>
                  <p className="text-sm text-gray-500">AI-powered content topics based on your expertise</p>
                </Card>
                
                <Card className="p-4 flex flex-col items-center text-center">
                  <div className="bg-blue-100 p-3 rounded-full mb-4">
                    <svg className="h-6 w-6 text-[#0984E3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="font-medium mb-2">Create content</h3>
                  <p className="text-sm text-gray-500">Develop platform-specific content with AI assistance</p>
                </Card>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="font-medium mb-2 flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-[#0984E3] mr-2" />
                  Welcome, {expert.name}!
                </h3>
                <p className="text-sm text-gray-700">
                  We'll guide you through setting up your expert profile and getting started with content generation. This will only take a few minutes.
                </p>
              </div>
            </div>
          )}
          
          {currentStep === 1 && (
            <div className="text-center py-8">
              {/* This is shown briefly before the ProfileWizard opens */}
              <div className="animate-pulse">
                <svg className="mx-auto h-12 w-12 text-[#0984E3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium">Opening profile wizard...</h3>
              </div>
            </div>
          )}
          
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <h3 className="font-medium mb-2 flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                  Profile successfully created!
                </h3>
                <p className="text-sm text-gray-700">
                  You're all set up and ready to start generating content ideas based on your expertise.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">What's next?</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                    <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-[#0984E3] text-white mr-3">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Generate topics</h4>
                      <p className="text-sm text-gray-600">Click "Generate Weekly Topics" on your dashboard to create AI-powered content topics</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                    <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-[#0984E3] text-white mr-3">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Explore platform-specific content</h4>
                      <p className="text-sm text-gray-600">Click on any topic card to see content ideas for different platforms</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                    <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-[#0984E3] text-white mr-3">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">Create and edit content</h4>
                      <p className="text-sm text-gray-600">Use the Content Editor to craft platform-ready content with AI assistance</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-8 flex justify-end">
            <Button 
              onClick={handleNextStep}
              className="bg-[#0984E3]"
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Continue"}
              {currentStep < steps.length - 1 && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
      
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