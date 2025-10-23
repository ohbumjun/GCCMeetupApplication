import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CurrentVote } from "@/components/dashboard/current-vote";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { MemberOverview } from "@/components/dashboard/member-overview";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { Announcements } from "@/components/dashboard/announcements";
import { WarningAlerts } from "@/components/dashboard/warning-alerts";
import { useQuery } from "@tanstack/react-query";
import { Users, CalendarCheck, Vote, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: votes, isLoading: isVotesLoading } = useQuery({
    queryKey: ["/api/votes"],
  });

  const activeVote = votes && votes.length > 0 ? votes[0] : null;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header title="Dashboard" subtitle="Welcome back! Here's what's happening with your club." />
        
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatsCard
              title="Total Members"
              value={stats?.totalMembers ?? 0}
              icon={Users}
              change={"+2 this month"}
              changeType="positive"
              isLoading={isStatsLoading}
              data-testid="stat-total-members"
            />
            <StatsCard
              title="This Week's Attendance"
              value={`${stats?.weeklyAttendanceRate ?? 0}%`}
              icon={CalendarCheck}
              change="+5% from last week"
              changeType="positive"
              isLoading={isStatsLoading}
              data-testid="stat-weekly-attendance"
            />
            <StatsCard
              title="Active Votes"
              value={stats?.activeVotesCount ?? 0}
              icon={Vote}
              change="Deadline: 2 hours"
              changeType="neutral"
              isLoading={isStatsLoading}
              data-testid="stat-active-votes"
            />
            <StatsCard
              title="Consecutive Absences"
              value={stats?.consecutiveAbsentees ?? 0}
              icon={AlertTriangle}
              change="Members need attention"
              changeType="negative"
              isLoading={isStatsLoading}
              data-testid="stat-consecutive-absences"
            />
          </div>

          {/* Warning Alerts */}
          <WarningAlerts />

          {/* Quick Actions & Current Vote */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <QuickActions />
            </div>
            <div className="lg:col-span-2">
              <CurrentVote vote={activeVote} isLoading={isVotesLoading} />
            </div>
          </div>

          {/* Recent Activity & Member Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentActivity />
            <MemberOverview />
          </div>

          {/* Upcoming Events & Announcements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UpcomingEvents />
            <Announcements />
          </div>
        </div>
      </main>
    </div>
  );
}
