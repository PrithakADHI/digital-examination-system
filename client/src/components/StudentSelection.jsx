import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { 
  ShieldCheck, 
  LogOut, 
  User, 
  Users,
  Search,
  BookOpen, 
  Clock, 
  RefreshCcw, 
  AlertCircle, 
  CheckCircle2, 
  Square, 
  Play, 
  Heart,
  Hash,
  Fingerprint,
  Trash2
} from "lucide-react";

const PROXY_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

export default function StudentSelection({ 
    authToken, 
    onStudentSelected, 
    onLogout, 
    registered, 
    onRegister, 
    onUnregister,
    clientDetails,
    heartbeatActive,
    onToggleHeartbeat,
    lastHeartbeat,
    onClearQuestions
}) {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchStudents = async () => {
    if (!registered) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${PROXY_URL}/students`);
      setStudents(response.data.data);
    } catch (err) {
      console.error("Failed to fetch students:", err);
      setError("Failed to load students. Ensure proxy is running.");
      toast.error("Error fetching students");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (registered) {
        fetchStudents();
    }
  }, [registered]);

  const handleSelect = (student) => {
    localStorage.setItem("assigned_student", JSON.stringify(student));
    onStudentSelected(student);
    toast.success(`Student Assigned: ${student.firstname_txt}`);
  };

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
        await onRegister();
    } finally {
        setIsRegistering(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.firstname_txt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.lastname_txt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.stud_exam_symbol_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* 🛠️ TOP NAV & LOGOUT */}
      <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                  <h2 className="text-xl font-black uppercase tracking-tight leading-tight">Admin Control</h2>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Authenticated Session</p>
              </div>
          </div>
          <button 
            onClick={onLogout}
            className="btn btn-ghost bg-base-100 rounded-2xl shadow-sm border border-base-300/50 px-6 font-bold hover:bg-error/10 hover:text-error transition-all"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Finish Session
          </button>
      </div>

      {/* ⚠️ SYSTEM STATUS CARD */}
      <div className="card bg-base-100 shadow-xl border border-base-300/50 rounded-[2.5rem] overflow-hidden">
        <div className="card-body p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center">
            <div className={`p-8 rounded-[2rem] flex items-center justify-center transition-all duration-500 ${registered ? 'bg-success/10 text-success' : 'bg-error/10 text-error animate-pulse'}`}>
                {registered ? <CheckCircle2 className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
            </div>
            
            <div className="flex-1 space-y-4 text-center md:text-left">
                <div>
                   <h3 className="text-2xl font-black tracking-tight leading-tight">
                        Terminal Status: {registered ? 'Registered' : 'Unregistered'}
                    </h3>
                    <p className="text-sm font-medium opacity-40 mt-1">
                        {registered 
                            ? `Connected as terminal ${clientDetails?.client_physical_id}` 
                            : 'This terminal must be registered with the proxy server before use.'}
                    </p>
                </div>

                {registered && (
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <div className="px-4 py-2 bg-base-200 rounded-xl border border-base-300 flex items-center gap-3">
                            <Heart className={`w-3.5 h-3.5 ${heartbeatActive ? 'text-error fill-error animate-ping' : 'opacity-20'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Heartbeat</span>
                        </div>
                        {lastHeartbeat && (
                            <div className="px-4 py-2 bg-base-200 rounded-xl border border-base-300 flex items-center gap-3 opacity-60">
                                <RefreshCcw className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-medium leading-none">Signal: {new Date(lastHeartbeat).toLocaleTimeString()}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {!registered ? (
                    <button 
                        onClick={handleRegister} 
                        disabled={isRegistering} 
                        className="btn btn-primary btn-lg rounded-2xl px-10 font-bold"
                    >
                        {isRegistering ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                        Register Terminal
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={onToggleHeartbeat}
                            className={`btn btn-lg rounded-2xl flex-1 md:flex-none px-6 font-bold shadow-lg ${heartbeatActive ? 'btn-error btn-outline' : 'btn-success shadow-success/20'}`}
                        >
                            {heartbeatActive ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                            {heartbeatActive ? 'Stop Heart' : 'Start Heart'}
                        </button>
                        <button 
                            onClick={onUnregister}
                            className="btn btn-ghost btn-lg rounded-2xl flex-1 md:flex-none px-6 font-bold opacity-40 hover:opacity-100 hover:bg-error/10 hover:text-error transition-all border border-transparent hover:border-error/20"
                        >
                            Unregister
                        </button>
                    </>
                )}
            </div>
        </div>
        
        {registered && (
            <div className="bg-base-200/50 p-4 border-t border-base-300 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold opacity-40 uppercase tracking-widest pl-4">
                    <Clock className="w-3.5 h-3.5" />
                    Storage Management
                </div>
                <button 
                    onClick={() => {
                        if (window.confirm("Are you sure you want to clear locally cached questions and assigned student? This will force a refresh.")) {
                            onClearQuestions();
                            toast.success("Local cache cleared");
                        }
                    }}
                    className="btn btn-error btn-sm btn-ghost gap-2 rounded-xl font-black text-[10px] uppercase tracking-widest"
                >
                    <Trash2 className="w-4 h-4" />
                    Clear Local Question Cache
                </button>
            </div>
        )}
      </div>

      {registered && (
          <div className="space-y-8">
              {/* STUDENT SELECTION SEARCH */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 pt-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        <h2 className="text-3xl font-black tracking-tight leading-tight">Student Assignment</h2>
                    </div>
                    <p className="text-sm font-medium opacity-40">Search and select a candidate for this terminal.</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input 
                    type="text" 
                    placeholder="Search students..." 
                    className="input input-bordered w-full pl-12 rounded-2xl bg-base-100 border-base-300 focus:border-primary/50 transition-all font-medium py-7"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="text-xs font-bold uppercase tracking-widest">Loading candidates...</p>
                </div>
              ) : error ? (
                <div className="alert alert-error rounded-[2rem] shadow-lg font-bold">
                    <AlertCircle className="w-6 h-6" />
                    <span>{error}</span>
                    <button onClick={fetchStudents} className="btn btn-sm btn-ghost">Retry</button>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="bg-base-100/30 rounded-[3rem] p-24 text-center border-4 border-dashed border-base-content/5 mt-8">
                    <Users className="w-16 h-16 mx-auto opacity-10 mb-4" />
                    <h3 className="text-xl font-bold opacity-20">No matching students found</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStudents.map((student) => (
                    <button 
                        key={student.id} 
                        onClick={() => handleSelect(student)}
                        className="card bg-base-100 shadow-xl border-2 border-transparent hover:border-primary/40 hover:ring-8 hover:ring-primary/5 transition-all duration-300 text-left group overflow-hidden rounded-[2.5rem]"
                    >
                        <div className="card-body p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="p-4 bg-base-200 rounded-2xl text-base-content/40 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-500">
                                    <User className="w-7 h-7" />
                                </div>
                                <div className="badge badge-ghost opacity-40 py-3 px-4 text-[9px] font-black uppercase tracking-widest rounded-lg"># {student.id}</div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-black group-hover:text-primary transition-colors leading-tight">
                                    {student.firstname_txt} {student.lastname_txt}
                                </h3>
                                <p className="text-sm font-bold opacity-30 lowercase truncate">@{student.username}</p>
                            </div>

                            <div className="grid grid-cols-1 gap-2 border-t border-base-content/5 pt-6 mt-2">
                                <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-xl">
                                    <Hash className="w-4 h-4 opacity-30" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-30 leading-none mb-1">Symbol No</span>
                                        <span className="text-xs font-mono font-bold">{student.stud_exam_symbol_no || "N/A"}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-xl">
                                    <Fingerprint className="w-4 h-4 opacity-30" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-30 leading-none mb-1">Registration No</span>
                                        <span className="text-xs font-mono font-bold">{student.stud_exam_reg_no || "N/A"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="btn btn-primary btn-sm w-full rounded-xl font-bold uppercase tracking-widest text-[9px] h-10">
                                    Assign This Student
                                </div>
                            </div>
                        </div>
                    </button>
                    ))}
                </div>
              )}
          </div>
      )}
    </div>
  );
}
