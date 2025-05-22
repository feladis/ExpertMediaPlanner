import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import ContentIdeas from "@/pages/content-ideas";
import PlatformContent from "@/pages/platform-content";
import ContentEditorPage from "@/pages/content-editor";
import LoginPage from "@/pages/login";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { useAuth } from "@/hooks/useAuth";

export interface Expert {
  id: number;
  username: string;
  name: string;
  role: string;
  profileComplete: boolean;
  profileImage?: string;
}

function App() {
  const { user: expert, isLoading, login, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [showSidebar, setShowSidebar] = useState(true);
  
  const handleLogin = (loggedInExpert: Expert) => {
    login(loggedInExpert);
    setLocation("/"); // Redirect to dashboard after login
  };
  
  const handleLogout = () => {
    logout();
    // The redirect will be handled by the server after logout
  };
  
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  // If no expert exists and not at login page, redirect to login
  useEffect(() => {
    if (!isLoading && !expert && location !== "/login" && location !== "/content-editor") {
      setLocation("/login");
    }
  }, [expert, isLoading, location, setLocation]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex bg-[#F5F6FA]">
        {expert && showSidebar && (
          <Sidebar expert={expert} onLogout={handleLogout} />
        )}
        
        <div className="flex flex-col flex-1 overflow-hidden">
          {expert && (
            <Topbar onToggleSidebar={toggleSidebar} expert={expert} />
          )}
          
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <Switch>
              {!expert ? (
                <>
                  <Route path="/login" component={() => <LoginPage onLogin={handleLogin} />} />
                  <Route component={() => <LoginPage onLogin={handleLogin} />} />
                </>
              ) : (
                <>
                  <Route path="/" component={() => <Dashboard expert={expert} />} />
                  <Route path="/profile" component={() => <ProfilePage expert={expert} />} />
                  <Route path="/content-ideas" component={() => <ContentIdeas expert={expert} />} />
                  <Route path="/platform-content" component={() => <PlatformContent />} />
                  <Route path="/content-editor" component={() => <ContentEditorPage />} />
                  <Route component={NotFound} />
                </>
              )}
            </Switch>
          </main>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
