import { useMemo, useState } from "react";
import UsersList from "../components/users/UsersList.jsx";
import UserFormModal from "../components/users/UserFormModal.jsx";
import { useActivateUser, useCenters, useDeactivateUser, useUsers } from "../hooks/useAdminQueries.js";

const USERS_PER_PAGE = 10;

function fullName(user) {
  return `${user.firstname_txt ?? ""} ${user.lastname_txt ?? ""}`.trim() || "Unknown User";
}

export default function UserPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const usersQuery = useUsers({ limit: 1000, search: searchTerm || undefined });
  const centersQuery = useCenters({ limit: 1000 });
  const deactivateMutation = useDeactivateUser();
  const activateMutation = useActivateUser();

  const users = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);
  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * USERS_PER_PAGE;
  const pagedUsers = users.slice(startIndex, startIndex + USERS_PER_PAGE);
  const pagination = {
    page: safePage,
    totalPages,
    total: users.length,
    limit: USERS_PER_PAGE,
  };
  const centers = useMemo(() => centersQuery.data?.data ?? [], [centersQuery.data]);

  const centersById = useMemo(() => {
    return new Map(centers.map((center) => [Number(center.id), center.center_name_txt]));
  }, [centers]);

  const isLoading = usersQuery.isLoading || centersQuery.isLoading;
  const isError = usersQuery.isError || centersQuery.isError;
  const error = usersQuery.error || centersQuery.error;
  const isTogglePending = deactivateMutation.isPending || activateMutation.isPending;

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const mutation = deleteTarget.is_active ? deactivateMutation : activateMutation;
    mutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleCreateNew = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleSearchSubmit = () => {
    const nextSearchTerm = searchInput.trim();
    setSearchTerm(nextSearchTerm);
    setPage(1);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setSearchTerm("");
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 bg-base-100/50 rounded-2xl glass-card">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="text-sm font-bold opacity-40 tracking-widest uppercase">Fetching Users...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="alert alert-error glass-card border-error/20 shadow-xl animate-fade-in">
        <span className="font-bold">{error?.response?.data?.error ?? error?.message ?? "Failed to load users"}</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <UsersList
        users={pagedUsers}
        pagination={pagination}
        setPage={setPage}
        centersById={centersById}
        searchInput={searchInput}
        searchTerm={searchTerm}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onSearchClear={handleSearchClear}
        onCreateNew={handleCreateNew}
        onEdit={handleEditUser}
        onDelete={setDeleteTarget}
      />

      <UserFormModal
        key={userToEdit?.id ?? "create-user"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setUserToEdit(null);
        }}
        userToEdit={userToEdit}
        centers={centers}
      />

      <div className={`modal ${deleteTarget ? "modal-open" : ""}`}>
        <div className="modal-box glass-card border border-error/20 p-8 max-w-lg">
          <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="font-bold text-2xl tracking-tight">{deleteTarget?.is_active ? "Deactivate User?" : "Activate User?"}</h3>
          <p className="py-4 text-base-content/60 font-medium">
            You are about to {deleteTarget?.is_active ? "deactivate" : "activate"} <span className="font-bold text-base-content">"{deleteTarget ? fullName(deleteTarget) : ""}"</span>.
            {deleteTarget?.is_active ? " This user will no longer be active." : " This user will be active again."}
          </p>
          <div className="modal-action gap-3">
            <button type="button" className="btn btn-ghost rounded-xl font-bold" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={`btn rounded-xl px-8 font-bold shadow-lg ${deleteTarget?.is_active ? "btn-error shadow-error/20" : "btn-success shadow-success/20"}`}
              onClick={handleDeleteConfirm}
              disabled={isTogglePending}
            >
              {isTogglePending ? <span className="loading loading-spinner loading-xs" /> : deleteTarget?.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
        <div className="modal-backdrop backdrop-blur-sm bg-base-900/20" onClick={() => setDeleteTarget(null)} aria-hidden />
      </div>
    </div>
  );
}
