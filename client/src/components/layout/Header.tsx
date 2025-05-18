import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Menu, X } from "lucide-react";
import { getSyncStatus } from "@/lib/localStorageSync";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>(
    getSyncStatus()
  );

  // Update sync status when online/offline status changes
  useEffect(() => {
    const updateSyncStatus = () => {
      setSyncStatus(getSyncStatus());
    };

    // Initial status
    updateSyncStatus();

    // Add event listeners
    window.addEventListener('online', updateSyncStatus);
    window.addEventListener('offline', updateSyncStatus);

    // Cleanup
    return () => {
      window.removeEventListener('online', updateSyncStatus);
      window.removeEventListener('offline', updateSyncStatus);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <span className="text-primary font-semibold text-xl mr-1">Fish</span>
            <span className="text-secondary font-semibold text-xl">Tracker</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Sync Status Indicator */}
          <div className="flex items-center">
            {syncStatus === 'online' && (
              <span className="inline-flex items-center text-xs font-medium text-green-600 mr-1">
                <i className="ri-wifi-line mr-1"></i> Online
              </span>
            )}
            {syncStatus === 'offline' && (
              <span className="inline-flex items-center text-xs font-medium text-amber-600 mr-1">
                <i className="ri-wifi-off-line mr-1"></i> Offline
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="inline-flex items-center text-xs font-medium text-blue-600 mr-1">
                <i className="ri-loader-2-line animate-spin mr-1"></i> Syncing
              </span>
            )}
          </div>
          
          {/* Notifications */}
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>
          
          {/* User Profile / Auth Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full overflow-hidden bg-gray-200">
                {isAuthenticated ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={(user as any)?.profileImageUrl} alt={(user as any)?.username || ""} />
                    <AvatarFallback>{(user as any)?.username?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <i className="ri-user-line"></i>
                    </AvatarFallback>
                  </Avatar>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="py-4 flex flex-col space-y-2">
                {isAuthenticated ? (
                  <>
                    <Link href={`/profile/${(user as any)?.id}`} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md">
                        <i className="ri-user-line"></i>
                        Profile
                    </Link>
                    {(user as any)?.role === 'admin' && (
                      <Link href="/admin" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md">
                        <i className="ri-shield-star-line"></i>
                        Admin
                      </Link>
                    )}
                    <Link href="/settings" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md">
                        <i className="ri-settings-line"></i>
                        Settings
                    </Link>
                    <hr className="my-2" />
                    <SheetClose asChild>
                      <Link
                        href="#"
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            // Clear localStorage auth data
                            localStorage.removeItem('currentUserId');
                            localStorage.removeItem('currentUserName');
                            localStorage.removeItem('currentUserRole');
                            
                            // Log out from server session
                            await fetch("/api/auth/logout", { method: "POST" });
                            
                            // Navigate home
                            window.location.href = "/";
                          } catch (error) {
                            console.error("Logout failed:", error);
                          }
                        }}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md text-red-600"
                      >
                        <i className="ri-logout-box-line"></i>
                        Log Out
                      </Link>
                    </SheetClose>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Link 
                      href="/login"
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md"
                    >
                      <i className="ri-login-box-line"></i>
                      Log In
                    </Link>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
