import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Vote, UserPlus, DoorOpen, Lightbulb } from "lucide-react";

// Mock activity data - in a real app, this would come from an API
const mockActivities = [
  {
    id: 1,
    type: "vote",
    user: "Sarah Kim",
    action: 'voted "Present" for this week\'s meetup',
    time: "2 minutes ago",
    icon: Vote,
    iconColor: "text-accent",
    iconBg: "bg-accent/10",
  },
  {
    id: 2,
    type: "member",
    user: "Michael Park",
    action: "was added to the club",
    time: "1 hour ago",
    icon: UserPlus,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: 3,
    type: "room",
    user: "",
    action: "Room assignments generated for December 22 meetup",
    time: "3 hours ago",
    icon: DoorOpen,
    iconColor: "text-secondary",
    iconBg: "bg-secondary/10",
  },
  {
    id: 4,
    type: "suggestion",
    user: "Jessica Lee",
    action: "submitted a new suggestion",
    time: "5 hours ago",
    icon: Lightbulb,
    iconColor: "text-accent",
    iconBg: "bg-accent/10",
  },
];

export function RecentActivity() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockActivities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3" data-testid={`activity-item-${activity.id}`}>
            <div className={`w-8 h-8 ${activity.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
              <activity.icon className={`${activity.iconColor} h-4 w-4`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                {activity.user && (
                  <span className="font-medium">{activity.user} </span>
                )}
                {activity.action}
              </p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
        
        <Button 
          variant="ghost" 
          className="w-full mt-4 text-primary hover:text-primary/80"
          data-testid="button-view-all-activity"
        >
          View All Activity
        </Button>
      </CardContent>
    </Card>
  );
}
