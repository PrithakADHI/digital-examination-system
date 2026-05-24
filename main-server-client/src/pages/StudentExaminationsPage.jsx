import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentExaminations } from "../hooks/useStudentQueries.js";

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

function getStatusBadge(status) {
  if (status === "SUBMITTED") {
    return <span className="badge badge-success py-2.5 text-[9px] font-black uppercase tracking-tighter shadow-sm shadow-success/15">Submitted</span>;
  }
  if (status === "STARTED") {
    return <span className="badge badge-warning py-2.5 text-[9px] font-black uppercase tracking-tighter shadow-sm shadow-warning/15">In Progress</span>;
  }
  return <span className="badge badge-neutral py-2.5 text-[9px] font-black uppercase tracking-tighter opacity-65">Registered</span>;
}

export default function StudentExaminationsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useStudentExaminations();
  const list = Array.isArray(data) ? data : [];
  const now = new Date();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 bg-base-100/50 rounded-2xl glass-card">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="text-sm font-bold opacity-40 tracking-widest uppercase">Fetching Examinations...</span>
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
        <span className="font-bold">{error?.response?.data?.error ?? error?.message ?? "Failed to load examinations"}</span>
      </div>
    );
  }

  return (
    <div className="glass-card shadow-sm border border-base-300/30 overflow-hidden animate-fade-in mb-8">
      <div className="p-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 gap-4 border-b border-base-300/30 bg-base-200/20">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Examinations</h2>
            <p className="text-sm text-base-content/50 font-medium mt-1">Review your schedules, submissions, and published results.</p>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto px-6 pb-6">
          <table className="table table-md w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-base-content/40 uppercase tracking-widest text-[10px] font-black">
                <th className="bg-transparent border-none pl-4">ID</th>
                <th className="bg-transparent border-none min-w-[200px]">Examination</th>
                <th className="bg-transparent border-none">Start Time</th>
                <th className="bg-transparent border-none">Result Date</th>
                <th className="bg-transparent border-none">Submission Status</th>
                <th className="bg-transparent border-none text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-24 bg-base-100/50 rounded-2xl border border-base-300/30 shadow-inner">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-lg font-bold">You are not enrolled in any examinations.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((row) => {
                  const resultDate = row.result_time_ts ? new Date(row.result_time_ts) : null;
                  const isResultPublished = resultDate && resultDate <= now;

                  return (
                    <tr key={row.id} className="group/tr transition-all duration-300">
                      <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-l border-base-300/30 rounded-l-2xl pl-4 py-6">
                        <span className="text-xs font-black opacity-20 tracking-tighter">#{row.id}</span>
                      </td>
                      <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30">
                        <div className="flex flex-col">
                          <span className="font-bold text-base group-hover/tr:text-primary transition-colors truncate max-w-[240px]">
                            {row.exam_name_txt ?? "Untitled Assessment"}
                          </span>
                        </div>
                      </td>
                      <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30">
                        <div className="flex items-center gap-2 text-xs font-semibold text-base-content/70">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          {formatDate(row.exam_startTime_ts)}
                        </div>
                      </td>
                      <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30">
                        <div className="flex items-center gap-2 text-xs font-semibold text-base-content/70">
                          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          {formatDate(row.result_time_ts)}
                        </div>
                      </td>
                      <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 py-4">
                        {getStatusBadge(row.status)}
                      </td>
                      <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-r border-base-300/30 rounded-r-2xl pr-4 text-right">
                        <button
                          type="button"
                          className={`btn btn-xs h-8 px-4 rounded-xl font-bold uppercase transition-all duration-200 ${
                            isResultPublished
                              ? "btn-success shadow-lg shadow-success/20 text-success-content"
                              : "btn-ghost border border-base-300 hover:bg-base-200"
                          }`}
                          onClick={() => navigate(`/student/examinations/${row.id}`)}
                        >
                          {isResultPublished ? "View Results" : "View Details"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden px-6 pb-8 space-y-4">
          {list.length === 0 ? (
            <div className="text-center py-12 opacity-40">
              <p className="font-bold">You are not enrolled in any examinations.</p>
            </div>
          ) : (
            list.map((row) => {
              const resultDate = row.result_time_ts ? new Date(row.result_time_ts) : null;
              const isResultPublished = resultDate && resultDate <= now;

              return (
                <div key={row.id} className="p-5 rounded-2xl bg-base-100 border border-base-300/30 space-y-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black opacity-20 tracking-tighter mb-1">#{row.id}</span>
                      <span className="font-bold text-base leading-tight">{row.exam_name_txt ?? "Untitled Assessment"}</span>
                    </div>
                    {getStatusBadge(row.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-base-200/30">
                      <p className="text-[10px] font-black opacity-30 mb-1.5 uppercase">Start Time</p>
                      <span className="font-bold text-base-content/80">{formatDate(row.exam_startTime_ts)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-base-200/30">
                      <p className="text-[10px] font-black opacity-30 mb-1.5 uppercase">Result Date</p>
                      <span className="font-bold text-base-content/80">{formatDate(row.result_time_ts)}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      className={`btn btn-sm w-full rounded-xl font-bold uppercase transition-all ${
                        isResultPublished ? "btn-success shadow-lg shadow-success/20" : "btn-outline border-base-300"
                      }`}
                      onClick={() => navigate(`/student/examinations/${row.id}`)}
                    >
                      {isResultPublished ? "View Results" : "View Details"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
