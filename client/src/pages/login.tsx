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
import RegisterForm from "@/components/register-form";
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
                    
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#F5F6FA] px-2 text-gray-500">Or continue with</span>
                      </div>
                    </div>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => window.location.href = '/api/login'}
                      disabled={loginMutation.isPending}
                    >
                      <svg width="18" height="18" viewBox="0 0 75 75" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M37.5 0C16.8 0 0 16.8 0 37.5C0 58.2 16.8 75 37.5 75C58.2 75 75 58.2 75 37.5C75 16.8 58.2 0 37.5 0Z" fill="#F26207"/>
                        <path d="M56.25 46.9C54.9 46.9 53.7 46.3 52.8 45.4L45.45 38.05C44.55 37.15 43.95 35.95 43.95 34.6C43.95 33.25 44.55 32.05 45.45 31.15L52.8 23.8C53.7 22.9 54.9 22.3 56.25 22.3C58.95 22.3 61.15 24.5 61.15 27.2C61.15 28.55 60.55 29.75 59.65 30.65L54.75 35.55C54.3 36 54.3 36.75 54.75 37.2L59.65 42.1C60.55 43 61.15 44.2 61.15 45.55C61.15 48.25 58.95 46.9 56.25 46.9Z" fill="white"/>
                        <path d="M18.75 46.9C16.05 46.9 13.85 44.7 13.85 42C13.85 40.65 14.45 39.45 15.35 38.55L20.25 33.65C20.7 33.2 20.7 32.45 20.25 32L15.35 27.1C14.45 26.2 13.85 25 13.85 23.65C13.85 20.95 16.05 18.75 18.75 18.75C20.1 18.75 21.3 19.35 22.2 20.25L29.55 27.6C30.45 28.5 31.05 29.7 31.05 31.05C31.05 32.4 30.45 33.6 29.55 34.5L22.2 41.85C21.3 42.75 20.1 46.9 18.75 46.9Z" fill="white"/>
                      </svg>
                      Sign in with Replit
                    </Button>
                    
                    <div className="text-center text-sm text-gray-500 mt-4">
                      <p>Demo credentials are pre-filled (username: demo, password: password)</p>
                    </div>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <RegisterForm 
                  onSuccess={onLogin}
                  onCancel={() => setActiveTab("login")}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}