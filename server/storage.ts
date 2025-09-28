import { 
  users, votes, voteResponses, attendanceRecords, roomAssignments, 
  meetingTopics, suggestions,
  type User, type InsertUser, type Vote, type InsertVote,
  type VoteResponse, type InsertVoteResponse, type AttendanceRecord,
  type InsertAttendanceRecord, type RoomAssignment, type InsertRoomAssignment,
  type MeetingTopic, type InsertMeetingTopic, type Suggestion, type InsertSuggestion
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, isNotNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Vote methods
  createVote(vote: InsertVote): Promise<Vote>;
  getActiveVotes(): Promise<Vote[]>;
  getVoteById(id: string): Promise<Vote | undefined>;
  updateVoteStatus(id: string, status: "ACTIVE" | "CLOSED"): Promise<void>;
  getVoteHistory(): Promise<Vote[]>;
  
  // Vote response methods
  submitVoteResponse(response: InsertVoteResponse): Promise<VoteResponse>;
  getVoteResponses(voteId: string): Promise<VoteResponse[]>;
  getUserVoteResponse(voteId: string, userId: string): Promise<VoteResponse | undefined>;
  
  // Attendance methods
  createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  getAttendanceByDate(date: Date): Promise<AttendanceRecord[]>;
  updateAttendanceRecord(id: string, updates: Partial<InsertAttendanceRecord>): Promise<AttendanceRecord>;
  getUserAttendanceHistory(userId: string): Promise<AttendanceRecord[]>;
  calculateAttendanceRate(userId: string): Promise<number>;
  
  // Room assignment methods
  createRoomAssignment(assignment: InsertRoomAssignment): Promise<RoomAssignment>;
  getRoomAssignmentsByDate(date: Date): Promise<RoomAssignment[]>;
  getRoomAssignmentHistory(): Promise<RoomAssignment[]>;
  
  // Meeting topic methods
  createMeetingTopic(topic: InsertMeetingTopic): Promise<MeetingTopic>;
  getMeetingTopics(): Promise<MeetingTopic[]>;
  getMeetingTopicByDate(date: Date): Promise<MeetingTopic | undefined>;
  
  // Suggestion methods
  createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion>;
  getAllSuggestions(): Promise<Suggestion[]>;
  updateSuggestionStatus(id: string, status: "PENDING" | "REVIEWED"): Promise<void>;
  
  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalMembers: number;
    weeklyAttendanceRate: number;
    activeVotesCount: number;
    consecutiveAbsentees: number;
  }>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedDate: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, mustChangePassword: false, updatedDate: new Date() })
      .where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdDate));
  }

  async createVote(vote: InsertVote): Promise<Vote> {
    const [newVote] = await db
      .insert(votes)
      .values(vote)
      .returning();
    return newVote;
  }

  async getActiveVotes(): Promise<Vote[]> {
    return await db
      .select()
      .from(votes)
      .where(eq(votes.status, "ACTIVE"))
      .orderBy(desc(votes.createdDate));
  }

  async getVoteById(id: string): Promise<Vote | undefined> {
    const [vote] = await db.select().from(votes).where(eq(votes.id, id));
    return vote || undefined;
  }

  async updateVoteStatus(id: string, status: "ACTIVE" | "CLOSED"): Promise<void> {
    await db
      .update(votes)
      .set({ status })
      .where(eq(votes.id, id));
  }

  async getVoteHistory(): Promise<Vote[]> {
    return await db
      .select()
      .from(votes)
      .orderBy(desc(votes.createdDate))
      .limit(50);
  }

  async submitVoteResponse(response: InsertVoteResponse): Promise<VoteResponse> {
    const [newResponse] = await db
      .insert(voteResponses)
      .values(response)
      .returning();
    return newResponse;
  }

  async getVoteResponses(voteId: string): Promise<VoteResponse[]> {
    return await db
      .select()
      .from(voteResponses)
      .where(eq(voteResponses.voteId, voteId));
  }

  async getUserVoteResponse(voteId: string, userId: string): Promise<VoteResponse | undefined> {
    const [response] = await db
      .select()
      .from(voteResponses)
      .where(and(
        eq(voteResponses.voteId, voteId),
        eq(voteResponses.userId, userId)
      ));
    return response || undefined;
  }

  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [newRecord] = await db
      .insert(attendanceRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  async getAttendanceByDate(date: Date): Promise<any[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    return await db
      .select({
        id: attendanceRecords.id,
        userId: attendanceRecords.userId,
        meetingDate: attendanceRecords.meetingDate,
        status: attendanceRecords.status,
        notes: attendanceRecords.notes,
        updatedByAdminId: attendanceRecords.updatedByAdminId,
        createdDate: attendanceRecords.createdDate,
        user: {
          username: users.username,
          englishName: users.englishName,
          koreanName: users.koreanName,
        }
      })
      .from(attendanceRecords)
      .leftJoin(users, eq(attendanceRecords.userId, users.id))
      .where(and(
        gte(attendanceRecords.meetingDate, startOfDay),
        lte(attendanceRecords.meetingDate, endOfDay)
      ));
  }

  async updateAttendanceRecord(id: string, updates: Partial<InsertAttendanceRecord>): Promise<AttendanceRecord> {
    const [record] = await db
      .update(attendanceRecords)
      .set(updates)
      .where(eq(attendanceRecords.id, id))
      .returning();
    return record;
  }

  async getUserAttendanceHistory(userId: string): Promise<AttendanceRecord[]> {
    return await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.userId, userId))
      .orderBy(desc(attendanceRecords.meetingDate));
  }

  async calculateAttendanceRate(userId: string): Promise<number> {
    const records = await this.getUserAttendanceHistory(userId);
    if (records.length === 0) return 0;
    
    const presentRecords = records.filter(r => r.status === "PRESENT");
    return (presentRecords.length / records.length) * 100;
  }

  async createRoomAssignment(assignment: InsertRoomAssignment): Promise<RoomAssignment> {
    const [newAssignment] = await db
      .insert(roomAssignments)
      .values({
        ...assignment,
        assignedMembers: assignment.assignedMembers || []
      })
      .returning();
    return newAssignment;
  }

  async getRoomAssignmentsByDate(date: Date): Promise<RoomAssignment[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    return await db
      .select()
      .from(roomAssignments)
      .where(and(
        gte(roomAssignments.meetingDate, startOfDay),
        lte(roomAssignments.meetingDate, endOfDay)
      ));
  }

  async getRoomAssignmentHistory(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id, 
          meeting_date, 
          room_number as "roomNumber", 
          room_name as "roomName", 
          assigned_members as "assignedMembers", 
          created_date, 
          created_by_admin_id as "createdByAdminId"
        FROM room_assignments 
        WHERE meeting_date IS NOT NULL
        ORDER BY meeting_date DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error in getRoomAssignmentHistory:', error);
      return [];
    }
  }

  async createMeetingTopic(topic: InsertMeetingTopic): Promise<MeetingTopic> {
    const [newTopic] = await db
      .insert(meetingTopics)
      .values(topic)
      .returning();
    return newTopic;
  }

  async getMeetingTopics(): Promise<MeetingTopic[]> {
    return await db
      .select()
      .from(meetingTopics)
      .orderBy(desc(meetingTopics.meetingDate));
  }

  async getMeetingTopicByDate(date: Date): Promise<MeetingTopic | undefined> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    const [topic] = await db
      .select()
      .from(meetingTopics)
      .where(and(
        gte(meetingTopics.meetingDate, startOfDay),
        lte(meetingTopics.meetingDate, endOfDay)
      ));
    return topic || undefined;
  }

  async createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion> {
    const [newSuggestion] = await db
      .insert(suggestions)
      .values(suggestion)
      .returning();
    return newSuggestion;
  }

  async getAllSuggestions(): Promise<Suggestion[]> {
    return await db
      .select()
      .from(suggestions)
      .orderBy(desc(suggestions.createdDate));
  }

  async updateSuggestionStatus(id: string, status: "PENDING" | "REVIEWED"): Promise<void> {
    await db
      .update(suggestions)
      .set({ status })
      .where(eq(suggestions.id, id));
  }

  async getDashboardStats(): Promise<{
    totalMembers: number;
    weeklyAttendanceRate: number;
    activeVotesCount: number;
    consecutiveAbsentees: number;
  }> {
    // Get total members
    const [memberCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, "ACTIVE"));

    // Get active votes count
    const [votesCount] = await db
      .select({ count: count() })
      .from(votes)
      .where(eq(votes.status, "ACTIVE"));

    // Get weekly attendance rate (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyAttendance = await db
      .select()
      .from(attendanceRecords)
      .where(gte(attendanceRecords.meetingDate, weekAgo));

    const weeklyRate = weeklyAttendance.length > 0 
      ? (weeklyAttendance.filter(r => r.status === "PRESENT").length / weeklyAttendance.length) * 100
      : 0;

    // Get consecutive absentees (users with 3+ consecutive absences)
    const allUsers = await db.select().from(users).where(eq(users.status, "ACTIVE"));
    const consecutiveAbsentees = allUsers.filter(user => (user.consecutiveAbsences || 0) >= 3).length;

    return {
      totalMembers: memberCount.count,
      weeklyAttendanceRate: Math.round(weeklyRate),
      activeVotesCount: votesCount.count,
      consecutiveAbsentees,
    };
  }
}

export const storage = new DatabaseStorage();
