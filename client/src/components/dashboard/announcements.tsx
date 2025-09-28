import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Star, Info } from "lucide-react";

// Mock announcements data - in a real app, this would come from an API
const announcements = [
  {
    id: 1,
    title: "Holiday Schedule Update",
    content: "Please note that there will be no regular meetup on December 29th due to the New Year social event. Regular meetings resume on January 5th, 2025.",
    date: "December 10, 2024",
    type: "important",
    icon: Megaphone,
    bgColor: "bg-primary/5",
    borderColor: "border-primary/20",
    iconColor: "text-primary",
  },
  {
    id: 2,
    title: "New Honor Level Requirements",
    content: "Updated criteria for Honor level advancement. Members need 90% attendance rate and active participation in discussions for level progression.",
    date: "December 5, 2024",
    type: "update",
    icon: Star,
    bgColor: "bg-accent/5",
    borderColor: "border-accent/20",
    iconColor: "text-accent",
  },
  {
    id: 3,
    title: "Room Assignment Algorithm Update",
    content: "We've improved our room assignment system to ensure better mixing of members. The system now prevents repeated groupings for 3+ weeks.",
    date: "November 28, 2024",
    type: "info",
    icon: Info,
    bgColor: "bg-secondary/5",
    borderColor: "border-secondary/20",
    iconColor: "text-secondary",
  },
];

export function Announcements() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Announcements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.map((announcement) => (
          <div 
            key={announcement.id} 
            className={`p-4 ${announcement.bgColor} border ${announcement.borderColor} rounded-md`}
            data-testid={`announcement-${announcement.id}`}
          >
            <div className="flex items-start space-x-3">
              <announcement.icon className={`${announcement.iconColor} h-5 w-5 mt-1 flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground">{announcement.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {announcement.content}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Posted: {announcement.date}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        <Button 
          variant="ghost" 
          className="w-full mt-4 text-primary hover:text-primary/80"
          data-testid="button-view-all-announcements"
        >
          View All Announcements
        </Button>
      </CardContent>
    </Card>
  );
}
