import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuestionsReviewList } from "../hooks/useAdminQueries.js";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Real-Time Countdown widget for each review item
function ReviewLockoutCountdown({ deadline, isLocked }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [urgency, setUrgency] = useState("normal");

  useEffect(() => {
    if (isLocked || !deadline) {
      setTimeLeft("Locked");
      setUrgency("critical");
      return;
    }

    const targetDate = new Date(deadline);

    const calculateTime = () => {
      const now = new Date();
      const diffMs = targetDate - now;

      if (diffMs <= 0) {
        setTimeLeft("Locked");
        setUrgency("critical");
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (days > 3) {
        setTimeLeft(`${days}d ${hours}h remaining`);
        setUrgency("normal");
      } else if (days > 0) {
        setTimeLeft(`${days}d ${hours}h remaining`);
        setUrgency("warning");
      } else {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s remaining`);
        setUrgency("critical");
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [deadline, isLocked]);

  if (timeLeft === "Locked") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-error/10 text-error border border-error/20 font-bold text-xs uppercase tracking-widest mt-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Locked (Secure)
      </div>
    );
  }

  const badgeClass =
    urgency === "critical"
      ? "bg-error/10 text-error border-error/20 animate-pulse"
      : urgency === "warning"
      ? "bg-warning/10 text-warning border-warning/20"
      : "bg-primary/10 text-primary border-primary/20";

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs ${badgeClass} mt-1`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{timeLeft}</span>
    </div>
  );
}

export default function AdminQuestionsReviewPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useQuestionsReviewList();
  const [filter, setFilter] = useState("ALL");

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filteredRows = useMemo(() => {
    if (filter === "ALL") return rows;
    return rows.filter((r) => r.paper_status === filter);
  }, [rows, filter]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="text-sm font-bold uppercase tracking-wider text-base-content/40">Loading review records...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card card max-w-xl mx-auto shadow-2xl border border-error/20 my-12 overflow-hidden">
        <div className="card-body p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto border border-error/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Failed to load papers for review</h2>
          <p className="text-base-content/60 text-sm max-w-md mx-auto">{error?.response?.data?.error ?? error?.message ?? "An unexpected connection error occurred."}</p>
          <button type="button" className="btn btn-primary rounded-xl px-8" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return <span className="badge bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-sm">APPROVED</span>;
      case "SUBMITTED":
        return <span className="badge bg-info/10 text-info border-info/20 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-sm">SUBMITTED FOR REVIEW</span>;
      case "DISAPPROVED":
        return <span className="badge bg-error/10 text-error border-error/20 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-sm">REVISION REQUIRED</span>;
      case "DRAFT":
        return <span className="badge bg-warning/10 text-warning border-warning/20 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-sm">IN DRAFT</span>;
      default:
        return <span className="badge bg-base-300 text-base-content/60 border-base-300 font-bold text-[10px] px-2.5 py-1.5 rounded-lg">NOT STARTED</span>;
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-base-300/40 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="text-[10px] uppercase font-black text-primary tracking-widest block mb-1">ADMIN CONTROL</span>
            <h1 className="text-3xl font-black tracking-tight">Question Paper Audits</h1>
            <p className="text-sm text-base-content/50 font-medium mt-1">Audit, approve, and track question paper drafting progress and deadlines.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["ALL", "NOT_STARTED", "DRAFT", "SUBMITTED", "APPROVED", "DISAPPROVED"].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-xs rounded-lg px-3 py-1 font-bold ${
                  filter === st
                    ? "btn-primary shadow-sm"
                    : "btn-ghost border border-base-300 hover:bg-base-200"
                }`}
                onClick={() => setFilter(st)}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
      </div>

      {/* Audit cards list */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredRows.length === 0 ? (
          <div className="xl:col-span-2 glass-card border border-base-300/40 rounded-3xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4 text-base-content/30 border border-base-300/40">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold tracking-tight">No Question Papers to Audit</h3>
            <p className="text-sm text-base-content/40 max-w-sm mx-auto mt-1">No question papers fit the current status selection.</p>
          </div>
        ) : (
          filteredRows.map((row) => {
            const isLocked = row.is_locked;
            const hasPaper = row.paper_status !== "NOT_STARTED";
            const canReview = !isLocked && ["SUBMITTED", "APPROVED", "DISAPPROVED"].includes(row.paper_status);

            return (
              <div 
                key={row.subject_id} 
                className={`glass-card rounded-3xl p-6 border transition-all duration-300 hover:shadow-xl flex flex-col justify-between ${
                  isLocked 
                    ? "border-base-300/30 opacity-75 bg-base-300/10" 
                    : row.paper_status === "SUBMITTED"
                    ? "border-info/30 bg-info/[0.01]"
                    : "border-base-300/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <span className="font-mono text-xs text-base-content/45 font-bold uppercase tracking-widest">{row.exam_name_txt}</span>
                    {getStatusBadge(row.paper_status)}
                  </div>

                  <h3 className="text-xl font-bold tracking-tight text-base-content mb-2">
                    {row.subject_name_txt}
                  </h3>

                  <div className="space-y-2 mb-4 text-xs font-semibold text-base-content/70">
                    <div className="flex justify-between bg-base-200/40 p-3 rounded-xl">
                      <span className="text-base-content/45 font-bold uppercase tracking-wider text-[10px]">Setter Assignment</span>
                      <span className="text-primary font-bold">{row.setter_name} (Setter #{row.setter_id})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-base-200/40 p-3 rounded-xl">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-base-content/40 block mb-0.5">Marks Threshold</span>
                        <span>{row.full_marks} Marks (Pass: {row.pass_marks})</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-base-content/40 block mb-0.5">Exam Date</span>
                        <span>{formatDate(row.exam_startTime_ts)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-base-300/30">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-base-content/40 block mb-0.5">Review Cutoff Clock</span>
                    <ReviewLockoutCountdown deadline={row.review_deadline} isLocked={isLocked} />
                  </div>

                  <div className="flex gap-2">
                    {canReview && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary rounded-xl font-bold hover:scale-105 active:scale-95 transition-all px-5 shadow-md shadow-primary/10"
                        onClick={() => navigate(`/admin/questions-review/${row.paper_id}`)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Review Paper
                      </button>
                    )}

                    {!canReview && hasPaper && !isLocked && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline border-base-300 rounded-xl hover:bg-base-200 text-base-content/50 font-bold transition-all px-4"
                        onClick={() => navigate(`/admin/questions-review/${row.paper_id}`)}
                      >
                        Preview Draft
                      </button>
                    )}

                    {!hasPaper && (
                      <span className="text-xs text-base-content/40 italic font-semibold py-2">
                        Drafting not initiated
                      </span>
                    )}

                    {isLocked && (
                      <button
                        type="button"
                        className="btn btn-sm btn-disabled border-none bg-base-300/40 rounded-xl text-base-content/30 font-bold px-4 cursor-not-allowed"
                        disabled
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Locked
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
