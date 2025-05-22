import { Link, useLocation } from "wouter";
import { Expert } from "../App";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  expert: Expert;
  onLogout: () => void;
}

export default function Sidebar({ expert, onLogout }: SidebarProps) {
  const [location] = useLocation();
  
  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-white shadow-md">
        <div className="flex items-center justify-center h-16 border-b border-[#DFE6E9]">
          <h1 className="text-xl font-semibold text-[#2D3436] flex items-center">
            <i className="fas fa-brain mr-2 text-[#0984E3]"></i>
            ExpertPlanner
          </h1>
        </div>
        
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1">
            <div className="mb-1">
              <Link href="/">
                <div className={`flex items-center px-4 py-3 text-sm font-medium rounded-md cursor-pointer ${
                  location === "/" 
                    ? "text-white bg-[#0984E3]" 
                    : "text-[#2D3436] hover:bg-[#F5F6FA]"
                }`}>
                  <i className="fas fa-list-ul mr-3"></i>
                  Topic Ideas
                </div>
              </Link>
            </div>
            
            <div className="mb-1">
              <Link href="/profile">
                <div className={`flex items-center px-4 py-3 text-sm font-medium rounded-md cursor-pointer ${
                  location === "/profile" 
                    ? "text-white bg-[#0984E3]" 
                    : "text-[#2D3436] hover:bg-[#F5F6FA]"
                }`}>
                  <i className="fas fa-user-circle mr-3"></i>
                  My Profile
                </div>
              </Link>
            </div>
            
            <div className="mb-1">
              <Link href="/content-ideas">
                <div className={`flex items-center px-4 py-3 text-sm font-medium rounded-md cursor-pointer ${
                  location === "/content-ideas" 
                    ? "text-white bg-[#0984E3]" 
                    : "text-[#2D3436] hover:bg-[#F5F6FA]"
                }`}>
                  <i className="fas fa-lightbulb mr-3"></i>
                  Content Ideas
                </div>
              </Link>
            </div>
            
            <div className="mb-1">
              <Link href="/platform-content">
                <div className={`flex items-center px-4 py-3 text-sm font-medium rounded-md cursor-pointer ${
                  location === "/platform-content" 
                    ? "text-white bg-[#0984E3]" 
                    : "text-[#2D3436] hover:bg-[#F5F6FA]"
                }`}>
                  <i className="fas fa-share-alt mr-3"></i>
                  Platform Content
                </div>
              </Link>
            </div>
            
            <div className="mb-1">
              <Link href="/content-editor">
                <div className={`flex items-center px-4 py-3 text-sm font-medium rounded-md cursor-pointer ${
                  location.startsWith("/content-editor") 
                    ? "text-white bg-[#0984E3]" 
                    : "text-[#2D3436] hover:bg-[#F5F6FA]"
                }`}>
                  <i className="fas fa-edit mr-3"></i>
                  Content Editor
                </div>
              </Link>
            </div>
            
            <button
              onClick={onLogout}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-[#2D3436] hover:bg-[#F5F6FA] rounded-md"
            >
              <i className="fas fa-sign-out-alt mr-3"></i>
              Log Out
            </button>
          </nav>
        </div>
        
        <div className="p-4 border-t border-[#DFE6E9]">
          <div className="flex items-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt={expert.name} />
              <AvatarFallback className="bg-[#0984E3] text-white">
                {expert.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium text-[#2D3436]">{expert.name}</p>
              <p className="text-xs text-gray-500">{expert.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
