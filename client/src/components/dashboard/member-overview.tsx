import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Medal } from "lucide-react";

// Mock data - in a real app, this would come from an API
const membershipLevels = [
  { level: "Honor IV", count: 8, color: "bg-yellow-500" },
  { level: "Honor III", count: 12, color: "bg-orange-500" },
  { level: "Honor II", count: 15, color: "bg-blue-500" },
  { level: "Honor I", count: 13, color: "bg-green-500" },
];

const topPerformers = [
  { name: "Jennifer Kim", rate: "100%", medal: "text-yellow-500" },
  { name: "David Lee", rate: "95%", medal: "text-gray-400" },
  { name: "Sarah Park", rate: "92%", medal: "text-orange-500" },
];

export function MemberOverview() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Member Overview</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-all-members">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Membership Levels */}
        <div className="space-y-4">
          {membershipLevels.map((level) => (
            <div 
              key={level.level} 
              className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
              data-testid={`level-${level.level.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 ${level.color} rounded-full`}></div>
                <span className="text-sm font-medium text-foreground">{level.level}</span>
              </div>
              <span className="text-sm text-muted-foreground">{level.count} members</span>
            </div>
          ))}
        </div>

        {/* Top Performers */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">Top Performers This Month</h4>
          <div className="space-y-2">
            {topPerformers.map((performer, index) => (
              <div 
                key={performer.name} 
                className="flex items-center justify-between"
                data-testid={`top-performer-${index + 1}`}
              >
                <div className="flex items-center space-x-2">
                  <Medal className={`h-4 w-4 ${performer.medal}`} />
                  <span className="text-sm text-foreground">{performer.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{performer.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
