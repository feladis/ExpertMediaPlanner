import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import ContentIdeas from "@/pages/content-ideas";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

export interface Expert {
  id: number;
  username: string;
  name: string;
  role: string;
  profileComplete: boolean;
}

function App() {
  const [expert, setExpert] = useState<Expert | null>(null);
  const [location] = useLocation();
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Check for stored expert data on initial load
  useEffect(() => {
    const storedExpert = localStorage.getItem('expert');
    if (storedExpert) {
      setExpert(JSON.parse(storedExpert));
    }
  }, []);
  
  // Save expert data to localStorage when it changes
  useEffect(() => {
    if (expert) {
      localStorage.setItem('expert', JSON.stringify(expert));
    }
  }, [expert]);
  
  const handleLogin = (loggedInExpert: Expert) => {
    setExpert(loggedInExpert);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('expert');
    setExpert(null);
  };
  
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  // If no expert exists and not at login route, redirect to login
  if (!expert && location !== "/") {
    window.location.href = "/";
    return null;
  }
  
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
              <Route path="/" component={() => <Dashboard expert={expert} onLogin={handleLogin} />} />
              <Route path="/profile" component={() => <ProfilePage expert={expert} />} />
              <Route path="/content-ideas" component={() => <ContentIdeas expert={expert} />} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
