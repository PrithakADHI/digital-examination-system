import { useUsers } from "../../hooks/useAdminQueries.js";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function SubjectInputBlock({ subject, index, onChange, onRemove, canRemove, minDate }) {
  const { data: usersData } = useUsers({ role: "TEACHER" });
  const teachers = usersData?.data ?? [];

  const handleChange = (field, value) => {
    onChange(index, { ...subject, [field]: value });
  };

  return (
    <div className="relative group p-6 rounded-2xl bg-base-100 border border-base-300/50 shadow-sm transition-all hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 animate-fade-in">
      {/* Header with Background Badge Feel */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
            {index + 1}
          </div>
          <span className="text-[10px] font-black uppercase text-base-content/40 tracking-widest">Subject Details</span>
        </div>
        {canRemove && (
          <button 
            type="button" 
            className="btn btn-ghost btn-xs btn-circle bg-error/5 text-error hover:bg-error hover:text-white transition-all" 
            onClick={() => onRemove(index)} 
            aria-label="Remove subject"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase text-base-content/30 tracking-widest mb-1.5 block ml-1">Title</label>
          <input
            type="text"
            className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-all rounded-xl border-base-300 focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold text-sm h-11"
            placeholder="e.g. Advanced Calculus"
            value={subject.subject_name_txt ?? ""}
            onChange={(e) => handleChange("subject_name_txt", e.target.value)}
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-base-content/30 tracking-widest mb-1.5 block ml-1">Assigned Teacher</label>
          <div className="dropdown w-full">
            <div 
              tabIndex={0} 
              role="button" 
              className="btn btn-outline border-base-300 w-full justify-between hover:bg-base-200 hover:border-primary/20 text-left font-bold min-h-[44px] h-auto rounded-xl transition-all normal-case"
            >
              <div className="flex items-center gap-2 truncate">
                {subject.exam_setter_user_fk_id ? (
                  <>
                    <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[8px] font-black">
                      {teachers.find(u => u.id === subject.exam_setter_user_fk_id)?.firstname_txt?.[0]}
                    </div>
                    <span className="text-sm">
                      {teachers.find(u => u.id === subject.exam_setter_user_fk_id)?.firstname_txt} {teachers.find(u => u.id === subject.exam_setter_user_fk_id)?.lastname_txt}
                    </span>
                  </>
                ) : (
                  <span className="text-base-content/30 font-medium text-sm">Choose Exam Setter...</span>
                )}
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <ul tabIndex={0} className="dropdown-content z-[20] menu p-2 shadow-2xl bg-base-100 border border-base-300/50 rounded-2xl w-full mt-2 max-h-60 overflow-y-auto block animate-in fade-in zoom-in duration-200">
              {teachers.length === 0 ? (
                <li className="p-4 text-center opacity-40 text-[10px] font-black uppercase tracking-widest">No Teachers Found</li>
              ) : (
                teachers.map((u) => (
                  <li key={u.id} className="mb-0.5">
                    <button
                      type="button"
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        subject.exam_setter_user_fk_id === u.id 
                          ? "bg-primary/10 text-primary font-bold shadow-sm" 
                          : "hover:bg-base-200"
                      }`}
                      onClick={() => {
                        handleChange("exam_setter_user_fk_id", u.id);
                        document.activeElement.blur(); // Close dropdown on selection
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          subject.exam_setter_user_fk_id === u.id ? "bg-primary text-white" : "bg-base-300 shadow-inner"
                        }`}>
                          {u.firstname_txt?.[0]}
                        </div>
                        <div className="flex flex-col items-start translate-y-[1px]">
                          <span className="text-sm leading-tight">{u.firstname_txt} {u.lastname_txt}</span>
                          <span className="text-[9px] opacity-40 uppercase tracking-tighter">@{u.username}</span>
                        </div>
                      </div>
                      {subject.exam_setter_user_fk_id === u.id && (
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase text-base-content/30 tracking-widest mb-1.5 block ml-1">Full Marks</label>
            <input
              type="number"
              min={1}
              className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-all rounded-xl border-base-300 focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold text-sm h-11 text-center"
              value={subject.full_marks ?? ""}
              onChange={(e) => handleChange("full_marks", e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-base-content/30 tracking-widest mb-1.5 block ml-1">Pass Marks</label>
            <input
              type="number"
              min={0}
              className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-all rounded-xl border-base-300 focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold text-sm h-11 text-center"
              value={subject.pass_marks ?? ""}
              onChange={(e) => handleChange("pass_marks", e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-base-content/30 tracking-widest mb-1.5 block ml-1">Start Date & Time</label>
          <DatePicker
            selected={subject.exam_startTime_ts ? new Date(subject.exam_startTime_ts) : null}
            onChange={(date) => handleChange("exam_startTime_ts", date)}
            showTimeSelect
            dateFormat="MMMM d, yyyy h:mm aa"
            placeholderText="Select start time"
            className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-all rounded-xl border-base-300 focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold text-sm h-11"
            required
            minDate={minDate}
          />
        </div>
      </div>
    </div>
  );
}
