import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface Warning {
  id: string;
  userId: string;
  warningType: string;
  reason: string;
  isResolved: boolean;
  createdDate: string;
  resolvedDate?: string;
  issuedByAdminId?: string;
  resolvedByAdminId?: string;
}

export function WarningAlerts() {
  const { user } = useAuth();
  
  const { data: warnings, isLoading } = useQuery<Warning[]>({
    queryKey: ["/api/warnings/user", user?.id],
    enabled: !!user?.id,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/warnings/count", user?.id],
    enabled: !!user?.id,
  });

  const unresolvedCount = countData?.count ?? 0;
  const recentWarnings = warnings?.slice(0, 3) ?? [];

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Warning Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const getWarningTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LOW_BALANCE: "Low Balance",
      CANCELLATION_PENALTY: "Cancellation Penalty",
      LATE_PENALTY: "Late Penalty",
      ABSENCE_WARNING: "Absence Warning",
      OTHER: "Other"
    };
    return labels[type] || type;
  };

  const getWarningColor = (type: string) => {
    const colors: Record<string, string> = {
      LOW_BALANCE: "bg-warning/10 border-warning/30 text-warning-foreground",
      CANCELLATION_PENALTY: "bg-destructive/10 border-destructive/30 text-destructive-foreground",
      LATE_PENALTY: "bg-destructive/10 border-destructive/30 text-destructive-foreground",
      ABSENCE_WARNING: "bg-destructive/10 border-destructive/30 text-destructive-foreground",
      OTHER: "bg-secondary/10 border-secondary/30 text-secondary-foreground"
    };
    return colors[type] || colors.OTHER;
  };

  if (unresolvedCount === 0) {
    return (
      <Card className="shadow-sm" data-testid="card-warning-alerts">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-accent" />
            Warning Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-accent/5 border border-accent/20 rounded-md">
            <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">All Clear!</p>
              <p className="text-sm text-muted-foreground">You have no active warnings.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm" data-testid="card-warning-alerts">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Warning Alerts
          </CardTitle>
          <Badge variant="destructive" data-testid="badge-warning-count">
            {unresolvedCount} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentWarnings.map((warning) => (
          <div 
            key={warning.id}
            className={`p-4 border-l-4 rounded-md ${getWarningColor(warning.warningType)}`}
            data-testid={`warning-item-${warning.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant={warning.isResolved ? "secondary" : "destructive"}
                    className="text-xs"
                    data-testid={`badge-type-${warning.id}`}
                  >
                    {getWarningTypeLabel(warning.warningType)}
                  </Badge>
                  {warning.isResolved && (
                    <CheckCircle className="h-4 w-4 text-accent" />
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">
                  {warning.reason}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span data-testid={`date-${warning.id}`}>
                    {format(new Date(warning.createdDate), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {warnings && warnings.length > 3 && (
          <Button 
            variant="ghost" 
            className="w-full mt-2 text-primary hover:text-primary/80"
            data-testid="button-view-all-warnings"
          >
            View All Warnings ({warnings.length})
          </Button>
        )}

        {unresolvedCount >= 3 && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md mt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Critical Warning</p>
                <p className="text-sm text-destructive/90 mt-1">
                  You have {unresolvedCount} unresolved warnings. Please contact an administrator or resolve outstanding issues to avoid suspension.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
