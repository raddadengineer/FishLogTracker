import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Map, Trophy, User, Plus, Shield } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import CatchForm from "@/components/catches/CatchForm";
import { useAuth } from "@/hooks/useAuth";

export default function TabNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between">
          {/* Home Tab */}
          <Link href="/">
            <a className={cn(
              "flex flex-col items-center py-3 px-5",
              location === "/" ? "text-primary" : "text-gray-500 hover:text-primary"
            )}>
              <Home className="h-5 w-5" />
              <span className="text-xs mt-0.5">Home</span>
            </a>
          </Link>

          {/* Map Tab */}
          <Link href="/map">
            <a className={cn(
              "flex flex-col items-center py-3 px-5",
              location === "/map" ? "text-primary" : "text-gray-500 hover:text-primary"
            )}>
              <Map className="h-5 w-5" />
              <span className="text-xs mt-0.5">Map</span>
            </a>
          </Link>

          {/* Add Catch Button */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex flex-col items-center justify-center relative -top-5 bg-primary w-16 h-16 rounded-full text-white shadow-lg hover:bg-primary/90 transition duration-200">
                <Plus className="h-7 w-7" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log a New Catch</DialogTitle>
              </DialogHeader>
              <CatchForm />
            </DialogContent>
          </Dialog>

          {/* Leaderboard Tab */}
          <Link href="/leaderboard">
            <a className={cn(
              "flex flex-col items-center py-3 px-5",
              location === "/leaderboard" ? "text-primary" : "text-gray-500 hover:text-primary"
            )}>
              <Trophy className="h-5 w-5" />
              <span className="text-xs mt-0.5">Leaderboard</span>
            </a>
          </Link>

          {/* Profile Tab */}
          <Link href="/profile">
            <a className={cn(
              "flex flex-col items-center py-3 px-5",
              location.startsWith("/profile") ? "text-primary" : "text-gray-500 hover:text-primary"
            )}>
              <User className="h-5 w-5" />
              <span className="text-xs mt-0.5">Profile</span>
            </a>
          </Link>
          
          {/* Admin Tab - Only visible to admin users */}
          {user && user.role === 'admin' && (
            <Link href="/admin">
              <a className={cn(
                "flex flex-col items-center py-3 px-5",
                location.startsWith("/admin") ? "text-primary" : "text-gray-500 hover:text-primary"
              )}>
                <Shield className="h-5 w-5" />
                <span className="text-xs mt-0.5">Admin</span>
              </a>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
