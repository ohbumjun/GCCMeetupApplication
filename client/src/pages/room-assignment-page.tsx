import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calendar as CalendarIcon, 
  Users, 
  DoorOpen,
  Plus,
  Eye,
  Clock,
  MapPin,
  Crown
} from "lucide-react";

interface RoomAssignment {
  id: string;
  meetingDate: string;
  roomNumber: string;
  roomName: string;
  assignedMembers: string[];
  leaderId?: string;
  createdByAdminId?: string;
  createdDate: string;
  locationId?: string;
}

interface User {
  id: string;
  username: string;
  englishName?: string;
  koreanName?: string;
}

export default function RoomAssignmentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomName, setRoomName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Auto-assign states
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [autoAssignLocationId, setAutoAssignLocationId] = useState("");
  const [numberOfRooms, setNumberOfRooms] = useState("3");
  const [weeksToAvoid, setWeeksToAvoid] = useState("4");
  const [autoAssignPreview, setAutoAssignPreview] = useState<{
    meetingDate: string;
    locationId: string;
    rooms: any[];
  } | null>(null);

  const isAdmin = user?.role === "ADMIN";
  const dateString = format(selectedDate, "yyyy-MM-dd");

  // Fetch room assignments for selected date
  const { data: roomAssignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/room-assignments", dateString],
    queryFn: () => fetch(`/api/room-assignments/${dateString}`).then(res => res.json()),
  });

  // Fetch assignment history
  const { data: assignmentHistory } = useQuery({
    queryKey: ["/api/room-assignments/history"],
  });

  // Fetch all users for assignment
  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  // Fetch active locations
  const { data: activeLocations } = useQuery({
    queryKey: ["/api/locations/active"],
    enabled: isAdmin,
  });

  // Create room assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: (data: { meetingDate: string; roomNumber: string; roomName: string; assignedMembers: string[] }) =>
      apiRequest("POST", `/api/room-assignments`, {
        ...data,
        meetingDate: new Date(data.meetingDate).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-assignments"] });
      setIsCreatingAssignment(false);
      setRoomNumber("");
      setRoomName("");
      setSelectedMembers([]);
      toast({
        title: "Success",
        description: "Room assignment created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create room assignment",
        variant: "destructive",
      });
    },
  });

  // Auto-assign mutation
  const autoAssignMutation = useMutation({
    mutationFn: (data: { meetingDate: string; locationId: string; numberOfRooms: number; weeksToAvoid: number }) =>
      apiRequest("POST", `/api/room-assignments/auto-assign`, data),
    onSuccess: (result: any) => {
      setAutoAssignPreview(result);
      toast({
        title: "Preview Generated",
        description: `${result.rooms.length} rooms auto-assigned. Review and confirm to save.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Auto-Assign Failed",
        description: error.message || "Failed to auto-assign rooms",
        variant: "destructive",
      });
    },
  });

  // Confirm auto-assign mutation (saves preview to DB using batch endpoint)
  const confirmAutoAssignMutation = useMutation({
    mutationFn: async () => {
      if (!autoAssignPreview) return;
      
      return apiRequest("POST", `/api/room-assignments/batch`, {
        meetingDate: autoAssignPreview.meetingDate,
        locationId: autoAssignPreview.locationId,
        rooms: autoAssignPreview.rooms,
      });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-assignments"] });
      setIsAutoAssigning(false);
      setAutoAssignPreview(null);
      setAutoAssignLocationId("");
      setNumberOfRooms("3");
      setWeeksToAvoid("4");
      
      if (result.errors && result.errors.length > 0) {
        toast({
          title: "Partial Success",
          description: `${result.created.length} rooms created, ${result.errors.length} failed. Check console for details.`,
          variant: "warning",
        });
        console.error("Failed room assignments:", result.errors);
      } else {
        toast({
          title: "Success",
          description: `${result.created.length} room assignments saved successfully`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save room assignments",
        variant: "destructive",
      });
    },
  });

  const handleCreateAssignment = () => {
    if (!roomNumber || !roomName) {
      toast({
        title: "Error",
        description: "Please fill in room number and name",
        variant: "destructive",
      });
      return;
    }
    
    createAssignmentMutation.mutate({
      meetingDate: selectedDate.toISOString(),
      roomNumber,
      roomName,
      assignedMembers: selectedMembers,
    });
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAutoAssign = () => {
    if (!autoAssignLocationId) {
      toast({
        title: "Error",
        description: "Please select a location",
        variant: "destructive",
      });
      return;
    }

    autoAssignMutation.mutate({
      meetingDate: selectedDate.toISOString(),
      locationId: autoAssignLocationId,
      numberOfRooms: parseInt(numberOfRooms),
      weeksToAvoid: parseInt(weeksToAvoid),
    });
  };

  const handleConfirmAutoAssign = () => {
    confirmAutoAssignMutation.mutate();
  };

  const handleCancelAutoAssign = () => {
    setAutoAssignPreview(null);
  };

  const getUserById = (userId: string) => {
    if (!allUsers || !Array.isArray(allUsers)) return null;
    return (allUsers as User[]).find(u => u.id === userId);
  };

  const getRoomStats = (assignments: RoomAssignment[]) => {
    const totalRooms = assignments.length;
    const totalMembers = assignments.reduce((sum, room) => sum + room.assignedMembers.length, 0);
    const avgMembersPerRoom = totalRooms > 0 ? Math.round(totalMembers / totalRooms) : 0;
    
    return { totalRooms, totalMembers, avgMembersPerRoom };
  };

  const stats = roomAssignments ? getRoomStats(roomAssignments) : null;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header title="Room Assignment" subtitle="Manage room assignments for meetups." />
        
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          <div className="flex items-center justify-between">
            {isAdmin && (
              <div className="flex gap-2 flex-wrap">
                <Dialog open={isCreatingAssignment} onOpenChange={setIsCreatingAssignment}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-assignment">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Room Assignment
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Room Assignment</DialogTitle>
                    <DialogDescription>
                      Create room assignment for {format(selectedDate, "PPP")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="roomNumber">Room Number</Label>
                        <Input
                          id="roomNumber"
                          value={roomNumber}
                          onChange={(e) => setRoomNumber(e.target.value)}
                          placeholder="A, B, C..."
                          data-testid="input-room-number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roomName">Room Name</Label>
                        <Input
                          id="roomName"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          placeholder="Discussion Room A"
                          data-testid="input-room-name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign Members ({selectedMembers.length} selected)</Label>
                      <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                        {allUsers && Array.isArray(allUsers) && (allUsers as User[]).map((user: User) => (
                          <div
                            key={user.id}
                            className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                              selectedMembers.includes(user.id) 
                                ? "bg-primary/10 border-primary" 
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => handleMemberToggle(user.id)}
                            data-testid={`member-option-${user.id}`}
                          >
                            <div className={`w-4 h-4 border rounded ${
                              selectedMembers.includes(user.id) 
                                ? "bg-primary border-primary" 
                                : "border-muted-foreground"
                            }`}>
                              {selectedMembers.includes(user.id) && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-sm"></div>
                                </div>
                              )}
                            </div>
                            <span className="text-sm">
                              {user.englishName || user.username} ({user.username})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreatingAssignment(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateAssignment}
                      disabled={createAssignmentMutation.isPending}
                      data-testid="button-submit-assignment"
                    >
                      {createAssignmentMutation.isPending ? "Creating..." : "Create Assignment"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAutoAssigning} onOpenChange={setIsAutoAssigning}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-auto-assign">
                    <Users className="h-4 w-4 mr-2" />
                    Auto-Assign Rooms
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Auto-Assign Rooms</DialogTitle>
                    <DialogDescription>
                      Automatically assign members to rooms based on voting and history
                    </DialogDescription>
                  </DialogHeader>
                  
                  {!autoAssignPreview ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Select value={autoAssignLocationId} onValueChange={setAutoAssignLocationId}>
                          <SelectTrigger id="location" data-testid="select-location">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeLocations && Array.isArray(activeLocations) && activeLocations.map((loc: any) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="numberOfRooms">Number of Rooms</Label>
                          <Input
                            id="numberOfRooms"
                            type="number"
                            min="1"
                            max="20"
                            value={numberOfRooms}
                            onChange={(e) => setNumberOfRooms(e.target.value)}
                            data-testid="input-number-of-rooms"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weeksToAvoid">Weeks to Avoid (Pairing History)</Label>
                          <Input
                            id="weeksToAvoid"
                            type="number"
                            min="0"
                            max="12"
                            value={weeksToAvoid}
                            onChange={(e) => setWeeksToAvoid(e.target.value)}
                            data-testid="input-weeks-to-avoid"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <p className="text-sm text-green-800">
                          Preview: {autoAssignPreview.rooms.length} rooms generated. Review and confirm to save.
                        </p>
                      </div>
                      
                      {autoAssignPreview.rooms.map((room: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">Room {room.roomNumber} - {room.roomName}</h4>
                            <Badge 
                              variant="default" 
                              className={room.leaderId ? "bg-yellow-500 hover:bg-yellow-600" : "bg-muted text-muted-foreground"}
                            >
                              <Crown className="h-3 w-3 mr-1" />
                              {room.leaderId 
                                ? `Leader: ${getUserById(room.leaderId)?.englishName || getUserById(room.leaderId)?.username || room.leaderId?.slice(0, 8) || 'Unknown'}`
                                : "No leader assigned"
                              }
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {room.assignedMembers.map((memberId: string) => {
                              const member = getUserById(memberId);
                              const isLeader = memberId === room.leaderId;
                              return (
                                <Badge 
                                  key={memberId} 
                                  variant={isLeader ? "default" : "outline"}
                                  className={isLeader ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                                >
                                  {isLeader && <Crown className="h-3 w-3 mr-1" />}
                                  {member ? (member.englishName || member.username) : memberId.slice(0, 8)}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <DialogFooter>
                    {!autoAssignPreview ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setIsAutoAssigning(false)}
                          data-testid="button-cancel-auto-assign"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAutoAssign}
                          disabled={autoAssignMutation.isPending}
                          data-testid="button-generate-preview"
                        >
                          {autoAssignMutation.isPending ? "Generating..." : "Generate Preview"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleCancelAutoAssign}
                          data-testid="button-cancel-preview"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleConfirmAutoAssign}
                          disabled={confirmAutoAssignMutation.isPending}
                          data-testid="button-confirm-auto-assign"
                        >
                          {confirmAutoAssignMutation.isPending ? "Saving..." : "Confirm & Save"}
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            )}
          </div>

          <Tabs defaultValue="current" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="current" data-testid="tab-current">Current Assignments</TabsTrigger>
              <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar View</TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">Assignment History</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-6">
              {/* Date Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <h3 className="font-semibold text-lg">
                        Room Assignments for {format(selectedDate, "EEEE, MMMM dd, yyyy")}
                      </h3>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Room Stats */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <DoorOpen className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-bold">{stats.totalRooms}</p>
                          <p className="text-xs text-muted-foreground">Total Rooms</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold text-blue-600">{stats.totalMembers}</p>
                          <p className="text-xs text-muted-foreground">Assigned Members</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-green-600">{stats.avgMembersPerRoom}</p>
                          <p className="text-xs text-muted-foreground">Avg per Room</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Room Assignments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DoorOpen className="h-5 w-5" />
                    <span>Room Assignments</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {assignmentsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-5 w-16" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <div className="flex flex-wrap gap-2">
                              {[...Array(4)].map((_, j) => (
                                <Skeleton key={j} className="h-6 w-20" />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : roomAssignments && roomAssignments.length > 0 ? (
                    <div className="space-y-4">
                      {roomAssignments.map((assignment: RoomAssignment) => (
                        <div
                          key={assignment.id}
                          className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                          data-testid={`room-assignment-${assignment.id}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-lg">
                              Room {assignment.roomNumber} - {assignment.roomName}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="default" 
                                className={assignment.leaderId ? "bg-yellow-500 hover:bg-yellow-600" : "bg-muted text-muted-foreground"}
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                {assignment.leaderId 
                                  ? `Leader: ${getUserById(assignment.leaderId)?.englishName || getUserById(assignment.leaderId)?.username || 'Unknown'}`
                                  : "No leader assigned"
                                }
                              </Badge>
                              <Badge variant="secondary">
                                {assignment.assignedMembers.length} members
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              <Clock className="inline h-4 w-4 mr-1" />
                              Created: {format(new Date(assignment.createdDate), "PPp")}
                            </p>
                            {assignment.assignedMembers.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">Assigned Members:</p>
                                <div className="flex flex-wrap gap-2">
                                  {assignment.assignedMembers.map((memberId) => {
                                    const member = getUserById(memberId);
                                    const isLeader = memberId === assignment.leaderId;
                                    return (
                                      <Badge 
                                        key={memberId} 
                                        variant={isLeader ? "default" : "outline"}
                                        className={isLeader ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                                      >
                                        {isLeader && <Crown className="h-3 w-3 mr-1" />}
                                        {member ? (member.englishName || member.username) : `User ${memberId.slice(0, 8)}`}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        No room assignments for {format(selectedDate, "PPP")}
                      </p>
                      {isAdmin && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Click "Create Room Assignment" to add assignments
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
                  <CardTitle>Select Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      className="rounded-md border"
                      data-testid="room-assignment-calendar"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assignment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {assignmentHistory && Array.isArray(assignmentHistory) && assignmentHistory.length > 0 ? (
                    <div className="space-y-3">
                      {(assignmentHistory as RoomAssignment[]).slice(0, 10).map((assignment: RoomAssignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-3 border rounded"
                          data-testid={`history-assignment-${assignment.id}`}
                        >
                          <div>
                            <p className="font-medium">
                              Room {assignment.roomNumber} - {assignment.roomName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(assignment.meetingDate), "PPP")} • {assignment.assignedMembers.length} members
                            </p>
                          </div>
                          <Badge variant="outline">
                            {format(new Date(assignment.createdDate), "MMM dd")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No assignment history available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}