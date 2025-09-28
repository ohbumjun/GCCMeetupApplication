import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  isLoading?: boolean;
  "data-testid"?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType = "neutral", 
  isLoading,
  "data-testid": testId
}: StatsCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case "positive": return "text-accent";
      case "negative": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm" data-testid={testId}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="w-12 h-12 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-24 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm" data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
        {change && (
          <p className={`text-xs mt-2 ${getChangeColor()}`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
