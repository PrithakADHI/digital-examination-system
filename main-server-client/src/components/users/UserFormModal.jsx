import { useMemo, useState } from "react";
import { useCreateUser, useUpdateUser } from "../../hooks/useAdminQueries.js";
import { toast } from "react-hot-toast";

const ROLE_OPTIONS = ["SUPERADMIN", "ADMIN", "TEACHER", "STUDENT"];
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

function getInitialFormData(userToEdit) {
  return {
    firstname_txt: capitalizeName(userToEdit?.firstname_txt || ""),
    lastname_txt: capitalizeName(userToEdit?.lastname_txt || ""),
    username: userToEdit?.username || "",
    email_txt: userToEdit?.email_txt || "",
    role: userToEdit?.role || "STUDENT",
    center_fk_id: userToEdit?.center_fk_id != null ? String(userToEdit.center_fk_id) : "",
    stud_exam_symbol_no: userToEdit?.stud_exam_symbol_no || "",
    stud_exam_reg_no: userToEdit?.stud_exam_reg_no || "",
    stud_batch_year: userToEdit?.stud_batch_year || "",
  };
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export default function UserFormModal({ isOpen, onClose, userToEdit, centers }) {
  const [formData, setFormData] = useState(() => getInitialFormData(userToEdit));

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(userToEdit?.id);

  const centerOptions = useMemo(() => centers ?? [], [centers]);
  const batchYearOptions = useMemo(() => getBatchYearOptions(), []);

  if (!isOpen) return null;

  const isEditMode = Boolean(userToEdit?.id);
  const activeMutation = isEditMode ? updateMutation : createMutation;

  const isStudent = formData.role === "STUDENT";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "firstname_txt" || name === "lastname_txt") {
        return { ...prev, [name]: capitalizeName(value) };
      }

      if (name === "stud_exam_symbol_no" || name === "stud_exam_reg_no") {
        return { ...prev, [name]: digitsOnly(value) };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      firstname_txt: capitalizeName(formData.firstname_txt.trim()),
      lastname_txt: capitalizeName(formData.lastname_txt.trim()),
      role: formData.role,
      center_fk_id: toNumberOrNull(formData.center_fk_id),
    };

    if (!isEditMode) {
      payload.username = formData.username.trim();
      payload.email_txt = formData.email_txt.trim().toLowerCase();
    }

    if (isStudent) {
      payload.stud_exam_symbol_no = digitsOnly(formData.stud_exam_symbol_no.trim());
      payload.stud_exam_reg_no = digitsOnly(formData.stud_exam_reg_no.trim());
      payload.stud_batch_year = formData.stud_batch_year.trim();
    }

    activeMutation.mutate(payload, {
      onSuccess: (response) => {
        if (!isEditMode) {
          const mailTarget = response?.email || payload.email_txt;
          toast.success(`Mail sent to this email: ${mailTarget}`);
        }
        onClose();
      },
    });
  };

  return (
    <div className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box glass-card p-8 max-w-2xl border border-base-300/30">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4" onClick={onClose}>
          x
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="font-bold text-2xl tracking-tight">{isEditMode ? "Edit User" : "Add User"}</h3>
            <p className="text-sm text-base-content/50 font-medium mt-1">
              {isEditMode ? "Update user profile details and center mapping" : "Create a new user and assign role and center"}
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
                className="input input-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50"
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
                className="input input-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50"
              />
            </div>
          </div>

          {!isEditMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Username</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="input input-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50"
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Email</span>
                </label>
                <input
                  type="email"
                  name="email_txt"
                  value={formData.email_txt}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                  className="input input-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50"
                />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Role</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="select select-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Examination Center</span>
              </label>
              <select
                name="center_fk_id"
                value={formData.center_fk_id}
                onChange={handleChange}
                className="select select-bordered w-full rounded-xl bg-base-200/30 font-medium border-base-300/50"
              >
                <option value="">Not Assigned</option>
                {centerOptions.map((center) => (
                  <option key={center.id} value={String(center.id)}>
                    {center.center_name_txt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isStudent ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-base-200/20 border border-base-300/30">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Symbol No.</span>
                </label>
                <input
                  type="text"
                  name="stud_exam_symbol_no"
                  value={formData.stud_exam_symbol_no}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="[0-9]{8,10}"
                  maxLength={10}
                  title="Symbol number must contain 8 to 10 digits"
                  className="input input-bordered w-full rounded-xl bg-base-100/70 font-medium border-base-300/50"
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold uppercase text-[10px] tracking-widest opacity-40">Regist. No.</span>
                </label>
                <input
                  type="text"
                  name="stud_exam_reg_no"
                  value={formData.stud_exam_reg_no}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="[0-9]{8,10}"
                  maxLength={10}
                  title="Registration number must contain 8 to 10 digits"
                  className="input input-bordered w-full rounded-xl bg-base-100/70 font-medium border-base-300/50"
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
                  className="select select-bordered w-full rounded-xl bg-base-100/70 font-medium border-base-300/50"
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
          ) : null}

          <div className="modal-action gap-3 pt-6 border-t border-base-300/20">
            <button type="button" className="btn btn-ghost rounded-xl px-6 font-bold" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary rounded-xl px-8 font-bold shadow-lg shadow-primary/20"
              disabled={activeMutation.isPending}
            >
              {activeMutation.isPending ? <span className="loading loading-spinner loading-xs" /> : isEditMode ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop backdrop-blur-sm bg-base-900/20" onClick={onClose} aria-hidden />
    </div>
  );
}
