import { useState, useEffect } from "react";
import { useExaminations, useCenters, usePatchExaminationCenters } from "../../hooks/useAdminQueries.js";

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return value;
  }
}

function CenterAssignment({ examId, currentCenterIds }) {
  const { data: centersData } = useCenters({ limit: 100 });
  const centers = centersData?.data ?? [];
  
  // Normalize IDs to numbers to avoid type mismatch issues (string vs number)
  const normalizedCurrentIds = (currentCenterIds ?? []).map(id => Number(id));
  const [selectedIds, setSelectedIds] = useState(normalizedCurrentIds);
  const [hasChanges, setHasChanges] = useState(false);
  const patchMutation = usePatchExaminationCenters(examId);

  useEffect(() => {
    const ids = (currentCenterIds ?? []).map(id => Number(id));
    setSelectedIds(ids);
    setHasChanges(false);
  }, [currentCenterIds]);

  const handleToggle = (id) => {
    const numId = Number(id);
    setSelectedIds(prev => {
      const next = prev.includes(numId) ? prev.filter(i => i !== numId) : [...prev, numId];
      
      // Compare sorted strings to detect real changes
      const currentSorted = [...normalizedCurrentIds].sort().join(',');
      const nextSorted = [...next].sort().join(',');
      setHasChanges(currentSorted !== nextSorted);
      
      return next;
    });
  };

  const handleSave = () => {
    patchMutation.mutate(selectedIds, {
      onSuccess: () => setHasChanges(false)
    });
  };

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <div className="dropdown dropdown-bottom dropdown-end w-full">
        <div 
          tabIndex={0} 
          role="button" 
          className="btn btn-ghost border border-base-300/50 bg-base-100/50 hover:bg-base-200/50 w-full justify-between px-3 h-auto min-h-[40px] py-1.5 rounded-xl transition-all"
        >
          <div className="flex flex-nowrap gap-2 items-center max-w-[180px] overflow-hidden">
            {selectedIds.length > 0 ? (
              <>
                {selectedIds.slice(0, 1).map(cid => {
                  const center = centers.find(c => Number(c.id) === Number(cid));
                  return (
                    <span key={cid} className="badge badge-primary py-2.5 text-[9px] font-black uppercase tracking-tighter truncate max-w-[120px]">
                      {center?.center_name_txt ?? `ID:${cid}`}
                    </span>
                  );
                })}
                {selectedIds.length > 1 && (
                  <span className="badge badge-ghost py-2.5 text-[9px] font-black opacity-40 whitespace-nowrap">
                    +{selectedIds.length - 1} More
                  </span>
                )}
              </>
            ) : (
              <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Assign Centers</span>
            )}
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <ul tabIndex={0} className="dropdown-content z-[20] menu p-2 shadow-2xl bg-base-100 border border-base-300/50 rounded-2xl w-64 mt-2 max-h-60 overflow-y-auto block animate-in fade-in zoom-in duration-200">
          {centers.length === 0 ? (
            <li className="p-4 text-center opacity-40 text-[10px] font-bold uppercase tracking-widest">No centers found</li>
          ) : (
            centers.map((center) => (
              <li key={center.id} className="mb-1">
                <button
                  type="button"
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    selectedIds.includes(Number(center.id)) 
                      ? "bg-primary/10 text-primary font-bold shadow-sm" 
                      : "hover:bg-base-200"
                  }`}
                  onClick={() => handleToggle(center.id)}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-xs checkbox-primary" 
                      checked={selectedIds.includes(Number(center.id))}
                      readOnly
                    />
                    <span className="text-[11px] font-bold">{center.center_name_txt}</span>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {hasChanges && (
        <button 
          onClick={handleSave}
          disabled={patchMutation.isPending}
          className="btn btn-primary btn-xs rounded-lg shadow-lg shadow-primary/20 gap-1.5 self-start animate-fade-in font-black uppercase text-[9px] h-8 px-3"
        >
          {patchMutation.isPending ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Save Centers
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function ExaminationsList({
  examinations,
  pagination,
  page,
  setPage,
  searchInput,
  searchTerm,
  onSearchInputChange,
  onSearchSubmit,
  onSearchClear,
  onSelectExam,
  onCreateNew,
  onDelete,
  isLoading,
  isError,
  error,
}) {
  const list = examinations ?? [];
  const hasSearchTerm = Boolean(searchTerm?.trim());
  const emptyMessage = hasSearchTerm ? `No examinations match "${searchTerm}".` : "No examinations scheduled yet.";

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearchSubmit?.();
  };

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
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span className="font-bold">{error?.response?.data?.error ?? error?.message ?? "Failed to load examinations"}</span>
      </div>
    );
  }

  return (
    <div className="glass-card shadow-sm border border-base-300/30 overflow-hidden animate-fade-in mb-8">
      <div className="p-0">
        <div className="flex flex-col gap-4 p-8 border-b border-base-300/30 bg-base-200/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Examinations</h2>
              <p className="text-sm text-base-content/50 font-medium mt-1">Manage and monitor all examinations in the system</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto lg:justify-end">
              <form className="flex flex-1 sm:flex-initial items-center gap-3 w-full lg:w-auto" onSubmit={handleSubmit}>
                <label className="input input-bordered flex items-center gap-2 rounded-xl bg-base-100 w-full sm:w-[320px] lg:w-[420px]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                  </svg>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => onSearchInputChange?.(event.target.value)}
                    placeholder="Search examinations..."
                    className="grow font-medium bg-transparent border-none focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-primary btn-square rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105"
                  aria-label="Search examinations"
                  title="Search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                  </svg>
                </button>
                {hasSearchTerm ? (
                  <button type="button" className="btn btn-ghost rounded-xl px-5 font-bold" onClick={onSearchClear}>
                    Clear
                  </button>
                ) : null}
              </form>

              <button 
                type="button" 
                className="btn btn-primary rounded-xl px-6 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105 w-full sm:w-auto lg:shrink-0" 
                onClick={onCreateNew}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Exam
              </button>
            </div>
          </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto px-6 pb-6">
          <table className="table table-md w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-base-content/40 uppercase tracking-widest text-[10px] font-black">
                <th className="bg-transparent border-none pl-4">ID</th>
                <th className="bg-transparent border-none min-w-[200px]">Examination</th>
                <th className="bg-transparent border-none">Result Date</th>
                <th className="bg-transparent border-none">Centers Assignment</th>
                <th className="bg-transparent border-none text-right pr-4">Actions</th>
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
                      <span className="text-lg font-bold">{emptyMessage}</span>
                      <button className="btn btn-primary btn-sm rounded-lg" onClick={onCreateNew}>Create Your First Exam</button>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id} className="group/tr transition-all duration-300">
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-l border-base-300/30 rounded-l-2xl pl-4 py-6">
                      <span className="text-xs font-black opacity-20 tracking-tighter">#{row.id}</span>
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30">
                      <div className="flex flex-col">
                        <span className="font-bold text-base group-hover/tr:text-primary transition-colors truncate max-w-[200px]">{row.exam_name_txt ?? "Untitled Assessment"}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 mt-1">Academic Year 2082</span>
                      </div>
                    </td>
                    {/* <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30">
                      <div className="flex items-center gap-2 text-xs font-semibold text-base-content/70">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        {formatDate(row.exam_startTime_ts)}
                      </div>
                    </td> */}
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30">
                      <div className="flex items-center gap-2 text-xs font-semibold text-base-content/70">
                        <div className="w-6 h-6 rounded-lg bg-success/10 flex items-center justify-center text-success">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        {formatDate(row.result_time_ts)}
                      </div>
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 py-4">
                      <CenterAssignment 
                        examId={row.id} 
                        currentCenterIds={row.center_fk_list} 
                      />
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-r border-base-300/30 rounded-r-2xl pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-circle btn-sm hover:bg-primary/20 hover:text-primary transition-all duration-200"
                          onClick={() => onSelectExam(row.id)}
                          title="Edit Examination"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-circle btn-sm hover:bg-error/20 hover:text-error transition-all duration-200"
                          onClick={() => onDelete(row.id, row.exam_name_txt)}
                          title="Delete Examination"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden px-6 pb-8 space-y-4">
          {list.length === 0 ? (
            <div className="text-center py-12 opacity-40">
              <p className="font-bold">{emptyMessage}</p>
            </div>
          ) : (
            list.map((row) => (
              <div key={row.id} className="p-5 rounded-2xl bg-base-100 border border-base-300/30 space-y-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black opacity-20 tracking-tighter mb-1">#{row.id}</span>
                    <span className="font-bold text-lg leading-tight">{row.exam_name_txt ?? "Untitled Assessment"}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 mt-1">Academic Year 2082</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-circle btn-sm bg-base-200/50"
                      onClick={() => onSelectExam(row.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-circle btn-sm bg-error/10 text-error"
                      onClick={() => onDelete(row.id, row.exam_name_txt)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {/* <div className="p-3 rounded-xl bg-base-200/30">
                    <p className="text-[10px] font-black uppercase opacity-30 mb-2">Started On</p>
                    <span className="text-[11px] font-bold block">{formatDate(row.exam_startTime_ts)}</span>
                  </div> */}
                  <div className="p-3 rounded-xl bg-base-200/30">
                    <p className="text-[10px] font-black uppercase opacity-30 mb-2">Result Date</p>
                    <span className="text-[11px] font-bold block">{formatDate(row.result_time_ts)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-[10px] font-black uppercase opacity-30 mb-2">Center Assignment</p>
                  <CenterAssignment 
                    examId={row.id} 
                    currentCenterIds={row.center_fk_list} 
                  />
                </div>
              </div>
            ))
          )}
        </div>
        
        {pagination.totalPages > 1 && (
          <div className="p-8 border-t border-base-300/30 bg-base-200/10">
            <div className="flex justify-center">
              <div className="join glass-effect border border-base-300/30 shadow-sm p-1">
                <button
                  type="button"
                  className="join-item btn btn-sm btn-ghost rounded-lg font-bold"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="join-item btn btn-sm btn-ghost px-6 no-animation font-black text-xs">
                  {pagination.page} <span className="mx-2 opacity-30">/</span> {pagination.totalPages}
                </div>
                <button
                  type="button"
                  className="join-item btn btn-sm btn-ghost rounded-lg font-bold"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
