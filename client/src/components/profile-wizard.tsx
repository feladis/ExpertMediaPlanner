import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProfileWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expertId: number;
  onProfileComplete: () => void;
}

const expertiseAreas = [
  "Marketing Strategy",
  "Content Marketing",
  "Digital Transformation",
  "Leadership Development",
  "Business Analytics",
  "Social Media Strategy",
  "Brand Development",
  "Data Science",
  "E-commerce",
  "Product Management",
];

const secondaryExpertise = [
  { id: "ai", label: "Artificial Intelligence" },
  { id: "sustainability", label: "Sustainability" },
  { id: "remote", label: "Remote Work" },
  { id: "leadership", label: "Leadership" },
  { id: "data", label: "Data Analytics" },
  { id: "innovation", label: "Innovation" },
  { id: "branding", label: "Branding" },
  { id: "seo", label: "SEO" },
];

const platforms = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "Twitter" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
  { id: "medium", label: "Medium" },
];

const tones = [
  { id: "professional", label: "Professional" },
  { id: "conversational", label: "Conversational" },
  { id: "authoritative", label: "Authoritative" },
  { id: "friendly", label: "Friendly" },
  { id: "educational", label: "Educational" },
  { id: "inspirational", label: "Inspirational" },
];

const contentGoals = [
  { id: "thought-leadership", label: "Thought Leadership" },
  { id: "lead-generation", label: "Lead Generation" },
  { id: "brand-awareness", label: "Brand Awareness" },
  { id: "education", label: "Education" },
  { id: "community-building", label: "Community Building" },
  { id: "sales", label: "Sales" },
];

export default function ProfileWizard({ open, onOpenChange, expertId, onProfileComplete }: ProfileWizardProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const stepSchema = [
    // Step 1: Expertise Areas
    z.object({
      primaryExpertise: z.string().min(1, "Primary expertise is required"),
      secondaryExpertise: z.array(z.string()).min(1, "Select at least one secondary expertise"),
      expertiseKeywords: z.string().min(3, "Add some expertise keywords")
    }),
    // Step 2: Voice and Branding
    z.object({
      voiceTone: z.array(z.string()).min(1, "Select at least one voice tone"),
      personalBranding: z.string().min(10, "Describe your personal brand in at least 10 characters")
    }),
    // Step 3: Platforms and Audience
    z.object({
      platforms: z.array(z.string()).min(1, "Select at least one platform"),
      targetAudience: z.string().min(10, "Describe your target audience in at least 10 characters")
    }),
    // Step 4: Content Goals and Sources
    z.object({
      contentGoals: z.array(z.string()).min(1, "Select at least one content goal"),
      informationSources: z.string().min(10, "Add some information sources")
    })
  ];
  
  const currentSchema = stepSchema[step - 1];
  
  // Form setup
  const form = useForm<any>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      primaryExpertise: "",
      secondaryExpertise: [],
      expertiseKeywords: "",
      voiceTone: [],
      personalBranding: "",
      platforms: [],
      targetAudience: "",
      contentGoals: [],
      informationSources: ""
    }
  });
  
  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        expertId,
        primaryExpertise: data.primaryExpertise,
        secondaryExpertise: data.secondaryExpertise,
        expertiseKeywords: data.expertiseKeywords.split(',').map((kw: string) => kw.trim()),
        voiceTone: data.voiceTone,
        personalBranding: data.personalBranding,
        platforms: data.platforms,
        targetAudience: data.targetAudience,
        contentGoals: data.contentGoals,
        informationSources: data.informationSources.split('\n')
          .filter((source: string) => source.trim())
          .map((source: string) => {
            const parts = source.split(' - ');
            return {
              name: parts[0] || source,
              url: parts[1] || ""
            };
          })
      };
      
      return apiRequest('POST', '/api/expert-profiles', formattedData);
    },
    onSuccess: () => {
      toast({
        title: "Profile created successfully!",
        description: "Your expert profile is now complete."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/expert-profiles/${expertId}`] });
      onProfileComplete();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error creating profile",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Calculate progress
  const calculateProgress = () => {
    return (step / 4) * 100;
  };
  
  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case 1: return "Expertise Areas";
      case 2: return "Voice and Branding";
      case 3: return "Platforms and Audience";
      case 4: return "Content Goals and Sources";
      default: return "";
    }
  };
  
  // Handle next step
  const handleNext = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Submit the whole form
      const allValues = form.getValues();
      saveProfileMutation.mutate(allValues);
    }
  };
  
  // Handle previous step
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg text-[#2D3436]">Complete Your Expert Profile</DialogTitle>
          <DialogDescription>
            <div className="mb-6 mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Step {step} of 4: {getStepTitle()}
                </span>
                <span className="text-sm text-gray-500">{Math.round(calculateProgress())}% Complete</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Form {...form}>
            <form className="space-y-6">
              {/* Step 1: Expertise Areas */}
              {step === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="primaryExpertise"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Area of Expertise</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your primary expertise" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {expertiseAreas.map((area) => (
                              <SelectItem key={area} value={area}>
                                {area}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="secondaryExpertise"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Secondary Expertise Areas</FormLabel>
                          <FormDescription>
                            Select areas that complement your primary expertise
                          </FormDescription>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {secondaryExpertise.map((item) => (
                              <FormField
                                key={item.id}
                                control={form.control}
                                name="secondaryExpertise"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={item.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(item.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, item.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== item.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {item.label}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="expertiseKeywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expertise Keywords</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add comma-separated keywords relevant to your expertise"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Add specific keywords to help generate more targeted content ideas.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              {/* Step 2: Voice and Branding */}
              {step === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="voiceTone"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Voice Tone</FormLabel>
                          <FormDescription>
                            Select tones that represent how you want to sound in your content
                          </FormDescription>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {tones.map((item) => (
                              <FormField
                                key={item.id}
                                control={form.control}
                                name="voiceTone"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={item.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(item.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, item.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== item.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {item.label}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="personalBranding"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Personal Branding Statement</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your personal brand in a few sentences..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          How would you describe your unique value proposition and brand voice?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              {/* Step 3: Platforms and Audience */}
              {step === 3 && (
                <>
                  <FormField
                    control={form.control}
                    name="platforms"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Social Media Platforms</FormLabel>
                          <FormDescription>
                            Select platforms where you want to publish content
                          </FormDescription>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {platforms.map((item) => (
                              <FormField
                                key={item.id}
                                control={form.control}
                                name="platforms"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={item.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(item.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, item.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== item.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {item.label}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetAudience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Audience</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your target audience..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Who are you creating content for? Be specific about their demographics, interests, needs, and pain points.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              {/* Step 4: Content Goals and Sources */}
              {step === 4 && (
                <>
                  <FormField
                    control={form.control}
                    name="contentGoals"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Content Goals</FormLabel>
                          <FormDescription>
                            What do you want to achieve with your content?
                          </FormDescription>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {contentGoals.map((item) => (
                              <FormField
                                key={item.id}
                                control={form.control}
                                name="contentGoals"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={item.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(item.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, item.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== item.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {item.label}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="informationSources"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trusted Information Sources</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Harvard Business Review - https://hbr.org
MIT Technology Review - https://technologyreview.com
McKinsey Global Institute"
                            className="resize-none min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          List your preferred sources for research and information (one per line). Optionally include URLs.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </form>
          </Form>
        </div>
        
        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            {step > 1 && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePrevious}
                disabled={saveProfileMutation.isPending}
              >
                Previous
              </Button>
            )}
            <Button 
              type="button" 
              onClick={handleNext}
              disabled={saveProfileMutation.isPending}
            >
              {step === 4 ? "Complete Profile" : "Continue"}
            </Button>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            disabled={saveProfileMutation.isPending}
          >
            Save & Finish Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
