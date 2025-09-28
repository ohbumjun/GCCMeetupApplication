import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock events data - in a real app, this would come from an API
const upcomingEvents = [
  {
    id: 1,
    title: "Weekly English Meetup",
    date: "December 22, 2024",
    time: "7:00 PM - 9:00 PM",
    topic: "Topic: New Year Resolutions and Goal Setting",
    badges: [
      { text: "32 confirmed", variant: "secondary" as const },
      { text: "Room A, B, C", variant: "outline" as const },
    ],
    borderColor: "border-l-primary",
  },
  {
    id: 2,
    title: "New Year Social Event",
    date: "December 29, 2024",
    time: "6:00 PM - 10:00 PM",
    location: "Location: Gangnam Community Center",
    badges: [
      { text: "RSVP Open", variant: "default" as const },
      { text: "Social Event", variant: "secondary" as const },
    ],
    borderColor: "border-l-accent",
  },
  {
    id: 3,
    title: "Level Assessment",
    date: "January 5, 2025",
    time: "2:00 PM - 4:00 PM",
    description: "Quarterly membership level evaluation",
    badges: [
      { text: "Assessment", variant: "outline" as const },
      { text: "Optional", variant: "secondary" as const },
    ],
    borderColor: "border-l-secondary",
  },
];

export function UpcomingEvents() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Upcoming Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingEvents.map((event) => (
          <div 
            key={event.id} 
            className={`border-l-4 ${event.borderColor} pl-4 py-2`}
            data-testid={`upcoming-event-${event.id}`}
          >
            <h4 className="font-medium text-foreground">{event.title}</h4>
            <p className="text-sm text-muted-foreground">
              {event.date} • {event.time}
            </p>
            {event.topic && (
              <p className="text-sm text-muted-foreground mt-1">{event.topic}</p>
            )}
            {event.location && (
              <p className="text-sm text-muted-foreground mt-1">{event.location}</p>
            )}
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
            )}
            <div className="flex items-center mt-2 space-x-2">
              {event.badges.map((badge, index) => (
                <Badge key={index} variant={badge.variant} className="text-xs">
                  {badge.text}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
