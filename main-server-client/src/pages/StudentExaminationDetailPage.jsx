import { useParams, useNavigate } from "react-router-dom";
import { useStudentExaminationDetail } from "../hooks/useStudentQueries.js";

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function StudentExaminationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useStudentExaminationDetail(id);
  const now = new Date();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 bg-base-100/50 rounded-2xl glass-card">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="text-sm font-bold opacity-40 tracking-widest uppercase">Fetching Details...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="alert alert-error glass-card border-error/20 shadow-xl animate-fade-in">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-bold">{error?.response?.data?.error ?? error?.message ?? "Failed to load examination detail"}</span>
      </div>
    );
  }

  const exam = data ?? {};
  const subjects = Array.isArray(exam.subjects) ? exam.subjects : [];

  const resultPublished = exam.result_time_ts ? new Date(exam.result_time_ts) <= now : false;

  // Determine overall status based on subjects
  let overallStatus = "PENDING";
  if (resultPublished) {
    const hasFail = subjects.some((sub) => sub.status === "FAIL");
    const hasPending = subjects.some((sub) => sub.status === "PENDING");
    overallStatus = hasFail ? "FAIL" : hasPending ? "PENDING" : "PASS";
  }

  const overallStatusBadge = () => {
    if (overallStatus === "PASS") {
      return (
        <span className="badge badge-success px-4 py-3 text-xs font-black uppercase tracking-wider shadow-lg shadow-success/20">
          Passed
        </span>
      );
    }
    if (overallStatus === "FAIL") {
      return (
        <span className="badge badge-error px-4 py-3 text-xs font-black uppercase tracking-wider shadow-lg shadow-error/20">
          Failed
        </span>
      );
    }
    return (
      <span className="badge badge-neutral px-4 py-3 text-xs font-black uppercase tracking-wider opacity-60">
        Results Pending
      </span>
    );
  };

  const percentageScored =
    exam.total_full_marks > 0 && exam.total_marks_obtained !== null
      ? Math.round((Number(exam.total_marks_obtained) * 100) / Number(exam.total_full_marks))
      : null;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in px-2 md:px-0">
      {/* Back navigation header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="btn btn-ghost rounded-xl pl-2 pr-4 hover:bg-base-200/50 flex items-center gap-2"
          onClick={() => navigate("/student/examinations")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider">Back to Examinations</span>
        </button>
      </div>

      {/* Main Examination Heading Card */}
      <div className="glass-card card shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-base-content/95">{exam.exam_name_txt}</h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-xs opacity-60 font-medium">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base-content">Exam Schedule:</span>
                <span>{formatDate(exam.exam_startTime_ts)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base-content">Result Publication Date:</span>
                <span>{formatDate(exam.result_time_ts)}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0">{overallStatusBadge()}</div>
        </div>
      </div>

      {/* Results Overview Metrics */}
      {resultPublished && percentageScored !== null ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card card p-6 shadow-sm flex flex-row items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-base-content/40 tracking-wider">Total Marks Obtained</p>
              <h2 className="text-xl font-extrabold mt-1 text-base-content/90">
                {exam.total_marks_obtained} <span className="text-sm font-semibold opacity-40">/ {exam.total_full_marks}</span>
              </h2>
            </div>
          </div>

          <div className="glass-card card p-6 shadow-sm flex flex-row items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-base-content/40 tracking-wider">Overall Percentage</p>
              <h2 className="text-xl font-extrabold mt-1 text-base-content/90">{percentageScored}%</h2>
            </div>
          </div>

          <div className="glass-card card p-6 shadow-sm flex flex-row items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              overallStatus === "PASS" ? "bg-emerald-500/10 text-emerald-600" : overallStatus === "FAIL" ? "bg-error/10 text-error" : "bg-neutral/10 text-neutral-content"
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-base-content/40 tracking-wider">Final Decision</p>
              <h2 className="text-xl font-extrabold mt-1 text-base-content/90 uppercase tracking-wide">
                {overallStatus === "PASS" ? "PASSED" : overallStatus === "FAIL" ? "FAILED" : "PENDING"}
              </h2>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 border border-primary/10 bg-primary/5 rounded-2xl flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold animate-pulse shrink-0">
            i
          </div>
          <p className="text-xs font-semibold leading-relaxed text-primary/80">
            Results have not been officially published for this examination yet. You can inspect subject scheduling below, but scores will remain hidden until the publication date.
          </p>
        </div>
      )}

      {/* Subjects Grade report Table */}
      <div className="glass-card shadow-sm border border-base-300/30 overflow-hidden">
        <div className="p-8 border-b border-base-300/30 bg-base-200/20">
          <h2 className="text-lg font-bold tracking-tight">Subject-wise Performance</h2>
          <p className="text-xs text-base-content/50 font-medium mt-1">Detailed scores and evaluation feedback from your graders.</p>
        </div>

        <div className="overflow-x-auto px-6 pb-6 mt-4">
          <table className="table table-md w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-base-content/40 uppercase tracking-widest text-[10px] font-black">
                <th className="bg-transparent border-none pl-4">Subject Name</th>
                <th className="bg-transparent border-none">Scheduled Time</th>
                <th className="bg-transparent border-none text-center">Full Marks</th>
                <th className="bg-transparent border-none text-center">Pass Marks</th>
                <th className="bg-transparent border-none text-center">Marks Obtained</th>
                <th className="bg-transparent border-none text-center">Result Status</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub, idx) => (
                <tr key={idx} className="group/tr transition-all duration-300">
                  <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-l border-base-300/30 rounded-l-2xl pl-4 py-5">
                    <span className="font-bold text-sm block group-hover/tr:text-primary transition-colors">{sub.subject_name_txt}</span>
                  </td>
                  <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30">
                    <span className="text-[11px] font-semibold text-base-content/70">{formatDate(sub.exam_startTime_ts)}</span>
                  </td>
                  <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 text-center font-semibold text-xs text-base-content/60">
                    {sub.full_marks}
                  </td>
                  <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 text-center font-semibold text-xs text-base-content/60">
                    {sub.pass_marks}
                  </td>
                  <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 text-center font-bold text-sm">
                    {sub.marks_obtained !== null ? (
                      <span className={sub.status === "PASS" ? "text-success" : "text-error"}>
                        {sub.marks_obtained}
                      </span>
                    ) : (
                      <span className="opacity-30 italic text-xs font-medium">Hidden</span>
                    )}
                  </td>
                  <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-r border-base-300/30 rounded-r-2xl text-center">
                    {sub.status === "PASS" ? (
                      <span className="badge badge-success py-2 text-[9px] font-black uppercase tracking-wider">Pass</span>
                    ) : sub.status === "FAIL" ? (
                      <span className="badge badge-error py-2 text-[9px] font-black uppercase tracking-wider">Fail</span>
                    ) : (
                      <span className="badge badge-ghost py-2 text-[9px] font-black uppercase tracking-wider opacity-55">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grader Feedback Sections */}
      {resultPublished && subjects.some((sub) => sub.feedback) && (
        <div className="space-y-4">
          <h3 className="text-base font-bold tracking-tight px-1">Evaluation & Feedback Notes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects
              .filter((sub) => sub.feedback)
              .map((sub, idx) => (
                <div key={idx} className="glass-card card shadow-sm p-5 border border-primary/5 hover:border-primary/10 transition-all duration-300">
                  <header className="flex items-center justify-between gap-3 border-b border-base-300/30 pb-3 mb-3">
                    <span className="font-bold text-xs text-base-content/80 uppercase tracking-tight">{sub.subject_name_txt}</span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${
                      sub.status === "PASS" ? "bg-emerald-500/10 text-emerald-600" : "bg-error/10 text-error"
                    }`}>
                      {sub.status}
                    </span>
                  </header>
                  <blockquote className="text-[11px] leading-relaxed italic opacity-75 font-medium border-l-2 border-primary/20 pl-3 py-1">
                    &ldquo;{sub.feedback}&rdquo;
                  </blockquote>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
