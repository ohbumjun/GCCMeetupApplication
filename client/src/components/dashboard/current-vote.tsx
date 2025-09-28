import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface CurrentVoteProps {
  vote: any;
  isLoading: boolean;
}

export function CurrentVote({ vote, isLoading }: CurrentVoteProps) {
  const { data: responses } = useQuery({
    queryKey: vote ? ["/api/votes", vote.id, "responses"] : [],
    enabled: !!vote,
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vote) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Current Vote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No active votes at the moment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const presentCount = responses?.filter((r: any) => r.response === "PRESENT").length || 0;
  const absentCount = responses?.filter((r: any) => r.response === "ABSENT").length || 0;
  const totalResponses = presentCount + absentCount;
  const presentPercentage = totalResponses > 0 ? (presentCount / totalResponses) * 100 : 0;

  const deadline = new Date(vote.deadlineDate);
  const isExpired = deadline < new Date();

  return (
    <Card className="shadow-sm" data-testid="current-vote-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Current Vote</CardTitle>
          <Badge variant={isExpired ? "secondary" : "default"}>
            {isExpired ? "Expired" : "Active"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-medium text-foreground">{vote.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{vote.description}</p>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          <span className="flex items-center text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            <span>Deadline: {deadline.toLocaleDateString()} {deadline.toLocaleTimeString()}</span>
          </span>
          <span className="flex items-center text-accent">
            <Users className="h-4 w-4 mr-2" />
            <span>{totalResponses} responded</span>
          </span>
        </div>

        {/* Vote Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Present</span>
            <span className="font-medium text-accent">
              {presentCount} ({presentPercentage.toFixed(1)}%)
            </span>
          </div>
          <Progress value={presentPercentage} className="h-2" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Absent</span>
            <span className="font-medium text-muted-foreground">
              {absentCount} ({(100 - presentPercentage).toFixed(1)}%)
            </span>
          </div>
          <Progress value={100 - presentPercentage} className="h-2" />
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <Button data-testid="button-view-vote-details">
            View Details
          </Button>
          <Button variant="outline" data-testid="button-send-reminders">
            Send Reminders
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
