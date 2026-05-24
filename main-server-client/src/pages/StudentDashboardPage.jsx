import StudentProfileCard from "../components/dashboard/student/StudentProfileCard.jsx";
import StudentExamSummaryCard from "../components/dashboard/student/StudentExamSummaryCard.jsx";
import StudentUpcomingCard from "../components/dashboard/student/StudentUpcomingCard.jsx";
import StudentPerformanceTrendCard from "../components/dashboard/student/StudentPerformanceTrendCard.jsx";

export default function StudentDashboardPage() {
  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 md:py-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Student Workspace</h1>
          <p className="text-sm md:text-base text-base-content/50 mt-1 font-medium">Manage your academic progress, upcoming exam schedule, and results history.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 h-full">
          <StudentProfileCard />
        </div>
        <div className="lg:col-span-1 h-full">
          <StudentExamSummaryCard />
        </div>
        <div className="lg:col-span-1 h-full">
          <StudentUpcomingCard />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <StudentPerformanceTrendCard />
      </div>
    </div>
  );
}
