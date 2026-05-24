import { useStudentProfile } from "../../../hooks/useStudentQueries.js";

export default function StudentProfileCard() {
  const { data, isLoading, isError, error, refetch } = useStudentProfile();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening";

  if (isLoading) {
    return (
      <div className="glass-card card shadow-sm p-6 flex flex-col justify-center items-center min-h-[180px]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card card shadow-sm p-6 text-center">
        <p className="text-error font-medium">{error?.response?.data?.error ?? error?.message ?? "Failed to load profile"}</p>
        <button type="button" className="btn btn-sm btn-outline mt-3" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const profile = data ?? {};
  const fullName = [profile.firstname_txt, profile.lastname_txt].filter(Boolean).join(" ") || "Student";

  return (
    <div className="glass-card card shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
      <div className="card-body p-6">
        <header className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shadow-inner">
            {profile.profilePicture ? (
              <img src={profile.profilePicture} alt="Profile" className="w-full h-full object-cover rounded-xl" />
            ) : (
              profile.firstname_txt?.charAt(0) || "S"
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{greeting}, {fullName}</h1>
            <p className="text-xs text-base-content/50 font-medium">Batch of {profile.stud_batch_year || "-"}</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 border-t border-base-300/30 pt-4 text-xs">
          <div>
            <p className="text-[10px] uppercase font-bold text-base-content/40 tracking-wider">Symbol Number</p>
            <p className="font-semibold mt-0.5 text-base-content/80">{profile.stud_exam_symbol_no || "-"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-base-content/40 tracking-wider">Registration Number</p>
            <p className="font-semibold mt-0.5 text-base-content/80">{profile.stud_exam_reg_no || "-"}</p>
          </div>
          <div className="col-span-2 border-t border-base-300/30 pt-3 mt-1">
            <p className="text-[10px] uppercase font-bold text-base-content/40 tracking-wider">Assigned Examination Center</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="px-1.5 py-0.5 rounded bg-primary/10 text-[10px] font-bold text-primary uppercase">
                {profile.exam_center_id || "Code"}
              </div>
              <p className="font-semibold text-base-content/80 text-[11px] truncate">{profile.center_name_txt || "No assigned center"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
