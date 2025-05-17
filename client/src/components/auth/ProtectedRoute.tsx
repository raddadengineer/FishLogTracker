import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  adminOnly = false 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Check if the component is still loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Use setTimeout to avoid React state updates during render
    setTimeout(() => {
      setLocation("/login");
    }, 0);
    return null;
  }

  // Check for admin access if required
  if (adminOnly && user?.role !== "admin") {
    setTimeout(() => {
      setLocation("/");
    }, 0);
    return null;
  }

  // Render children if all checks pass
  return <>{children}</>;
}