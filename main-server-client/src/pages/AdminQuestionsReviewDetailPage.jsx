import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuestionsReviewDetail, useApproveOrDisapproveQuestionPaper } from "../hooks/useAdminQueries.js";
import toast from "react-hot-toast";

export default function AdminQuestionsReviewDetailPage() {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState("");
  const [overallNote, setOverallNote] = useState("");
  const [questionsNotes, setQuestionsNotes] = useState({});

  const { data: reviewData, isLoading, isError, error } = useQuestionsReviewDetail(paperId);
  const actionMutation = useApproveOrDisapproveQuestionPaper();

  const paper = reviewData?.paper ?? null;
  const questions = reviewData?.questions ?? [];

  const handleAction = (action) => {
    setErrorMsg("");
    
    // Compile questions notes into an array of { id, feedback_note }
    const questions_feedback = Object.entries(questionsNotes)
      .map(([id, note]) => ({ id: Number(id), feedback_note: note.trim() }))
      .filter(item => item.feedback_note !== "");

    actionMutation.mutate(
      { 
        paperId, 
        action,
        feedback_note: overallNote.trim() || null,
        questions_feedback: questions_feedback.length > 0 ? questions_feedback : null
      },
      {
        onSuccess: () => {
          toast.success(`Question paper successfully ${action === "APPROVE" ? "Approved" : "Returned for Revision"}.`);
          navigate("/admin/questions-review");
        },
        onError: (err) => {
          setErrorMsg(err?.response?.data?.error ?? err?.message ?? "An error occurred during review submission.");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="text-sm font-bold uppercase tracking-wider text-base-content/40">Decrypting question paper...</span>
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
          <h2 className="text-xl font-bold tracking-tight">Decryption Failed / Paper Locked</h2>
          <p className="text-base-content/60 text-sm max-w-md mx-auto">{error?.response?.data?.error ?? error?.message ?? "Draft question paper could not be fetched."}</p>
          <button type="button" className="btn btn-outline border-base-300 rounded-xl px-8" onClick={() => navigate("/admin/questions-review")}>
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-base-200/50 to-transparent p-6 rounded-3xl border border-base-300/40 gap-4">
        <div className="flex items-center gap-4">
          <button type="button" className="btn btn-ghost btn-circle hover:bg-base-300/50" onClick={() => navigate("/admin/questions-review")}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <span className="text-[10px] font-black uppercase text-primary tracking-widest">{paper?.exam_name_txt}</span>
            <h1 className="text-2xl font-black tracking-tight mt-0.5">Audit: {paper?.subject_name_txt}</h1>
            <p className="text-xs text-base-content/50 font-semibold mt-0.5">Drafted by: {paper?.setter_name} (Batch: {paper?.exam_batch_year})</p>
          </div>
        </div>

        <div className="flex flex-col md:items-end">
          <span className="text-[10px] font-black uppercase text-base-content/40 tracking-wider">AUDIT STATUS</span>
          <span className={`badge font-black text-xs px-3 py-2.5 rounded-lg border mt-1 ${
            paper?.paper_status === "APPROVED"
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : paper?.paper_status === "SUBMITTED"
              ? "bg-info/10 text-info border-info/20 animate-pulse"
              : paper?.paper_status === "DISAPPROVED"
              ? "bg-error/10 text-error border-error/20"
              : "bg-warning/10 text-warning border-warning/20"
          }`}>
            {paper?.paper_status}
          </span>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 border border-base-300/40 space-y-6">
        {/* Questions list */}
        <div className="space-y-6">
          {questions.map((q, index) => (
            <div key={q.id} className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
              {/* Question metadata */}
              <div className="rounded-3xl border border-base-300/40 p-6 bg-base-100/70 space-y-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-base-300/30">
                    <span className="badge badge-neutral text-xs font-black px-3 py-2 rounded-lg">Question {index + 1}</span>
                  </div>

                  <div className="pt-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-base-content/40 block">Question Type</span>
                      <span className="font-bold text-sm">{q.question_type}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-base-content/40 block">Assigned Marks</span>
                      <span className="font-black text-lg text-primary">{q.full_marks} Marks</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-base-content/40 block">Text</span>
                      <p className="font-semibold text-sm whitespace-pre-wrap mt-1">{q.question_txt}</p>
                    </div>

                    {q.image_url && (
                      <div className="mt-3">
                        <span className="text-[10px] font-black uppercase text-base-content/40 block">Decrypted Image Diagram</span>
                        <div className="relative group w-full max-w-md rounded-xl overflow-hidden border border-base-300/50 shadow-sm bg-base-200 mt-1">
                          <img src={q.image_url} alt="Question diagram" className="max-h-48 w-full object-contain p-2" />
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-base-300/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Feedback note for Question {index + 1}</span>
                      </div>
                      <textarea
                        value={questionsNotes[q.id] || ""}
                        onChange={(e) => setQuestionsNotes(p => ({ ...p, [q.id]: e.target.value }))}
                        placeholder="Attach a correction note (e.g. Please clarify options, fix typos, rewrite statement, etc.)"
                        rows={2}
                        className="textarea textarea-bordered w-full rounded-xl bg-base-100 border-base-300 focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 transition-all font-medium text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview (split screen) */}
              <div className="rounded-3xl border border-base-300/40 p-6 bg-base-200/20 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-base-300/30">
                  <span className="text-[10px] font-black uppercase tracking-wider text-base-content/40">Visual Preview (Student Perspective)</span>
                  <span className="font-black text-xl text-primary">[{q.full_marks} Marks]</span>
                </div>
                <div className="pt-4 space-y-3">
                  <p className="font-extrabold text-base-content leading-relaxed">
                    Q.{index + 1}. {q.question_txt}
                  </p>

                  {q.image_url && (
                    <div className="w-full max-w-md rounded-xl overflow-hidden border border-base-300/50 shadow-sm bg-base-100 p-2 mt-2">
                      <img src={q.image_url} alt={`Q.${index + 1} diagram`} className="max-h-48 w-full object-contain" />
                    </div>
                  )}
                  <span className="badge badge-outline border-base-300/50 text-[10px] font-bold tracking-widest uppercase">
                    {q.question_type === "MCQ" ? "Multiple Choice" : q.question_type === "SHORT" ? "Short Answer" : "Long Answer"}
                  </span>

                  {q.question_type === "MCQ" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                      {[1, 2, 3, 4].map((opt) => (
                        <div 
                          key={`pv-opt-${q.id}-${opt}`} 
                          className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all ${
                            String(q.correct_option) === String(opt)
                              ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-600 shadow-sm"
                              : "bg-base-100 border-base-300/40 opacity-70"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${
                            String(q.correct_option) === String(opt)
                              ? "bg-emerald-500 text-white border-emerald-500"
                              : "bg-base-200 border-base-300 text-base-content/60"
                          }`}>
                            {opt}
                          </div>
                          <span className="truncate">{q[`option${opt}`]}</span>
                          {String(q.correct_option) === String(opt) && (
                            <span className="text-[9px] uppercase font-black text-emerald-600 tracking-wider ml-auto bg-emerald-500/10 px-2 py-0.5 rounded-md">Correct Key</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 space-y-4 my-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Overall Audit Revision Notes</h3>
              <p className="text-xs text-base-content/50 font-semibold mt-0.5">Attach a high-level review note detailing required adjustments for the entire question paper.</p>
            </div>
          </div>
          <textarea
            value={overallNote}
            onChange={(e) => setOverallNote(e.target.value)}
            placeholder="Write overall revision feedback here (highly recommended when returning for revision)..."
            className="textarea textarea-bordered w-full rounded-2xl bg-base-100/50 focus:bg-base-100 border-base-300 focus:border-primary/50 transition-all font-medium text-sm p-4 h-24"
          />
        </div>

        {errorMsg && (
          <div className="alert alert-error font-bold text-xs uppercase tracking-wider py-3.5 rounded-2xl border-none shadow-lg shadow-error/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pt-6 border-t border-base-300/30 gap-4">
          <button 
            type="button" 
            className="btn btn-ghost rounded-xl px-6 font-bold hover:bg-base-300/50" 
            onClick={() => navigate("/admin/questions-review")}
          >
            Back to List
          </button>
          
          <div className="flex gap-3">
            <button 
              type="button" 
              className="btn btn-error text-white shadow-lg shadow-error/10 rounded-xl px-6 font-bold" 
              onClick={() => handleAction("DISAPPROVE")}
              disabled={actionMutation.isPending}
            >
              Return for Revision
            </button>
            
            <button 
              type="button" 
              className="btn btn-success text-white shadow-lg shadow-emerald-500/15 rounded-xl px-8 font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all" 
              onClick={() => handleAction("APPROVE")}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : "Approve Paper"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
