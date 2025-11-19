import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  MapPin,
  Plus,
  Edit,
  Trash2,
  Clock
} from "lucide-react";

interface Location {
  id: string;
  name: string;
  address: string;
  timezone: string;
  defaultMeetingDay: number;
  defaultMeetingTime: string;
  isActive: boolean;
  createdDate: string;
  updatedDate?: string;
}

const locationFormSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  address: z.string().min(1, "Address is required"),
  timezone: z.string().default("Asia/Seoul"),
  defaultMeetingDay: z.number().min(0).max(6),
  defaultMeetingTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
});

type LocationFormData = z.infer<typeof locationFormSchema>;

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function LocationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: "",
      address: "",
      timezone: "Asia/Seoul",
      defaultMeetingDay: 0,
      defaultMeetingTime: "10:00",
    },
  });

  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const createMutation = useMutation({
    mutationFn: (data: LocationFormData) =>
      apiRequest("POST", "/api/locations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Location created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create location",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LocationFormData> }) =>
      apiRequest("PATCH", `/api/locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setEditingLocation(null);
      form.reset();
      toast({
        title: "Success",
        description: "Location updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/locations/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({
        title: "Success",
        description: "Location deactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate location",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LocationFormData) => {
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    form.reset({
      name: location.name,
      address: location.address,
      timezone: location.timezone,
      defaultMeetingDay: location.defaultMeetingDay,
      defaultMeetingTime: location.defaultMeetingTime,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to deactivate this location?")) {
      deleteMutation.mutate(id);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">You do not have permission to view this page.</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Location Management</h1>
                <p className="text-muted-foreground mt-1">Manage meeting locations for the club</p>
              </div>
              <Dialog open={isCreateDialogOpen || editingLocation !== null} onOpenChange={(open) => {
                if (!open) {
                  setIsCreateDialogOpen(false);
                  setEditingLocation(null);
                  form.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    data-testid="button-create-location"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingLocation ? "Edit Location" : "Create New Location"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingLocation 
                        ? "Update the location details below" 
                        : "Add a new meeting location to the system"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., Sinchon HQ"
                                data-testid="input-location-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., Seoul, Mapo-gu, Sinchon-dong"
                                data-testid="input-location-address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="defaultMeetingDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Meeting Day</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-meeting-day">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {DAYS_OF_WEEK.map((day) => (
                                  <SelectItem key={day.value} value={day.value.toString()}>
                                    {day.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="defaultMeetingTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Meeting Time</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="10:00"
                                data-testid="input-meeting-time"
                              />
                            </FormControl>
                            <FormDescription>
                              Format: HH:MM (24-hour)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsCreateDialogOpen(false);
                            setEditingLocation(null);
                            form.reset();
                          }}
                          data-testid="button-cancel"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createMutation.isPending || updateMutation.isPending}
                          data-testid="button-save-location"
                        >
                          {editingLocation ? "Update" : "Create"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {locations?.map((location) => (
                  <Card 
                    key={location.id} 
                    className={!location.isActive ? "opacity-60" : ""}
                    data-testid={`card-location-${location.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary" />
                          <CardTitle className="text-lg" data-testid={`text-location-name-${location.id}`}>
                            {location.name}
                          </CardTitle>
                        </div>
                        <Badge variant={location.isActive ? "default" : "secondary"}>
                          {location.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground">{location.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {DAYS_OF_WEEK.find(d => d.value === location.defaultMeetingDay)?.label} at {location.defaultMeetingTime}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(location)}
                          data-testid={`button-edit-${location.id}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(location.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${location.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Deactivate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoading && locations?.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Locations Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by creating your first meeting location
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Location
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
