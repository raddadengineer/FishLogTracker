import React from "react";
import Header from "./Header";
import TabNavigation from "./TabNavigation";
import { useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  
  // Determine if current route needs the tab navigation
  const showTabs = !location.startsWith("/auth/") && location !== "/not-found";
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-4 pb-20">
        {children}
      </main>
      
      {showTabs && <TabNavigation />}
    </div>
  );
}
