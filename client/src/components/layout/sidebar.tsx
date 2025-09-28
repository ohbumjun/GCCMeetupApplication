import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Home, 
  Vote, 
  CalendarCheck, 
  Trophy, 
  DoorOpen, 
  MessageSquare, 
  Lightbulb, 
  User, 
  X,
  Menu,
  LogOut
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Voting", href: "/voting", icon: Vote },
  { name: "Attendance", href: "/attendance", icon: CalendarCheck },
  { name: "Members", href: "/members", icon: Users },
  { name: "Rankings", href: "/rankings", icon: Trophy },
  { name: "Room Assignment", href: "/room-assignment", icon: DoorOpen },
  { name: "Topics", href: "/topics", icon: MessageSquare },
  { name: "Suggestions", href: "/suggestions", icon: Lightbulb },
  { name: "My Profile", href: "/profile", icon: User },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const closeMobile = () => setIsMobileOpen(false);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(true)}
        data-testid="button-mobile-menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative z-50 w-64 h-screen bg-card border-r border-border shadow-lg transition-transform duration-300",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">GCC English</h1>
                  <p className="text-xs text-muted-foreground">Meetup Club</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={closeMobile}
                data-testid="button-close-sidebar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start space-x-3",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={closeMobile}
                    data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <span className="text-accent-foreground text-sm font-medium">
                  {user?.englishName?.charAt(0) || user?.username?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.englishName || user?.username || "User"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role?.toLowerCase() || "Member"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
