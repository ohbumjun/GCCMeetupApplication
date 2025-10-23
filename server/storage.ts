import { 
  users, votes, voteResponses, attendanceRecords, roomAssignments, 
  meetingTopics, suggestions, financialAccounts, financialTransactions,
  type User, type InsertUser, type Vote, type InsertVote,
  type VoteResponse, type InsertVoteResponse, type AttendanceRecord,
  type InsertAttendanceRecord, type RoomAssignment, type InsertRoomAssignment,
  type MeetingTopic, type InsertMeetingTopic, type Suggestion, type InsertSuggestion,
  type FinancialAccount, type InsertFinancialAccount, type FinancialTransaction,
  type InsertFinancialTransaction
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

  // Rankings methods
  getMemberRankings(): Promise<Array<{
    userId: string;
    username: string;
    koreanName: string;
    englishName: string;
    attendanceRate: string;
    totalAttendance: number;
    voteParticipation: number;
    activityScore: number;
    rank: number;
  }>>;

  // Financial methods
  getOrCreateFinancialAccount(userId: string): Promise<FinancialAccount>;
  getFinancialAccount(userId: string): Promise<FinancialAccount | undefined>;
  updateDepositBalance(userId: string, amount: number, description: string, processedByAdminId?: string, relatedAttendanceId?: string): Promise<FinancialTransaction>;
  deductFromBalance(userId: string, amount: number, transactionType: string, description: string, processedByAdminId?: string, relatedAttendanceId?: string): Promise<FinancialTransaction>;
  getTransactionHistory(userId: string): Promise<FinancialTransaction[]>;
  getAllFinancialAccounts(): Promise<FinancialAccount[]>;
  updateAnnualFee(userId: string, paid: boolean): Promise<void>;

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
      .values(assignment)
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

  async getMemberRankings(): Promise<Array<{
    userId: string;
    username: string;
    koreanName: string;
    englishName: string;
    attendanceRate: string;
    totalAttendance: number;
    voteParticipation: number;
    activityScore: number;
    rank: number;
  }>> {
    // Get all active users
    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.status, "ACTIVE"));

    // Calculate rankings for each user
    const rankings = await Promise.all(
      allUsers.map(async (user) => {
        // Get total attendance count
        const userAttendance = await db
          .select()
          .from(attendanceRecords)
          .where(eq(attendanceRecords.userId, user.id));
        
        const totalAttendance = userAttendance.filter(
          r => r.status === "PRESENT" || r.status === "LATE"
        ).length;

        // Get total votes and user's vote participation
        const totalVotes = await db
          .select({ count: count() })
          .from(votes);
        
        const userVoteResponses = await db
          .select({ count: count() })
          .from(voteResponses)
          .where(eq(voteResponses.userId, user.id));

        const voteParticipation = totalVotes[0].count > 0
          ? Math.round((userVoteResponses[0].count / totalVotes[0].count) * 100)
          : 0;

        // Calculate activity score
        // Formula: attendanceRate * 0.5 + voteParticipation * 0.3 + (totalAttendance * 2) * 0.2
        const attendanceRate = parseFloat(user.attendanceRate || "0");
        const activityScore = Math.round(
          attendanceRate * 0.5 + 
          voteParticipation * 0.3 + 
          (totalAttendance * 2) * 0.2
        );

        return {
          userId: user.id,
          username: user.username,
          koreanName: user.koreanName || "",
          englishName: user.englishName || "",
          attendanceRate: user.attendanceRate || "0.00",
          totalAttendance,
          voteParticipation,
          activityScore,
          rank: 0, // Will be assigned after sorting
        };
      })
    );

    // Sort by activity score (descending)
    rankings.sort((a, b) => b.activityScore - a.activityScore);

    // Assign ranks
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return rankings;
  }

  async getOrCreateFinancialAccount(userId: string): Promise<FinancialAccount> {
    const existing = await this.getFinancialAccount(userId);
    if (existing) {
      return existing;
    }

    const [account] = await db
      .insert(financialAccounts)
      .values({
        userId,
        annualFeePaid: false,
        depositBalance: "0.00",
      })
      .returning();
    return account;
  }

  async getFinancialAccount(userId: string): Promise<FinancialAccount | undefined> {
    const [account] = await db
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.userId, userId));
    return account || undefined;
  }

  async updateDepositBalance(
    userId: string,
    amount: number,
    description: string,
    processedByAdminId?: string,
    relatedAttendanceId?: string
  ): Promise<FinancialTransaction> {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    const account = await this.getOrCreateFinancialAccount(userId);
    
    return await db.transaction(async (tx) => {
      const currentBalance = parseFloat(account.depositBalance || "0");
      const newBalance = currentBalance + amount;

      await tx
        .update(financialAccounts)
        .set({
          depositBalance: newBalance.toFixed(2),
          lastDepositDate: new Date(),
          updatedDate: new Date(),
        })
        .where(eq(financialAccounts.id, account.id));

      const [transaction] = await tx
        .insert(financialTransactions)
        .values({
          userId,
          accountId: account.id,
          transactionType: "DEPOSIT",
          amount: amount.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description,
          relatedAttendanceId,
          processedByAdminId,
        })
        .returning();

      return transaction;
    });
  }

  async deductFromBalance(
    userId: string,
    amount: number,
    transactionType: string,
    description: string,
    processedByAdminId?: string,
    relatedAttendanceId?: string
  ): Promise<FinancialTransaction> {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    const account = await this.getOrCreateFinancialAccount(userId);
    
    return await db.transaction(async (tx) => {
      const currentBalance = parseFloat(account.depositBalance || "0");
      const newBalance = currentBalance - amount;

      await tx
        .update(financialAccounts)
        .set({
          depositBalance: newBalance.toFixed(2),
          updatedDate: new Date(),
        })
        .where(eq(financialAccounts.id, account.id));

      const [transaction] = await tx
        .insert(financialTransactions)
        .values({
          userId,
          accountId: account.id,
          transactionType: transactionType as any,
          amount: (-amount).toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description,
          relatedAttendanceId,
          processedByAdminId,
        })
        .returning();

      return transaction;
    });
  }

  async getTransactionHistory(userId: string): Promise<FinancialTransaction[]> {
    return await db
      .select()
      .from(financialTransactions)
      .where(eq(financialTransactions.userId, userId))
      .orderBy(desc(financialTransactions.createdDate));
  }

  async getAllFinancialAccounts(): Promise<FinancialAccount[]> {
    return await db.select().from(financialAccounts);
  }

  async updateAnnualFee(userId: string, paid: boolean): Promise<void> {
    const account = await this.getOrCreateFinancialAccount(userId);
    await db
      .update(financialAccounts)
      .set({
        annualFeePaid: paid,
        annualFeeDate: paid ? new Date() : null,
        updatedDate: new Date(),
      })
      .where(eq(financialAccounts.id, account.id));
  }
}

export const storage = new DatabaseStorage();
