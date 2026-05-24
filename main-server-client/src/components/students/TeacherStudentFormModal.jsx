import { useMemo, useState, useEffect } from "react";
import { useCreateTeacherStudent, useUpdateTeacherStudent } from "../../hooks/useTeacherQueries.js";

const BATCH_YEAR_START = 2020;
const BATCH_YEAR_END = new Date().getFullYear() + 10;

function capitalizeName(value) {
  const cleanValue = value.replace(/[^A-Za-z]/g, "");
  if (!cleanValue) return "";
  return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1).toLowerCase();
}

function digitsOnly(value) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function getBatchYearOptions() {
  return Array.from({ length: BATCH_YEAR_END - BATCH_YEAR_START + 1 }, (_, index) => String(BATCH_YEAR_START + index));
}

function getInitialFormData(studentToEdit) {
  return {
    firstname_txt: capitalizeName(studentToEdit?.firstname_txt || ""),
    lastname_txt: capitalizeName(studentToEdit?.lastname_txt || ""),
    username: studentToEdit?.username || "",
    email_txt: studentToEdit?.email_txt || "",
    phone_num_txt: studentToEdit?.phone_num_txt || "",
    stud_exam_symbol_no: studentToEdit?.stud_exam_symbol_no || "",
    stud_exam_reg_no: studentToEdit?.stud_exam_reg_no || "",
    stud_batch_year: studentToEdit?.stud_batch_year || "",
  };
}

export default function TeacherStudentFormModal({ isOpen, onClose, studentToEdit }) {
  const [formData, setFormData] = useState(() => getInitialFormData(studentToEdit));

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData(studentToEdit));
    }
  }, [isOpen, studentToEdit]);

  const createMutation = useCreateTeacherStudent();
  const updateMutation = useUpdateTeacherStudent(studentToEdit?.id);

  const batchYearOptions = useMemo(() => getBatchYearOptions(), []);

  if (!isOpen) return null;

  const isEditMode = Boolean(studentToEdit?.id);
  const activeMutation = isEditMode ? updateMutation : createMutation;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "firstname_txt" || name === "lastname_txt") {
        return { ...prev, [name]: capitalizeName(value) };
      }

      if (name === "stud_exam_symbol_no" || name === "stud_exam_reg_no") {
        return { ...prev, [name]: digitsOnly(value) };
      }

      if (name === "phone_num_txt") {
        return { ...prev, [name]: digitsOnly(value).slice(0, 10) };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      firstname_txt: capitalizeName(formData.firstname_txt.trim()),
      lastname_txt: capitalizeName(formData.lastname_txt.trim()),
      email_txt: formData.email_txt.trim() || null,
      phone_num_txt: formData.phone_num_txt.trim() || null,
      stud_exam_symbol_no: digitsOnly(formData.stud_exam_symbol_no.trim()),
      stud_exam_reg_no: digitsOnly(formData.stud_exam_reg_no.trim()),
      stud_batch_year: formData.stud_batch_year.trim(),
    };

    if (!isEditMode) {
      payload.username = formData.username.trim();
    }

    activeMutation.mutate(payload, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box glass-card p-8 max-w-2xl border border-base-300/30">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4" onClick={onClose} type="button">
          ✕
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="font-bold text-2xl tracking-tight">{isEditMode ? "Edit Student" : "Add Student"}</h3>
            <p className="text-sm text-base-content/50 font-medium mt-1">
              {isEditMode ? "Update student profile details" : "Create a new student in your center"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">First Name</span>
              </label>
              <input
                type="text"
                name="firstname_txt"
                value={formData.firstname_txt}
                onChange={handleChange}
                required
                pattern="[A-Za-z]+"
                title="First name must contain letters only"
                autoComplete="off"
                className="input input-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50 px-4 py-2"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Last Name</span>
              </label>
              <input
                type="text"
                name="lastname_txt"
                value={formData.lastname_txt}
                onChange={handleChange}
                required
                pattern="[A-Za-z]+"
                title="Last name must contain letters only"
                autoComplete="off"
                className="input input-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50 px-4 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isEditMode ? (
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Student Username</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="e.g. sfxas2457xxd"
                  autoComplete="off"
                  className="input input-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50 px-4 py-2"
                />
              </div>
            ) : null}

            <div className={`form-control w-full ${isEditMode ? "md:col-span-2" : ""}`}>
              <label className="label">
                <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Email Address</span>
              </label>
              <input
                type="email"
                name="email_txt"
                value={formData.email_txt}
                onChange={handleChange}
                placeholder="e.g. student@gmail.com"
                className="input input-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50 px-4 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Phone Number</span>
              </label>
              <input
                type="text"
                name="phone_num_txt"
                value={formData.phone_num_txt}
                onChange={handleChange}
                maxLength={10}
                placeholder="e.g. 9841000000"
                className="input input-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50 px-4 py-2"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Batch Year</span>
              </label>
              <select
                name="stud_batch_year"
                value={formData.stud_batch_year}
                onChange={handleChange}
                required
                className="select select-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50 px-4 py-2"
              >
                <option value="">Select year</option>
                {batchYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-base-200/20 border border-base-300/30">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Exam Roll / Symbol No.</span>
              </label>
              <input
                type="text"
                name="stud_exam_symbol_no"
                value={formData.stud_exam_symbol_no}
                onChange={handleChange}
                required
                inputMode="numeric"
                pattern="[0-9]{8,10}"
                maxLength={10}
                title="Symbol number must contain 8 to 10 digits"
                placeholder="8 to 10 digits"
                className="input input-bordered w-full rounded-xl bg-base-100/70 font-medium border-base-300/50 px-4 py-2"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Registration No.</span>
              </label>
              <input
                type="text"
                name="stud_exam_reg_no"
                value={formData.stud_exam_reg_no}
                onChange={handleChange}
                required
                inputMode="numeric"
                pattern="[0-9]{8,10}"
                maxLength={10}
                title="Registration number must contain 8 to 10 digits"
                placeholder="8 to 10 digits"
                className="input input-bordered w-full rounded-xl bg-base-100/70 font-medium border-base-300/50 px-4 py-2"
              />
            </div>
          </div>

          <div className="modal-action gap-3 pt-6 border-t border-base-300/20">
            <button type="button" className="btn btn-ghost rounded-xl px-6 font-bold" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary rounded-xl px-8 font-bold shadow-lg shadow-primary/20"
              disabled={activeMutation.isPending}
            >
              {activeMutation.isPending ? <span className="loading loading-spinner loading-xs" /> : isEditMode ? "Update Student" : "Create Student"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop backdrop-blur-sm bg-base-900/20" onClick={onClose} aria-hidden />
    </div>
  );
}
