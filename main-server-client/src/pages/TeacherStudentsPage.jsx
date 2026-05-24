import { useState, useMemo } from "react";
import {
  useTeacherCenterStudents,
  useDeactivateTeacherStudent,
  useActivateTeacherStudent,
  useDeleteTeacherStudent,
} from "../hooks/useTeacherQueries.js";
import TeacherStudentFormModal from "../components/students/TeacherStudentFormModal.jsx";
import StudentDetailsModal from "../components/students/StudentDetailsModal.jsx";
import toast from "react-hot-toast";

export default function TeacherStudentsPage() {
  const { data, isLoading, isError, error, refetch } = useTeacherCenterStudents();

  // Search & Pagination states
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Mutations
  const deactivateMutation = useDeactivateTeacherStudent();
  const activateMutation = useActivateTeacherStudent();
  const deleteMutation = useDeleteTeacherStudent();

  const centerName = data?.center_name || "Assigned Center";
  const students = useMemo(() => data?.students ?? [], [data]);

  // Client-side search and filtering
  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return students;

    return students.filter((s) => {
      const name = `${s.firstname_txt ?? ""} ${s.lastname_txt ?? ""}`.toLowerCase();
      const username = (s.username ?? "").toLowerCase();
      const email = (s.email_txt ?? "").toLowerCase();
      const symbol = (s.stud_exam_symbol_no ?? "").toLowerCase();
      const batch = (s.stud_batch_year ?? "").toLowerCase();

      return (
        name.includes(term) ||
        username.includes(term) ||
        email.includes(term) ||
        symbol.includes(term) ||
        batch.includes(term)
      );
    });
  }, [students, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Add/Edit trigger
  const handleCreateNew = () => {
    setSelectedStudent(null);
    setFormModalOpen(true);
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setFormModalOpen(true);
  };

  // View Details trigger
  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setDetailsModalOpen(true);
  };

  // Toggle active status
  const handleToggleStatus = (student) => {
    const toastId = toast.loading(`${student.is_active ? "Deactivating" : "Activating"} student...`);
    const actionMutation = student.is_active ? deactivateMutation : activateMutation;

    actionMutation.mutate(student.id, {
      onSuccess: () => {
        toast.success(`Student ${student.is_active ? "deactivated" : "activated"} successfully!`, { id: toastId });
      },
      onError: (err) => {
        toast.error(err?.response?.data?.error ?? "Failed to toggle student status", { id: toastId });
      },
    });
  };

  // Delete trigger
  const handleDelete = (student) => {
    if (window.confirm(`Are you absolutely sure you want to permanently delete student ${student.firstname_txt} ${student.lastname_txt}?`)) {
      const toastId = toast.loading("Permanently removing student record...");
      deleteMutation.mutate(student.id, {
        onSuccess: () => {
          toast.success("Student deleted successfully!", { id: toastId });
        },
        onError: (err) => {
          toast.error(err?.response?.data?.error ?? "Could not delete student. They may have active exam submissions.", { id: toastId });
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 grow">
        <span className="loading loading-spinner loading-lg text-primary mb-4" />
        <p className="text-sm text-base-content/50 font-bold">Loading center student records...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card card border border-error/20 bg-error/5 animate-fade-in">
        <div className="card-body">
          <h2 className="text-lg font-bold flex items-center gap-2 text-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Error loading students list
          </h2>
          <p className="text-sm opacity-70 font-medium mt-1">
            {error?.response?.data?.error ?? error?.message ?? "Failed to fetch student data."}
          </p>
          <div className="card-actions mt-4">
            <button type="button" className="btn btn-sm btn-outline btn-error rounded-xl font-bold px-6" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 px-2 md:px-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Center Students</h1>
          <p className="text-sm text-base-content/50 font-medium mt-1">
            Manage student records assigned to your center: <span className="text-primary font-bold">{centerName}</span>
          </p>
        </div>
      </div>

      {/* Main Glass Card list */}
      <div className="glass-card shadow-sm border border-base-300/30 overflow-hidden bg-base-100 mb-8 rounded-3xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 gap-4 border-b border-base-300/30 bg-base-200/20">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Student Roster</h2>
            <p className="text-xs text-base-content/40 font-medium mt-0.5">CRUD management & performance overview</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <form className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto" onSubmit={handleSearchSubmit}>
              <label className="input input-bordered flex items-center gap-2 rounded-xl bg-base-100 w-full sm:w-[280px]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search students..."
                  className="grow rounded-xl bg-white dark:bg-base-200/20 h-max border-none focus:outline-none"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="btn btn-primary btn-square rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105"
                  aria-label="Search"
                  title="Search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                  </svg>
                </button>
                {searchTerm && (
                  <button type="button" className="btn btn-ghost rounded-xl px-5 text-xs font-bold" onClick={handleSearchClear}>
                    Clear
                  </button>
                )}
              </div>
            </form>
            <button
              type="button"
              className="btn btn-primary rounded-xl px-6 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105 font-bold"
              onClick={handleCreateNew}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Student
            </button>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-x-auto px-6 pb-6 mt-4">
          <table className="table table-md w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-base-content/40 uppercase tracking-widest text-[9px] font-black border-none">
                <th className="bg-transparent pl-4 border-none">Student ID</th>
                <th className="bg-transparent border-none">Student Name</th>
                <th className="bg-transparent border-none">Student Batch Year</th>
                <th className="bg-transparent border-none">Exam Roll No.</th>
                <th className="bg-transparent border-none">Email</th>
                <th className="bg-transparent border-none">Phone Number</th>
                <th className="bg-transparent border-none text-center">Status</th>
                <th className="bg-transparent text-right pr-4 border-none">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 bg-base-100/50 rounded-2xl border border-base-300/30 shadow-inner">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <span className="text-base font-bold">
                        {searchTerm ? `No results matching "${searchTerm}"` : "No student records found in your center"}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((row) => (
                  <tr key={row.id} className="group/tr transition-all duration-300">
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-l border-base-300/30 rounded-l-2xl pl-4 py-4 font-mono text-[11px] font-bold text-base-content/70">
                      {row.username}
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30">
                      <span className="font-bold text-sm group-hover/tr:text-primary transition-colors block">
                        {row.full_name || `${row.firstname_txt} ${row.lastname_txt}`}
                      </span>
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 font-semibold text-xs text-base-content/70">
                      {row.stud_batch_year || "—"}
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 font-mono text-xs font-bold text-base-content/70">
                      {row.stud_exam_symbol_no || "—"}
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 text-xs font-semibold text-base-content/60 truncate max-w-[150px]">
                      {row.email_txt || "—"}
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 text-xs font-semibold text-base-content/60">
                      {row.phone_num_txt || "—"}
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${row.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-neutral/10 text-neutral border border-neutral/20"}`}>
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-r border-base-300/30 rounded-r-2xl pr-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className="btn btn-ghost btn-circle btn-sm bg-base-200/50 hover:bg-primary/20 hover:text-primary transition-all duration-200"
                          onClick={() => handleViewDetails(row)}
                          title="View Performance"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-circle btn-sm bg-base-200/50 hover:bg-primary/20 hover:text-primary transition-all duration-200"
                          onClick={() => handleEdit(row)}
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={`btn btn-ghost btn-circle btn-sm bg-base-200/50 ${row.is_active ? "hover:bg-error/20 hover:text-error" : "hover:bg-success/20 hover:text-success"} transition-all duration-200`}
                          onClick={() => handleToggleStatus(row)}
                          title={row.is_active ? "Deactivate" : "Activate"}
                        >
                          {row.is_active ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-circle btn-sm bg-base-200/50 hover:bg-error/20 hover:text-error transition-all duration-200"
                          onClick={() => handleDelete(row)}
                          title="Delete Permanently"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards Layout */}
        <div className="lg:hidden px-6 pb-8 space-y-4 mt-6">
          {paginatedStudents.map((row) => (
            <div key={row.id} className="p-5 rounded-2xl bg-base-100 border border-base-300/30 space-y-4 shadow-sm relative hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-mono text-[9px] font-bold text-base-content/40 tracking-wider">#{row.username}</div>
                  <div className="font-bold text-base leading-tight">{row.full_name || `${row.firstname_txt} ${row.lastname_txt}`}</div>
                  <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${row.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-neutral/10 text-neutral border border-neutral/20"}`}>
                    {row.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                
                {/* Actions Row */}
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-circle btn-xs bg-base-200/50 hover:bg-primary/20 hover:text-primary"
                    onClick={() => handleViewDetails(row)}
                    title="View details"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-circle btn-xs bg-base-200/50 hover:bg-primary/20 hover:text-primary"
                    onClick={() => handleEdit(row)}
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-circle btn-xs bg-base-200/50 ${row.is_active ? "hover:bg-error/20 hover:text-error" : "hover:bg-success/20 hover:text-success"}`}
                    onClick={() => handleToggleStatus(row)}
                    title={row.is_active ? "Deactivate" : "Activate"}
                  >
                    {row.is_active ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-circle btn-xs bg-base-200/50 hover:bg-error/20 hover:text-error"
                    onClick={() => handleDelete(row)}
                    title="Delete permanently"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-3 text-[10px] font-bold">
                <div className="p-3 rounded-xl bg-base-200/30">
                  <p className="opacity-35 mb-1 font-black uppercase text-[8px]">Batch Year</p>
                  {row.stud_batch_year || "—"}
                </div>
                <div className="p-3 rounded-xl bg-base-200/30">
                  <p className="opacity-35 mb-1 font-black uppercase text-[8px]">Symbol No.</p>
                  {row.stud_exam_symbol_no || "—"}
                </div>
                <div className="col-span-2 p-3 rounded-xl bg-base-200/30">
                  <p className="opacity-35 mb-1 font-black uppercase text-[8px]">Email</p>
                  <p className="truncate">{row.email_txt || "—"}</p>
                </div>
              </div>
            </div>
          ))}
          {paginatedStudents.length === 0 && (
            <div className="text-center py-12 opacity-40 font-semibold">No students match your filter.</div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-8 border-t border-base-300/30 bg-base-200/10">
            <div className="flex justify-center">
              <div className="join glass-effect border border-base-300/30 shadow-sm p-1">
                <button
                  type="button"
                  className="join-item btn btn-sm btn-ghost rounded-lg font-bold"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="join-item btn btn-sm btn-ghost px-6 no-animation font-black text-xs">
                  {currentPage} <span className="mx-2 opacity-30">/</span> {totalPages}
                </div>
                <button
                  type="button"
                  className="join-item btn btn-sm btn-ghost rounded-lg font-bold"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Forms & Details Modals */}
      <TeacherStudentFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        studentToEdit={selectedStudent}
      />

      <StudentDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        studentId={selectedStudent?.id}
      />
    </div>
  );
}
