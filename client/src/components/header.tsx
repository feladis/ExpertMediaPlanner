import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Expert } from "../App";
import { useState } from "react";

interface HeaderProps {
  expert: Expert;
  onLogout: () => void;
}

export default function Header({ expert, onLogout }: HeaderProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#DFE6E9] shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-[#2D3436] flex items-center">
            <i className="fas fa-brain mr-2 text-[#0984E3]"></i>
            <span className="hidden sm:inline">ExpertPlanner</span>
            <span className="sm:hidden">EP</span>
          </h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/profile">
            <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              location === "/profile" 
                ? "text-white bg-[#0984E3]" 
                : "text-[#2D3436] hover:bg-[#F5F6FA]"
            }`}>
              <Avatar className="h-5 w-5 mr-2">
                <AvatarImage src={expert.profileImage} alt={expert.name} />
                <AvatarFallback className="bg-[#0984E3] text-white text-xs">
                  {expert.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              My Profile
            </div>
          </Link>
          
          <Link href="/">
            <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              location === "/" 
                ? "text-white bg-[#0984E3]" 
                : "text-[#2D3436] hover:bg-[#F5F6FA]"
            }`}>
              <i className="fas fa-list-ul mr-2"></i>
              Topic Ideas
            </div>
          </Link>
          
          <Link href="/platform-content">
            <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              location === "/platform-content" 
                ? "text-white bg-[#0984E3]" 
                : "text-[#2D3436] hover:bg-[#F5F6FA]"
            }`}>
              <i className="fas fa-share-alt mr-2"></i>
              Platform Content
            </div>
          </Link>
          
          <Link href="/content-editor">
            <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              location.startsWith("/content-editor") 
                ? "text-white bg-[#0984E3]" 
                : "text-[#2D3436] hover:bg-[#F5F6FA]"
            }`}>
              <i className="fas fa-edit mr-2"></i>
              Content Editor
            </div>
          </Link>
        </nav>

        {/* Desktop User Actions */}
        <div className="hidden md:flex items-center">
          <button
            onClick={onLogout}
            className="flex items-center px-3 py-2 text-sm font-medium text-[#2D3436] hover:bg-[#F5F6FA] rounded-md transition-colors"
          >
            <i className="fas fa-sign-out-alt mr-2"></i>
            Log Out
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden flex items-center px-2 py-2 text-[#2D3436] hover:bg-[#F5F6FA] rounded-md transition-colors"
        >
          <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#DFE6E9] shadow-lg">
          <nav className="px-6 py-4 space-y-2">
            <Link href="/profile">
              <div className={`flex items-center px-3 py-3 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                location === "/profile" 
                  ? "text-white bg-[#0984E3]" 
                  : "text-[#2D3436] hover:bg-[#F5F6FA]"
              }`} onClick={() => setIsMobileMenuOpen(false)}>
                <Avatar className="h-5 w-5 mr-3">
                  <AvatarImage src={expert.profileImage} alt={expert.name} />
                  <AvatarFallback className="bg-[#0984E3] text-white text-xs">
                    {expert.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                My Profile
              </div>
            </Link>
            
            <Link href="/">
              <div className={`flex items-center px-3 py-3 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                location === "/" 
                  ? "text-white bg-[#0984E3]" 
                  : "text-[#2D3436] hover:bg-[#F5F6FA]"
              }`} onClick={() => setIsMobileMenuOpen(false)}>
                <i className="fas fa-list-ul mr-3"></i>
                Topic Ideas
              </div>
            </Link>
            
            <Link href="/platform-content">
              <div className={`flex items-center px-3 py-3 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                location === "/platform-content" 
                  ? "text-white bg-[#0984E3]" 
                  : "text-[#2D3436] hover:bg-[#F5F6FA]"
              }`} onClick={() => setIsMobileMenuOpen(false)}>
                <i className="fas fa-share-alt mr-3"></i>
                Platform Content
              </div>
            </Link>
            
            <Link href="/content-editor">
              <div className={`flex items-center px-3 py-3 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                location.startsWith("/content-editor") 
                  ? "text-white bg-[#0984E3]" 
                  : "text-[#2D3436] hover:bg-[#F5F6FA]"
              }`} onClick={() => setIsMobileMenuOpen(false)}>
                <i className="fas fa-edit mr-3"></i>
                Content Editor
              </div>
            </Link>

            <div className="pt-2 border-t border-[#DFE6E9]">
              <button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-3 text-sm font-medium text-[#2D3436] hover:bg-[#F5F6FA] rounded-md transition-colors"
              >
                <i className="fas fa-sign-out-alt mr-3"></i>
                Log Out
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}