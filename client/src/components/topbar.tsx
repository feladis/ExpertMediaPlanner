import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Expert } from "../App";

interface TopbarProps {
  onToggleSidebar: () => void;
  expert: Expert;
}

export default function Topbar({ onToggleSidebar, expert }: TopbarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow-sm">
      <button 
        type="button" 
        className="px-4 md:hidden"
        onClick={onToggleSidebar}
      >
        <i className="fas fa-bars text-gray-500"></i>
      </button>
      
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex items-center">
          <div className="max-w-lg w-full lg:max-w-xs relative">
            <label htmlFor="search" className="sr-only">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <Input
                id="search"
                className="block w-full pl-10 pr-3 py-2 border border-[#DFE6E9] rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0984E3] focus:border-[#0984E3] sm:text-sm"
                placeholder="Search topics, ideas..."
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6">
          <button className="p-1 rounded-full text-gray-400 hover:text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#0984E3]">
            <i className="fas fa-bell"></i>
          </button>
          <button className="ml-3 p-1 rounded-full text-gray-400 hover:text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#0984E3]">
            <i className="fas fa-question-circle"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
