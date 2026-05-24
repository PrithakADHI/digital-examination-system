import { useStudentUpcomingExaminations } from "../../../hooks/useStudentQueries.js";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function StudentUpcomingCard() {
  const { data, isLoading, isError, error, refetch } = useStudentUpcomingExaminations();

  if (isLoading) {
    return (
      <div className="glass-card card shadow-sm p-6 flex flex-col justify-center items-center min-h-[220px]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card card shadow-sm p-6 text-center">
        <p className="text-error font-medium">{error?.response?.data?.error ?? error?.message ?? "Failed to load upcoming exams"}</p>
        <button type="button" className="btn btn-sm btn-outline mt-3" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const list = Array.isArray(data) ? data : [];

  return (
    <div className="glass-card card h-full shadow-sm hover:shadow-md transition-all duration-300">
      <div className="card-body p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight">Upcoming Schedule</h2>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[160px] opacity-40 italic">
            <p className="text-sm font-medium">No upcoming examination subjects scheduled.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
            {list.map((item, index) => (
              <div key={index} className="rounded-xl border border-base-300/30 bg-base-200/20 p-3 hover:bg-base-200/40 transition-all duration-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold truncate text-base-content/95">{item.subjectName}</p>
                  <span className="text-[10px] font-bold text-base-content/40 uppercase truncate shrink-0">
                    {item.examName}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <p className="text-[11px] opacity-60 font-medium">{formatDate(item.examStartTime)}</p>
                  <span className="inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-primary/10 text-primary">
                    Pass: {item.passMarks}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
