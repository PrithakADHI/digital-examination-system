import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useStudentAverageResultsOverExaminations } from "../../../hooks/useStudentQueries.js";

export default function StudentPerformanceTrendCard() {
  const { data, isLoading, isError, error, refetch } = useStudentAverageResultsOverExaminations();

  if (isLoading) {
    return (
      <div className="glass-card card shadow-sm p-6 min-h-[220px] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card card shadow-sm p-6 text-center">
        <h2 className="text-sm font-bold text-error">Failed to load performance trend</h2>
        <p className="text-xs opacity-60 mt-1">{error?.response?.data?.error ?? error?.message ?? "Error occurred"}</p>
        <button type="button" className="btn btn-sm btn-outline mt-3" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const chartData = Array.isArray(data) ? data : [];

  return (
    <div className="glass-card card shadow-sm hover:shadow-md transition-all duration-300">
      <div className="card-body p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Performance Trajectory</h2>
            <p className="text-xs text-base-content/50 font-medium">Your aggregate percentage score per completed examination</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-48 md:h-64 flex items-center justify-center opacity-30 italic">
            No completed and graded exam result trend data yet.
          </div>
        ) : (
          <div className="h-48 md:h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, opacity: 0.5 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, opacity: 0.5 }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "16px",
                    border: "1px solid rgba(0,0,0,0.05)",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                    padding: "12px",
                  }}
                  itemStyle={{ fontWeight: "bold" }}
                  formatter={(value, name, props) => [`${value}%`, `Score Percentage (${props.payload.examName})`]}
                />
                <Line
                  type="monotone"
                  dataKey="averageScore"
                  stroke="hsl(var(--p))"
                  strokeWidth={4}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
