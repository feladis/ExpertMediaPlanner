import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Expert } from "../App";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContentCalendarProps {
  expert: Expert | null;
}

interface ScheduledContent {
  id: number;
  topicId: number;
  expertId: number;
  platform: string;
  contentType: string;
  title: string;
  status: string;
  scheduledDate: string;
  content: string;
}

interface Topic {
  id: number;
  title: string;
  description: string;
}

// Schema for scheduling content
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

export default function ContentCalendar({ expert }: ContentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentContentId, setCurrentContentId] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Fetch scheduled content
  const { data: scheduledContent = [], isLoading: contentLoading } = useQuery({
    queryKey: [`/api/scheduled-content/${expert?.id}`],
    enabled: !!expert?.id
  });
  
  // Fetch topics for selection
  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: [`/api/topics/${expert?.id}`],
    enabled: !!expert?.id
  });
  
  // Form setup
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
  
  // Create scheduled content mutation
  const createScheduledContentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof scheduleContentSchema>) => {
      if (!expert) return null;
      
      const formattedData = {
        ...data,
        expertId: expert.id,
        topicId: parseInt(data.topicId),
        scheduledDate: data.scheduledDate.toISOString(),
      };
      
      if (editMode && currentContentId) {
        return apiRequest('PATCH', `/api/scheduled-content/${currentContentId}`, formattedData);
      } else {
        return apiRequest('POST', '/api/scheduled-content', formattedData);
      }
    },
    onSuccess: () => {
      toast({
        title: editMode ? "Content updated" : "Content scheduled",
        description: editMode 
          ? "Your content has been updated successfully." 
          : "Your content has been scheduled successfully."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/scheduled-content/${expert?.id}`] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Handle form submission
  function onSubmit(values: z.infer<typeof scheduleContentSchema>) {
    createScheduledContentMutation.mutate(values);
  }
  
  // Reset form and edit mode
  const resetForm = () => {
    form.reset({
      topicId: "",
      platform: "linkedin",
      contentType: "post",
      title: "",
      content: "",
      scheduledDate: new Date(),
    });
    setEditMode(false);
    setCurrentContentId(null);
  };
  
  // Open dialog for editing existing content
  const handleEditContent = (content: ScheduledContent) => {
    setEditMode(true);
    setCurrentContentId(content.id);
    
    form.reset({
      topicId: content.topicId.toString(),
      platform: content.platform,
      contentType: content.contentType,
      title: content.title,
      content: content.content || "",
      scheduledDate: content.scheduledDate ? new Date(content.scheduledDate) : new Date(),
    });
    
    setDialogOpen(true);
  };
  
  // Open dialog for creating new content
  const handleNewContent = () => {
    resetForm();
    setDialogOpen(true);
  };
  
  // Filter content for selected date
  const filteredContent = useMemo(() => {
    if (!selectedDate || !scheduledContent.length) return [];
    
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    
    return scheduledContent.filter((content: ScheduledContent) => {
      const contentDate = new Date(content.scheduledDate);
      return format(contentDate, 'yyyy-MM-dd') === selectedDateStr;
    });
  }, [selectedDate, scheduledContent]);
  
  // Get content status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      case 'needs review':
        return <Badge className="bg-blue-100 text-blue-800">Needs Review</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };
  
  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin':
        return <i className="fab fa-linkedin text-blue-600 mr-2"></i>;
      case 'twitter':
        return <i className="fab fa-twitter text-blue-400 mr-2"></i>;
      case 'instagram':
        return <i className="fab fa-instagram text-pink-500 mr-2"></i>;
      case 'facebook':
        return <i className="fab fa-facebook text-blue-800 mr-2"></i>;
      default:
        return <i className="fas fa-globe text-gray-600 mr-2"></i>;
    }
  };
  
  if (!expert) return null;
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[#2D3436]">Content Calendar</h1>
        <Button 
          className="inline-flex items-center bg-[#0984E3] hover:bg-blue-700"
          onClick={handleNewContent}
        >
          <i className="fas fa-plus mr-2"></i>
          Schedule Content
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Calendar sidebar */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>
              Choose a date to view or schedule content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="border rounded-md p-3"
            />
            
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Content Status Legend</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm text-gray-600">Ready</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-sm text-gray-600">Draft</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-sm text-gray-600">Needs Review</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Content schedule for selected date */}
        <Card className="md:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                Scheduled Content for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Today'}
              </CardTitle>
              <CardDescription>
                Manage your content for this date
              </CardDescription>
            </div>
            {selectedDate && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleNewContent()}
              >
                <i className="fas fa-plus mr-1"></i> Add
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {contentLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredContent.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContent.map((content: ScheduledContent) => {
                    const contentDate = new Date(content.scheduledDate);
                    const timeStr = format(contentDate, 'h:mm a');
                    
                    return (
                      <TableRow key={content.id}>
                        <TableCell className="font-medium">
                          {timeStr}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-[#2D3436]">{content.title}</div>
                          <div className="text-xs text-gray-500">{content.contentType}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getPlatformIcon(content.platform)}
                            <span className="text-sm text-gray-900">{content.platform}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(content.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex space-x-2 justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditContent(content)}
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <div className="text-[#0984E3] mb-3">
                  <i className="fas fa-calendar-day text-3xl"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">No Content Scheduled</h3>
                <p className="text-gray-500 mb-4">
                  There's no content scheduled for this date. Create new content to get started.
                </p>
                <Button 
                  onClick={handleNewContent}
                  className="bg-[#0984E3]"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Schedule Content
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Upcoming scheduled content table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Upcoming Scheduled Content</CardTitle>
          <CardDescription>
            View and manage your upcoming content across all platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contentLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : scheduledContent.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledContent
                    .sort((a: ScheduledContent, b: ScheduledContent) => {
                      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
                    })
                    .slice(0, 5)
                    .map((content: ScheduledContent) => {
                      const contentDate = new Date(content.scheduledDate);
                      const dateTimeStr = format(contentDate, 'MMM d, yyyy • h:mm a');
                      
                      return (
                        <TableRow key={content.id}>
                          <TableCell className="whitespace-nowrap text-sm text-gray-500">
                            {dateTimeStr}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="text-sm font-medium text-[#2D3436]">{content.title}</div>
                            <div className="text-xs text-gray-500">{content.contentType}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center">
                              {getPlatformIcon(content.platform)}
                              <span className="text-sm text-gray-900">{content.platform}</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {getStatusBadge(content.status)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditContent(content)}
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-[#0984E3] mb-3">
                <i className="fas fa-calendar-alt text-3xl"></i>
              </div>
              <h3 className="text-lg font-medium mb-2">No Upcoming Content</h3>
              <p className="text-gray-500 mb-4">
                You haven't scheduled any content yet. Start by creating your first scheduled post.
              </p>
              <Button 
                onClick={handleNewContent}
                className="bg-[#0984E3]"
              >
                Schedule Your First Content
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Schedule content dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Scheduled Content" : "Schedule New Content"}</DialogTitle>
            <DialogDescription>
              Fill in the details to {editMode ? "update your" : "schedule"} content for publishing.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="topicId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {topicsLoading ? (
                          <SelectItem value="loading" disabled>Loading topics...</SelectItem>
                        ) : topics.length > 0 ? (
                          topics.map((topic: Topic) => (
                            <SelectItem key={topic.id} value={topic.id.toString()}>
                              {topic.title}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No topics available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="twitter">Twitter</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="post">Post</SelectItem>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="poll">Poll</SelectItem>
                          <SelectItem value="thread">Thread</SelectItem>
                          <SelectItem value="carousel">Carousel</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter content title" {...field} />
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
                        placeholder="Enter your content text"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Scheduled Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : new Date();
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-[#0984E3]"
                  disabled={createScheduledContentMutation.isPending}
                >
                  {createScheduledContentMutation.isPending 
                    ? "Saving..." 
                    : editMode ? "Update Content" : "Schedule Content"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
