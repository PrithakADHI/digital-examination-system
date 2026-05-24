import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import passport from "passport";
import { ExtractJwt, Strategy as JWTStrategy } from "passport-jwt";
import cors from "cors";

import User from "./models/User.js";

import authRouter from "./routes/authRoutes.js";
import sequelizeSqlite from "./sqliteDatabase.js";
import ProxySetting from "./models/ProxySetting.js";
import StudentAnswer from "./models/StudentAnswer.js";
import { 
    getExaminations, 
    getStudents,
    selectExamination, 
    initializeCronJobs, 
    getLocalQuestions,
    removeExamination 
} from "./controllers/examinationController.js";
import { 
    registerClient, 
    heartbeat, 
    getQuestionForClient, 
    getClients,
    deleteClient,
    monitorHeartbeats
} from "./controllers/clientController.js";
import { runCode } from "./controllers/runCodeController.js";
import DockerPool from "./utils/DockerPool.js";
import { submitAnswer, syncAnswersToMain, getUnsyncedAnswers, getUnsyncedCount } from "./controllers/answerController.js";
import http from "http";

const PORT = process.env.PORT || 8000;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.SECRET_KEY,
};

const strategy = new JWTStrategy(jwtOptions, async (jwt_payload, done) => {
  try {
    const user = await User.findByPk(jwt_payload.id);
    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  } catch (err) {
    return done(err, false);
  }
});

passport.use(strategy);

const app = express();

app.use(cors());
app.use(passport.initialize());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/question-images", express.static("question-images"));

const server = http.createServer(app);

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Express is up." });
});

app.use("/auth", authRouter);

// Examination Routes
app.get("/examinations", getExaminations);
app.get("/students", getStudents);
app.post("/select-examination", selectExamination);
app.post("/remove-examination", removeExamination);
app.get("/questions", getLocalQuestions);
app.post("/run-code", runCode);

// Client-specific routes (Examination PCs)
app.post("/register-client", registerClient);
app.post("/heartbeat/:client_id", heartbeat);
app.get("/question-for-client", getQuestionForClient);
app.get("/clients", getClients);
app.delete("/clients/:client_id", deleteClient);
import Client from "./models/Client.js";

// Custom Middleware for Student PC Authentication
const authenticateStudentPC = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // 1. Try checking if it's a Client UUID first (The Terminal Token)
    const client = await Client.findOne({ where: { token } });
    if (client) {
      req.client = client;
      return next();
    }

    // 2. Fallback to JWT Strategy (The Regular User Token)
    passport.authenticate("jwt", { session: false })(req, res, next);
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Authentication internal error" });
  }
};

// Answer Routes
app.post("/submit-answer", authenticateStudentPC, submitAnswer);
app.post("/sync-answers", syncAnswersToMain);
app.get("/unsynced-answers", getUnsyncedAnswers);
app.get("/unsynced-count", getUnsyncedCount);


// Protected route example
app.get(
  "/auth/profile",
  (req, res, next) => {
    passport.authenticate("jwt", { session: false }, (err, user, info) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "An error occurred during authentication." });
      }
      if (!user) {
        return res
          .status(401)
          .json({ error: "Unauthorized. Token is missing or invalid." });
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  (req, res) => {
    res.json({ message: "This is a protected route.", user: req.user });
  }
);

// Database connection and server startup
const runApp = async () => {
  try {
    await sequelizeSqlite.authenticate();
    console.log("SQLite database connected successfully.");
    await sequelizeSqlite.sync({ alter: true });
    console.log("SQLite database synced.");

    // Initialize cron jobs on startup
    await initializeCronJobs();

    // Initialize Docker Pool
    await DockerPool.initialize();

    // Start heartbeat monitor for clients (every 10s)
    setInterval(monitorHeartbeats, 10000);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Unable to connect to the database:", err);
  }
};

const handleShutdown = async () => {
  console.log("\n[Shutdown] Detected signal. Starting cleanup...");
  
  // Close the server first to stop accepting new requests
  server.close(async () => {
    console.log("[Shutdown] Server closed. Cleaning up Docker pool...");
    try {
      await DockerPool.cleanup();
      console.log("[Shutdown] Cleanup complete. Exiting.");
      process.exit(0);
    } catch (err) {
      console.error("[Shutdown] Cleanup error:", err);
      process.exit(1);
    }
  });
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

runApp();
