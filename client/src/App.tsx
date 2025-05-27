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
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

export interface Expert {
  id: number;
  username: string;
  name: string;
  role: string;
  profileComplete: boolean;
  profileImage?: string;
}

function App() {
  const [expert, setExpert] = useState<Expert | null>(null);
  const [location] = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Check for stored expert data and Replit auth on initial load
  useEffect(() => {
    const storedExpert = localStorage.getItem('expert');

    console.log('Checking Replit authentication...');

    // First try Replit authentication
    fetch('/api/auth/replit', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      console.log('Replit auth response status:', res.status);
      if (res.ok) {
        return res.json();
      }
      throw new Error(`Replit auth failed with status ${res.status}`);
    })
    .then(expert => {
      console.log('Replit auth successful:', expert);
      setExpert(expert);
      localStorage.setItem('expert', JSON.stringify(expert));
      setAuthLoading(false);
    })
    .catch(error => {
      console.log('Replit auth failed:', error.message);
      // Fallback to stored expert data if Replit auth fails
      if (storedExpert) {
        console.log('Using stored expert data');
        const parsedExpert = JSON.parse(storedExpert);
        setExpert(parsedExpert);

        // Fetch latest expert data from server to get any updates (like profile image)
        fetch(`/api/experts/${parsedExpert.id}`, { credentials: 'include' })
          .then(res => res.json())
          .then(updatedExpert => {
            setExpert(updatedExpert);
            localStorage.setItem('expert', JSON.stringify(updatedExpert));
            setAuthLoading(false);
          })
          .catch(err => {
            console.log('Could not fetch updated expert data:', err);
            setAuthLoading(false);
          });
      } else {
        console.log('No stored expert data found');
        setAuthLoading(false);
      }
    });
  }, []);

  // Save expert data to localStorage when it changes
  useEffect(() => {
    if (expert) {
      localStorage.setItem('expert', JSON.stringify(expert));
    }
  }, [expert]);

  const handleLogin = (expert: Expert) => {
    setExpert(expert);
    localStorage.setItem('expert', JSON.stringify(expert));
  };

  const handleReplitAuth = async () => {
    try {
      console.log('Attempting Replit authentication...');
      const response = await fetch('/api/auth/replit', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Replit auth response status:', response.status);

      if (response.ok) {
        const expert = await response.json();
        console.log('Replit auth successful:', expert);
        setExpert(expert);
        localStorage.setItem('expert', JSON.stringify(expert));
        return expert;
      } else {
        const error = await response.json();
        console.log('Replit auth failed:', error.message);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Replit authentication error:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('expert');
    setExpert(null);
  };

  const handleExpertUpdate = (updatedExpert: Expert) => {
    setExpert(updatedExpert);
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // If no expert exists and not at login route, redirect to login
  // Special case for content editor which should be accessible even if coming from direct link
  if (!expert && location !== "/" && location !== "/content-editor") {
    window.location.href = "/";
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex bg-[#F5F6FA]">
        {/* Sidebar with responsive behavior */}
        <div className={`
          transition-transform duration-300 ease-in-out
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:relative md:translate-x-0
          fixed md:static
          z-30 md:z-auto
          h-full
        `}>
          {expert && (
            <Sidebar expert={expert} onLogout={handleLogout} />
          )}
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {expert && (
            <Topbar onToggleSidebar={toggleSidebar} expert={expert} />
          )}

          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <Switch>
              <Route path="/" component={() => <Dashboard expert={expert} onLogin={handleLogin} authLoading={authLoading} />} />
              <Route path="/profile" component={() => <ProfilePage expert={expert} onExpertUpdate={handleExpertUpdate} />} />
              <Route path="/content-ideas" component={() => <ContentIdeas expert={expert} />} />
              <Route path="/platform-content" component={() => <PlatformContent />} />
              <Route path="/content-editor" component={() => <ContentEditorPage />} />
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