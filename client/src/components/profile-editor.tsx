import { useState, useRef } from "react";
import { Expert } from "../App";
import { 
  Dialog,
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expert: Expert;
  onProfileUpdated: (updatedExpert: Expert) => void;
}

export default function ProfileEditor({ 
  open, 
  onOpenChange, 
  expert,
  onProfileUpdated
}: ProfileEditorProps) {
  const [name, setName] = useState(expert.name);
  const [role, setRole] = useState(expert.role || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | undefined>(expert.profileImage);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(expert.profileImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Trigger file input click when the avatar is clicked
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection for profile picture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert file to base64 for preview and storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfileImage(base64String);
        setPreviewUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit the form to update profile
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare update data
      const updateData = {
        name,
        role,
        profileImage: profileImage || undefined
      };

      // Send update request to the API
      const response = await apiRequest(
        `/api/experts/${expert.id}`,
        "PATCH",
        updateData
      );

      if (response) {
        // Update the local expert data
        const updatedExpert = { ...expert, ...updateData };
        onProfileUpdated(updatedExpert);
        
        // Invalidate any queries that might rely on this data
        queryClient.invalidateQueries({ queryKey: [`/api/experts/${expert.id}`] });
        
        // Show success toast
        toast({
          title: "Profile Updated",
          description: "Your personal information has been successfully updated.",
          duration: 3000
        });
        
        // Close the dialog
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "There was a problem updating your profile. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Personal Information</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Profile Picture */}
          <div className="flex flex-col items-center space-y-4">
            <div 
              className="relative cursor-pointer group"
              onClick={handleAvatarClick}
            >
              <Avatar className="h-24 w-24 border-2 border-[#0984E3]">
                {previewUrl ? (
                  <AvatarImage src={previewUrl} alt={name} />
                ) : (
                  <AvatarFallback className="bg-[#0984E3] text-white text-xl">
                    {name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="fas fa-camera text-white text-lg"></i>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-sm text-gray-500">Click to upload a profile picture</p>
          </div>
          
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
          
          {/* Role Field */}
          <div className="space-y-2">
            <Label htmlFor="role">Professional Role</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Marketing Director, Social Media Manager"
              required
            />
          </div>
          
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancel</Button>
            </DialogClose>
            <Button 
              type="submit" 
              className="bg-[#0984E3] hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}