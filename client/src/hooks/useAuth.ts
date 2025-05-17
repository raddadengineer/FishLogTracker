import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  // First check localStorage for fallback user data
  const localStorageUser = {
    id: localStorage.getItem('currentUserId'),
    username: localStorage.getItem('currentUserName')
  };
  
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
  });
  
  // Either use the API-returned user or fallback to localStorage data
  const finalUser = user || (localStorageUser.id ? localStorageUser : null);
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