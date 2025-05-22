import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Expert } from "../App";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<Expert | null>(null);

  const { data, isError, refetch } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/auth/user');
        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error('Failed to fetch user');
        }
        return response.json();
      } catch (error) {
        console.error('Auth error:', error);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isLoading && data) {
      setUser(data);
    } else if (!isLoading) {
      setUser(null);
    }
  }, [data, isLoading]);

  useEffect(() => {
    setIsLoading(false);
  }, [data, isError]);

  const login = async (userData: Expert) => {
    setUser(userData);
  };

  const logout = async () => {
    window.location.href = '/api/logout';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refetchUser: refetch,
  };
}