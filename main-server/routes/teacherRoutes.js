import express from "express";
import multer from "multer";
import {
    getAllQuestionsToSet,
    createQuestion,
    getQuestionPaperById,
    getAllAssignedPapersToCheck,
    getAllStudentsAnswersToCheck,
    getStudentAnswersBySubject,
    getAnswerById,
    assignQuestionMark,
    assignSubjectMarks,
    getStudentById,
    getAllStudentInTeacherCenter,
    getTeacherExamSummary,
    getTeacherUpcomingExaminations,
    getTeacherTopStudents,
    getTeacherAverageResultsOverExaminations,
    createStudent,
    updateStudent,
    deactivateStudent,
    activateStudent,
    deleteStudent,
    uploadQuestionImage,
} from "../controllers/teacherController.js";
import { verifyLoggedIn, verifyTeacher } from "../middlewares/authMiddleware.js";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const teacherRouter = express.Router();

// Get all subjects assigned to a teacher to set questions for
teacherRouter.get("/all-questions-to-set", verifyLoggedIn, verifyTeacher, getAllQuestionsToSet);

// Upload a question image to Cloudinary
teacherRouter.post("/upload-image", verifyLoggedIn, verifyTeacher, upload.single("image"), uploadQuestionImage);

// Create paper and questions for an assigned subject
teacherRouter.post("/create-question", verifyLoggedIn, verifyTeacher, createQuestion);

// Get decrypted question paper for an assigned subject (before lockout)
teacherRouter.get("/question-paper/:subjectId", verifyLoggedIn, verifyTeacher, getQuestionPaperById);


// 1. Fetch list of subject papers that are assigned to currently logged in user
teacherRouter.get("/assigned-papers-to-check", verifyLoggedIn, verifyTeacher, getAllAssignedPapersToCheck);

// 2. Fetch list of all student answers (all subjects or one subject)
teacherRouter.get("/all-student-answers-to-check", verifyLoggedIn, verifyTeacher, getAllStudentsAnswersToCheck);
teacherRouter.get("/student-answers-to-check/:subject_fk_id", verifyLoggedIn, verifyTeacher, getAllStudentsAnswersToCheck);

// 2b. Fetch all answers of one assigned student for one subject
teacherRouter.get("/student-answers-to-check/:subject_fk_id/student/:student_user_fk_id", verifyLoggedIn, verifyTeacher, getStudentAnswersBySubject);

// 3. Fetch specific answer and decrypt
teacherRouter.get("/answer/:answer_id", verifyLoggedIn, verifyTeacher, getAnswerById);

// 3c. Assign marks to a specific question answer
teacherRouter.post("/assign-question-mark", verifyLoggedIn, verifyTeacher, assignQuestionMark);

// 4. Assign marks for a subject
teacherRouter.post("/assign-subject-marks", verifyLoggedIn, verifyTeacher, assignSubjectMarks);

// 5. Get student details and results
teacherRouter.get("/student/:student_id", verifyLoggedIn, verifyTeacher, getStudentById);

// 6. Get all students in a teacher's center
teacherRouter.get("/center-students", verifyLoggedIn, verifyTeacher, getAllStudentInTeacherCenter);

// Student CRUD operations
teacherRouter.post("/student", verifyLoggedIn, verifyTeacher, createStudent);
teacherRouter.put("/student/:student_id", verifyLoggedIn, verifyTeacher, updateStudent);
teacherRouter.patch("/student/:student_id/deactivate", verifyLoggedIn, verifyTeacher, deactivateStudent);
teacherRouter.patch("/student/:student_id/activate", verifyLoggedIn, verifyTeacher, activateStudent);
teacherRouter.delete("/student/:student_id", verifyLoggedIn, verifyTeacher, deleteStudent);

// Dashboard routes
teacherRouter.get("/dashboard/exam-summary", verifyLoggedIn, verifyTeacher, getTeacherExamSummary);
teacherRouter.get("/dashboard/upcoming-examinations", verifyLoggedIn, verifyTeacher, getTeacherUpcomingExaminations);
teacherRouter.get("/dashboard/top-students", verifyLoggedIn, verifyTeacher, getTeacherTopStudents);
teacherRouter.get("/dashboard/average-results-over-examinations", verifyLoggedIn, verifyTeacher, getTeacherAverageResultsOverExaminations);

export default teacherRouter;
