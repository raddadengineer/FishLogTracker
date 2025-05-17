import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
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

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    isError,
    refetch
  };
}