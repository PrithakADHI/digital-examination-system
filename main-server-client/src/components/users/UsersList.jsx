function fullName(user) {
  return `${user.firstname_txt ?? ""} ${user.lastname_txt ?? ""}`.trim() || "—";
}

function userCenterName(user, centersById) {
  if (!user?.center_fk_id) return "—";
  return centersById.get(Number(user.center_fk_id)) ?? `Center #${user.center_fk_id}`;
}

function studentValue(user, key) {
  if (user?.role !== "STUDENT") return "—";
  return user?.[key] || "—";
}

export default function UsersList({
  users,
  pagination,
  setPage,
  centersById,
  searchInput,
  searchTerm,
  onSearchInputChange,
  onSearchSubmit,
  onSearchClear,
  onCreateNew,
  onEdit,
  onDelete,
}) {
  const list = users ?? [];
  const hasSearchTerm = Boolean(searchTerm?.trim());
  const emptyMessage = hasSearchTerm ? `No users match "${searchTerm}".` : "No users found.";

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearchSubmit?.();
  };

  return (
    <div className="glass-card shadow-sm border border-base-300/30 overflow-hidden animate-fade-in mb-8">
      <div className="p-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 gap-4 border-b border-base-300/30 bg-base-200/20">
          <div>
            <h2 className="text-xl font-bold tracking-tight">System Users</h2>
            <p className="text-sm text-base-content/50 font-medium mt-1">Manage user records and center assignment</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <form className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto" onSubmit={handleSubmit}>
              <label className="input input-bordered flex items-center gap-2 rounded-xl bg-base-100 w-full sm:w-[320px]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => onSearchInputChange?.(event.target.value)}
                  placeholder="Search users..."
                  className="grow"
                />
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="btn btn-primary btn-square rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105"
                  aria-label="Search users"
                  title="Search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                  </svg>
                </button>
                {hasSearchTerm ? (
                  <button type="button" className="btn btn-ghost rounded-xl px-5" onClick={onSearchClear}>
                    Clear
                  </button>
                ) : null}
              </div>
            </form>
            <button
              type="button"
              className="btn btn-primary rounded-xl px-6 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105"
              onClick={onCreateNew}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              User
            </button>
          </div>
        </div>

        <div className="hidden lg:block overflow-x-auto px-6 pb-6">
          <table className="table table-md w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-base-content/40 uppercase tracking-widest text-[10px] font-black">
                <th className="bg-transparent border-none pl-4">ID</th>
                <th className="bg-transparent border-none min-w-[180px]">Full Name</th>
                <th className="bg-transparent border-none">Role</th>
                <th className="bg-transparent border-none min-w-[160px]">Center</th>
                <th className="bg-transparent border-none">Symbol No.</th>
                <th className="bg-transparent border-none">Regis. No.</th>
                <th className="bg-transparent border-none">Batch Year</th>
                <th className="bg-transparent border-none text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 bg-base-100/50 rounded-2xl border border-base-300/30 shadow-inner">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <span className="text-lg font-bold">{emptyMessage}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id} className="group/tr transition-all duration-300">
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-l border-base-300/30 rounded-l-2xl pl-4 py-5">
                      <span className="text-xs font-black opacity-20 tracking-tighter">#{row.id}</span>
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30">
                      <span className="font-bold text-base group-hover/tr:text-primary transition-colors">{fullName(row)}</span>
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30">
                      <span className="badge badge-outline rounded-xl font-black tracking-wide">{row.role || "—"}</span>
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 text-sm font-semibold text-base-content/70">
                      {userCenterName(row, centersById)}
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 text-xs font-semibold text-base-content/70">
                      {studentValue(row, "stud_exam_symbol_no")}
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 text-xs font-semibold text-base-content/70">
                      {studentValue(row, "stud_exam_reg_no")}
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-base-300/30 text-xs font-semibold text-base-content/70">
                      {studentValue(row, "stud_batch_year")}
                    </td>
                    <td className="bg-base-100 group-hover/tr:bg-base-200/50 border-y border-r border-base-300/30 rounded-r-2xl pr-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-circle btn-sm bg-base-200/50 hover:bg-primary/20 hover:text-primary"
                          onClick={() => onEdit(row)}
                          aria-label="Edit user"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={`btn btn-ghost btn-circle btn-sm bg-base-200/50 ${row.is_active ? "hover:bg-error/20 hover:text-error" : "hover:bg-success/20 hover:text-success"}`}
                          onClick={() => onDelete(row)}
                          aria-label={row.is_active ? "Deactivate user" : "Activate user"}
                          title={row.is_active ? "Deactivate" : "Activate"}
                        >
                          {row.is_active ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden px-6 pb-8 space-y-4">
          {list.map((row) => (
            <div key={row.id} className="p-5 rounded-2xl bg-base-100 border border-base-300/30 space-y-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-[10px] font-black opacity-20 tracking-tighter">#{row.id}</div>
                  <div className="font-bold text-lg leading-tight">{fullName(row)}</div>
                  <div className="badge badge-outline rounded-xl font-black tracking-wide">{row.role || "—"}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-circle btn-xs bg-base-200/50 hover:bg-primary/20 hover:text-primary"
                    onClick={() => onEdit(row)}
                    aria-label="Edit user"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-circle btn-xs bg-base-200/50 ${row.is_active ? "hover:bg-error/20 hover:text-error" : "hover:bg-success/20 hover:text-success"}`}
                    onClick={() => onDelete(row)}
                    aria-label={row.is_active ? "Deactivate user" : "Activate user"}
                    title={row.is_active ? "Deactivate" : "Activate"}
                  >
                    {row.is_active ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] font-bold">
                <div className="p-3 rounded-xl bg-base-200/30">
                  <p className="opacity-30 mb-1 font-black uppercase text-[9px]">Center</p>
                  {userCenterName(row, centersById)}
                </div>
                <div className="p-3 rounded-xl bg-base-200/30">
                  <p className="opacity-30 mb-1 font-black uppercase text-[9px]">Batch</p>
                  {studentValue(row, "stud_batch_year")}
                </div>
                <div className="p-3 rounded-xl bg-base-200/30">
                  <p className="opacity-30 mb-1 font-black uppercase text-[9px]">Symbol</p>
                  {studentValue(row, "stud_exam_symbol_no")}
                </div>
                <div className="p-3 rounded-xl bg-base-200/30">
                  <p className="opacity-30 mb-1 font-black uppercase text-[9px]">Regis.</p>
                  {studentValue(row, "stud_exam_reg_no")}
                </div>
              </div>
            </div>
          ))}

          {list.length === 0 ? <div className="text-center py-12 opacity-40 font-semibold">{emptyMessage}</div> : null}
        </div>

        {pagination?.totalPages > 1 && (
          <div className="p-8 border-t border-base-300/30 bg-base-200/10">
            <div className="flex justify-center">
              <div className="join glass-effect border border-base-300/30 shadow-sm p-1">
                <button
                  type="button"
                  className="join-item btn btn-sm btn-ghost rounded-lg font-bold"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="join-item btn btn-sm btn-ghost px-6 no-animation font-black text-xs">
                  {pagination.page} <span className="mx-2 opacity-30">/</span> {pagination.totalPages}
                </div>
                <button
                  type="button"
                  className="join-item btn btn-sm btn-ghost rounded-lg font-bold"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
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
    </div>
  );
}
