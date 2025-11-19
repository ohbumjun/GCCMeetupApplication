import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertVoteSchema, insertVoteResponseSchema, insertAttendanceRecordSchema, insertRoomAssignmentSchema, insertMeetingTopicSchema, insertSuggestionSchema, insertPresenterSchema, insertLocationSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Development only: Create first admin user
  app.post("/api/create-admin", async (req, res, next) => {
    try {
      if (process.env.NODE_ENV !== "development") {
        return res.status(403).json({ message: "Only available in development" });
      }
      
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        role: "ADMIN",
        password: await hashPassword(req.body.password),
      });

      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  });

  // Middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Middleware to check if user is admin
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Middleware to check if user is room leader or admin
  const requireLeaderOrAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role === "ADMIN") {
      return next();
    }

    const roomAssignmentId = req.body.roomAssignmentId || req.params.roomAssignmentId;
    if (roomAssignmentId) {
      const isLeader = await storage.isUserRoomLeader(req.user.id, roomAssignmentId);
      if (isLeader) {
        return next();
      }
    }

    return res.status(403).json({ message: "Room leader or admin access required" });
  };

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res, next) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  // User management
  app.get("/api/users", requireAdmin, async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/users", requireAdmin, async (req, res, next) => {
    try {
      // Generate random password for new users
      const randomPassword = Math.random().toString(36).slice(-8);
      const userData = {
        ...req.body,
        password: await hashPassword(randomPassword),
        mustChangePassword: true,
      };
      
      const user = await storage.createUser(userData);
      res.status(201).json({ ...user, generatedPassword: randomPassword });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res, next) => {
    try {
      const userId = req.params.id;
      const updates = req.body;
      
      // Users can only update their own profile (except admins)
      if (req.user!.role !== "ADMIN" && req.user!.id !== userId) {
        return res.status(403).json({ message: "Can only update your own profile" });
      }
      
      // Non-admins cannot update certain fields
      if (req.user!.role !== "ADMIN") {
        const allowedFields = ["koreanName", "englishName", "industry", "linkedinUrl", "websiteUrl", "email"];
        const filteredUpdates = Object.keys(updates)
          .filter(key => allowedFields.includes(key))
          .reduce((obj: any, key) => {
            obj[key] = updates[key];
            return obj;
          }, {});
        
        const user = await storage.updateUser(userId, filteredUpdates);
        res.json(user);
      } else {
        const user = await storage.updateUser(userId, updates);
        res.json(user);
      }
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id/restore", requireAdmin, async (req, res, next) => {
    try {
      const userId = req.params.id;
      
      await storage.restoreUser(userId, req.user!.id);
      res.json({ message: "User restored successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Voting system
  app.get("/api/votes", requireAuth, async (req, res, next) => {
    try {
      const votes = await storage.getActiveVotes();
      res.json(votes);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/votes/history", requireAuth, async (req, res, next) => {
    try {
      const votes = await storage.getVoteHistory();
      res.json(votes);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/votes", requireAdmin, async (req, res, next) => {
    try {
      if (!req.body.locationId) {
        return res.status(400).json({ message: "Location ID is required for creating votes" });
      }

      // Convert ISO date strings to Date objects
      const processedBody = {
        ...req.body,
        voteDate: new Date(req.body.voteDate),
        meetingDate: new Date(req.body.meetingDate),
        deadlineDate: new Date(req.body.deadlineDate),
      };
      
      const voteData = insertVoteSchema.parse({
        ...processedBody,
        createdByAdminId: req.user!.id,
      });
      
      const vote = await storage.createVote(voteData);
      res.status(201).json(vote);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/votes/:id/responses", requireAuth, async (req, res, next) => {
    try {
      const responses = await storage.getVoteResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/votes/:id/responses", requireAuth, async (req, res, next) => {
    try {
      const voteId = req.params.id;
      const userId = req.user!.id;
      
      const existingResponse = await storage.getUserVoteResponse(voteId, userId);
      
      if (existingResponse) {
        const updated = await storage.updateVoteResponse(voteId, userId, req.body.response);
        return res.json(updated);
      }
      
      const canVote = await storage.checkUserWeeklyVoteLimit(userId, voteId);
      if (!canVote) {
        return res.status(400).json({ 
          message: "You can only vote for one location per week" 
        });
      }
      
      const responseData = insertVoteResponseSchema.parse({
        voteId,
        userId,
        response: req.body.response,
      });
      
      const response = await storage.submitVoteResponse(responseData);
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Attendance management
  app.get("/api/attendance/:date", requireAuth, async (req, res, next) => {
    try {
      const date = new Date(req.params.date);
      const attendance = await storage.getAttendanceByDate(date);
      res.json(attendance);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/attendance", requireAdmin, async (req, res, next) => {
    try {
      // Convert ISO date string to Date object
      const processedBody = {
        ...req.body,
        meetingDate: new Date(req.body.meetingDate),
      };
      
      const attendanceData = insertAttendanceRecordSchema.parse({
        ...processedBody,
        updatedByAdminId: req.user!.id,
      });
      
      const record = await storage.createAttendanceRecord(attendanceData);

      // Auto-deduct room fee for PRESENT or LATE status
      if (attendanceData.status === "PRESENT" || attendanceData.status === "LATE") {
        try {
          await storage.deductFromBalance(
            attendanceData.userId,
            5000,
            "ROOM_FEE",
            `Room fee for ${new Date(attendanceData.meetingDate).toLocaleDateString()}`,
            req.user!.id,
            record.id
          );
        } catch (deductError) {
          console.error("Failed to deduct room fee:", deductError);
        }
      }

      // Deduct late fee if LATE status
      if (attendanceData.status === "LATE") {
        try {
          let lateFee = 5000;
          
          if (attendanceData.arrivalTime) {
            lateFee = storage.calculateLateFee(new Date(attendanceData.arrivalTime));
          }
          
          if (lateFee > 0) {
            await storage.deductFromBalance(
              attendanceData.userId,
              lateFee,
              "LATE_FEE",
              `Late fee for ${new Date(attendanceData.meetingDate).toLocaleDateString()}`,
              req.user!.id,
              record.id
            );
          }
        } catch (deductError) {
          console.error("Failed to deduct late fee:", deductError);
        }
      }

      // Apply cancellation penalty if ABSENT after voting YES
      if (attendanceData.status === "ABSENT") {
        try {
          const voteResponse = await storage.getVoteResponseByUserAndDate(
            attendanceData.userId,
            new Date(attendanceData.meetingDate)
          );

          if (voteResponse && voteResponse.response === "YES") {
            await storage.deductFromBalance(
              attendanceData.userId,
              10000,
              "CANCELLATION_PENALTY",
              `Cancellation penalty for ${new Date(attendanceData.meetingDate).toLocaleDateString()} (voted YES but absent)`,
              req.user!.id,
              record.id
            );

            await storage.createWarning({
              userId: attendanceData.userId,
              warningType: "CANCELLATION_PENALTY",
              reason: `Voted YES but absent on ${new Date(attendanceData.meetingDate).toLocaleDateString()}. 10,000원 penalty applied.`,
              issuedByAdminId: req.user!.id,
              isResolved: false,
            });

            await storage.checkAndSuspendUser(attendanceData.userId);
          }
        } catch (penaltyError) {
          console.error("Failed to apply cancellation penalty:", penaltyError);
        }
      }

      // Update consecutive absences
      const isPresent = attendanceData.status === "PRESENT" || attendanceData.status === "LATE";
      try {
        await storage.updateConsecutiveAbsences(attendanceData.userId, isPresent);
      } catch (absenceError) {
        console.error("Failed to update consecutive absences:", absenceError);
      }
      
      res.status(201).json(record);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id/attendance", requireAuth, async (req, res, next) => {
    try {
      const userId = req.params.id;
      
      // Users can only view their own attendance (except admins)
      if (req.user!.role !== "ADMIN" && req.user!.id !== userId) {
        return res.status(403).json({ message: "Can only view your own attendance" });
      }
      
      const attendance = await storage.getUserAttendanceHistory(userId);
      const rate = await storage.calculateAttendanceRate(userId);
      res.json({ attendance, rate });
    } catch (error) {
      next(error);
    }
  });

  // Room assignments
  app.get("/api/room-assignments/history", requireAuth, async (req, res, next) => {
    try {
      const history = await storage.getRoomAssignmentHistory();
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/room-assignments/:date", requireAuth, async (req, res, next) => {
    try {
      const date = new Date(req.params.date);
      const assignments = await storage.getRoomAssignmentsByDate(date);
      res.json(assignments);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/room-assignments", requireAdmin, async (req, res, next) => {
    try {
      // Convert ISO date string to Date object
      const processedBody = {
        ...req.body,
        meetingDate: new Date(req.body.meetingDate),
      };
      
      const assignmentData = insertRoomAssignmentSchema.parse({
        ...processedBody,
        createdByAdminId: req.user!.id,
      });
      
      const assignment = await storage.createRoomAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      next(error);
    }
  });


  // Meeting topics
  app.get("/api/topics", requireAuth, async (req, res, next) => {
    try {
      const topics = await storage.getMeetingTopics();
      res.json(topics);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/topics", requireAdmin, async (req, res, next) => {
    try {
      const topicData = insertMeetingTopicSchema.parse({
        ...req.body,
        createdByAdminId: req.user!.id,
      });
      
      const topic = await storage.createMeetingTopic(topicData);
      res.status(201).json(topic);
    } catch (error) {
      next(error);
    }
  });

  // Suggestions
  app.get("/api/suggestions", requireAuth, async (req, res, next) => {
    try {
      const suggestions = await storage.getAllSuggestions();
      res.json(suggestions);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/suggestions", requireAuth, async (req, res, next) => {
    try {
      const suggestionData = insertSuggestionSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      const suggestion = await storage.createSuggestion(suggestionData);
      res.status(201).json(suggestion);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/suggestions/:id/status", requireAdmin, async (req, res, next) => {
    try {
      const { status } = req.body;
      await storage.updateSuggestionStatus(req.params.id, status);
      res.json({ message: "Suggestion status updated" });
    } catch (error) {
      next(error);
    }
  });

  // Rankings
  app.get("/api/rankings", requireAuth, async (req, res, next) => {
    try {
      const rankings = await storage.getMemberRankings();
      res.json(rankings);
    } catch (error) {
      next(error);
    }
  });

  // Financial management
  app.get("/api/financial/account/:userId", requireAuth, async (req, res, next) => {
    try {
      const { userId } = req.params;
      
      if (req.user!.role !== "ADMIN" && req.user!.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const account = await storage.getFinancialAccount(userId);
      if (!account) {
        const newAccount = await storage.getOrCreateFinancialAccount(userId);
        return res.json(newAccount);
      }
      
      res.json(account);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/financial/accounts", requireAdmin, async (req, res, next) => {
    try {
      const accounts = await storage.getAllFinancialAccounts();
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/financial/transactions/:userId", requireAuth, async (req, res, next) => {
    try {
      const { userId } = req.params;
      
      if (req.user!.role !== "ADMIN" && req.user!.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const transactions = await storage.getTransactionHistory(userId);
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/financial/deposit", requireAdmin, async (req, res, next) => {
    try {
      const schema = z.object({
        userId: z.string(),
        amount: z.number().positive().or(z.string().transform(val => {
          const num = parseFloat(val);
          if (isNaN(num) || num <= 0) throw new Error("Amount must be a positive number");
          return num;
        })),
        description: z.string().optional(),
      });

      const { userId, amount, description } = schema.parse(req.body);
      
      const transaction = await storage.updateDepositBalance(
        userId,
        typeof amount === 'number' ? amount : parseFloat(amount),
        description || "Deposit",
        req.user!.id
      );

      res.status(201).json(transaction);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/financial/deduct", requireAdmin, async (req, res, next) => {
    try {
      const schema = z.object({
        userId: z.string(),
        amount: z.number().positive().or(z.string().transform(val => {
          const num = parseFloat(val);
          if (isNaN(num) || num <= 0) throw new Error("Amount must be a positive number");
          return num;
        })),
        transactionType: z.enum(["ROOM_FEE", "LATE_FEE", "CANCELLATION_PENALTY", "PRESENTER_PENALTY", "ANNUAL_FEE", "ADJUSTMENT"]),
        description: z.string().optional(),
        relatedAttendanceId: z.string().optional(),
      });

      const { userId, amount, transactionType, description, relatedAttendanceId } = schema.parse(req.body);
      
      const transaction = await storage.deductFromBalance(
        userId,
        typeof amount === 'number' ? amount : parseFloat(amount),
        transactionType,
        description || "Deduction",
        req.user!.id,
        relatedAttendanceId
      );

      res.status(201).json(transaction);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/financial/annual-fee/:userId", requireAdmin, async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { paid } = req.body;
      
      await storage.updateAnnualFee(userId, paid);
      res.json({ message: "Annual fee status updated" });
    } catch (error) {
      next(error);
    }
  });

  // Warning management
  app.get("/api/warnings", requireAdmin, async (req, res, next) => {
    try {
      const warnings = await storage.getAllActiveWarnings();
      res.json(warnings);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/warnings/user/:userId", requireAuth, async (req, res, next) => {
    try {
      const { userId } = req.params;
      
      if (req.user!.role !== "ADMIN" && req.user!.id !== userId) {
        return res.status(403).json({ message: "Cannot view other users' warnings" });
      }

      const warnings = await storage.getWarningsByUserId(userId);
      res.json(warnings);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/warnings/count/:userId", requireAuth, async (req, res, next) => {
    try {
      const { userId } = req.params;
      
      if (req.user!.role !== "ADMIN" && req.user!.id !== userId) {
        return res.status(403).json({ message: "Cannot view other users' warning count" });
      }

      const count = await storage.getUnresolvedWarningCount(userId);
      res.json({ count });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/warnings", requireAdmin, async (req, res, next) => {
    try {
      const schema = z.object({
        userId: z.string(),
        warningType: z.enum(["LOW_BALANCE", "CANCELLATION_PENALTY", "LATE_PENALTY", "ABSENCE_WARNING", "OTHER"]),
        reason: z.string(),
      });

      const data = schema.parse(req.body);
      
      const warning = await storage.createWarning({
        ...data,
        issuedByAdminId: req.user!.id,
        isResolved: false,
      });

      await storage.checkAndSuspendUser(data.userId);

      res.status(201).json(warning);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/warnings/:warningId/resolve", requireAdmin, async (req, res, next) => {
    try {
      const { warningId } = req.params;
      
      const warning = await storage.resolveWarning(warningId, req.user!.id);
      res.json(warning);
    } catch (error) {
      next(error);
    }
  });

  // Presenter management
  app.post("/api/presenters", requireAdmin, async (req, res, next) => {
    try {
      const presenterData = insertPresenterSchema.parse({
        ...req.body,
        assignedByAdminId: req.user!.id,
        submissionStatus: "NOT_SUBMITTED",
        penaltyApplied: false,
        penaltyAmount: "0.00",
      });
      
      const presenter = await storage.createPresenter(presenterData);
      res.status(201).json(presenter);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/presenters/upcoming", requireAuth, async (req, res, next) => {
    try {
      const presenters = await storage.getUpcomingPresenters();
      res.json(presenters);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/presenters/meeting/:date", requireAuth, async (req, res, next) => {
    try {
      const meetingDate = new Date(req.params.date);
      const presenters = await storage.getPresentersByMeetingDate(meetingDate);
      res.json(presenters);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/presenters/:id/submit-topic", requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { topicTitle } = req.body;
      
      const presenter = await storage.getPresenterById(id);
      if (!presenter) {
        return res.status(404).json({ message: "Presenter not found" });
      }

      if (presenter.userId !== req.user!.id && req.user!.role !== "ADMIN") {
        return res.status(403).json({ message: "You can only submit your own topics" });
      }

      const updatedPresenter = await storage.updatePresenterSubmissionStatus(
        id,
        "TOPIC_SUBMITTED",
        topicTitle
      );
      
      res.json(updatedPresenter);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/presenters/:id/submit-material", requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const presenter = await storage.getPresenterById(id);
      if (!presenter) {
        return res.status(404).json({ message: "Presenter not found" });
      }

      if (presenter.userId !== req.user!.id && req.user!.role !== "ADMIN") {
        return res.status(403).json({ message: "You can only submit your own materials" });
      }

      const updatedPresenter = await storage.updatePresenterSubmissionStatus(
        id,
        "MATERIAL_SUBMITTED"
      );
      
      res.json(updatedPresenter);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/presenters/:id/apply-penalty", requireAdmin, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      
      await storage.applyPresenterPenalty(id, amount, req.user!.id);
      res.json({ message: "Penalty applied successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Location management
  app.get("/api/locations", requireAuth, async (req, res, next) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/locations/active", requireAuth, async (req, res, next) => {
    try {
      const locations = await storage.getActiveLocations();
      res.json(locations);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/locations/:id", requireAuth, async (req, res, next) => {
    try {
      const location = await storage.getLocationById(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/locations", requireAdmin, async (req, res, next) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);
      res.status(201).json(location);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/locations/:id", requireAdmin, async (req, res, next) => {
    try {
      const updates = insertLocationSchema.partial().parse(req.body);
      const location = await storage.updateLocation(req.params.id, updates);
      res.json(location);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/locations/:id", requireAdmin, async (req, res, next) => {
    try {
      await storage.deleteLocation(req.params.id);
      res.json({ message: "Location deactivated successfully" });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
