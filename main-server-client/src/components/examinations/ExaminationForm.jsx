import { useMemo, useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useCenters } from "../../hooks/useAdminQueries.js";
import SubjectInputBlock from "./SubjectInputBlock.jsx";

const emptySubject = () => ({
  subject_name_txt: "",
  exam_setter_user_fk_id: "",
  full_marks: "",
  pass_marks: "",
  exam_startTime_ts: null,
});

const DAY_MS = 24 * 60 * 60 * 1000;

function getStartDateFloor() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 14);
  return date;
}

function toDayStart(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export default function ExaminationForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
}) {
  const { data: centersData } = useCenters({ limit: 100 });
  const centers = centersData?.data ?? [];

  const getDefaultForm = () => ({
    exam_name_txt: "",
    result_time_ts: null,
    center_fk_list: [],
    subjects: [emptySubject()],
  });

  const mapApiToForm = (examination, subjects = []) => {
    const centerList = examination?.center_fk_list;
    const centerIds = Array.isArray(centerList)
      ? centerList.map((c) => (typeof c === "object" ? c?.id : c)).filter(Boolean)
      : [];
    return {
      exam_name_txt: examination?.exam_name_txt ?? "",
      result_time_ts: examination?.result_time_ts
        ? new Date(examination.result_time_ts)
        : null,
      center_fk_list: centerIds,
      subjects:
        subjects?.length > 0
          ? subjects.map((s) => ({
              subject_name_txt: s.subject_name_txt ?? "",
              exam_setter_user_fk_id: s.exam_setter_user_fk_id ?? "",
              full_marks: s.full_marks ?? "",
              pass_marks: s.pass_marks ?? "",
              exam_startTime_ts: s.exam_startTime_ts ? new Date(s.exam_startTime_ts) : null,
            }))
          : [emptySubject()],
    };
  };

  const [form, setFormState] = useState(getDefaultForm());
  const setForm = (updater) => setFormState((prev) => (typeof updater === "function" ? updater(prev) : updater));
  const minSubjectStartDate = useMemo(() => getStartDateFloor(), []);

  const latestSubjectStartDate = useMemo(() => {
    const subjectDates = form.subjects
      .map((subject) => subject.exam_startTime_ts)
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (subjectDates.length === 0) return null;
    return new Date(Math.max(...subjectDates.map((date) => date.getTime())));
  }, [form.subjects]);

  const resultDateMin = useMemo(() => {
    if (!latestSubjectStartDate) return null;
    const nextDay = new Date(toDayStart(latestSubjectStartDate).getTime() + DAY_MS);
    return nextDay;
  }, [latestSubjectStartDate]);

  const resultDateError = useMemo(() => {
    if (!form.result_time_ts || !latestSubjectStartDate) return null;
    return toDayStart(form.result_time_ts).getTime() < toDayStart(latestSubjectStartDate).getTime() + DAY_MS
      ? "Result publication date must be after the last subject exam date."
      : null;
  }, [form.result_time_ts, latestSubjectStartDate]);

  useEffect(() => {
    if (initialData) {
      const { examination, subjects } = initialData;
      setForm(mapApiToForm(examination, subjects));
    } else {
      setForm(getDefaultForm());
    }
  }, [initialData?.examination?.id]);

  const handleSubjectChange = (index, nextSubject) => {
    setForm((prev) => {
      const next = [...prev.subjects];
      next[index] = nextSubject;
      return { ...prev, subjects: next };
    });
  };

  const handleAddSubject = () => {
    setForm((prev) => ({ ...prev, subjects: [...prev.subjects, emptySubject()] }));
  };

  const handleRemoveSubject = (index) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index),
    }));
  };

  const handleCenterToggle = (centerId) => {
    const id = Number(centerId);
    setForm((prev) => {
      const list = prev.center_fk_list ?? [];
      const has = list.includes(id);
      return {
        ...prev,
        center_fk_list: has ? list.filter((c) => c !== id) : [...list, id],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (resultDateError) return;
    const payload = {
      exam_name_txt: form.exam_name_txt.trim(),
      result_time_ts: form.result_time_ts ? form.result_time_ts.toISOString() : null,
      center_fk_list: form.center_fk_list?.length ? form.center_fk_list : null,
      subjects: form.subjects
        .filter((s) => String(s.subject_name_txt ?? "").trim())
        .map((s) => ({
          subject_name_txt: String(s.subject_name_txt).trim(),
          exam_setter_user_fk_id: Number(s.exam_setter_user_fk_id),
          full_marks: Number(s.full_marks) || 0,
          pass_marks: Number(s.pass_marks) || 0,
          exam_startTime_ts: s.exam_startTime_ts ? s.exam_startTime_ts.toISOString() : null,
        })),
    };
    if (payload.subjects.length < 1) return;
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card shadow-sm border border-base-300/30 overflow-hidden animate-fade-in mb-8">
      <div className="p-0">
        <div className="p-8 border-b border-base-300/30 bg-base-200/20">
          <h2 className="text-xl font-bold tracking-tight">Examination Settings</h2>
          <p className="text-sm text-base-content/50 font-medium mt-1">Configure the core details and centers for this assessment</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Main Info Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-base-content/40 tracking-widest mb-2 block ml-1">Examination Title</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base-content/20 group-focus-within:text-primary transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="input input-bordered w-full pl-12 bg-base-100/50 focus:bg-base-100 transition-all rounded-xl border-base-300 focus:border-primary focus:ring-4 focus:ring-primary/10 font-bold"
                    placeholder="e.g. Annual Final Assessment 2082"
                    value={form.exam_name_txt}
                    onChange={(e) => setForm((p) => ({ ...p, exam_name_txt: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div />
              </div>
            </div>

            <div className="relative">
              <label className="text-[10px] font-black uppercase text-base-content/40 tracking-widest mb-2 block ml-1">Center Assignments</label>
              <div className="dropdown w-full">
                <div 
                  tabIndex={0} 
                  role="button" 
                  className="btn btn-outline border-base-300 w-full justify-between hover:bg-base-200 hover:border-primary/20 text-left font-bold min-h-[52px] h-auto py-3 rounded-xl transition-all"
                >
                  <div className="flex flex-wrap gap-1.5 items-center overflow-hidden">
                    {form.center_fk_list?.length > 0 ? (
                      form.center_fk_list.map(cid => {
                        const center = centers.find(c => Number(c.id) === Number(cid));
                        return (
                          <div key={cid} className="badge badge-primary gap-1 py-3 px-3">
                            <span className="text-[10px] uppercase font-black tracking-tighter">{center?.center_name_txt ?? `ID: ${cid}`}</span>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterToggle(cid);
                              }}
                              className="hover:scale-125 transition-transform"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-base-content/30 font-medium">Select evaluation centers...</span>
                    )}
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <ul tabIndex={0} className="dropdown-content z-[20] menu p-2 shadow-2xl bg-base-100 border border-base-300/50 rounded-2xl w-full mt-2 max-h-60 overflow-y-auto block animate-in fade-in zoom-in duration-200">
                  {centers.length === 0 ? (
                    <li className="p-4 text-center opacity-40 text-xs font-black uppercase tracking-widest">No centers available</li>
                  ) : (
                    centers.map((c) => (
                      <li key={c.id} className="mb-0.5">
                        <button
                          type="button"
                          className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                            (form.center_fk_list ?? []).includes(Number(c.id)) 
                              ? "bg-primary/10 text-primary font-bold shadow-sm" 
                              : "hover:bg-base-200"
                          }`}
                          onClick={() => handleCenterToggle(c.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${ (form.center_fk_list ?? []).includes(Number(c.id)) ? "bg-primary" : "bg-base-300" }`} />
                            <span>{c.center_name_txt}</span>
                          </div>
                          {(form.center_fk_list ?? []).includes(Number(c.id)) && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Subjects Section */}
          <div className="pt-4 border-t border-base-300/30">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold tracking-tight">Paper Configurations</h3>
                <p className="text-sm text-base-content/50 font-medium">Add and define the subjects for this examination</p>
              </div>
              <button 
                type="button" 
                className="btn btn-primary btn-sm rounded-lg shadow-lg shadow-primary/20 gap-2 font-bold px-4 h-9" 
                onClick={handleAddSubject}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
                Add Subject
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
              {form.subjects.map((sub, i) => (
                <SubjectInputBlock
                  key={i}
                  subject={sub}
                  index={i}
                  onChange={handleSubjectChange}
                  onRemove={handleRemoveSubject}
                  canRemove={form.subjects.length > 1}
                />
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-base-300/30">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold tracking-tight">Result Settings</h3>
                <p className="text-sm text-base-content/50 font-medium">Schedule when result publication becomes available</p>
              </div>
            </div>

            <div className="max-w-xl">
              <label className="text-[10px] font-black uppercase text-base-content/40 tracking-widest mb-2 block ml-1">Result Publication Date</label>
              <DatePicker
                selected={form.result_time_ts}
                onChange={(date) => setForm((p) => ({ ...p, result_time_ts: date }))}
                showTimeSelect
                dateFormat="MMMM d, yyyy h:mm aa"
                placeholderText="Select result time"
                minDate={resultDateMin ?? undefined}
                className={`input input-bordered w-full bg-base-100/50 focus:bg-base-100 transition-all rounded-xl border-base-300 focus:border-primary focus:ring-4 focus:ring-primary/10 font-medium ${resultDateError ? "border-error focus:border-error focus:ring-error/10" : ""}`}
              />
              {resultDateError ? (
                <p className="mt-2 text-xs font-bold text-error">{resultDateError}</p>
              ) : latestSubjectStartDate ? (
                <p className="mt-2 text-xs font-medium text-base-content/40">
                  Must be after {latestSubjectStartDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.
                </p>
              ) : (
                <p className="mt-2 text-xs font-medium text-base-content/40">Add at least one subject date to unlock result scheduling.</p>
              )}
            </div>
          </div>
        </div>

        {submitError && (
          <div className="px-8 pb-4">
            <div className="alert alert-error text-xs font-bold rounded-xl py-3 shadow-lg shadow-error/10 animate-fade-in border-none uppercase tracking-wider">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{submitError}</span>
            </div>
          </div>
        )}

        <div className="p-8 border-t border-base-300/30 bg-base-200/20 flex justify-end gap-3">
          {onCancel && (
            <button 
              type="button" 
              className="btn btn-ghost px-8 rounded-xl font-bold transition-all hover:bg-base-300/50" 
              onClick={onCancel}
            >
              Discard Changes
            </button>
          )}
          <button 
            type="submit" 
            className="btn btn-primary px-10 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95" 
            disabled={isSubmitting || Boolean(resultDateError)}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Submit Examination"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

