import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calendar as CalendarIcon, 
  Users, 
  UserCheck, 
  CheckCircle2,
  AlertCircle,
  Trash2
} from "lucide-react";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

interface AttendanceEntry {
  userId: string;
  status: AttendanceStatus;
  arrivalTime?: string;
  notes?: string;
}

interface User {
  id: string;
  username: string;
  englishName?: string;
  koreanName?: string;
}

interface RoomAssignment {
  id: string;
  roomNumber: string;
  roomName: string;
  assignedMembers: string[];
  members: User[];
  leaderId: string;
  meetingDate: string;
  locationId: string;
}

interface PendingAttendance {
  id: string;
  roomAssignmentId: string;
  attendanceData: AttendanceEntry[];
  submittedAt: string;
  status: string;
}

const statusColors = {
  PRESENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  LATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ABSENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function LeaderAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRoom, setSelectedRoom] = useState<RoomAssignment | null>(null);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceEntry>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingToDelete, setPendingToDelete] = useState<string | null>(null);

  const dateString = format(selectedDate, "yyyy-MM-dd");

  // Fetch rooms where current user is leader (includes member details)
  const { data: myRooms, isLoading: roomsLoading } = useQuery<RoomAssignment[]>({
    queryKey: ["/api/room-assignments/my-rooms", dateString],
    queryFn: () => fetch(`/api/room-assignments/my-rooms/${dateString}`).then(res => res.json()),
  });

  // Fetch pending submissions
  const { data: pendingSubmissions, isLoading: pendingLoading } = useQuery<PendingAttendance[]>({
    queryKey: ["/api/leader-attendance"],
  });

  // Submit attendance mutation
  const submitAttendanceMutation = useMutation({
    mutationFn: (data: { roomAssignmentId: string; attendanceData: AttendanceEntry[] }) =>
      apiRequest("POST", `/api/leader-attendance`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leader-attendance"] });
      setShowConfirmDialog(false);
      setSelectedRoom(null);
      setAttendanceData({});
      toast({
        title: "Success",
        description: "Attendance submitted for admin review",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit attendance",
        variant: "destructive",
      });
    },
  });

  // Delete pending submission mutation
  const deletePendingMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/leader-attendance/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leader-attendance"] });
      setDeleteDialogOpen(false);
      setPendingToDelete(null);
      toast({
        title: "Success",
        description: "Submission deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete submission",
        variant: "destructive",
      });
    },
  });

  const getUserById = (userId: string): User | null => {
    if (!selectedRoom?.members) return null;
    return selectedRoom.members.find(u => u.id === userId) || null;
  };

  const handleStatusChange = (userId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        userId,
        status,
        arrivalTime: status === "LATE" ? prev[userId]?.arrivalTime || "" : undefined,
      },
    }));
  };

  const handleArrivalTimeChange = (userId: string, time: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        userId,
        status: prev[userId]?.status || "LATE",
        arrivalTime: time,
      },
    }));
  };

  const handleNotesChange = (userId: string, notes: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        userId,
        status: prev[userId]?.status || "PRESENT",
        notes,
      },
    }));
  };

  const handleSubmit = () => {
    if (!selectedRoom) return;

    // Convert to array and validate
    const entries = Object.values(attendanceData);
    
    // Check if all members have status
    const allMembersMarked = selectedRoom.assignedMembers.every(memberId => 
      attendanceData[memberId]?.status
    );

    if (!allMembersMarked) {
      toast({
        title: "Incomplete Data",
        description: "Please mark attendance for all members",
        variant: "destructive",
      });
      return;
    }

    // Validate late entries have arrival time
    const lateEntries = entries.filter(e => e.status === "LATE");
    const allLateHaveTime = lateEntries.every(e => e.arrivalTime && e.arrivalTime.trim());

    if (!allLateHaveTime) {
      toast({
        title: "Missing Arrival Time",
        description: "Please provide arrival time for all late members",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSubmit = () => {
    if (!selectedRoom) return;

    const entries = Object.values(attendanceData);
    submitAttendanceMutation.mutate({
      roomAssignmentId: selectedRoom.id,
      attendanceData: entries,
    });
  };

  const handleSelectRoom = (room: RoomAssignment) => {
    setSelectedRoom(room);
    // Initialize attendance data for all members
    const initialData: Record<string, AttendanceEntry> = {};
    room.assignedMembers.forEach(memberId => {
      initialData[memberId] = {
        userId: memberId,
        status: "PRESENT",
      };
    });
    setAttendanceData(initialData);
  };

  const handleDeletePending = (id: string) => {
    setPendingToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (pendingToDelete) {
      deletePendingMutation.mutate(pendingToDelete);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header 
          title="Leader Attendance" 
          subtitle="Submit attendance for your room members." 
        />
        
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select Meeting Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                data-testid="calendar-attendance"
              />
            </CardContent>
          </Card>

          {/* My Rooms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Rooms for {format(selectedDate, "PPP")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {roomsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : !myRooms || myRooms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>You are not assigned as a room leader for this date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRooms.map((room: RoomAssignment) => (
                    <div
                      key={room.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedRoom?.id === room.id 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => handleSelectRoom(room)}
                      data-testid={`room-card-${room.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">
                            Room {room.roomNumber} - {room.roomName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {room.assignedMembers.length} members
                          </p>
                        </div>
                        <Badge variant="outline">Leader</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Form */}
          {selectedRoom && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Mark Attendance - Room {selectedRoom.roomNumber}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedRoom.assignedMembers.map((memberId) => {
                    const member = getUserById(memberId);
                    const entry = attendanceData[memberId];
                    
                    return (
                      <div
                        key={memberId}
                        className="border rounded-lg p-4 space-y-3"
                        data-testid={`member-attendance-${memberId}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {member?.englishName || member?.username || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{member?.username}
                            </p>
                          </div>
                          <Badge className={statusColors[entry?.status || "PRESENT"]}>
                            {entry?.status || "PRESENT"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                              value={entry?.status || "PRESENT"}
                              onValueChange={(value: AttendanceStatus) => 
                                handleStatusChange(memberId, value)
                              }
                            >
                              <SelectTrigger data-testid={`select-status-${memberId}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PRESENT">Present</SelectItem>
                                <SelectItem value="LATE">Late</SelectItem>
                                <SelectItem value="ABSENT">Absent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {entry?.status === "LATE" && (
                            <div className="space-y-2">
                              <Label>Arrival Time (HH:MM)</Label>
                              <Input
                                type="time"
                                value={entry.arrivalTime || ""}
                                onChange={(e) => handleArrivalTimeChange(memberId, e.target.value)}
                                data-testid={`input-arrival-${memberId}`}
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Notes (optional)</Label>
                          <Textarea
                            value={entry?.notes || ""}
                            onChange={(e) => handleNotesChange(memberId, e.target.value)}
                            placeholder="Additional notes..."
                            rows={2}
                            data-testid={`textarea-notes-${memberId}`}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    onClick={handleSubmit}
                    className="w-full"
                    size="lg"
                    data-testid="button-submit-attendance"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Submit for Admin Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Submissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Pending Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !pendingSubmissions || pendingSubmissions.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  No pending submissions
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingSubmissions.map((pending) => (
                    <div
                      key={pending.id}
                      className="border rounded-lg p-4"
                      data-testid={`pending-${pending.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            Submitted {format(new Date(pending.submittedAt), "PPp")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {pending.attendanceData.length} members
                          </p>
                          <Badge 
                            className="mt-2"
                            variant={pending.status === "PENDING" ? "outline" : "secondary"}
                          >
                            {pending.status}
                          </Badge>
                        </div>
                        {pending.status === "PENDING" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePending(pending.id)}
                            data-testid={`button-delete-${pending.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this attendance for admin review?
              You can cancel it later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              data-testid="button-cancel-confirm"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSubmit}
              disabled={submitAttendanceMutation.isPending}
              data-testid="button-confirm-submit"
            >
              {submitAttendanceMutation.isPending ? "Submitting..." : "Confirm Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this submission?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              No, Keep It
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePendingMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deletePendingMutation.isPending ? "Cancelling..." : "Yes, Cancel It"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
