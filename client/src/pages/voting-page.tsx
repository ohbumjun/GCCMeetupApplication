import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, Users, CheckCircle, XCircle, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VotingPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: votes, isLoading: isVotesLoading } = useQuery({
    queryKey: ["/api/votes"],
  });

  const { data: voteHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["/api/votes/history"],
  });

  const { data: locations, isLoading: isLocationsLoading } = useQuery({
    queryKey: ["/api/locations"],
  });

  const voteResponseMutation = useMutation({
    mutationFn: async ({ voteId, response }: { voteId: string; response: string }) => {
      await apiRequest("POST", `/api/votes/${voteId}/responses`, { response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/votes"] });
      toast({
        title: "Vote submitted",
        description: "Your response has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Vote failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVote = (voteId: string, response: "PRESENT" | "ABSENT") => {
    voteResponseMutation.mutate({ voteId, response });
  };

  const activeVotes = (votes || []).filter((vote: any) => vote.status === "ACTIVE");
  const closedVotes = (voteHistory || []).filter((vote: any) => vote.status === "CLOSED");

  const votesByLocation = activeVotes.reduce((acc: any, vote: any) => {
    const locationId = vote.locationId || "unknown";
    if (!acc[locationId]) {
      acc[locationId] = [];
    }
    acc[locationId].push(vote);
    return acc;
  }, {});

  const activeLocations = locations?.filter((loc: any) => 
    votesByLocation[loc.id]?.length > 0
  ) || [];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header title="Voting" subtitle="Participate in weekly meetup votes and view your voting history." />
        
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Active Votes by Location */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Active Votes</h2>
            {isVotesLoading || isLocationsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ) : activeVotes.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No active votes at the moment.</p>
                </CardContent>
              </Card>
            ) : activeLocations.length > 1 ? (
              <div className="space-y-4">
                {activeLocations.map((location: any) => (
                  <Card key={location.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {location.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {location.address || 'No address available'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {votesByLocation[location.id]?.map((vote: any) => (
                        <VoteCard 
                          key={vote.id} 
                          vote={vote}
                          location={location}
                          onVote={handleVote}
                          isPending={voteResponseMutation.isPending}
                        />
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {activeVotes.map((vote: any) => {
                  const location = locations?.find((loc: any) => loc.id === vote.locationId);
                  return (
                    <VoteCard 
                      key={vote.id} 
                      vote={vote}
                      location={location}
                      onVote={handleVote}
                      isPending={voteResponseMutation.isPending}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Vote History */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Vote History</h2>
            {isHistoryLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : closedVotes.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No vote history available.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {closedVotes.map((vote: any) => {
                  const location = locations?.find((loc: any) => loc.id === vote.locationId);
                  return (
                    <HistoryVoteCard key={vote.id} vote={vote} location={location} />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function VoteCard({ vote, location, onVote, isPending }: { vote: any; location?: any; onVote: (voteId: string, response: "PRESENT" | "ABSENT") => void; isPending: boolean }) {
  const { data: responses } = useQuery({
    queryKey: ["/api/votes", vote.id, "responses"],
  });

  const { user } = useAuth();
  const userResponse = (responses || []).find((r: any) => r.userId === user?.id);

  const presentCount = (responses || []).filter((r: any) => r.response === "PRESENT").length;
  const absentCount = (responses || []).filter((r: any) => r.response === "ABSENT").length;
  const totalResponses = presentCount + absentCount;
  const presentPercentage = totalResponses > 0 ? (presentCount / totalResponses) * 100 : 0;

  const deadline = new Date(vote.deadlineDate);
  const isExpired = deadline < new Date();

  return (
    <Card data-testid={`vote-card-${vote.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{vote.title}</CardTitle>
            {location && (
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{location.name}</span>
              </div>
            )}
          </div>
          <Badge variant={isExpired ? "secondary" : "default"}>
            {isExpired ? "Expired" : "Active"}
          </Badge>
        </div>
        <CardDescription>{vote.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>Deadline: {deadline.toLocaleDateString()} {deadline.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{totalResponses} responses</span>
          </div>
        </div>

        {/* Vote Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Present</span>
            <span className="font-medium text-accent">{presentCount} ({presentPercentage.toFixed(1)}%)</span>
          </div>
          <Progress value={presentPercentage} className="h-2" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Absent</span>
            <span className="font-medium text-muted-foreground">{absentCount} ({(100 - presentPercentage).toFixed(1)}%)</span>
          </div>
          <Progress value={100 - presentPercentage} className="h-2" />
        </div>

        {/* Vote Actions */}
        {userResponse ? (
          <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-md">
            {userResponse.response === "PRESENT" ? (
              <CheckCircle className="h-5 w-5 text-accent" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              You voted: {userResponse.response === "PRESENT" ? "Present" : "Absent"}
            </span>
          </div>
        ) : !isExpired ? (
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => onVote(vote.id, "PRESENT")}
              disabled={isPending}
              className="flex-1"
              data-testid={`button-vote-present-${vote.id}`}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Present
            </Button>
            <Button
              onClick={() => onVote(vote.id, "ABSENT")}
              disabled={isPending}
              variant="outline"
              className="flex-1"
              data-testid={`button-vote-absent-${vote.id}`}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Absent
            </Button>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            Voting has closed
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryVoteCard({ vote, location }: { vote: any; location?: any }) {
  const { data: responses } = useQuery({
    queryKey: ["/api/votes", vote.id, "responses"],
  });

  const presentCount = (responses || []).filter((r: any) => r.response === "PRESENT").length;
  const absentCount = (responses || []).filter((r: any) => r.response === "ABSENT").length;
  const totalResponses = presentCount + absentCount;
  const presentPercentage = totalResponses > 0 ? (presentCount / totalResponses) * 100 : 0;

  return (
    <Card data-testid={`history-vote-card-${vote.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{vote.title}</CardTitle>
            {location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{location.name}</span>
              </div>
            )}
          </div>
          <Badge variant="secondary">Closed</Badge>
        </div>
        <CardDescription>{vote.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Date: {new Date(vote.voteDate).toLocaleDateString()}</span>
          <span>{totalResponses} responses</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-3 bg-accent/10 rounded-md">
            <div className="font-medium text-accent">{presentCount}</div>
            <div className="text-muted-foreground">Present</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <div className="font-medium text-muted-foreground">{absentCount}</div>
            <div className="text-muted-foreground">Absent</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
