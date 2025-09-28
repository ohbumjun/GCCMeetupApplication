import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Check, DoorOpen, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function QuickActions() {
  const { user } = useAuth();

  const isAdmin = user?.role === "ADMIN";

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAdmin && (
          <>
            <Button 
              className="w-full justify-start space-x-3"
              data-testid="button-create-vote"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Vote</span>
            </Button>
            <Button 
              variant="secondary"
              className="w-full justify-start space-x-3"
              data-testid="button-mark-attendance"
            >
              <Check className="h-4 w-4" />
              <span>Mark Attendance</span>
            </Button>
            <Button 
              variant="secondary"
              className="w-full justify-start space-x-3"
              data-testid="button-assign-rooms"
            >
              <DoorOpen className="h-4 w-4" />
              <span>Assign Rooms</span>
            </Button>
            <Button 
              variant="outline"
              className="w-full justify-start space-x-3"
              data-testid="button-add-member"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Member</span>
            </Button>
          </>
        )}
        {!isAdmin && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Admin actions will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
