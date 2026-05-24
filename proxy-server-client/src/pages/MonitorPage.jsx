import { useQuestions } from "../hooks/useProxyQueries.js";

const PROXY_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

export default function MonitorPage() {
  const { data, isLoading, error } = useQuestions();

  if (isLoading) return <div className="flex justify-center p-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
  if (error) return <div className="alert alert-error mx-auto max-w-2xl mt-10">Error: {error.message}</div>;

  const questions = data?.data || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Question Terminal</h1>
          <p className="text-base-content/60 mt-1">Real-time status of fetched examination questions.</p>
        </div>
        <div className={`badge ${questions.length > 0 ? "badge-success" : "badge-warning"} gap-2 p-4 font-bold rounded-lg`}>
          <div className={`w-2 h-2 rounded-full ${questions.length > 0 ? "bg-success-content" : "bg-warning-content animate-pulse"}`}></div>
          {questions.length > 0 ? "STATUS: COMPLETED" : "STATUS: FETCHING..."}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-base-100 rounded-3xl border-2 border-dashed border-base-300 border-spacing-4">
           <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
           <h2 className="text-xl font-bold opacity-60">Waiting for Examination Start...</h2>
           <p className="max-w-xs text-center text-sm opacity-40 mt-2">
             The background cron job is periodically checking the Main Server. Questions will appear here once the exam starts.
           </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card bg-primary/5 border border-primary/20 stats shadow overflow-hidden">
            <div className="stat">
              <div className="stat-title text-primary font-bold">Total Questions Fetched</div>
              <div className="stat-value text-primary">{questions.length}</div>
              <div className="stat-desc opacity-60">Stored securely in local SQLite database</div>
            </div>
          </div>

          <div className="grid gap-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-2xl">
                <input type="radio" name="questions-accordion" defaultChecked={idx === 0} /> 
                <div className="collapse-title flex items-center gap-4 py-4">
                   <div className="badge badge-neutral font-mono text-[10px]">{q.id}</div>
                   <div className="badge badge-outline text-[10px] font-bold uppercase">{q.question_type}</div>
                   <span className="font-bold text-sm truncate max-w-md">{q.question_txt.substring(0, 60)}...</span>
                </div>
                <div className="collapse-content"> 
                   <div className="pt-4 border-t border-base-200">
                      <p className="text-sm leading-relaxed mb-4">{q.question_txt}</p>

                      {q.image_url && (
                        <div className="mb-4 w-full max-w-md rounded-xl overflow-hidden border border-base-content/10 bg-base-200/50 p-2">
                           <img 
                             src={q.image_url.startsWith("http") ? q.image_url : `${PROXY_URL}${q.image_url.startsWith("/") ? "" : "/"}${q.image_url}`} 
                             alt="Question Diagram" 
                             className="max-h-48 w-full object-contain"
                           />
                        </div>
                      )}
                      
                      {q.question_type === "MCQ" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                           {[q.option1, q.option2, q.option3, q.option4].map((opt, i) => (
                             <div key={i} className="bg-base-200 p-3 rounded-xl text-xs flex gap-3">
                               <span className="font-bold text-primary">{i + 1}.</span>
                               <span>{opt}</span>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
