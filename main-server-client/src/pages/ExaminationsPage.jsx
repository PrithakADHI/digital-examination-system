import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExaminationsList from "../components/examinations/ExaminationsList.jsx";
import {
  useDeleteExamination,
  useExaminations,
} from "../hooks/useAdminQueries.js";

const EXAMINATIONS_PER_PAGE = 10;

export default function ExaminationsPage() {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const deleteMutation = useDeleteExamination();
  const examinationsQuery = useExaminations({
    page,
    limit: EXAMINATIONS_PER_PAGE,
    search: searchTerm || undefined,
  });

  const examinations = useMemo(() => examinationsQuery.data?.data ?? [], [examinationsQuery.data]);
  const pagination = examinationsQuery.data?.pagination ?? {
    total: 0,
    page: 1,
    limit: EXAMINATIONS_PER_PAGE,
    totalPages: 0,
  };

  const handleCreateNew = () => navigate("/admin/examinations/new");
  const handleEditExam = (id) => navigate(`/admin/examinations/edit/${id}`);
  
  const handleDeleteClick = (id, name) => setDeleteTarget({ id, name });
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };
  const handleDeleteCancel = () => setDeleteTarget(null);
  const handleSearchSubmit = () => {
    setSearchTerm(searchInput.trim());
    setPage(1);
  };
  const handleSearchClear = () => {
    setSearchInput("");
    setSearchTerm("");
    setPage(1);
  };

  if (examinationsQuery.isLoading) {
    return (
      <div className="flex justify-center py-20 bg-base-100/50 rounded-2xl glass-card">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="text-sm font-bold opacity-40 tracking-widest uppercase">Fetching Examinations...</span>
        </div>
      </div>
    );
  }

  if (examinationsQuery.isError) {
    return (
      <div className="alert alert-error glass-card border-error/20 shadow-xl animate-fade-in">
        <span className="font-bold">{examinationsQuery.error?.response?.data?.error ?? examinationsQuery.error?.message ?? "Failed to load examinations"}</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">

      <ExaminationsList
        examinations={examinations}
        pagination={pagination}
        page={page}
        setPage={setPage}
        searchInput={searchInput}
        searchTerm={searchTerm}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onSearchClear={handleSearchClear}
        onSelectExam={handleEditExam}
        onCreateNew={handleCreateNew}
        onDelete={handleDeleteClick}
      />

      {/* Delete confirmation modal */}
      <div className={`modal ${deleteTarget ? "modal-open" : ""}`}>
        <div className="modal-box glass-card border border-error/20 p-8 max-w-lg">
          <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="font-bold text-2xl tracking-tight">Discard Examination?</h3>
          <p className="py-4 text-base-content/60 font-medium">
            You are about to delete <span className="font-bold text-base-content">&quot;{deleteTarget?.name}&quot;</span>. 
            All associated data will be permanently removed. This action cannot be undone.
          </p>
          <div className="modal-action gap-3">
            <button type="button" className="btn btn-ghost rounded-xl font-bold" onClick={handleDeleteCancel}>
              Keep Exam
            </button>
            <button
              type="button"
              className="btn btn-error rounded-xl px-8 font-bold shadow-lg shadow-error/20"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : "Delete Permanently"}
            </button>
          </div>
        </div>
        <div className="modal-backdrop backdrop-blur-sm bg-base-900/20" onClick={handleDeleteCancel} aria-hidden />
      </div>
    </div>
  );
}
