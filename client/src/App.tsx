import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import VotingPage from "@/pages/voting-page";
import MembersPage from "@/pages/members-page";
import AttendancePage from "@/pages/attendance-page";
import RankingsPage from "@/pages/rankings-page";
import RoomAssignmentPage from "@/pages/room-assignment-page";
import TopicsPage from "@/pages/topics-page";
import SuggestionsPage from "@/pages/suggestions-page";
import ProfilePage from "@/pages/profile-page";
import FinancialPage from "@/pages/financial-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/voting" component={VotingPage} />
      <ProtectedRoute path="/members" component={MembersPage} />
      <ProtectedRoute path="/attendance" component={AttendancePage} />
      <ProtectedRoute path="/rankings" component={RankingsPage} />
      <ProtectedRoute path="/room-assignment" component={RoomAssignmentPage} />
      <ProtectedRoute path="/topics" component={TopicsPage} />
      <ProtectedRoute path="/suggestions" component={SuggestionsPage} />
      <ProtectedRoute path="/financial" component={FinancialPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
