import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  isFormData: boolean = false,
): Promise<Response> {
  // Set up headers and body based on content type
  let headers: Record<string, string> = {};
  let body: any = undefined;
  
  // Add authentication from localStorage if available
  const userId = localStorage.getItem('currentUserId');
  if (userId) {
    headers['x-auth-user-id'] = userId;
  }
  
  if (data) {
    if (isFormData || data instanceof FormData) {
      // Don't set Content-Type for FormData, browser will set it with boundary
      body = data;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  try {
    await throwIfResNotOk(res);
  } catch (error) {
    console.error(`API request failed: ${error}`);
    // Just return the response so caller can handle the error
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const endpoint = queryKey[0] as string;
      console.log(`Fetching from: ${endpoint}`);
      
      const res = await fetch(endpoint, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`401 Unauthorized for ${endpoint}, returning null`);
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Data received from ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`Error in query function:`, error);
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
