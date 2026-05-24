import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAssignedQuestionsToWrite, useQuestionPaper } from "../hooks/useTeacherQueries.js";
import { useCreateTeacherQuestionPaper } from "../hooks/useTeacherQuestionMutations.js";
import { useDraftPersistence } from "../hooks/useDraftPersistence.js";
import * as teacherApi from "../api/teacher.js";

function createEmptyQuestion() {
  return {
    localId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    question_txt: "",
    full_marks: "",
    question_type: "SHORT",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    correct_option: "",
    image_url: "",
  };
}

function resolveDefaultBatchYear(assignedSubject) {
  const raw = assignedSubject?.exam_startTime_ts;
  if (!raw) return String(new Date().getFullYear());
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(new Date().getFullYear());
  return String(date.getFullYear());
}

export default function TeacherQuestionCreatePage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const createMutation = useCreateTeacherQuestionPaper();
  const { data: assignedList } = useAssignedQuestionsToWrite();
  const assignedFromState = location.state?.assignedSubject ?? null;

  // Load question paper from backend if it exists
  const { data: dbPaperData, isLoading: isPaperLoading } = useQuestionPaper(subjectId);

  const assignedSubject = useMemo(() => {
    if (assignedFromState && String(assignedFromState.subject_id) === String(subjectId)) {
      return assignedFromState;
    }
    const rows = Array.isArray(assignedList) ? assignedList : [];
    return rows.find((row) => String(row.subject_id) === String(subjectId)) ?? null;
  }, [assignedFromState, assignedList, subjectId]);

  const initialDraft = useMemo(
    () => ({
      exam_batch_year: resolveDefaultBatchYear(assignedSubject),
      questions: [createEmptyQuestion()],
    }),
    [assignedSubject]
  );

  const draftKey = `teacher-question-draft-${subjectId}`;
  const { value: draft, setValue: setDraft, clearDraft } = useDraftPersistence(draftKey, initialDraft);
  const [formError, setFormError] = useState("");
  const [uploadingMap, setUploadingMap] = useState({});

  const handleImageFileChange = async (index, file, localId) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image size exceeds the 10MB limit.");
      return;
    }

    setUploadingMap((prev) => ({ ...prev, [localId]: true }));
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await teacherApi.uploadQuestionImage(formData);
      if (response && response.secure_url) {
        updateQuestion(index, "image_url", response.secure_url);
      } else {
        alert("Failed to upload image. Please try again.");
      }
    } catch (err) {
      alert("Error uploading image: " + (err.response?.data?.error || err.message));
    } finally {
      setUploadingMap((prev) => ({ ...prev, [localId]: false }));
    }
  };

  const questions = Array.isArray(draft?.questions) && draft.questions.length > 0 ? draft.questions : [createEmptyQuestion()];

  // Sync server questions if they exist
  useEffect(() => {
    if (dbPaperData?.subject?.paper_id && dbPaperData.questions?.length > 0) {
      const serverQuestions = dbPaperData.questions.map((q) => ({
        localId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${q.id}`,
        question_txt: q.question_txt || "",
        full_marks: q.full_marks || "",
        question_type: q.question_type || "SHORT",
        option1: q.option1 || "",
        option2: q.option2 || "",
        option3: q.option3 || "",
        option4: q.option4 || "",
        correct_option: q.correct_option ? String(q.correct_option) : "",
        image_url: q.image_url || "",
      }));

      setDraft({
        exam_batch_year: dbPaperData.subject.exam_batch_year || resolveDefaultBatchYear(assignedSubject),
        questions: serverQuestions,
      });
    }
  }, [dbPaperData, assignedSubject, setDraft]);

  // Read-only state detection based on state or paper approval status
  const isReadOnly = useMemo(() => {
    if (location.state?.readOnly === true) return true;
    const paperStatus = dbPaperData?.subject?.paper_status;
    return ["SUBMITTED", "APPROVED"].includes(paperStatus);
  }, [location.state?.readOnly, dbPaperData?.subject?.paper_status]);

  const updateDraft = (updater) => {
    if (isReadOnly) return;
    setDraft((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  };

  const updateQuestion = (index, field, value) => {
    if (isReadOnly) return;
    updateDraft((prev) => {
      const nextQuestions = [...(prev?.questions ?? [])];
      const current = { ...nextQuestions[index] };
      current[field] = value;

      if (field === "question_type" && value !== "MCQ") {
        current.option1 = "";
        current.option2 = "";
        current.option3 = "";
        current.option4 = "";
        current.correct_option = "";
      }

      nextQuestions[index] = current;
      return { ...prev, questions: nextQuestions };
    });
  };

  const addQuestion = () => {
    if (isReadOnly) return;
    updateDraft((prev) => ({
      ...prev,
      questions: [...(prev?.questions ?? []), createEmptyQuestion()],
    }));
  };

  const removeQuestion = (index) => {
    if (isReadOnly) return;
    updateDraft((prev) => {
      const next = [...(prev?.questions ?? [])];
      next.splice(index, 1);
      return {
        ...prev,
        questions: next.length > 0 ? next : [createEmptyQuestion()],
      };
    });
  };

  const validate = () => {
    if (!draft?.exam_batch_year?.trim()) {
      return "Batch year is required.";
    }

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.question_txt?.trim()) {
        return `Question ${i + 1}: Question text is required.`;
      }
      if (!q.full_marks || Number(q.full_marks) <= 0) {
        return `Question ${i + 1}: Full marks must be greater than 0.`;
      }

      if (q.question_type === "MCQ") {
        if (!q.option1?.trim() || !q.option2?.trim() || !q.option3?.trim() || !q.option4?.trim()) {
          return `Question ${i + 1}: All 4 options are required for MCQ.`;
        }
        if (!["1", "2", "3", "4"].includes(String(q.correct_option))) {
          return `Question ${i + 1}: Select a correct option for MCQ.`;
        }
      }
    }

    return "";
  };

  const handleSaveAction = (targetStatus) => {
    setFormError("");
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }

    const payload = {
      subject_fk_id: Number(subjectId),
      exam_batch_year: draft.exam_batch_year,
      paper_checkers_list: null,
      status: targetStatus, // "DRAFT" or "SUBMITTED"
      questions: questions.map((q) => ({
        question_txt: q.question_txt.trim(),
        question_type: q.question_type,
        full_marks: Number(q.full_marks),
        option1: q.question_type === "MCQ" ? q.option1.trim() : null,
        option2: q.question_type === "MCQ" ? q.option2.trim() : null,
        option3: q.question_type === "MCQ" ? q.option3.trim() : null,
        option4: q.question_type === "MCQ" ? q.option4.trim() : null,
        correct_option: q.question_type === "MCQ" ? Number(q.correct_option) : null,
        image_url: q.image_url ? q.image_url.trim() : null,
      })),
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        clearDraft();
        navigate("/teacher/questions");
      },
      onError: (e) => {
        setFormError(e?.response?.data?.error ?? e?.message ?? "Failed to save question paper.");
      },
    });
  };

  if (isPaperLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-base-200/50 to-transparent p-6 rounded-3xl border border-base-300/40">
        <div className="flex items-center gap-4">
          <button type="button" className="btn btn-ghost btn-circle hover:bg-base-300/50" onClick={() => navigate("/teacher/questions")}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {isReadOnly ? "View Question Paper" : "Draft Question Paper"}
            </h1>
            <p className="text-xs text-base-content/50 font-semibold mt-0.5">
              {isReadOnly 
                ? "This paper is currently locked and cannot be edited." 
                : "Your edits are saved locally and synced with the database as a draft."
              }
            </p>
          </div>
        </div>
        {dbPaperData?.subject?.paper_status && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase text-base-content/40 tracking-wider">PAPER STATUS</span>
            <span className={`badge font-black text-xs px-3 py-2.5 rounded-lg border mt-1 ${
              dbPaperData.subject.paper_status === "APPROVED"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : dbPaperData.subject.paper_status === "SUBMITTED"
                ? "bg-info/10 text-info border-info/20"
                : dbPaperData.subject.paper_status === "DISAPPROVED"
                ? "bg-error/10 text-error border-error/20"
                : "bg-warning/10 text-warning border-warning/20"
            }`}>
              {dbPaperData.subject.paper_status}
            </span>
          </div>
        )}
      </div>

      <div className="glass-card rounded-3xl p-6 border border-base-300/40 space-y-6">
        {/* Top bar settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-base-200/20 p-6 rounded-2xl border border-base-300/30">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-base-content/40">Subject Name</label>
            <p className="text-lg font-black text-primary mt-1">{assignedSubject?.subject_name_txt ?? `Subject #${subjectId}`}</p>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-base-content/40">Exam Batch Year</label>
            <input
              type="text"
              className="input input-bordered w-full rounded-xl mt-1.5 font-bold"
              value={draft?.exam_batch_year ?? ""}
              onChange={(e) => updateDraft((prev) => ({ ...prev, exam_batch_year: e.target.value }))}
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* Questions list */}
        <div className="space-y-6">
          {questions.map((q, index) => (
            <div key={q.localId} className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
              {/* Question Editor panel */}
              <div className="rounded-3xl border border-base-300/40 p-6 bg-base-100/70 space-y-4 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-base-300/30">
                    <span className="badge badge-neutral text-xs font-black px-3 py-2 rounded-lg">Question {index + 1}</span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost text-error hover:bg-error/10 font-bold rounded-lg"
                        onClick={() => removeQuestion(index)}
                        disabled={questions.length === 1}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-base-content/40">Question Text</label>
                    <textarea
                      className="textarea textarea-bordered rounded-xl w-full mt-1.5 bg-base-200/50 font-semibold focus:bg-base-100 transition-colors"
                      rows={3}
                      value={q.question_txt}
                      onChange={(e) => updateQuestion(index, "question_txt", e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>

                  {/* Image Upload Widget */}
                  <div className="mt-2 p-4 bg-base-200/30 rounded-2xl border border-base-300/30">
                    <label className="text-[10px] font-black uppercase tracking-wider text-base-content/40 block mb-2">Question Diagram / Image</label>
                    
                    {q.image_url ? (
                      <div className="relative group w-full max-w-md rounded-xl overflow-hidden border border-base-300/50 shadow-sm bg-base-200">
                        <img src={q.image_url} alt="Question diagram" className="max-h-48 w-full object-contain p-2" />
                        {!isReadOnly && (
                          <button
                            type="button"
                            className="absolute top-2 right-2 btn btn-xs btn-circle btn-error shadow text-white hover:scale-110 transition-transform"
                            onClick={() => updateQuestion(index, "image_url", "")}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ) : uploadingMap[q.localId] ? (
                      <div className="flex items-center gap-3 py-3 px-4 border border-dashed border-base-300 rounded-xl bg-base-200/20">
                        <span className="loading loading-spinner loading-sm text-primary" />
                        <span className="text-xs font-bold text-base-content/60">Uploading diagram to Cloudinary...</span>
                      </div>
                    ) : !isReadOnly ? (
                      <div className="flex items-center">
                        <label className="flex items-center gap-2 text-xs font-bold border border-dashed border-base-300 hover:border-primary/50 hover:bg-primary/[0.02] cursor-pointer rounded-xl py-3 px-4 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Upload Diagram (Max 10MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageFileChange(index, e.target.files?.[0], q.localId)}
                          />
                        </label>
                      </div>
                    ) : (
                      <span className="text-xs text-base-content/30 italic">No diagram attached.</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-base-content/40">Question Full Marks</label>
                      <input
                        type="number"
                        className="input input-bordered rounded-xl w-full mt-1.5 font-semibold"
                        min="1"
                        value={q.full_marks}
                        onChange={(e) => updateQuestion(index, "full_marks", e.target.value)}
                        disabled={isReadOnly}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-base-content/40">Question Type</label>
                      <select
                        className="select select-bordered rounded-xl w-full mt-1.5 font-semibold"
                        value={q.question_type}
                        onChange={(e) => updateQuestion(index, "question_type", e.target.value)}
                        disabled={isReadOnly}
                      >
                        <option value="MCQ">MCQ (Multiple Choice)</option>
                        <option value="SHORT">Short Question</option>
                        <option value="LONG">Long Question</option>
                      </select>
                    </div>
                  </div>

                  {q.question_type === "MCQ" ? (
                    <div className="space-y-3 pt-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-base-content/40 block">MCQ Options & Key</label>
                      {[1, 2, 3, 4].map((opt) => (
                        <div key={opt} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                          <input
                            type="text"
                            className="input input-bordered rounded-xl w-full font-medium"
                            placeholder={`Option ${opt}`}
                            value={q[`option${opt}`]}
                            onChange={(e) => updateQuestion(index, `option${opt}`, e.target.value)}
                            disabled={isReadOnly}
                          />
                          <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer border rounded-xl py-3 px-4 transition-all ${
                            String(q.correct_option) === String(opt)
                              ? "bg-primary/10 border-primary text-primary"
                              : "border-base-300 hover:bg-base-200"
                          }`}>
                            <input
                              type="radio"
                              name={`correct-${q.localId}`}
                              className="radio radio-primary radio-sm"
                              checked={String(q.correct_option) === String(opt)}
                              onChange={() => updateQuestion(index, "correct_option", String(opt))}
                              disabled={isReadOnly}
                            />
                            Correct
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Question Preview panel (Right) */}
              <div className="rounded-3xl border border-base-300/40 p-6 bg-base-200/20 space-y-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-base-300/30">
                    <span className="text-[10px] font-black uppercase tracking-wider text-base-content/40">Visual Preview</span>
                    <span className="font-black text-xl text-primary">[{q.full_marks || 0} Marks]</span>
                  </div>
                  <div className="pt-4 space-y-3">
                    <p className="font-extrabold text-base-content leading-relaxed">
                      Q.{index + 1}. {q.question_txt?.trim() || <span className="opacity-30 italic">(Question text will appear here...)</span>}
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
                            key={`pv-opt-${q.localId}-${opt}`} 
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
                            <span className="truncate">{q[`option${opt}`]?.trim() || `Option ${opt}`}</span>
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
            </div>
          ))}

          {!isReadOnly && (
            <button type="button" className="btn btn-outline border-dashed border-base-300/60 rounded-2xl w-full py-4 text-base-content/65 hover:bg-base-200 font-bold transition-all shadow-sm" onClick={addQuestion}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Question
            </button>
          )}
        </div>

        {formError && (
          <div className="alert alert-error font-bold text-xs uppercase tracking-wider py-3.5 rounded-2xl border-none shadow-lg shadow-error/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{formError}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-6 border-t border-base-300/30">
          <button 
            type="button" 
            className="btn btn-ghost rounded-xl px-6 font-bold hover:bg-base-300/50" 
            onClick={() => navigate("/teacher/questions")}
          >
            {isReadOnly ? "Back to Dashboard" : "Discard & Back"}
          </button>
          
          {!isReadOnly && (
            <div className="flex gap-3">
              <button 
                type="button" 
                className="btn btn-outline border-base-300 hover:bg-base-200 rounded-xl px-6 font-bold" 
                onClick={() => handleSaveAction("DRAFT")}
                disabled={createMutation.isPending}
              >
                Save as Draft
              </button>
              
              <button 
                type="button" 
                className="btn btn-primary rounded-xl px-10 font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all" 
                onClick={() => handleSaveAction("SUBMITTED")}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : "Submit Paper"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
