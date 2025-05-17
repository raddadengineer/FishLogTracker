import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: ReactNode;
  iconBgClass?: string;
  isPositive?: boolean;
}

export default function StatCard({ 
  title, 
  value, 
  change, 
  icon, 
  iconBgClass = "bg-primary/10",
  isPositive = true 
}: StatCardProps) {
  return (
    <Card className="bg-white shadow-sm border border-gray-100">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm text-gray-500">{title}</span>
          <div className={`w-8 h-8 rounded-full ${iconBgClass} flex items-center justify-center`}>
            {icon}
          </div>
        </div>
        <h3 className="text-2xl font-semibold">{value}</h3>
        {change && (
          <p className={`text-xs flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <i className={`${isPositive ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} mr-1`}></i>
            <span>{change}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
