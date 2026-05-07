import { QueryClient, QueryFunction } from "@tanstack/react-query";

/** Headers used by the server when session cookies are missing (matches `apiRequest`). */
export function clientAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const userId = localStorage.getItem("currentUserId");
  const role = localStorage.getItem("currentUserRole");
  if (userId) headers["x-auth-user-id"] = userId;
  if (role) headers["x-auth-user-role"] = role;
  return headers;
}

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
  
  Object.assign(headers, clientAuthHeaders());
  
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

/** Build `/api/...` URL from React Query key: `['/api/users', id, 'stats']` → `/api/users/:id/stats` */
export function endpointFromQueryKey(queryKey: readonly unknown[]): string {
  const parts = queryKey
    .filter((p) => p != null && p !== "")
    .map((p) => String(p));
  if (parts.length === 0) return "/";
  const base = parts[0];
  if (!base.startsWith("/")) return parts.join("/");
  if (parts.length === 1) return base;
  return `${base}/${parts.slice(1).join("/")}`;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = (options: { on401: UnauthorizedBehavior }): QueryFunction<any> =>
  async ({ queryKey }) => {
    try {
      const endpoint = endpointFromQueryKey(queryKey);

      const res = await fetch(endpoint, {
        credentials: "include",
      });

      if (options.on401 === "returnNull" && res.status === 401) {
        console.log(`401 Unauthorized for ${endpoint}, returning null`);
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Data received from ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`Error in query function:`, error);
      if (options.on401 === "returnNull") {
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
