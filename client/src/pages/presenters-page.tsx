import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function PresentersPage() {
  const { user } = useAuth();

  const { data: presenters, isLoading } = useQuery({
    queryKey: ["/api/presenters/upcoming"],
  });

  const submitTopicMutation = useMutation({
    mutationFn: async ({ id, topicTitle }: { id: string; topicTitle: string }) =>
      apiRequest(`/api/presenters/${id}/submit-topic`, "PATCH", { topicTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presenters/upcoming"] });
    },
  });

  const submitMaterialMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/api/presenters/${id}/submit-material`, "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presenters/upcoming"] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NOT_SUBMITTED":
        return (
          <Badge variant="destructive" data-testid={`badge-status-${status}`}>
            <XCircle className="mr-1 h-3 w-3" />
            미제출
          </Badge>
        );
      case "TOPIC_SUBMITTED":
        return (
          <Badge variant="secondary" data-testid={`badge-status-${status}`}>
            <Clock className="mr-1 h-3 w-3" />
            주제 제출
          </Badge>
        );
      case "MATERIAL_SUBMITTED":
        return (
          <Badge variant="default" data-testid={`badge-status-${status}`}>
            <CheckCircle className="mr-1 h-3 w-3" />
            자료 제출 완료
          </Badge>
        );
      case "LATE_SUBMISSION":
        return (
          <Badge variant="outline" data-testid={`badge-status-${status}`}>
            <AlertTriangle className="mr-1 h-3 w-3" />
            지각 제출
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p data-testid="text-loading">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6" data-testid="heading-presenters">
        발제자 관리
      </h1>

      <div className="grid gap-6">
        {presenters && Array.isArray(presenters) && presenters.length > 0 ? (
          presenters.map((presenter: any) => {
            const isMyPresentation = presenter.userId === user?.id;
            const meetingDate = new Date(presenter.meetingDate);
            const topicDeadline = new Date(presenter.topicDeadline);
            const materialDeadline = new Date(presenter.materialDeadline);

            return (
              <Card key={presenter.id} data-testid={`card-presenter-${presenter.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {format(meetingDate, "yyyy년 MM월 dd일")} 회의
                    </CardTitle>
                    {getStatusBadge(presenter.submissionStatus)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">발제자</p>
                      <p className="font-medium" data-testid={`text-presenter-name-${presenter.id}`}>
                        {presenter.userName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">주제</p>
                      <p className="font-medium" data-testid={`text-topic-${presenter.id}`}>
                        {presenter.topicTitle || "미정"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">주제 제출 마감</p>
                      <p className="text-sm" data-testid={`text-topic-deadline-${presenter.id}`}>
                        {format(topicDeadline, "yyyy-MM-dd HH:mm")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">자료 제출 마감</p>
                      <p className="text-sm" data-testid={`text-material-deadline-${presenter.id}`}>
                        {format(materialDeadline, "yyyy-MM-dd HH:mm")}
                      </p>
                    </div>
                  </div>

                  {isMyPresentation && (
                    <div className="flex gap-2 pt-4 border-t">
                      {presenter.submissionStatus === "NOT_SUBMITTED" && (
                        <Button
                          onClick={() => {
                            const topic = prompt("발표 주제를 입력하세요:");
                            if (topic) {
                              submitTopicMutation.mutate({
                                id: presenter.id,
                                topicTitle: topic,
                              });
                            }
                          }}
                          disabled={submitTopicMutation.isPending}
                          data-testid={`button-submit-topic-${presenter.id}`}
                        >
                          주제 제출
                        </Button>
                      )}
                      {presenter.submissionStatus === "TOPIC_SUBMITTED" && (
                        <Button
                          onClick={() => submitMaterialMutation.mutate(presenter.id)}
                          disabled={submitMaterialMutation.isPending}
                          data-testid={`button-submit-material-${presenter.id}`}
                        >
                          자료 제출 완료
                        </Button>
                      )}
                    </div>
                  )}

                  {presenter.penaltyApplied && (
                    <div className="bg-destructive/10 p-3 rounded-md">
                      <p className="text-sm text-destructive font-medium" data-testid={`text-penalty-${presenter.id}`}>
                        패널티 적용: {Number(presenter.penaltyAmount).toLocaleString()}원
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground" data-testid="text-no-presenters">
                예정된 발제자가 없습니다.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
