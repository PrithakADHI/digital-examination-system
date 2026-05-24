import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { Toaster } from "react-hot-toast";
import AdminLayout from "./components/layout/AdminLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ExaminationsPage from "./pages/ExaminationsPage.jsx";
import ExaminationFormPage from "./pages/ExaminationFormPage.jsx";
import ExamCentersPage from "./pages/ExamCentersPage.jsx";
import UserPage from "./pages/UserPage.jsx";
import TeacherLayout from "./components/layout/TeacherLayout.jsx";
import TeacherDashboardPage from "./pages/TeacherDashboardPage.jsx";
import TeacherQuestionsPage from "./pages/TeacherQuestionsPage.jsx";
import TeacherQuestionCreatePage from "./pages/TeacherQuestionCreatePage.jsx";
import TeacherAnswersPage from "./pages/TeacherAnswersPage.jsx";
import TeacherSubmissionsPage from "./pages/TeacherSubmissionsPage.jsx";
import TeacherGradingPage from "./pages/TeacherGradingPage.jsx";
import AnswersPage from "./pages/AnswersPage.jsx";
import TeacherStudentsPage from "./pages/TeacherStudentsPage.jsx";
import AdminQuestionsReviewPage from "./pages/AdminQuestionsReviewPage.jsx";
import AdminQuestionsReviewDetailPage from "./pages/AdminQuestionsReviewDetailPage.jsx";

import StudentLayout from "./components/layout/StudentLayout.jsx";
import StudentDashboardPage from "./pages/StudentDashboardPage.jsx";
import StudentExaminationsPage from "./pages/StudentExaminationsPage.jsx";
import StudentExaminationDetailPage from "./pages/StudentExaminationDetailPage.jsx";

function RootRedirect() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user.role === "TEACHER") {
        return <Navigate to="/teacher" replace />;
      }
      if (user.role === "STUDENT") {
        return <Navigate to="/student" replace />;
      }
    } catch (e) {
      console.error("Failed to parse user data", e);
    }
  }
  return <Navigate to="/admin" replace />;
}


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Toaster position="top-right" reverseOrder={false} />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="examinations" element={<ExaminationsPage />} />
                <Route path="examinations/new" element={<ExaminationFormPage />} />
                <Route path="examinations/edit/:id" element={<ExaminationFormPage />} />
                <Route path="centers" element={<ExamCentersPage />} />
                <Route path="users" element={<UserPage />} />
                <Route path="answers" element={<AnswersPage />} />
                <Route path="questions-review" element={<AdminQuestionsReviewPage />} />
                <Route path="questions-review/:paperId" element={<AdminQuestionsReviewDetailPage />} />
              </Route>

              {/* Teacher Routes */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute>
                    <TeacherLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<TeacherDashboardPage />} />
                <Route path="questions" element={<TeacherQuestionsPage />} />
                <Route path="questions/create/:subjectId" element={<TeacherQuestionCreatePage />} />
                <Route path="answers" element={<TeacherAnswersPage />} />
                <Route path="answers/:subjectId" element={<TeacherSubmissionsPage />} />
                <Route path="grading/:subjectId/:studentId" element={<TeacherGradingPage />} />
                <Route path="students" element={<TeacherStudentsPage />} />
              </Route>

              {/* Student Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute>
                    <StudentLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<StudentDashboardPage />} />
                <Route path="examinations" element={<StudentExaminationsPage />} />
                <Route path="examinations/:id" element={<StudentExaminationDetailPage />} />
              </Route>

              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
