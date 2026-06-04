import express from "express";
import bodyParser from "body-parser";
import passport from "passport";
import { ExtractJwt, Strategy as JWTStrategy } from "passport-jwt";
import cors from "cors";
import dotenv from "dotenv";

import sequelize from "./database.js";
import User from "./models/User.js";

import ExamAnswerToken from "./models/ExamAnswerToken.js";
import Examination from "./models/Examination.js";
import ExaminationCenter from "./models/ExaminationCenter.js";
import ExamStudent from "./models/ExamStudent.js";
import PaperQuestion from "./models/PaperQuestion.js";
import StudentAnswerMarks from "./models/StudentAnswerMarks.js";
import StudentQuestionAnswer from "./models/StudentQuestionAnswer.js";
import SubjectPaper from "./models/SubjectPaper.js";
import SubjectStudentCheckerAssignment from "./models/SubjectStudentCheckerAssignment.js";
import Token from "./models/Token.js";
import PasswordResetToken from "./models/PasswordResetToken.js";
import OnboardingInstitution from "./models/OnboardingInstitution.js";

import authRouter from "./routes/authRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import teacherRouter from "./routes/teacherRoutes.js";
import studentRouter from "./routes/studentRoutes.js";
import proxyRouter from "./routes/proxyRoutes.js";
import setupAssociations from "./models/associations.js";

setupAssociations();

import http from "http";

dotenv.config();

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
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const server = http.createServer(app);

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Express is up." });
});

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/teacher", teacherRouter);
app.use("/student", studentRouter);
app.use("/proxy", proxyRouter);

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
    await sequelize.authenticate();
    console.log("Database connected successfully.");
    await PasswordResetToken.sync();
    // await sequelize.sync({ alter: true });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Unable to connect to the database:", err);
  }
};

runApp();
