import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "./context/ThemeContext.jsx";
import { 
  Monitor, 
  Sun, 
  Moon, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen,
  User,
  Settings,
  Clock,
  RefreshCcw,
  Play,
  Square,
  Heart,
  ShieldCheck
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { useQuestionFetcher } from "./hooks/useQuestionFetcher.js";
import ExaminationView from "./components/ExaminationView.jsx";
import AdminLogin from "./components/AdminLogin.jsx";
import StudentSelection from "./components/StudentSelection.jsx";

const PROXY_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

function MainApp() {
  const { theme, toggleTheme } = useTheme();
  const [registered, setRegistered] = useState(false);
  const [clientDetails, setClientDetails] = useState(null);
  const [heartbeatActive, setHeartbeatActive] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const [isExamMode, setIsExamMode] = useState(false);
  const [assignedStudent, setAssignedStudent] = useState(null);
  const [adminToken, setAdminToken] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Start question fetcher when registered
  const { questions } = useQuestionFetcher(registered);

  // Load registration and student from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("client_registration");
    if (stored) {
      const data = JSON.parse(stored);
      setClientDetails(data);
      setRegistered(true);
    }
    const student = localStorage.getItem("assigned_student");
    if (student) {
      setAssignedStudent(JSON.parse(student));
    }
  }, []);

  const registerClient = async () => {
    setIsRegistering(true);
    const deviceId = `TERM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    try {
      const response = await axios.post(`${PROXY_URL}/register-client`, { device_id: deviceId });
      const data = response.data;
      
      localStorage.setItem("client_registration", JSON.stringify(data));
      setClientDetails(data);
      setRegistered(true);
      toast.success("Client Registered Successfully!");
    } catch (err) {
      console.error("Registration failed:", err);
      toast.error("Failed to register client.");
    } finally {
      setIsRegistering(false);
    }
  };

  const sendHeartbeat = useCallback(async () => {
    if (!clientDetails?.client_id || !heartbeatActive) return;
    try {
      await axios.post(`${PROXY_URL}/heartbeat/${clientDetails.client_id}`);
      setLastHeartbeat(new Date());
    } catch (err) {
      console.error("Heartbeat failed:", err.message);
    }
  }, [clientDetails, heartbeatActive]);

  useEffect(() => {
    let interval;
    if (registered && heartbeatActive) {
      sendHeartbeat();
      interval = setInterval(sendHeartbeat, 5000);
    }
    return () => clearInterval(interval);
  }, [registered, heartbeatActive, sendHeartbeat]);

  const handleAdminSuccess = ({ token }) => {
    setAdminToken(token);
  };

  const handleStudentSelected = (student) => {
    setAssignedStudent(student);
    setAdminToken(null); // Clear admin token to force re-login as per requirement
    navigate("/");
  };

  const examStartTime = useMemo(() => {
      // Questions contain subject info which has exam_startTime_ts
      // Assuming all questions in local storage belong to the same subject during an active session
      if (questions.length > 0) {
          return new Date(questions[0].exam_startTime_ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return "...";
  }, [questions]);

  const showQuestionAnswerUI = questions.length > 0 && isExamMode;

  return (
    <div className="min-h-screen bg-base-200 text-base-content transition-colors duration-300">
      {/* Navbar */}
      <div className="navbar glass-effect sticky top-0 z-50 px-6 py-4 border-b border-base-content/5 shadow-sm">
        <div className="flex-1 flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl text-primary-content">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase">DES</h1>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">
                Client {isExamMode && "• In Exam"}
            </p>
          </div>
        </div>
        <div className="flex-none gap-2">
          {location.pathname === "/" && (
              <button 
                onClick={() => navigate("/admin")}
                className="btn btn-ghost btn-circle rounded-xl"
                title="Admin Panel"
              >
                  <Settings className="w-5 h-5 opacity-40 hover:opacity-100" />
              </button>
          )}
          <button onClick={toggleTheme} className="btn btn-ghost btn-circle rounded-xl">
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <Routes>
          <Route path="/admin" element={
            !adminToken ? (
                <AdminLogin onLoginSuccess={handleAdminSuccess} />
            ) : (
                <StudentSelection 
                    authToken={adminToken} 
                    onStudentSelected={(s) => {
                        setAssignedStudent(s);
                        setAdminToken(null);
                        navigate("/");
                    }} 
                    onLogout={() => setAdminToken(null)}
                    registered={registered}
                    onRegister={registerClient}
                    onUnregister={() => {
                        localStorage.removeItem("client_registration");
                        setRegistered(false);
                        setClientDetails(null);
                        setHeartbeatActive(false);
                        toast.error("Client Unregistered");
                    }}
                    clientDetails={clientDetails}
                    heartbeatActive={heartbeatActive}
                    onToggleHeartbeat={() => setHeartbeatActive(!heartbeatActive)}
                    lastHeartbeat={lastHeartbeat}
                    onClearQuestions={() => {
                        localStorage.removeItem("exam_questions");
                        localStorage.removeItem("assigned_student");
                        localStorage.removeItem("has_synced_questions");
                        setAssignedStudent(null);
                        // Reloading is the cleanest way to reset the question fetcher hook state
                        window.location.reload();
                    }}
                />
            )
          } />
          
          <Route path="/" element={
            !registered ? (
                <div className="text-center space-y-6 animate-in fade-in duration-700">
                    <div className="p-8 md:p-14 bg-base-100/50 rounded-[3rem] border-4 border-dashed border-base-content/5">
                        <AlertCircle className="w-20 h-20 mx-auto text-error opacity-40 mb-6" />
                        <h2 className="text-4xl font-black tracking-tight mb-2">Terminal Not Ready</h2>
                        <p className="text-xl font-medium opacity-40">Registration required. Please contact the administrator.</p>
                    </div>
                </div>
            ) : isExamMode ? (
                <ExaminationView onExit={() => setIsExamMode(false)} />
            ) : !assignedStudent ? (
                <div className="text-center space-y-6 animate-in fade-in duration-700">
                    <div className="p-8 md:p-14 bg-base-100/50 rounded-[3rem] border-4 border-dashed border-base-content/5">
                        <User className="w-20 h-20 mx-auto opacity-10 mb-6" />
                        <h2 className="text-4xl font-black tracking-tight mb-2">Student has not been assigned</h2>
                        <p className="text-xl font-medium opacity-40">Please contact the administrator to begin.</p>
                    </div>
                </div>
            ) : questions.length === 0 ? (
                <div className="text-center space-y-6 animate-in fade-in duration-700">
                   <div className="p-8 md:p-14 bg-base-100/50 rounded-[3rem] border-4 border-dashed border-base-content/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
                        <div className="relative z-10">
                            <Clock className="w-20 h-20 mx-auto text-primary animate-bounce-subtle mb-6" />
                            <h2 className="text-4xl font-black tracking-tight mb-2">Loading Questions...</h2>
                            <p className="text-xl font-medium opacity-40">Your Exam will start at exactly <span className="text-primary font-bold">{examStartTime}</span> time. Please Wait.</p>
                        </div>
                    </div>
                    <div className="card bg-primary/10 p-6 rounded-2xl flex flex-row items-center gap-4 max-w-sm mx-auto">
                        <div className="p-3 bg-primary text-primary-content rounded-xl">
                            <User className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Assigned To</p>
                            <p className="font-bold">{assignedStudent.firstname_txt} {assignedStudent.lastname_txt}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center space-y-8 animate-in zoom-in duration-500">
                    <div className="flex flex-col items-center gap-4">
                        <div className="badge badge-success badge-lg py-4 px-6 gap-2 text-xs font-black uppercase tracking-widest rounded-xl">
                            <CheckCircle2 className="w-4 h-4" /> Ready to Begin
                        </div>
                        <h2 className="text-5xl font-black tracking-tighter">Everything is Set</h2>
                    </div>
                    
                    <div className="card bg-base-100 shadow-2xl rounded-[3rem] p-10 max-w-xl mx-auto border border-base-300/50 space-y-8">
                        <div className="flex flex-col md:flex-row gap-6 text-left">
                            <div className="flex-1 p-6 bg-base-200 rounded-2xl space-y-2">
                                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Candidate</p>
                                <p className="text-xl font-bold">{assignedStudent.firstname_txt} {assignedStudent.lastname_txt}</p>
                                <p className="text-xs font-mono opacity-60">Symbol No: {assignedStudent.stud_exam_symbol_no}</p>
                            </div>
                            <div className="flex-1 p-6 bg-base-200 rounded-2xl space-y-2">
                                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Questions Fetched</p>
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    <span className="text-2xl font-black">{questions.length} Active</span>
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setIsExamMode(true)}
                            className="btn btn-primary btn-lg w-full rounded-2xl h-20 text-xl font-black gap-4 shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Play className="w-8 h-8 fill-current" />
                            ENTER EXAMINATION
                        </button>
                    </div>
                </div>
            )
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px]" />
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
        <Toaster position="top-right" />
        <MainApp />
    </BrowserRouter>
  );
}

export default App;
