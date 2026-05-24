export const adminKeys = {
  all: ["admin"],
  dashboard: () => [...adminKeys.all, "dashboard"],
  examSummary: () => [...adminKeys.dashboard(), "exam-summary"],
  userCounts: () => [...adminKeys.dashboard(), "user-counts"],
  topStudents: () => [...adminKeys.dashboard(), "top-students"],
  examsCreationTrend: () => [...adminKeys.dashboard(), "exams-creation-trend"],
  examAverageScores: () => [...adminKeys.dashboard(), "exam-average-scores"],
  examinations: (params) => [...adminKeys.all, "examinations", params ?? {}],
  examination: (id) => [...adminKeys.all, "examination", id],
  centers: (params) => [...adminKeys.all, "centers", params ?? {}],
  users: (params) => [...adminKeys.all, "users", params ?? {}],
  answersBySubject: (subjectId) => [...adminKeys.all, "answersBySubject", subjectId],
};

export const teacherKeys = {
  all: ["teacher"],
  dashboard: () => [...teacherKeys.all, "dashboard"],
  examSummary: () => [...teacherKeys.dashboard(), "exam-summary"],
  upcomingExaminations: () => [...teacherKeys.dashboard(), "upcoming-examinations"],
  topStudents: () => [...teacherKeys.dashboard(), "top-students"],
  averageResultsOverExaminations: () => [...teacherKeys.dashboard(), "average-results-over-examinations"],
  questions: () => [...teacherKeys.all, "questions"],
  assignedQuestionsToWrite: () => [...teacherKeys.questions(), "assigned-to-write"],
  assignedPapersToCheck: () => [...teacherKeys.all, "assigned-papers-to-check"],
  allSubmissions: () => [...teacherKeys.all, "all-submissions"],
  studentsToGrade: (subjectId) => [...teacherKeys.all, "students-to-grade", subjectId],
  studentSubmission: (subjectId, studentId) => [...teacherKeys.all, "submission", subjectId, studentId],
  centerStudents: () => [...teacherKeys.all, "center-students"],
  studentDetail: (studentId) => [...teacherKeys.all, "student-detail", studentId],
};

export const studentKeys = {
  all: ["student"],
  profile: () => [...studentKeys.all, "profile"],
  dashboard: () => [...studentKeys.all, "dashboard"],
  examSummary: () => [...studentKeys.dashboard(), "exam-summary"],
  upcomingExaminations: () => [...studentKeys.dashboard(), "upcoming-examinations"],
  averageResultsOverExaminations: () => [...studentKeys.dashboard(), "results-trend"],
  examinations: () => [...studentKeys.all, "examinations"],
  examinationDetail: (id) => [...studentKeys.all, "examination-detail", id],
};

