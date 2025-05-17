import { cn } from "@/lib/utils";

interface SpotChipProps {
  name: string;
  catchCount: number;
  className?: string;
  colorScheme?: 'primary' | 'secondary' | 'accent' | 'neutral';
  onClick?: () => void;
}

export default function SpotChip({ 
  name, 
  catchCount, 
  className,
  colorScheme = 'primary',
  onClick 
}: SpotChipProps) {
  // Define color schemes
  const colorSchemes = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-amber-500/10 text-amber-500",
    neutral: "bg-gray-200 text-gray-600",
  };
  
  // Define lighter variants for catch count
  const countColors = {
    primary: "text-primary/70",
    secondary: "text-secondary/70",
    accent: "text-amber-500/70",
    neutral: "text-gray-500",
  };

  return (
    <div 
      className={cn(
        "flex items-center space-x-1 px-3 py-2 rounded-full whitespace-nowrap",
        colorSchemes[colorScheme],
        onClick && "cursor-pointer hover:shadow-sm transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <i className="ri-map-pin-line text-xs"></i>
      <span className="text-xs font-medium">{name}</span>
      <div className="flex items-center ml-1">
        <i className={`ri-fish-line text-xs ${countColors[colorScheme]}`}></i>
        <span className={`text-xs ${countColors[colorScheme]}`}>{catchCount}</span>
      </div>
    </div>
  );
}
