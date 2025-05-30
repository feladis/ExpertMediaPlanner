import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import ContentManagement from "@/pages/content-management";
import PlatformContent from "@/pages/platform-content";
import ContentEditorPage from "@/pages/content-editor";
import Header from "@/components/header";

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



  // If no expert exists and not at login route, redirect to login
  // Special case for content editor which should be accessible even if coming from direct link
  if (!expert && location !== "/" && location !== "/content-editor") {
    window.location.href = "/";
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#F5F6FA]">
        {expert && (
          <Header expert={expert} onLogout={handleLogout} />
        )}

        <main className="pt-16 px-6 py-8">
          <Switch>
            <Route path="/" component={() => <Dashboard expert={expert} onLogin={handleLogin} authLoading={authLoading} />} />
            <Route path="/profile" component={() => <ProfilePage expert={expert} onExpertUpdate={handleExpertUpdate} />} />
            <Route path="/content-management" component={() => <ContentManagement expert={expert} />} />
            <Route path="/platform-content" component={() => <PlatformContent />} />
            <Route path="/content-editor" component={() => <ContentEditorPage />} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;