import React from "react";
import Header from "./Header";
import TabNavigation from "./TabNavigation";
import { useLocation } from "wouter";
import { useOfflineSync } from "@/hooks/useOfflineSync";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { syncStatus, hasUnsyncedCatches, triggerSync } = useOfflineSync();
  
  // Determine if current route needs the tab navigation
  const showTabs = !location.startsWith("/auth/") && location !== "/not-found";
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {syncStatus === "offline" && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-amber-800">
              <span className="font-medium">You’re offline.</span>{" "}
              Changes will save locally and sync when you’re back online.
              {hasUnsyncedCatches ? (
                <span className="ml-2 font-medium">
                  ({/* keep copy short */}Unsynced catches pending)
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="text-xs sm:text-sm font-medium text-amber-900 underline underline-offset-2"
              onClick={triggerSync}
            >
              Try sync
            </button>
          </div>
        </div>
      )}
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-20">
        {children}
      </main>
      
      {showTabs && <TabNavigation />}
    </div>
  );
}
