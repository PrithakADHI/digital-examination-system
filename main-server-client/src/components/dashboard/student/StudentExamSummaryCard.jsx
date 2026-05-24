import { useStudentExamSummary } from "../../../hooks/useStudentQueries.js";

export default function StudentExamSummaryCard() {
  const { data, isLoading, isError, error, refetch } = useStudentExamSummary();

  if (isLoading) {
    return (
      <div className="glass-card card shadow-sm p-6 flex flex-col justify-center items-center min-h-[180px]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card card shadow-sm p-6 text-center">
        <p className="text-error font-medium">{error?.response?.data?.error ?? error?.message ?? "Failed to load summary"}</p>
        <button type="button" className="btn btn-sm btn-outline mt-3" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const summary = data ?? { total: 0, finished: 0, ongoing: 0, upcoming: 0 };

  const stats = [
    {
      label: "Total Registered",
      value: summary.total,
      bgColor: "bg-indigo-500/10",
      textColor: "text-indigo-600",
      desc: "All enrolled examinations",
    },
    {
      label: "Completed",
      value: summary.finished,
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-600",
      desc: "Finished and submitted",
    },
    {
      label: "Ongoing",
      value: summary.ongoing,
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-600",
      desc: "Currently active exams",
    },
    {
      label: "Upcoming",
      value: summary.upcoming,
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600",
      desc: "Scheduled for later",
    },
  ];

  return (
    <div className="glass-card card h-full shadow-sm hover:shadow-md transition-all duration-300">
      <div className="card-body p-6">
        <h2 className="text-lg font-bold tracking-tight mb-4">Examination Activity</h2>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="rounded-2xl border border-base-300/30 bg-base-200/20 p-4 transition-all duration-300 hover:bg-base-200/40">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-semibold text-base-content/50 leading-tight">{stat.label}</p>
                <div className={`w-6 h-6 rounded-lg ${stat.bgColor} flex items-center justify-center ${stat.textColor} text-xs font-bold`}>
                  {stat.value}
                </div>
              </div>
              <p className="text-[10px] opacity-40 font-medium leading-normal">{stat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
