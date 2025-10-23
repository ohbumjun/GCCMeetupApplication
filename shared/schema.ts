import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, pgEnum, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const industryEnum = pgEnum("industry", [
  "FINANCE", "IT", "MANUFACTURING", "HEALTHCARE", "EDUCATION", "CONSULTING", "OTHER"
]);

export const membershipLevelEnum = pgEnum("membership_level", [
  "HONOR_IV", "HONOR_III", "HONOR_II", "HONOR_I"
]);

export const statusEnum = pgEnum("status", ["ACTIVE", "INACTIVE", "SUSPENDED"]);

export const roleEnum = pgEnum("role", ["USER", "ADMIN"]);

export const voteStatusEnum = pgEnum("vote_status", ["ACTIVE", "CLOSED"]);

export const voteResponseEnum = pgEnum("vote_response", ["PRESENT", "ABSENT"]);

export const attendanceStatusEnum = pgEnum("attendance_status", ["PRESENT", "ABSENT", "LATE", "NO_SHOW"]);

export const suggestionStatusEnum = pgEnum("suggestion_status", ["PENDING", "REVIEWED"]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "ANNUAL_FEE", 
  "DEPOSIT", 
  "ROOM_FEE", 
  "LATE_FEE", 
  "CANCELLATION_PENALTY", 
  "PRESENTER_PENALTY",
  "REFUND",
  "ADJUSTMENT"
]);

export const warningTypeEnum = pgEnum("warning_type", [
  "LOW_BALANCE",
  "CANCELLATION_PENALTY",
  "LATE_PENALTY",
  "ABSENCE_WARNING",
  "OTHER"
]);

// Tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  koreanName: text("korean_name"),
  englishName: text("english_name"),
  phoneNumber: text("phone_number"),
  industry: industryEnum("industry"),
  linkedinUrl: text("linkedin_url"),
  websiteUrl: text("website_url"),
  email: text("email"),
  membershipLevel: membershipLevelEnum("membership_level").default("HONOR_I"),
  status: statusEnum("status").default("ACTIVE"),
  inactiveReason: text("inactive_reason"),
  lastAttendanceDate: timestamp("last_attendance_date"),
  consecutiveAbsences: integer("consecutive_absences").default(0),
  attendanceRate: decimal("attendance_rate", { precision: 5, scale: 2 }).default("0.00"),
  role: roleEnum("role").default("USER"),
  mustChangePassword: boolean("must_change_password").default(false),
  createdDate: timestamp("created_date").defaultNow(),
  updatedDate: timestamp("updated_date").defaultNow(),
});

export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  voteDate: timestamp("vote_date").notNull(),
  deadlineDate: timestamp("deadline_date").notNull(),
  createdByAdminId: varchar("created_by_admin_id").references(() => users.id),
  status: voteStatusEnum("status").default("ACTIVE"),
  createdDate: timestamp("created_date").defaultNow(),
});

export const voteResponses = pgTable("vote_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voteId: varchar("vote_id").references(() => votes.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  response: voteResponseEnum("response").notNull(),
  submittedDate: timestamp("submitted_date").defaultNow(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  meetingDate: timestamp("meeting_date").notNull(),
  status: attendanceStatusEnum("status").notNull(),
  updatedByAdminId: varchar("updated_by_admin_id").references(() => users.id),
  notes: text("notes"),
  createdDate: timestamp("created_date").defaultNow(),
});

export const roomAssignments = pgTable("room_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingDate: timestamp("meeting_date").notNull(),
  roomNumber: text("room_number").notNull(),
  roomName: text("room_name").notNull(),
  assignedMembers: json("assigned_members").$type<string[]>().default([]),
  createdByAdminId: varchar("created_by_admin_id").references(() => users.id),
  createdDate: timestamp("created_date").defaultNow(),
});

export const meetingTopics = pgTable("meeting_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingDate: timestamp("meeting_date").notNull(),
  topicTitle: text("topic_title").notNull(),
  description: text("description"),
  createdByAdminId: varchar("created_by_admin_id").references(() => users.id),
  createdDate: timestamp("created_date").defaultNow(),
});

export const suggestions = pgTable("suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  status: suggestionStatusEnum("status").default("PENDING"),
  createdDate: timestamp("created_date").defaultNow(),
});

export const financialAccounts = pgTable("financial_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  annualFeePaid: boolean("annual_fee_paid").default(false),
  annualFeeDate: timestamp("annual_fee_date"),
  depositBalance: decimal("deposit_balance", { precision: 10, scale: 2 }).default("0.00"),
  lastDepositDate: timestamp("last_deposit_date"),
  createdDate: timestamp("created_date").defaultNow(),
  updatedDate: timestamp("updated_date").defaultNow(),
});

export const financialTransactions = pgTable("financial_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  accountId: varchar("account_id").references(() => financialAccounts.id).notNull(),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  relatedAttendanceId: varchar("related_attendance_id").references(() => attendanceRecords.id),
  processedByAdminId: varchar("processed_by_admin_id").references(() => users.id),
  createdDate: timestamp("created_date").defaultNow(),
});

export const warnings = pgTable("warnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  warningType: warningTypeEnum("warning_type").notNull(),
  reason: text("reason").notNull(),
  issuedByAdminId: varchar("issued_by_admin_id").references(() => users.id),
  isResolved: boolean("is_resolved").default(false),
  resolvedDate: timestamp("resolved_date"),
  resolvedByAdminId: varchar("resolved_by_admin_id").references(() => users.id),
  createdDate: timestamp("created_date").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  voteResponses: many(voteResponses),
  attendanceRecords: many(attendanceRecords),
  suggestions: many(suggestions),
  createdVotes: many(votes),
  updatedAttendanceRecords: many(attendanceRecords),
  createdRoomAssignments: many(roomAssignments),
  createdMeetingTopics: many(meetingTopics),
  financialAccount: one(financialAccounts),
  financialTransactions: many(financialTransactions),
  warnings: many(warnings),
}));

export const votesRelations = relations(votes, ({ one, many }) => ({
  createdByAdmin: one(users, {
    fields: [votes.createdByAdminId],
    references: [users.id],
  }),
  responses: many(voteResponses),
}));

export const voteResponsesRelations = relations(voteResponses, ({ one }) => ({
  vote: one(votes, {
    fields: [voteResponses.voteId],
    references: [votes.id],
  }),
  user: one(users, {
    fields: [voteResponses.userId],
    references: [users.id],
  }),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  user: one(users, {
    fields: [attendanceRecords.userId],
    references: [users.id],
  }),
  updatedByAdmin: one(users, {
    fields: [attendanceRecords.updatedByAdminId],
    references: [users.id],
  }),
}));

export const roomAssignmentsRelations = relations(roomAssignments, ({ one }) => ({
  createdByAdmin: one(users, {
    fields: [roomAssignments.createdByAdminId],
    references: [users.id],
  }),
}));

export const meetingTopicsRelations = relations(meetingTopics, ({ one }) => ({
  createdByAdmin: one(users, {
    fields: [meetingTopics.createdByAdminId],
    references: [users.id],
  }),
}));

export const suggestionsRelations = relations(suggestions, ({ one }) => ({
  user: one(users, {
    fields: [suggestions.userId],
    references: [users.id],
  }),
}));

export const financialAccountsRelations = relations(financialAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [financialAccounts.userId],
    references: [users.id],
  }),
  transactions: many(financialTransactions),
}));

export const financialTransactionsRelations = relations(financialTransactions, ({ one }) => ({
  user: one(users, {
    fields: [financialTransactions.userId],
    references: [users.id],
  }),
  account: one(financialAccounts, {
    fields: [financialTransactions.accountId],
    references: [financialAccounts.id],
  }),
  relatedAttendance: one(attendanceRecords, {
    fields: [financialTransactions.relatedAttendanceId],
    references: [attendanceRecords.id],
  }),
  processedByAdmin: one(users, {
    fields: [financialTransactions.processedByAdminId],
    references: [users.id],
  }),
}));

export const warningsRelations = relations(warnings, ({ one }) => ({
  user: one(users, {
    fields: [warnings.userId],
    references: [users.id],
  }),
  issuedByAdmin: one(users, {
    fields: [warnings.issuedByAdminId],
    references: [users.id],
  }),
  resolvedByAdmin: one(users, {
    fields: [warnings.resolvedByAdminId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdDate: true,
  updatedDate: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdDate: true,
});

export const insertVoteResponseSchema = createInsertSchema(voteResponses).omit({
  id: true,
  submittedDate: true,
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdDate: true,
});

export const insertRoomAssignmentSchema = createInsertSchema(roomAssignments).omit({
  id: true,
  createdDate: true,
});

export const insertMeetingTopicSchema = createInsertSchema(meetingTopics).omit({
  id: true,
  createdDate: true,
});

export const insertSuggestionSchema = createInsertSchema(suggestions).omit({
  id: true,
  createdDate: true,
});

export const insertFinancialAccountSchema = createInsertSchema(financialAccounts).omit({
  id: true,
  createdDate: true,
  updatedDate: true,
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdDate: true,
});

export const insertWarningSchema = createInsertSchema(warnings).omit({
  id: true,
  createdDate: true,
  resolvedDate: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type VoteResponse = typeof voteResponses.$inferSelect;
export type InsertVoteResponse = z.infer<typeof insertVoteResponseSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type RoomAssignment = typeof roomAssignments.$inferSelect;
export type InsertRoomAssignment = z.infer<typeof insertRoomAssignmentSchema>;
export type MeetingTopic = typeof meetingTopics.$inferSelect;
export type InsertMeetingTopic = z.infer<typeof insertMeetingTopicSchema>;
export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type InsertFinancialAccount = z.infer<typeof insertFinancialAccountSchema>;
export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;
export type Warning = typeof warnings.$inferSelect;
export type InsertWarning = z.infer<typeof insertWarningSchema>;
