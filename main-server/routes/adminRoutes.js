import express from "express";
import {
  createCenter,
  getAllCenters,
  getCenterById,
  updateCenter,
  patchCenter,
  deleteCenter,
  createComprehensiveExamination,
  getAllExaminations,
  getExaminationById,
  updateExamination,
  patchExaminationCenters,
  deleteExamination,
  getExamSummary,
  getUserCounts,
  getTopStudents,
  getExamsCreationTrend,
  getExamAverageScores,
  getAllSubjectPapers,
  getSubjectPaperById,
  createUser,
  bulkCreateUsers,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignStudentsForChecking,
  assignBulkStudentsForChecking,
  getAnswersBySubject,
  deactivateUser,
  activateUser,
  getQuestionsReviewList,
  getQuestionsReviewDetail,
  approveOrDisapproveQuestionPaper
} from "../controllers/adminController.js";
import { verifyLoggedIn, verifyAdmin } from "../middlewares/authMiddleware.js";

const adminRouter = express.Router();

// CRUD Examination Center routes
adminRouter.post("/center", verifyLoggedIn, verifyAdmin, createCenter);
adminRouter.get("/center", verifyLoggedIn, verifyAdmin, getAllCenters);
adminRouter.get("/center/:id", verifyLoggedIn, verifyAdmin, getCenterById);
adminRouter.put("/center/:id", verifyLoggedIn, verifyAdmin, updateCenter);
adminRouter.patch("/center/:id", verifyLoggedIn, verifyAdmin, patchCenter);
adminRouter.delete("/center/:id", verifyLoggedIn, verifyAdmin, deleteCenter);

// Dashboard
adminRouter.get("/dashboard/exam-summary", verifyLoggedIn, verifyAdmin, getExamSummary);
adminRouter.get("/dashboard/user-counts", verifyLoggedIn, verifyAdmin, getUserCounts);
adminRouter.get("/dashboard/top-students", verifyLoggedIn, verifyAdmin, getTopStudents);
adminRouter.get("/dashboard/exams-creation-trend", verifyLoggedIn, verifyAdmin, getExamsCreationTrend);
adminRouter.get("/dashboard/exam-average-scores", verifyLoggedIn, verifyAdmin, getExamAverageScores);

// Comprehensive Examination creation, fetch, update, delete
adminRouter.post("/examination", verifyLoggedIn, verifyAdmin, createComprehensiveExamination);
adminRouter.get("/examination", verifyLoggedIn, verifyAdmin, getAllExaminations);
adminRouter.get("/examination/:id", verifyLoggedIn, verifyAdmin, getExaminationById);
adminRouter.put("/examination/:id", verifyLoggedIn, verifyAdmin, updateExamination);
adminRouter.patch("/examination/:id/centers", verifyLoggedIn, verifyAdmin, patchExaminationCenters);
adminRouter.delete("/examination/:id", verifyLoggedIn, verifyAdmin, deleteExamination);

// CRUD Subject Paper routes

adminRouter.get("/subject-paper", verifyLoggedIn, verifyAdmin, getAllSubjectPapers);
adminRouter.get("/subject-paper/:id", verifyLoggedIn, verifyAdmin, getSubjectPaperById);

// CRUD User routes
adminRouter.post("/users", verifyLoggedIn, verifyAdmin, createUser);
adminRouter.post("/users/bulk", verifyLoggedIn, verifyAdmin, bulkCreateUsers);
adminRouter.get("/users", verifyLoggedIn, verifyAdmin, getAllUsers);
adminRouter.get("/users/:id", verifyLoggedIn, verifyAdmin, getUserById);
adminRouter.put("/users/:id", verifyLoggedIn, verifyAdmin, updateUser);
adminRouter.delete("/users/:id", verifyLoggedIn, verifyAdmin, deleteUser);

// Status Management (Soft Delete)
adminRouter.patch("/users/:id/deactivate", verifyLoggedIn, verifyAdmin, deactivateUser);
adminRouter.patch("/users/:id/activate", verifyLoggedIn, verifyAdmin, activateUser);

// Administrative Question Review routes
adminRouter.get("/questions-review", verifyLoggedIn, verifyAdmin, getQuestionsReviewList);
adminRouter.get("/questions-review/:paperId", verifyLoggedIn, verifyAdmin, getQuestionsReviewDetail);
adminRouter.post("/questions-review/:paperId/action", verifyLoggedIn, verifyAdmin, approveOrDisapproveQuestionPaper);

// Student Assignment
adminRouter.post("/assign-students-for-checking", verifyLoggedIn, verifyAdmin, assignStudentsForChecking);
adminRouter.post("/assign-bulk-students", verifyLoggedIn, verifyAdmin, assignBulkStudentsForChecking);
adminRouter.get("/answers/subject/:subject_fk_id", verifyLoggedIn, verifyAdmin, getAnswersBySubject);

export default adminRouter;
