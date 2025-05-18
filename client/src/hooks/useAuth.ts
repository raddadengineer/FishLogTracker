import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  // First check localStorage for fallback user data
  const userId = localStorage.getItem('currentUserId');
  const userName = localStorage.getItem('currentUserName');
  const userRole = localStorage.getItem('currentUserRole');
  
  // Create a more complete fallback user object with properties that match our schema
  const localStorageUser = userId && userName ? {
    id: userId,
    username: userName,
    role: userRole || 'user',
    email: null as string | null,
    firstName: null as string | null,
    lastName: null as string | null,
    bio: null as string | null,
    profileImageUrl: null as string | null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } : null;
  
  const { 
    data: user, 
    isLoading, 
    error,
    isError,
    refetch
  } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: getQueryFn({ 
      on401: "returnNull"
    }),
    staleTime: 60000, // Cache user data for 1 minute
    refetchOnWindowFocus: false,
  });
  
  // Either use the API-returned user or fallback to localStorage data
  const finalUser = user || localStorageUser;
  const isAuthenticated = !!finalUser;

  return {
    user: finalUser,
    isLoading,
    isAuthenticated,
    error,
    isError,
    refetch
  };
}