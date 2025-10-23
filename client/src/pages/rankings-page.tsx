import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Medal, Award, TrendingUp, Users, CheckCircle } from "lucide-react";

interface MemberRanking {
  userId: string;
  username: string;
  koreanName: string;
  englishName: string;
  attendanceRate: string;
  totalAttendance: number;
  voteParticipation: number;
  activityScore: number;
  rank: number;
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" data-testid="icon-rank-1" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" data-testid="icon-rank-2" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" data-testid="icon-rank-3" />;
  return <span className="text-muted-foreground" data-testid={`text-rank-${rank}`}>#{rank}</span>;
};

const getRankBadge = (rank: number) => {
  if (rank === 1) return <Badge className="bg-yellow-500 hover:bg-yellow-600" data-testid="badge-rank-1">1st</Badge>;
  if (rank === 2) return <Badge className="bg-gray-400 hover:bg-gray-500" data-testid="badge-rank-2">2nd</Badge>;
  if (rank === 3) return <Badge className="bg-amber-600 hover:bg-amber-700" data-testid="badge-rank-3">3rd</Badge>;
  return <Badge variant="outline" data-testid={`badge-rank-${rank}`}>{rank}th</Badge>;
};

export default function RankingsPage() {
  const { data: rankings, isLoading } = useQuery<MemberRanking[]>({
    queryKey: ["/api/rankings"],
  });

  const topThree = rankings?.slice(0, 3) || [];
  const averageActivityScore = rankings && rankings.length > 0
    ? Math.round(rankings.reduce((sum, r) => sum + r.activityScore, 0) / rankings.length)
    : 0;
  const averageAttendanceRate = rankings && rankings.length > 0
    ? Math.round(rankings.reduce((sum, r) => sum + parseFloat(r.attendanceRate), 0) / rankings.length)
    : 0;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header title="회원 랭킹" subtitle="회원들의 활동 점수와 랭킹을 확인하세요." />
        
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card data-testid="card-total-members">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 회원</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-total-members">{rankings?.length || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">활성 회원 수</p>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-activity">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">평균 활동 점수</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-avg-activity">{averageActivityScore}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">전체 평균</p>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-attendance">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">평균 출석률</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-avg-attendance">{averageAttendanceRate}%</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">전체 평균</p>
              </CardContent>
            </Card>
          </div>

          {/* Top 3 Podium */}
          {!isLoading && topThree.length > 0 && (
            <Card data-testid="card-top-three">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Top 3 Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {topThree.map((member) => (
                    <div
                      key={member.userId}
                      className="flex flex-col items-center p-6 rounded-lg border bg-card hover:shadow-md transition-shadow"
                      data-testid={`podium-${member.rank}`}
                    >
                      <div className="mb-3">
                        {getRankIcon(member.rank)}
                      </div>
                      <div className="text-center mb-3">
                        <h3 className="font-semibold text-lg" data-testid={`name-top-${member.rank}`}>
                          {member.koreanName || member.englishName || member.username}
                        </h3>
                        <p className="text-sm text-muted-foreground" data-testid={`username-top-${member.rank}`}>
                          @{member.username}
                        </p>
                      </div>
                      <div className="text-center space-y-1">
                        <div className="text-3xl font-bold text-primary" data-testid={`score-top-${member.rank}`}>
                          {member.activityScore}
                        </div>
                        <p className="text-xs text-muted-foreground">활동 점수</p>
                        <div className="flex gap-2 mt-3 flex-wrap justify-center">
                          <Badge variant="outline" data-testid={`attendance-top-${member.rank}`}>
                            출석 {member.attendanceRate}%
                          </Badge>
                          <Badge variant="outline" data-testid={`vote-top-${member.rank}`}>
                            투표 {member.voteParticipation}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full Rankings Table */}
          <Card data-testid="card-rankings-table">
            <CardHeader>
              <CardTitle>전체 랭킹</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : rankings && rankings.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">순위</TableHead>
                        <TableHead>회원명</TableHead>
                        <TableHead>사용자명</TableHead>
                        <TableHead className="text-right">활동 점수</TableHead>
                        <TableHead className="text-right">출석률</TableHead>
                        <TableHead className="text-right">출석 횟수</TableHead>
                        <TableHead className="text-right">투표 참여율</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankings.map((member) => (
                        <TableRow key={member.userId} data-testid={`row-ranking-${member.userId}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getRankBadge(member.rank)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`name-${member.userId}`}>
                            {member.koreanName || member.englishName || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground" data-testid={`username-${member.userId}`}>
                            @{member.username}
                          </TableCell>
                          <TableCell className="text-right font-semibold" data-testid={`activity-${member.userId}`}>
                            {member.activityScore}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`attendance-rate-${member.userId}`}>
                            <Badge 
                              variant={parseFloat(member.attendanceRate) >= 80 ? "default" : "secondary"}
                              className={parseFloat(member.attendanceRate) >= 80 ? "bg-green-500 hover:bg-green-600" : ""}
                            >
                              {member.attendanceRate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" data-testid={`attendance-count-${member.userId}`}>
                            {member.totalAttendance}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`vote-participation-${member.userId}`}>
                            <Badge 
                              variant={member.voteParticipation >= 80 ? "default" : "secondary"}
                              className={member.voteParticipation >= 80 ? "bg-blue-500 hover:bg-blue-600" : ""}
                            >
                              {member.voteParticipation}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">아직 랭킹 데이터가 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card data-testid="card-info">
            <CardHeader>
              <CardTitle className="text-sm">활동 점수 계산 방식</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>활동 점수는 다음 요소들을 종합하여 계산됩니다:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>출석률 (50%)</strong>: 전체 모임 대비 출석 비율</li>
                <li><strong>투표 참여율 (30%)</strong>: 전체 투표 대비 참여 비율</li>
                <li><strong>출석 횟수 (20%)</strong>: 총 출석 횟수 기반 보너스</li>
              </ul>
              <p className="text-xs mt-3 italic">
                * 활동 점수 = 출석률 × 0.5 + 투표참여율 × 0.3 + (출석횟수 × 2) × 0.2
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
