import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Expert } from "../App";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LoginPageProps {
  onLogin: (expert: Expert) => void;
}

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Registration form schema
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Full name is required"),
  role: z.string().min(2, "Professional role is required"),
});

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { toast } = useToast();

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "demo",
      password: "password"
    },
  });

  // Registration form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: ""
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

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (values: z.infer<typeof registerSchema>) => {
      const response = await apiRequest('POST', '/api/experts', values);
      return response.json();
    },
    onSuccess: (data) => {
      onLogin(data);
      toast({
        title: "Registration successful",
        description: "Welcome! Let's set up your expert profile."
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle login form submission
  function handleLoginSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(values);
  }

  // Handle registration form submission
  function handleRegisterSubmit(values: z.infer<typeof registerSchema>) {
    registerMutation.mutate(values);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel - welcome message and benefits */}
      <div className="bg-[#0984E3] text-white p-8 flex flex-col justify-center md:w-1/2">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">ExpertPlanner</h1>
          <p className="text-xl md:text-2xl font-light mb-8">
            Your AI-powered content strategy assistant
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-2 rounded-full mr-4">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Strategic Topic Generation</h3>
                <p className="text-blue-100">
                  Discover relevant content topics tailored to your expertise and audience
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-2 rounded-full mr-4">
                <span className="text-xl">🎯</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Platform-Specific Ideas</h3>
                <p className="text-blue-100">
                  Get customized content ideas optimized for each social platform
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-2 rounded-full mr-4">
                <span className="text-xl">📝</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Content Development</h3>
                <p className="text-blue-100">
                  Create platform-ready content with formatting and references
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right panel - login/register form */}
      <div className="bg-[#F5F6FA] p-8 flex items-center justify-center md:w-1/2">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-6">
            <Tabs defaultValue="login" className="w-full" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
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
                    
                    <div className="text-center text-sm text-gray-500 mt-4">
                      <p>Demo credentials are pre-filled (username: demo, password: password)</p>
                    </div>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Role</FormLabel>
                          <FormControl>
                            <Input placeholder="Marketing Director" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Choose a secure password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[#0984E3]"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                    
                    <div className="text-center text-sm text-gray-500 mt-4">
                      <p>Already have an account? <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("login")}>Login</Button></p>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}