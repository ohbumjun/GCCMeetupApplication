import { 
  users, votes, voteResponses, attendanceRecords, roomAssignments, 
  meetingTopics, suggestions, financialAccounts, financialTransactions, warnings, presenters, locations,
  pendingAttendanceRecords,
  type User, type InsertUser, type Vote, type InsertVote,
  type VoteResponse, type InsertVoteResponse, type AttendanceRecord,
  type InsertAttendanceRecord, type RoomAssignment, type InsertRoomAssignment,
  type MeetingTopic, type InsertMeetingTopic, type Suggestion, type InsertSuggestion,
  type FinancialAccount, type InsertFinancialAccount, type FinancialTransaction,
  type InsertFinancialTransaction, type Warning, type InsertWarning, type Presenter, type InsertPresenter,
  type Location, type InsertLocation, type PendingAttendanceRecord, type InsertPendingAttendanceRecord
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, isNotNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds, startOfWeek, endOfWeek } from 'date-fns';

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
  getRecentRoomPairings(weeksBack: number): Promise<Map<string, Set<string>>>;
  autoAssignRooms(params: {
    meetingDate: Date;
    locationId: string;
    numberOfRooms: number;
    weeksToAvoid: number;
  }): Promise<Array<{
    roomNumber: string;
    roomName: string;
    leaderId: string;
    assignedMembers: string[];
  }>>;
  
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

  // Warning methods
  createWarning(warning: InsertWarning): Promise<Warning>;
  getWarningsByUserId(userId: string): Promise<Warning[]>;
  getUnresolvedWarningCount(userId: string): Promise<number>;
  getAllActiveWarnings(): Promise<Warning[]>;
  resolveWarning(warningId: string, resolvedByAdminId: string): Promise<Warning>;
  checkLowBalanceAndWarn(userId: string, currentBalance: number, issuedByAdminId?: string): Promise<Warning | null>;

  // Presenter methods
  createPresenter(presenter: InsertPresenter): Promise<Presenter>;
  getPresentersByMeetingDate(meetingDate: Date): Promise<Presenter[]>;
  getPresenterById(id: string): Promise<Presenter | undefined>;
  updatePresenterSubmissionStatus(id: string, status: "NOT_SUBMITTED" | "TOPIC_SUBMITTED" | "MATERIAL_SUBMITTED" | "LATE_SUBMISSION", topicTitle?: string): Promise<Presenter>;
  checkPresenterDeadlines(): Promise<void>;
  getUpcomingPresenters(): Promise<Presenter[]>;
  applyPresenterPenalty(presenterId: string, amount: number, processedByAdminId: string): Promise<void>;

  // Location methods
  createLocation(location: InsertLocation): Promise<Location>;
  getAllLocations(): Promise<Location[]>;
  getActiveLocations(): Promise<Location[]>;
  getLocationById(id: string): Promise<Location | undefined>;
  updateLocation(id: string, updates: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: string): Promise<void>;

  // Multi-location business logic
  checkUserWeeklyVoteLimit(userId: string, voteId: string): Promise<boolean>;
  isUserRoomLeader(userId: string, roomAssignmentId: string): Promise<boolean>;
  
  // Pending attendance methods (Leader attendance submissions)
  createPendingAttendance(record: InsertPendingAttendanceRecord): Promise<PendingAttendanceRecord>;
  getPendingAttendanceByLeader(leaderId: string): Promise<PendingAttendanceRecord[]>;
  getAllPendingAttendances(): Promise<PendingAttendanceRecord[]>;
  getPendingAttendanceById(id: string): Promise<PendingAttendanceRecord | undefined>;
  updatePendingAttendance(id: string, updates: Partial<InsertPendingAttendanceRecord>): Promise<PendingAttendanceRecord>;
  deletePendingAttendance(id: string): Promise<void>;
  approvePendingAttendance(id: string, adminId: string): Promise<void>;
  rejectPendingAttendance(id: string, adminId: string, reason: string): Promise<void>;

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

  async updateVoteResponse(voteId: string, userId: string, newResponse: "YES" | "NO" | "NO_RESPONSE"): Promise<VoteResponse> {
    const existing = await this.getUserVoteResponse(voteId, userId);
    if (!existing) {
      throw new Error("No existing vote response found");
    }

    const vote = await this.getVoteById(voteId);
    if (!vote) {
      throw new Error("Vote not found");
    }

    const oldResponse = existing.response;
    let penaltyApplied = false;
    let penaltyAmount = 0;

    if (oldResponse === "YES" && newResponse === "NO") {
      const KST_TIMEZONE = 'Asia/Seoul';
      
      const nowUTC = new Date();
      
      const meetingDateKST = toZonedTime(vote.meetingDate, KST_TIMEZONE);
      
      let sundayStartKST = new Date(meetingDateKST);
      sundayStartKST = setHours(sundayStartKST, 0);
      sundayStartKST = setMinutes(sundayStartKST, 0);
      sundayStartKST = setSeconds(sundayStartKST, 0);
      sundayStartKST = setMilliseconds(sundayStartKST, 0);
      
      let thursdayNightKST = addDays(sundayStartKST, -3);
      thursdayNightKST = setHours(thursdayNightKST, 23);
      thursdayNightKST = setMinutes(thursdayNightKST, 59);
      thursdayNightKST = setSeconds(thursdayNightKST, 59);
      thursdayNightKST = setMilliseconds(thursdayNightKST, 999);
      
      let fridayStartKST = addDays(sundayStartKST, -2);
      fridayStartKST = setHours(fridayStartKST, 0);
      fridayStartKST = setMinutes(fridayStartKST, 0);
      fridayStartKST = setSeconds(fridayStartKST, 0);
      fridayStartKST = setMilliseconds(fridayStartKST, 0);
      
      const thursdayNightUTC = fromZonedTime(thursdayNightKST, KST_TIMEZONE);
      const fridayStartUTC = fromZonedTime(fridayStartKST, KST_TIMEZONE);
      const sundayStartUTC = fromZonedTime(sundayStartKST, KST_TIMEZONE);

      if (nowUTC <= thursdayNightUTC) {
        penaltyAmount = 0;
      } else if (nowUTC >= fridayStartUTC && nowUTC < sundayStartUTC) {
        penaltyAmount = 10000;
      } else if (nowUTC >= sundayStartUTC) {
        penaltyAmount = 25000;
      }

      if (penaltyAmount > 0) {
        penaltyApplied = true;
        
        await this.deductFromBalance(
          userId,
          penaltyAmount,
          "CANCELLATION_PENALTY",
          `출석 취소 패널티 (${penaltyAmount === 10000 ? '금~토요일' : '일요일'} 취소): ${penaltyAmount.toLocaleString()}원`,
          null
        );

        if (penaltyAmount === 25000) {
          await this.createWarning({
            userId,
            warningType: "CANCELLATION_PENALTY",
            reason: `일요일(당일) 출석 취소 - ${penaltyAmount.toLocaleString()}원 패널티 부과`,
            issuedByAdminId: null,
            isResolved: false,
          });

          await this.checkAndSuspendUser(userId);
        }

        console.log(`[Cancellation] User ${userId} penalized ${penaltyAmount}원 for canceling at ${nowUTC.toISOString()}`);
      }
    }

    const [updated] = await db
      .update(voteResponses)
      .set({
        response: newResponse,
        updatedDate: new Date(),
      })
      .where(and(
        eq(voteResponses.voteId, voteId),
        eq(voteResponses.userId, userId)
      ))
      .returning();

    return updated;
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

  async getVoteResponseByUserAndDate(userId: string, meetingDate: Date): Promise<VoteResponse | undefined> {
    const startOfDay = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());
    const endOfDay = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate() + 1);
    
    const [response] = await db
      .select({
        id: voteResponses.id,
        voteId: voteResponses.voteId,
        userId: voteResponses.userId,
        response: voteResponses.response,
        submittedDate: voteResponses.submittedDate,
      })
      .from(voteResponses)
      .innerJoin(votes, eq(voteResponses.voteId, votes.id))
      .where(and(
        eq(voteResponses.userId, userId),
        gte(votes.meetingDate, startOfDay),
        lte(votes.meetingDate, endOfDay)
      ))
      .limit(1);
    
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

  async getRecentRoomPairings(weeksBack: number): Promise<Map<string, Set<string>>> {
    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - (weeksBack * 7));
    
    const assignments = await db
      .select()
      .from(roomAssignments)
      .where(and(
        gte(roomAssignments.meetingDate, weeksAgo),
        lte(roomAssignments.meetingDate, new Date())
      ));
    
    const pairings = new Map<string, Set<string>>();
    
    for (const assignment of assignments) {
      const members = assignment.assignedMembers as string[];
      if (!members || members.length === 0) continue;
      
      for (const memberId of members) {
        if (!pairings.has(memberId)) {
          pairings.set(memberId, new Set<string>());
        }
        
        for (const otherMemberId of members) {
          if (memberId !== otherMemberId) {
            pairings.get(memberId)!.add(otherMemberId);
          }
        }
      }
    }
    
    return pairings;
  }

  async autoAssignRooms(params: {
    meetingDate: Date;
    locationId: string;
    numberOfRooms: number;
    weeksToAvoid: number;
  }): Promise<Array<{
    roomNumber: string;
    roomName: string;
    leaderId: string;
    assignedMembers: string[];
  }>> {
    const { meetingDate, locationId, numberOfRooms, weeksToAvoid } = params;
    
    const votesOnDate = await db
      .select()
      .from(votes)
      .where(and(
        eq(votes.meetingDate, meetingDate),
        eq(votes.locationId, locationId)
      ));
    
    if (votesOnDate.length === 0) {
      throw new Error("No vote found for this date and location");
    }
    
    const vote = votesOnDate[0];
    
    const responses = await db
      .select({
        userId: voteResponses.userId,
        response: voteResponses.response,
        user: users,
      })
      .from(voteResponses)
      .innerJoin(users, eq(voteResponses.userId, users.id))
      .where(and(
        eq(voteResponses.voteId, vote.id),
        eq(voteResponses.response, "YES"),
        eq(users.status, "ACTIVE")
      ));
    
    const attendingMembers = responses.map(r => r.user);
    
    if (attendingMembers.length < numberOfRooms) {
      throw new Error(`Not enough members (${attendingMembers.length}) for ${numberOfRooms} rooms`);
    }
    
    const recentPairings = await this.getRecentRoomPairings(weeksToAvoid);
    
    const honorOrder = { HONOR_IV: 4, HONOR_III: 3, HONOR_II: 2, HONOR_I: 1 };
    const sortedMembers = [...attendingMembers].sort((a, b) => {
      const aHonor = honorOrder[a.membershipLevel || "HONOR_I"] || 1;
      const bHonor = honorOrder[b.membershipLevel || "HONOR_I"] || 1;
      return bHonor - aHonor;
    });
    
    const leaders = sortedMembers.slice(0, numberOfRooms);
    const remainingMembers = sortedMembers.slice(numberOfRooms);
    
    const rooms: Array<{
      roomNumber: string;
      roomName: string;
      leaderId: string;
      assignedMembers: string[];
    }> = leaders.map((leader, index) => ({
      roomNumber: `${index + 1}`,
      roomName: `Room ${index + 1}`,
      leaderId: leader.id,
      assignedMembers: [leader.id],
    }));
    
    for (let i = remainingMembers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingMembers[i], remainingMembers[j]] = [remainingMembers[j], remainingMembers[i]];
    }
    
    for (const member of remainingMembers) {
      let bestRoomIndex = 0;
      let minPairings = Infinity;
      
      for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
        const room = rooms[roomIndex];
        const memberPairings = recentPairings.get(member.id) || new Set();
        
        let pairingsCount = 0;
        for (const roomMemberId of room.assignedMembers) {
          if (memberPairings.has(roomMemberId)) {
            pairingsCount++;
          }
        }
        
        if (pairingsCount < minPairings) {
          minPairings = pairingsCount;
          bestRoomIndex = roomIndex;
        }
      }
      
      rooms[bestRoomIndex].assignedMembers.push(member.id);
    }
    
    return rooms;
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
    
    const transaction = await db.transaction(async (tx) => {
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

    await this.checkLowBalanceAndWarn(userId, parseFloat(transaction.balanceAfter), processedByAdminId);
    return transaction;
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
    
    const transaction = await db.transaction(async (tx) => {
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

    await this.checkLowBalanceAndWarn(userId, parseFloat(transaction.balanceAfter), processedByAdminId);
    return transaction;
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

  async createWarning(warning: InsertWarning): Promise<Warning> {
    const [newWarning] = await db
      .insert(warnings)
      .values(warning)
      .returning();
    return newWarning;
  }

  async getWarningsByUserId(userId: string): Promise<Warning[]> {
    return await db
      .select()
      .from(warnings)
      .where(eq(warnings.userId, userId))
      .orderBy(desc(warnings.createdDate));
  }

  async getUnresolvedWarningCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(warnings)
      .where(and(
        eq(warnings.userId, userId),
        eq(warnings.isResolved, false)
      ));
    return result[0]?.count || 0;
  }

  async getAllActiveWarnings(): Promise<Warning[]> {
    return await db
      .select()
      .from(warnings)
      .where(eq(warnings.isResolved, false))
      .orderBy(desc(warnings.createdDate));
  }

  async resolveWarning(warningId: string, resolvedByAdminId: string): Promise<Warning> {
    const [resolved] = await db
      .update(warnings)
      .set({
        isResolved: true,
        resolvedDate: new Date(),
        resolvedByAdminId,
      })
      .where(eq(warnings.id, warningId))
      .returning();
    return resolved;
  }

  async checkLowBalanceAndWarn(
    userId: string,
    currentBalance: number,
    issuedByAdminId?: string
  ): Promise<Warning | null> {
    const LOW_BALANCE_THRESHOLD = 15000;

    if (currentBalance <= LOW_BALANCE_THRESHOLD) {
      const recentWarnings = await db
        .select()
        .from(warnings)
        .where(and(
          eq(warnings.userId, userId),
          eq(warnings.warningType, "LOW_BALANCE"),
          eq(warnings.isResolved, false)
        ))
        .limit(1);

      if (recentWarnings.length === 0) {
        return await this.createWarning({
          userId,
          warningType: "LOW_BALANCE",
          reason: `잔액이 ${currentBalance.toLocaleString()}원으로 ${LOW_BALANCE_THRESHOLD.toLocaleString()}원 이하입니다.`,
          issuedByAdminId,
        });
      }
    }

    return null;
  }

  async updateUserStatus(userId: string, status: string, reason?: string): Promise<void> {
    await db
      .update(users)
      .set({
        status: status as any,
        inactiveReason: reason || null,
        updatedDate: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async checkAndSuspendUser(userId: string): Promise<boolean> {
    const unresolvedCount = await this.getUnresolvedWarningCount(userId);
    
    if (unresolvedCount >= 3) {
      await this.updateUserStatus(
        userId,
        "SUSPENDED",
        `자동 제외: ${unresolvedCount}개의 미해결 경고로 인해 활동이 정지되었습니다.`
      );
      return true;
    }
    
    return false;
  }

  async updateConsecutiveAbsences(userId: string, isPresent: boolean): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    if (isPresent) {
      await db
        .update(users)
        .set({
          consecutiveAbsences: 0,
          lastAttendanceDate: new Date(),
          updatedDate: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      const newCount = (user.consecutiveAbsences || 0) + 1;
      
      await db
        .update(users)
        .set({
          consecutiveAbsences: newCount,
          updatedDate: new Date(),
        })
        .where(eq(users.id, userId));

      const threshold = this.getAbsenceThreshold(user);
      if (newCount >= threshold) {
        await this.updateUserStatus(
          userId,
          "SUSPENDED",
          `자동 제외: ${newCount}주 연속 미참석으로 인해 활동이 정지되었습니다.`
        );
      }
    }
  }

  getAbsenceThreshold(user: any): number {
    if (user.isLead) {
      return Infinity;
    }
    
    if (user.isSubLead) {
      return 6;
    }

    switch (user.membershipLevel) {
      case "HONOR_IV":
        return 8;
      case "HONOR_III":
        return 7;
      case "HONOR_II":
        return 6;
      case "HONOR_I":
        return 5;
      default:
        return 4;
    }
  }

  calculateLateFee(arrivalTime: Date): number {
    const hours = arrivalTime.getHours();
    const minutes = arrivalTime.getMinutes();
    
    const totalMinutes = hours * 60 + minutes;
    const meetingStartMinutes = 10 * 60;
    
    if (totalMinutes < meetingStartMinutes + 10) {
      return 0;
    }
    
    const baseLateFee = 5000;
    
    if (totalMinutes < meetingStartMinutes + 20) {
      return baseLateFee;
    }
    
    const additionalTenMinutes = Math.floor((totalMinutes - (meetingStartMinutes + 20)) / 10);
    const calculatedFee = baseLateFee + (additionalTenMinutes + 1) * 1000;
    
    return Math.min(calculatedFee, 10000);
  }

  async restoreUser(userId: string, restoredByAdminId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(warnings)
        .set({
          isResolved: true,
          resolvedDate: new Date(),
          resolvedByAdminId: restoredByAdminId,
        })
        .where(and(
          eq(warnings.userId, userId),
          eq(warnings.isResolved, false)
        ));

      await tx
        .update(users)
        .set({
          status: "ACTIVE",
          inactiveReason: null,
          updatedDate: new Date(),
        })
        .where(eq(users.id, userId));
    });
  }

  async resetAllWarnings(): Promise<{ count: number }> {
    const result = await db
      .update(warnings)
      .set({
        isResolved: true,
        resolvedDate: new Date(),
        resolvedByAdminId: null,
      })
      .where(eq(warnings.isResolved, false))
      .returning();

    console.log(`[Warning Reset] Reset ${result.length} warnings on ${new Date().toISOString()}`);
    return { count: result.length };
  }

  async createPresenter(presenter: InsertPresenter): Promise<Presenter> {
    const [newPresenter] = await db
      .insert(presenters)
      .values(presenter)
      .returning();
    return newPresenter;
  }

  async getPresentersByMeetingDate(meetingDate: Date): Promise<Presenter[]> {
    const startOfDay = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());
    const endOfDay = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate() + 1);
    
    return await db
      .select()
      .from(presenters)
      .where(and(
        gte(presenters.meetingDate, startOfDay),
        lte(presenters.meetingDate, endOfDay)
      ));
  }

  async getPresenterById(id: string): Promise<Presenter | undefined> {
    const [presenter] = await db
      .select()
      .from(presenters)
      .where(eq(presenters.id, id));
    return presenter || undefined;
  }

  async updatePresenterSubmissionStatus(
    id: string, 
    status: "NOT_SUBMITTED" | "TOPIC_SUBMITTED" | "MATERIAL_SUBMITTED" | "LATE_SUBMISSION",
    topicTitle?: string
  ): Promise<Presenter> {
    const now = new Date();
    const updates: any = {
      submissionStatus: status,
    };

    if (status === "TOPIC_SUBMITTED" && topicTitle) {
      updates.topicTitle = topicTitle;
      updates.topicSubmittedDate = now;
    } else if (status === "MATERIAL_SUBMITTED") {
      updates.materialSubmittedDate = now;
    }

    const [updatedPresenter] = await db
      .update(presenters)
      .set(updates)
      .where(eq(presenters.id, id))
      .returning();
    
    return updatedPresenter;
  }

  async checkPresenterDeadlines(): Promise<void> {
    const now = new Date();
    
    const overduePresenters = await db
      .select()
      .from(presenters)
      .where(and(
        lte(presenters.topicDeadline, now),
        eq(presenters.submissionStatus, "NOT_SUBMITTED"),
        eq(presenters.penaltyApplied, false)
      ));

    for (const presenter of overduePresenters) {
      await db
        .update(presenters)
        .set({
          submissionStatus: "LATE_SUBMISSION",
          penaltyApplied: true,
          penaltyAmount: "5000.00",
        })
        .where(eq(presenters.id, presenter.id));
    }
  }

  async getUpcomingPresenters(): Promise<Presenter[]> {
    const now = new Date();
    
    return await db
      .select()
      .from(presenters)
      .where(gte(presenters.meetingDate, now))
      .orderBy(presenters.meetingDate);
  }

  async applyPresenterPenalty(presenterId: string, amount: number, processedByAdminId: string): Promise<void> {
    const presenter = await this.getPresenterById(presenterId);
    if (!presenter) {
      throw new Error("Presenter not found");
    }

    await db.transaction(async (tx) => {
      await this.deductFromBalance(
        presenter.userId,
        amount,
        "PRESENTER_PENALTY",
        `발제자 패널티: ${amount.toLocaleString()}원`,
        processedByAdminId
      );

      await tx
        .update(presenters)
        .set({
          penaltyApplied: true,
          penaltyAmount: amount.toString(),
        })
        .where(eq(presenters.id, presenterId));
    });
  }

  async processVoteDeadlines(): Promise<{ voteId: string; nonVotersCount: number }[]> {
    const now = new Date();
    const results: { voteId: string; nonVotersCount: number }[] = [];

    const overdueVotes = await db
      .select()
      .from(votes)
      .where(and(
        eq(votes.status, "ACTIVE"),
        lte(votes.deadlineDate, now)
      ));

    for (const vote of overdueVotes) {
      const existingResponses = await db
        .select()
        .from(voteResponses)
        .where(eq(voteResponses.voteId, vote.id));

      const respondedUserIds = new Set(existingResponses.map(r => r.userId));

      const activeUsers = await db
        .select()
        .from(users)
        .where(eq(users.status, "ACTIVE"));

      const nonVoters = activeUsers.filter(user => !respondedUserIds.has(user.id));

      for (const nonVoter of nonVoters) {
        await this.createWarning({
          userId: nonVoter.id,
          warningType: "ABSENCE_WARNING",
          reason: `Vote 미투표 (${vote.title}). 데드라인: ${vote.deadlineDate.toLocaleString()}`,
          issuedByAdminId: null,
          isResolved: false,
        });

        await this.checkAndSuspendUser(nonVoter.id);
      }

      await db
        .update(votes)
        .set({ status: "CLOSED" })
        .where(eq(votes.id, vote.id));

      results.push({
        voteId: vote.id,
        nonVotersCount: nonVoters.length,
      });

      console.log(`[Vote Deadline] Processed vote "${vote.title}": ${nonVoters.length} non-voters penalized`);
    }

    return results;
  }

  async processPresenterDeadlines(): Promise<{ presenterId: string; userId: string }[]> {
    const now = new Date();
    const results: { presenterId: string; userId: string }[] = [];

    const overduePresenters = await db
      .select()
      .from(presenters)
      .where(and(
        eq(presenters.submissionStatus, "NOT_SUBMITTED"),
        lte(presenters.topicDeadline, now),
        eq(presenters.penaltyApplied, false)
      ));

    for (const presenter of overduePresenters) {
      const lateFee = 5000;

      await db.transaction(async (tx) => {
        await this.deductFromBalance(
          presenter.userId,
          lateFee,
          "PRESENTER_PENALTY",
          `발제자 주제 제출 지연 패널티: ${lateFee.toLocaleString()}원`,
          null
        );

        await tx
          .update(presenters)
          .set({
            submissionStatus: "LATE_SUBMISSION",
            penaltyApplied: true,
            penaltyAmount: lateFee.toString(),
          })
          .where(eq(presenters.id, presenter.id));
      });

      results.push({
        presenterId: presenter.id,
        userId: presenter.userId,
      });

      console.log(`[Presenter Deadline] Applied late penalty to user ${presenter.userId} for presenter ${presenter.id}`);
    }

    console.log(`[Presenter Deadline] Total ${results.length} late presenters penalized`);
    return results;
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db
      .insert(locations)
      .values(location)
      .returning();
    return newLocation;
  }

  async getAllLocations(): Promise<Location[]> {
    return await db
      .select()
      .from(locations)
      .orderBy(desc(locations.createdDate));
  }

  async getActiveLocations(): Promise<Location[]> {
    return await db
      .select()
      .from(locations)
      .where(eq(locations.isActive, true))
      .orderBy(locations.name);
  }

  async getLocationById(id: string): Promise<Location | undefined> {
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id));
    return location;
  }

  async updateLocation(id: string, updates: Partial<InsertLocation>): Promise<Location> {
    const [updated] = await db
      .update(locations)
      .set({ ...updates, updatedDate: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return updated;
  }

  async deleteLocation(id: string): Promise<void> {
    await db
      .update(locations)
      .set({ isActive: false, updatedDate: new Date() })
      .where(eq(locations.id, id));
  }

  async checkUserWeeklyVoteLimit(userId: string, voteId: string): Promise<boolean> {
    const vote = await this.getVoteById(voteId);
    if (!vote) {
      throw new Error("Vote not found");
    }

    const SEOUL_TZ = 'Asia/Seoul';
    const meetingDateUTC = new Date(vote.meetingDate);
    const meetingDateKST = toZonedTime(meetingDateUTC, SEOUL_TZ);
    const weekStartKST = startOfWeek(meetingDateKST, { weekStartsOn: 0 });
    const weekEndKST = endOfWeek(meetingDateKST, { weekStartsOn: 0 });
    const weekStartUTC = fromZonedTime(weekStartKST, SEOUL_TZ);
    const weekEndUTC = fromZonedTime(weekEndKST, SEOUL_TZ);

    const userVotesThisWeek = await db
      .select({
        voteId: voteResponses.voteId,
        voteLocationId: votes.locationId,
      })
      .from(voteResponses)
      .innerJoin(votes, eq(voteResponses.voteId, votes.id))
      .where(and(
        eq(voteResponses.userId, userId),
        gte(votes.meetingDate, weekStartUTC),
        lte(votes.meetingDate, weekEndUTC),
        isNotNull(votes.locationId)
      ));

    if (userVotesThisWeek.length === 0) {
      return true;
    }

    const hasVotedDifferentLocation = userVotesThisWeek.some(
      v => v.voteLocationId !== vote.locationId
    );

    return !hasVotedDifferentLocation;
  }

  async isUserRoomLeader(userId: string, roomAssignmentId: string): Promise<boolean> {
    const [assignment] = await db
      .select()
      .from(roomAssignments)
      .where(eq(roomAssignments.id, roomAssignmentId));
    
    if (!assignment) {
      return false;
    }

    return assignment.leaderId === userId;
  }

  async createPendingAttendance(record: InsertPendingAttendanceRecord): Promise<PendingAttendanceRecord> {
    const [newRecord] = await db
      .insert(pendingAttendanceRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  async getPendingAttendanceByLeader(leaderId: string): Promise<PendingAttendanceRecord[]> {
    return await db
      .select()
      .from(pendingAttendanceRecords)
      .where(eq(pendingAttendanceRecords.submittedByLeaderId, leaderId))
      .orderBy(desc(pendingAttendanceRecords.submittedDate));
  }

  async getAllPendingAttendances(): Promise<PendingAttendanceRecord[]> {
    return await db
      .select()
      .from(pendingAttendanceRecords)
      .orderBy(desc(pendingAttendanceRecords.submittedDate));
  }

  async getPendingAttendanceById(id: string): Promise<PendingAttendanceRecord | undefined> {
    const [record] = await db
      .select()
      .from(pendingAttendanceRecords)
      .where(eq(pendingAttendanceRecords.id, id));
    return record;
  }

  async updatePendingAttendance(id: string, updates: Partial<InsertPendingAttendanceRecord>): Promise<PendingAttendanceRecord> {
    const [updated] = await db
      .update(pendingAttendanceRecords)
      .set(updates)
      .where(eq(pendingAttendanceRecords.id, id))
      .returning();
    return updated;
  }

  async deletePendingAttendance(id: string): Promise<void> {
    await db
      .delete(pendingAttendanceRecords)
      .where(eq(pendingAttendanceRecords.id, id));
  }

  async approvePendingAttendance(id: string, adminId: string): Promise<void> {
    const pending = await this.getPendingAttendanceById(id);
    if (!pending) {
      throw new Error("Pending attendance record not found");
    }

    const attendanceData = pending.attendanceData as Array<{
      userId: string;
      status: string;
      arrivalTime?: string;
      notes?: string;
    }>;

    // Get room assignment to find locationId
    const roomAssignment = await db
      .select()
      .from(roomAssignments)
      .where(eq(roomAssignments.id, pending.roomAssignmentId))
      .limit(1);

    const locationId = roomAssignment[0]?.locationId || null;

    for (const attendance of attendanceData) {
      // Create attendance record
      const record = await this.createAttendanceRecord({
        userId: attendance.userId,
        meetingDate: pending.meetingDate,
        status: attendance.status as any,
        arrivalTime: attendance.arrivalTime ? new Date(attendance.arrivalTime) : undefined,
        notes: attendance.notes,
        updatedByAdminId: adminId,
        locationId: locationId,
      });

      // Apply business rules based on status
      if (attendance.status === "PRESENT" || attendance.status === "LATE") {
        // Deduct room fee
        try {
          await this.deductFromBalance(
            attendance.userId,
            5000,
            "ROOM_FEE",
            `Room fee for ${pending.meetingDate.toLocaleDateString()}`,
            adminId,
            record.id
          );
        } catch (error) {
          console.error(`Failed to deduct room fee for user ${attendance.userId}:`, error);
        }
      }

      if (attendance.status === "LATE" && attendance.arrivalTime) {
        // Calculate and deduct late fee
        try {
          const lateFee = this.calculateLateFee(new Date(attendance.arrivalTime));
          if (lateFee > 0) {
            await this.deductFromBalance(
              attendance.userId,
              lateFee,
              "LATE_FEE",
              `Late fee for ${pending.meetingDate.toLocaleDateString()}`,
              adminId,
              record.id
            );
          }
        } catch (error) {
          console.error(`Failed to deduct late fee for user ${attendance.userId}:`, error);
        }
      }

      // Apply cancellation penalty if ABSENT after voting YES
      if (attendance.status === "ABSENT") {
        try {
          const voteResponse = await this.getVoteResponseByUserAndDate(
            attendance.userId,
            pending.meetingDate
          );

          if (voteResponse && voteResponse.response === "YES") {
            await this.deductFromBalance(
              attendance.userId,
              10000,
              "CANCELLATION_PENALTY",
              `Cancellation penalty for ${pending.meetingDate.toLocaleDateString()} (voted YES but absent)`,
              adminId,
              record.id
            );

            await this.createWarning({
              userId: attendance.userId,
              warningType: "CANCELLATION_PENALTY",
              reason: `Voted YES but absent on ${pending.meetingDate.toLocaleDateString()}. 10,000원 penalty applied.`,
              issuedByAdminId: adminId,
              isResolved: false,
            });

            await this.checkAndSuspendUser(attendance.userId);
          }
        } catch (error) {
          console.error(`Failed to apply cancellation penalty for user ${attendance.userId}:`, error);
        }
      }

      // Update consecutive absences
      const isPresent = attendance.status === "PRESENT" || attendance.status === "LATE";
      try {
        await this.updateConsecutiveAbsences(attendance.userId, isPresent);
      } catch (error) {
        console.error(`Failed to update consecutive absences for user ${attendance.userId}:`, error);
      }
    }

    // Mark pending record as approved
    await db
      .update(pendingAttendanceRecords)
      .set({
        status: "APPROVED",
        reviewedByAdminId: adminId,
        reviewedDate: new Date(),
      })
      .where(eq(pendingAttendanceRecords.id, id));
  }

  async rejectPendingAttendance(id: string, adminId: string, reason: string): Promise<void> {
    await db
      .update(pendingAttendanceRecords)
      .set({
        status: "REJECTED",
        reviewedByAdminId: adminId,
        reviewedDate: new Date(),
        adminNotes: reason,
      })
      .where(eq(pendingAttendanceRecords.id, id));
  }
}

export const storage = new DatabaseStorage();
