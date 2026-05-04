import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Keeps localStorage auth hints aligned with the server session so API calls
 * that send `x-auth-user-id` stay consistent after Google OAuth redirects.
 */
export function AuthLocalStorageSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem("currentUserId", user.id);
    localStorage.setItem("currentUserName", user.username);
    localStorage.setItem("currentUserRole", user.role || "user");
  }, [user?.id, user?.username, user?.role]);

  return null;
}
