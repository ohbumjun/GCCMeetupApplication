import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, subDays, addDays, startOfWeek, endOfWeek } from "date-fns";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  UserCheck, 
  UserX, 
  Clock,
  Plus,
  Eye
} from "lucide-react";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "NO_SHOW";

interface AttendanceRecord {
  id: string;
  userId: string;
  meetingDate: string;
  status: AttendanceStatus;
  notes?: string;
  user: {
    username: string;
    englishName?: string;
    koreanName?: string;
  };
}

interface User {
  id: string;
  username: string;
  englishName?: string;
  koreanName?: string;
  attendanceRate: string;
}

const statusColors = {
  PRESENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  LATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ABSENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  NO_SHOW: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

const statusLabels = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  NO_SHOW: "No Show"
};

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>("PRESENT");
  const [notes, setNotes] = useState("");

  const isAdmin = user?.role === "ADMIN";
  const dateString = format(selectedDate, "yyyy-MM-dd");

  // Fetch attendance for selected date
  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery({
    queryKey: ["/api/attendance", dateString],
    queryFn: () => fetch(`/api/attendance/${dateString}`).then(res => res.json()),
  });

  // Fetch all users for admin
  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: (data: { userId: string; meetingDate: string; status: AttendanceStatus; notes?: string }) =>
      apiRequest("POST", `/api/attendance`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsMarkingAttendance(false);
      setSelectedUser("");
      setNotes("");
      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    },
  });

  const handleMarkAttendance = () => {
    if (!selectedUser) return;
    
    markAttendanceMutation.mutate({
      userId: selectedUser,
      meetingDate: selectedDate.toISOString(),
      status: selectedStatus,
      notes: notes || undefined,
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(subDays(selectedDate, 7));
    } else {
      setSelectedDate(addDays(selectedDate, 7));
    }
  };

  const getAttendanceStats = (records: AttendanceRecord[]) => {
    const total = records.length;
    const present = records.filter(r => r.status === "PRESENT").length;
    const late = records.filter(r => r.status === "LATE").length;
    const absent = records.filter(r => r.status === "ABSENT").length;
    const noShow = records.filter(r => r.status === "NO_SHOW").length;
    
    return { total, present, late, absent, noShow };
  };

  const stats = attendanceRecords ? getAttendanceStats(attendanceRecords) : null;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header title="Attendance" subtitle="Track and manage member attendance records." />
        
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          <div className="flex items-center justify-between">
            {isAdmin && (
              <Dialog open={isMarkingAttendance} onOpenChange={setIsMarkingAttendance}>
                <DialogTrigger asChild>
                  <Button data-testid="button-mark-attendance">
                    <Plus className="h-4 w-4 mr-2" />
                    Mark Attendance
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Mark Attendance</DialogTitle>
                    <DialogDescription>
                      Mark attendance for {format(selectedDate, "PPP")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="member">Member</Label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger data-testid="select-member">
                          <SelectValue placeholder="Select a member" />
                        </SelectTrigger>
                        <SelectContent>
                          {allUsers && Array.isArray(allUsers) && (allUsers as User[]).map((user: User) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.englishName || user.username} ({user.username})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={selectedStatus} onValueChange={(value: AttendanceStatus) => setSelectedStatus(value)}>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESENT">Present</SelectItem>
                          <SelectItem value="LATE">Late</SelectItem>
                          <SelectItem value="ABSENT">Absent</SelectItem>
                          <SelectItem value="NO_SHOW">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes..."
                        data-testid="textarea-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsMarkingAttendance(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleMarkAttendance}
                      disabled={!selectedUser || markAttendanceMutation.isPending}
                      data-testid="button-submit-attendance"
                    >
                      {markAttendanceMutation.isPending ? "Marking..." : "Mark Attendance"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar View</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Date Navigation */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate('prev')}
                      data-testid="button-prev-week"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <h3 className="font-semibold text-lg">
                        Week of {format(startOfWeek(selectedDate), "MMM dd")} - {format(endOfWeek(selectedDate), "MMM dd, yyyy")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Selected: {format(selectedDate, "EEEE, MMMM dd, yyyy")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate('next')}
                      data-testid="button-next-week"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Attendance Stats */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-bold">{stats.total}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                          <p className="text-xs text-muted-foreground">Present</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
                          <p className="text-xs text-muted-foreground">Late</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <UserX className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                          <p className="text-xs text-muted-foreground">Absent</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <UserX className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="text-2xl font-bold text-gray-600">{stats.noShow}</p>
                          <p className="text-xs text-muted-foreground">No Show</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Attendance Records */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarIcon className="h-5 w-5" />
                    <span>Attendance Records - {format(selectedDate, "PPP")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center space-x-3">
                            <Skeleton className="h-10 w-10 rounded" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                          <Skeleton className="h-6 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : attendanceRecords && attendanceRecords.length > 0 ? (
                    <div className="space-y-2">
                      {attendanceRecords.map((record: AttendanceRecord) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 border rounded hover:bg-muted/50"
                          data-testid={`attendance-record-${record.id}`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {(record.user.englishName || record.user.username).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {record.user.englishName || record.user.username}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                @{record.user.username}
                                {record.user.koreanName && ` • ${record.user.koreanName}`}
                              </p>
                              {record.notes && (
                                <p className="text-xs text-muted-foreground italic mt-1">
                                  {record.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={statusColors[record.status]}>
                            {statusLabels[record.status]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        No attendance records for {format(selectedDate, "PPP")}
                      </p>
                      {isAdmin && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Click "Mark Attendance" to add records
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Calendar View</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      className="rounded-md border"
                      data-testid="attendance-calendar"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}