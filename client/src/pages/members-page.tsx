import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Search, UserPlus, Mail, Phone, ExternalLink } from "lucide-react";
import { useState } from "react";

export default function MembersPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  const { data: members, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const filteredMembers = (members || []).filter((member: any) => {
    const matchesSearch = 
      member.englishName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.koreanName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    const matchesLevel = levelFilter === "all" || member.membershipLevel === levelFilter;

    return matchesSearch && matchesStatus && matchesLevel;
  }) || [];

  const getMembershipLevelColor = (level: string) => {
    switch (level) {
      case "HONOR_IV": return "bg-yellow-500";
      case "HONOR_III": return "bg-orange-500";
      case "HONOR_II": return "bg-blue-500";
      case "HONOR_I": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getMembershipLevelText = (level: string) => {
    switch (level) {
      case "HONOR_IV": return "Honor IV";
      case "HONOR_III": return "Honor III";
      case "HONOR_II": return "Honor II";
      case "HONOR_I": return "Honor I";
      default: return level;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header title="Members" subtitle="Manage club members and their information." />
        
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-members"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-level-filter">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="HONOR_IV">Honor IV</SelectItem>
                  <SelectItem value="HONOR_III">Honor III</SelectItem>
                  <SelectItem value="HONOR_II">Honor II</SelectItem>
                  <SelectItem value="HONOR_I">Honor I</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {user?.role === "ADMIN" && (
              <Button data-testid="button-add-member">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            )}
          </div>

          {/* Members Table */}
          <Card>
            <CardHeader>
              <CardTitle>Club Members</CardTitle>
              <CardDescription>
                {filteredMembers.length} of {(members || []).length} members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Attendance Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member: any) => (
                        <TableRow key={member.id} data-testid={`member-row-${member.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{member.englishName || "N/A"}</div>
                              {member.koreanName && (
                                <div className="text-sm text-muted-foreground">{member.koreanName}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{member.username}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${getMembershipLevelColor(member.membershipLevel)}`}></div>
                              <span className="text-sm font-medium">
                                {getMembershipLevelText(member.membershipLevel)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {member.industry ? (
                              <Badge variant="outline">{member.industry}</Badge>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {member.attendanceRate ? `${member.attendanceRate}%` : "0%"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"}>
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {member.email && (
                                <Button variant="ghost" size="sm" data-testid={`button-email-${member.id}`}>
                                  <Mail className="h-4 w-4" />
                                </Button>
                              )}
                              {user?.role === "ADMIN" && member.phoneNumber && (
                                <Button variant="ghost" size="sm" data-testid={`button-phone-${member.id}`}>
                                  <Phone className="h-4 w-4" />
                                </Button>
                              )}
                              {member.linkedinUrl && (
                                <Button variant="ghost" size="sm" data-testid={`button-linkedin-${member.id}`}>
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" data-testid={`button-view-profile-${member.id}`}>
                              View Profile
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!isLoading && filteredMembers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No members found matching your criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
