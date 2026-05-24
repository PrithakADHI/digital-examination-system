import express from "express";
import {
    getAllExaminations,
    getExaminationById,
    getStudentProfile,
    getStudentExamSummary,
    getStudentUpcomingExaminations,
    getStudentAverageResultsOverExaminations
} from "../controllers/studentController.js";
import { verifyLoggedIn } from "../middlewares/authMiddleware.js";

const studentRouter = express.Router();

studentRouter.get("/profile", verifyLoggedIn, getStudentProfile);
studentRouter.get("/dashboard/exam-summary", verifyLoggedIn, getStudentExamSummary);
studentRouter.get("/dashboard/upcoming-examinations", verifyLoggedIn, getStudentUpcomingExaminations);
studentRouter.get("/dashboard/results-trend", verifyLoggedIn, getStudentAverageResultsOverExaminations);

studentRouter.get("/examinations", verifyLoggedIn, getAllExaminations);
studentRouter.get("/examination/:id", verifyLoggedIn, getExaminationById);

export default studentRouter;
