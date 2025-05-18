import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFishSpeciesById } from "@/lib/fishSpecies";

interface SpeciesData {
  species: string;
  count: number;
  percentage: number;
  color?: string;
}

interface SpeciesChartProps {
  title: string;
  data: SpeciesData[];
}

// Color classes based on position
const colorClasses = [
  "bg-primary",
  "bg-secondary",
  "bg-amber-500",
  "bg-gray-400",
  "bg-purple-500",
  "bg-pink-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-red-500",
  "bg-indigo-500"
];

export default function SpeciesChart({ title, data }: SpeciesChartProps) {
  // Add colors to data if not provided
  const enrichedData = data.map((item, index) => ({
    ...item,
    color: item.color || colorClasses[index % colorClasses.length]
  }));

  return (
    <Card className="bg-white shadow-sm border border-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {enrichedData.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No data available
          </div>
        ) : (
          enrichedData.map((species, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>
                  {getFishSpeciesById(species.species).name}
                </span>
                <span>{species.count} {species.count === 1 ? 'catch' : 'catches'}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`${species.color} h-2 rounded-full`} 
                  style={{ width: `${species.percentage}%` }}
                ></div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
