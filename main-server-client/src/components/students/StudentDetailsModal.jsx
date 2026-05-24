import { useTeacherStudentDetail } from "../../hooks/useTeacherQueries.js";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString([], { dateStyle: "medium" });
}

export default function StudentDetailsModal({ isOpen, onClose, studentId }) {
  const { data, isLoading, isError, error } = useTeacherStudentDetail(studentId, {
    enabled: isOpen && !!studentId,
  });

  if (!isOpen) return null;

  const student = data?.student;
  const results = data?.results ?? [];

  return (
    <div className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box glass-card p-8 max-w-4xl border border-base-300/30 overflow-hidden relative flex flex-col max-h-[85vh]">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 z-10" onClick={onClose} type="button">
          ✕
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 grow">
            <span className="loading loading-spinner loading-lg text-primary mb-4" />
            <p className="text-sm text-base-content/50 font-bold">Loading student records...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 grow text-center">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-error">Failed to load student details</h3>
            <p className="text-sm text-base-content/50 mt-1">{error?.response?.data?.error ?? error?.message}</p>
            <button className="btn btn-primary rounded-xl btn-sm mt-6 px-6 font-bold" onClick={onClose} type="button">
              Close
            </button>
          </div>
        ) : (
          <div className="flex flex-col grow overflow-y-auto no-scrollbar gap-6 pr-1">
            {/* Header / Student Profile Summary */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-base-300/30 gap-4 mt-2">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl border border-primary/20 shadow-sm flex-shrink-0">
                  {student?.full_name?.charAt(0) || "S"}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{student?.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="badge badge-outline border-primary/20 text-primary font-bold text-[10px] uppercase tracking-wider py-2 px-2.5 bg-primary/5 rounded-lg">
                      Student Account
                    </span>
                    <span className="text-xs text-base-content/40 font-bold">
                      ID: <span className="font-mono text-[10px] text-base-content/75 bg-base-200/50 px-1.5 py-0.5 rounded border border-base-300/30">{student?.username}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Grid Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-base-200/20 border border-base-300/25">
                <p className="text-[9px] font-black uppercase tracking-widest text-base-content/45 mb-1.5">Symbol Number</p>
                <p className="font-mono text-sm font-bold text-base-content">{student?.stud_exam_symbol_no || "—"}</p>
              </div>
              <div className="p-4 rounded-2xl bg-base-200/20 border border-base-300/25">
                <p className="text-[9px] font-black uppercase tracking-widest text-base-content/45 mb-1.5">Registration Number</p>
                <p className="font-mono text-sm font-bold text-base-content">{student?.stud_exam_reg_no || "—"}</p>
              </div>
              <div className="p-4 rounded-2xl bg-base-200/20 border border-base-300/25">
                <p className="text-[9px] font-black uppercase tracking-widest text-base-content/45 mb-1.5">Batch Year</p>
                <p className="text-sm font-bold text-base-content">{student?.stud_batch_year || "—"}</p>
              </div>
              <div className="p-4 rounded-2xl bg-base-200/20 border border-base-300/25">
                <p className="text-[9px] font-black uppercase tracking-widest text-base-content/45 mb-1.5">Phone Number</p>
                <p className="text-sm font-bold text-base-content">{student?.phone_num_txt || "—"}</p>
              </div>
              <div className="col-span-2 md:col-span-4 p-4 rounded-2xl bg-base-200/20 border border-base-300/25 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-base-content/45 mb-1">Email Address</p>
                  <p className="text-sm font-bold text-base-content truncate">{student?.email_txt || "—"}</p>
                </div>
              </div>
            </div>

            {/* Academic Performance / Exam records */}
            <div className="space-y-4 grow">
              <div>
                <h4 className="font-extrabold text-base tracking-tight">Academic Records & Attendance</h4>
                <p className="text-xs text-base-content/50 font-medium mt-0.5">Exams and subject markings registered at your center</p>
              </div>

              {results.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-base-300/40 text-center bg-base-200/10">
                  <div className="flex flex-col items-center gap-2 opacity-40">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-base-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span className="text-xs font-black">No exams attended or registered yet</span>
                  </div>
                </div>
              ) : (
                <div className="border border-base-300/30 rounded-2xl overflow-hidden shadow-inner bg-base-100/50">
                  <div className="overflow-x-auto">
                    <table className="table table-md w-full border-collapse">
                      <thead>
                        <tr className="bg-base-200/40 text-[9px] uppercase tracking-wider text-base-content/50 font-black border-b border-base-300/30">
                          <th className="py-3.5 pl-4">Examination</th>
                          <th className="py-3.5">Subject</th>
                          <th className="py-3.5 text-center">Marks Obtained</th>
                          <th className="py-3.5 text-center">Result Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((row, idx) => {
                          const hasAttended = Number(row.answers_submitted_count) > 0;
                          const isGraded = row.total_marks_obtained !== null && row.total_marks_obtained !== undefined;
                          const hasPassed = isGraded && Number(row.total_marks_obtained) >= Number(row.pass_marks);

                          let statusBadge = (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-base-200 text-base-content/60 border border-base-300/30">
                              Registered
                            </span>
                          );

                          if (hasAttended) {
                            if (isGraded) {
                              statusBadge = hasPassed ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Pass
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-error/10 text-error border border-error/20">
                                  Fail
                                </span>
                              );
                            } else {
                              statusBadge = (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                                  Grading Pending
                                </span>
                              );
                            }
                          } else if (row.exam_status === "STARTED") {
                            statusBadge = (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-info/10 text-info border border-info/20 animate-pulse">
                                Started
                              </span>
                            );
                          }

                          return (
                            <tr key={idx} className="border-b border-base-300/10 hover:bg-base-200/20 transition-all duration-200 last:border-0">
                              <td className="font-semibold text-xs py-4 pl-4">
                                <span className="block text-base-content font-bold tracking-tight">{row.exam_name_txt}</span>
                                {row.exam_submitted_at ? (
                                  <span className="block text-[9px] font-medium text-base-content/40 mt-0.5 font-mono">
                                    Submitted {formatDate(row.exam_submitted_at)}
                                  </span>
                                ) : null}
                              </td>
                              <td className="font-medium text-xs text-base-content/80 py-4">{row.subject_name_txt}</td>
                              <td className="text-center font-bold text-xs py-4">
                                {isGraded ? (
                                  <span className="font-mono">
                                    {row.total_marks_obtained}
                                    <span className="text-base-content/40 font-medium mx-1">/</span>
                                    {row.full_marks}
                                  </span>
                                ) : hasAttended ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold font-mono text-[10px]">Ungraded</span>
                                ) : (
                                  <span className="text-base-content/30 font-medium font-mono text-xs">—</span>
                                )}
                              </td>
                              <td className="text-center py-4">{statusBadge}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="modal-backdrop backdrop-blur-sm bg-base-900/20" onClick={onClose} aria-hidden />
    </div>
  );
}
