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
// Calendar component removed to fix import error
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";

interface ContentManagementProps {
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

interface ScheduledContent {
  id: number;
  expertId: number;
  topicId: number;
  platform: string;
  contentType: string;
  title: string;
  content: string;
  scheduledDate: string;
  status: string;
}

// Schedule content schema
const scheduleContentSchema = z.object({
  topicId: z.string().min(1, "Topic is required"),
  platform: z.string().min(1, "Platform is required"),
  contentType: z.string().min(1, "Content type is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  scheduledDate: z.date({
    required_error: "Please select a date",
  }),
});

export default function ContentManagement({ expert }: ContentManagementProps) {
  const [profileWizardOpen, setProfileWizardOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("linkedin");
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ideas");
  const { toast } = useToast();
  
  // Fetch expert profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/expert-profiles/${expert?.id}`],
    enabled: !!expert?.id
  });
  
  // Fetch topics
  const { data: topics = [], isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: [`/api/topics/${expert?.id}`],
    enabled: !!expert?.id
  });
  
  // Fetch content ideas for selected topic and platform
  const { data: contentIdeas = [], isLoading: ideasLoading } = useQuery<ContentIdea[]>({
    queryKey: [`/api/content-ideas/${selectedTopic}`, selectedPlatform],
    enabled: !!selectedTopic && !!expert?.id
  });
  
  // Fetch scheduled content
  const { data: scheduledContent = [], isLoading: scheduledLoading } = useQuery<ScheduledContent[]>({
    queryKey: [`/api/scheduled-content/${expert?.id}`],
    enabled: !!expert?.id
  });

  // Generate content ideas mutation
  const generateIdeasMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTopic || !expert) return null;
      return apiRequest('POST', '/api/content-ideas/generate', {
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

  // Form setup for scheduling
  const form = useForm<z.infer<typeof scheduleContentSchema>>({
    resolver: zodResolver(scheduleContentSchema),
    defaultValues: {
      topicId: "",
      platform: "linkedin",
      contentType: "post",
      title: "",
      content: "",
      scheduledDate: new Date(),
    }
  });

  // Schedule content mutation
  const scheduleContentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof scheduleContentSchema>) => {
      if (!expert) return null;
      
      const formattedData = {
        ...data,
        expertId: expert.id,
        topicId: parseInt(data.topicId),
        scheduledDate: data.scheduledDate.toISOString(),
      };
      
      return apiRequest('POST', '/api/scheduled-content', formattedData);
    },
    onSuccess: () => {
      toast({
        title: "Content scheduled",
        description: "Your content has been scheduled successfully."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/scheduled-content/${expert?.id}`] });
      setScheduleDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error scheduling content",
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

  // Set default selected topic when topics load
  useEffect(() => {
    if (topics.length > 0 && !selectedTopic) {
      setSelectedTopic(topics[0].id);
    }
  }, [topics, selectedTopic]);

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

  // Get platform badge color
  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "linkedin": return "bg-blue-100 text-blue-800";
      case "instagram": return "bg-pink-100 text-pink-800";
      case "twitter": return "bg-sky-100 text-sky-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!expert) return null;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-600">Generate ideas and schedule your content</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ideas">Content Ideas</TabsTrigger>
          <TabsTrigger value="calendar">Content Calendar</TabsTrigger>
        </TabsList>

        {/* Content Ideas Tab */}
        <TabsContent value="ideas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Content Ideas</CardTitle>
              <CardDescription>
                Select a topic and platform to generate AI-powered content ideas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Topic</label>
                  <Select value={selectedTopic?.toString() || ""} onValueChange={(value) => setSelectedTopic(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topicsLoading ? (
                        <div className="p-2">Loading topics...</div>
                      ) : (
                        topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id.toString()}>
                            {topic.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Platform</label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(profile as any)?.platforms?.map((platform: string) => (
                        <SelectItem key={platform} value={platform}>
                          {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </SelectItem>
                      )) || (
                        <>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => generateIdeasMutation.mutate()}
                disabled={!selectedTopic || generateIdeasMutation.isPending}
                className="w-full md:w-auto"
              >
                {generateIdeasMutation.isPending ? "Generating..." : "Generate Ideas"}
              </Button>
            </CardContent>
          </Card>

          {/* Content Ideas Display */}
          <div className="grid gap-4">
            {ideasLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))
            ) : contentIdeas.length > 0 ? (
              contentIdeas.map((idea) => (
                <Card key={idea.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {idea.title}
                        </h3>
                        <p className="text-gray-600 mb-3">{idea.description}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Badge className={getPlatformColor(idea.platform)}>
                          {idea.platform}
                        </Badge>
                        <Button
                          size="sm"
                          variant={idea.saved ? "default" : "outline"}
                          onClick={() => toggleSaved(idea.id, idea.saved)}
                        >
                          {idea.saved ? "Saved" : "Save"}
                        </Button>
                      </div>
                    </div>

                    {idea.keyPoints.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Key Points:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {idea.keyPoints.map((point, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {idea.sources.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Sources:</h4>
                        <div className="flex flex-wrap gap-2">
                          {idea.sources.slice(0, 3).map((source, index) => (
                            <a
                              key={index}
                              href={source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                            >
                              Source {index + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : selectedTopic ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500">No content ideas yet. Click "Generate Ideas" to get started!</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        {/* Content Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-8 border rounded-md">
                    <p className="text-sm text-gray-500">Calendar View</p>
                    <p className="text-xs text-gray-400 mt-2">Selected: {selectedDate ? format(selectedDate, "PPP") : "None"}</p>
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={() => setScheduleDialogOpen(true)}
                >
                  Schedule New Content
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Scheduled Content</CardTitle>
                <CardDescription>
                  Your upcoming content schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scheduledLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : scheduledContent.length > 0 ? (
                  <div className="space-y-4">
                    {scheduledContent.map((content) => (
                      <Card key={content.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{content.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {format(new Date(content.scheduledDate), "PPP")}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <Badge className={getPlatformColor(content.platform)}>
                                  {content.platform}
                                </Badge>
                                <Badge variant="outline">{content.contentType}</Badge>
                              </div>
                            </div>
                            <Badge variant={content.status === 'scheduled' ? 'default' : 'secondary'}>
                              {content.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No scheduled content yet.</p>
                    <Button 
                      className="mt-4"
                      onClick={() => setScheduleDialogOpen(true)}
                    >
                      Schedule Your First Content
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Schedule Content Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Content</DialogTitle>
            <DialogDescription>
              Create and schedule new content for publication
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => scheduleContentMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="topicId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id.toString()}>
                            {topic.title}
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
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Content title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your content here..." 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={scheduleContentMutation.isPending}
                >
                  {scheduleContentMutation.isPending ? "Scheduling..." : "Schedule Content"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ProfileWizard
        open={profileWizardOpen}
        onOpenChange={setProfileWizardOpen}
        expertId={expert?.id || 0}
        onProfileComplete={() => {
          setProfileWizardOpen(false);
          queryClient.invalidateQueries({ queryKey: [`/api/expert-profiles/${expert?.id}`] });
        }}
      />
    </div>
  );
}