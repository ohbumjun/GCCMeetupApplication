import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users,
  AlertCircle,
  Eye
} from "lucide-react";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

interface AttendanceEntry {
  userId: string;
  status: AttendanceStatus;
  arrivalTime?: string;
  notes?: string;
}

interface PendingAttendanceRecord {
  id: string;
  roomAssignmentId: string;
  submittedByLeaderId: string;
  attendanceData: AttendanceEntry[];
  submittedDate: string;
  status: string;
  meetingDate: string;
  roomAssignment?: {
    roomNumber: string;
    roomName: string;
    locationId: string;
  };
  submittedByLeader?: {
    username: string;
    englishName?: string;
  };
}

interface User {
  id: string;
  username: string;
  englishName?: string;
  koreanName?: string;
}

const statusColors = {
  PRESENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  LATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ABSENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function PendingAttendancePage() {
  const { toast } = useToast();
  const [selectedPending, setSelectedPending] = useState<PendingAttendanceRecord | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [pendingToApprove, setPendingToApprove] = useState<string | null>(null);

  // Fetch all pending submissions
  const { data: pendingRecords, isLoading } = useQuery<PendingAttendanceRecord[]>({
    queryKey: ["/api/admin/pending-attendance"],
  });

  // Fetch all users for display
  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/admin/approve-attendance/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setShowApproveDialog(false);
      setPendingToApprove(null);
      toast({
        title: "Success",
        description: "Attendance approved and recorded",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve attendance",
        variant: "destructive",
      });
    },
  });

  const getUserById = (userId: string): User | null => {
    if (!allUsers || !Array.isArray(allUsers)) return null;
    return (allUsers as User[]).find(u => u.id === userId) || null;
  };

  const handleViewDetails = (pending: PendingAttendanceRecord) => {
    setSelectedPending(pending);
    setShowDetailsDialog(true);
  };

  const handleApprove = (id: string) => {
    setPendingToApprove(id);
    setShowApproveDialog(true);
  };

  const confirmApprove = () => {
    if (pendingToApprove) {
      approveMutation.mutate(pendingToApprove);
    }
  };

  const getPendingStats = (records: PendingAttendanceRecord[]) => {
    const pending = records.filter(r => r.status === "PENDING").length;
    const approved = records.filter(r => r.status === "APPROVED").length;
    const rejected = records.filter(r => r.status === "REJECTED").length;
    return { pending, approved, rejected, total: records.length };
  };

  const stats = pendingRecords ? getPendingStats(pendingRecords) : null;
  const pendingOnly = pendingRecords?.filter(r => r.status === "PENDING") || [];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header 
          title="Pending Attendance Approvals" 
          subtitle="Review and approve room leader attendance submissions." 
        />
        
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">{stats.pending}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Approved</p>
                      <p className="text-2xl font-bold">{stats.approved}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                      <p className="text-2xl font-bold">{stats.rejected}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pending Submissions */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : pendingOnly.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No pending submissions</p>
                  <p className="text-sm">All attendance submissions have been processed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingOnly.map((pending) => (
                    <div
                      key={pending.id}
                      className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                      data-testid={`pending-record-${pending.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {pending.roomAssignment 
                                ? `Room ${pending.roomAssignment.roomNumber} - ${pending.roomAssignment.roomName}`
                                : "Room Assignment"}
                            </h4>
                            <Badge variant="outline">
                              {pending.attendanceData.length} members
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Submitted {format(new Date(pending.submittedDate), "PPp")}
                            </span>
                            {pending.submittedByLeader && (
                              <span>
                                by {pending.submittedByLeader.englishName || pending.submittedByLeader.username}
                              </span>
                            )}
                          </div>
                          {pending.meetingDate && (
                            <p className="text-sm text-muted-foreground">
                              Meeting: {format(new Date(pending.meetingDate), "PPP")}
                            </p>
                          )}
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          {pending.status}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(pending)}
                          data-testid={`button-view-${pending.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(pending.id)}
                          data-testid={`button-approve-${pending.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* History - Processed Submissions */}
          {pendingRecords && pendingRecords.filter(r => r.status !== "PENDING").length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Processed Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingRecords
                    .filter(r => r.status !== "PENDING")
                    .map((pending) => (
                      <div
                        key={pending.id}
                        className="border rounded-lg p-3 text-sm"
                        data-testid={`processed-record-${pending.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {pending.roomAssignment 
                                ? `Room ${pending.roomAssignment.roomNumber}`
                                : "Room"}
                            </p>
                            <p className="text-muted-foreground">
                              {format(new Date(pending.submittedDate), "PP")}
                            </p>
                          </div>
                          <Badge
                            variant={pending.status === "APPROVED" ? "default" : "destructive"}
                          >
                            {pending.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
            <DialogDescription>
              {selectedPending?.roomAssignment && (
                <>
                  Room {selectedPending.roomAssignment.roomNumber} - {selectedPending.roomAssignment.roomName}
                  <br />
                  Meeting: {selectedPending.meetingDate && format(new Date(selectedPending.meetingDate), "PPP")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPending && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm">
                  <strong>Submitted by:</strong>{" "}
                  {selectedPending.submittedByLeader?.englishName || 
                   selectedPending.submittedByLeader?.username || 
                   "Unknown"}
                </p>
                <p className="text-sm">
                  <strong>Submitted at:</strong>{" "}
                  {format(new Date(selectedPending.submittedDate), "PPp")}
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Arrival Time</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPending.attendanceData.map((entry) => {
                    const member = getUserById(entry.userId);
                    return (
                      <TableRow key={entry.userId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {member?.englishName || member?.username || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{member?.username}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[entry.status]}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.arrivalTime || "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entry.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
              data-testid="button-close-details"
            >
              Close
            </Button>
            {selectedPending?.status === "PENDING" && (
              <Button
                onClick={() => {
                  setShowDetailsDialog(false);
                  handleApprove(selectedPending.id);
                }}
                data-testid="button-approve-from-details"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Attendance</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this attendance submission?
              This will create official attendance records and apply all business rules
              (room fees, late fees, cancellation penalties, etc.).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              data-testid="button-cancel-approve"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
