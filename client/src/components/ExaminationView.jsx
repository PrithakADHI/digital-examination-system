import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ChevronLeft, ChevronRight, Send, User, Award, HelpCircle, RefreshCcw, Terminal } from "lucide-react";
import CodeCompiler from "./CodeCompiler.jsx";

const PROXY_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

export default function ExaminationView({ onExit }) {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompilerOpen, setIsCompilerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("question"); // "question" or "response" for mobile

    useEffect(() => {
        const stored = localStorage.getItem("exam_questions");
        if (stored) {
            setQuestions(JSON.parse(stored));
        }
    }, []);

    const currentQ = questions[currentIndex];

    const handleAnswerChange = (value) => {
        setAnswers({
            ...answers,
            [currentQ.id]: value
        });
    };

    const handleSubmitAll = async () => {
        const answeredCount = Object.keys(answers).length;
        if (answeredCount === 0) {
            toast.error("You haven't answered any questions yet.");
            return;
        }

        const confirmSubmit = window.confirm(`You have answered ${answeredCount} of ${questions.length} questions. Are you sure you want to submit all and finish?`);
        if (!confirmSubmit) return;

        const storedStudent = JSON.parse(localStorage.getItem("assigned_student") || "{}");
        const studentId = storedStudent.id;
        if (!studentId) {
            toast.error("Student not assigned! Please contact admin.");
            return;
        }

        setIsSubmitting(true);
        try {
            const registration = JSON.parse(localStorage.getItem("client_registration") || "{}");
            const token = registration.token;

            const submissions = Object.entries(answers).map(([qId, answer]) => {
                const payload = {
                    stud_user_fk_id: studentId,
                    exam_question_fk_id: qId,
                    stud_answer: answer,
                    exam_fk_id: currentQ.exam_fk_id, 
                    subject_fk_id: currentQ.subject_fk_id,
                };
                return axios.post(`${PROXY_URL}/submit-answer`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            });

            await Promise.all(submissions);

            toast.success("All answers submitted successfully!");
            onExit();
        } catch (err) {
            console.error("Submission failed:", err);
            toast.error("Failed to submit answers. " + (err.response?.data?.error || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-6 md:p-12 text-center animate-in fade-in duration-500">
                <div className="p-4 md:p-6 bg-warning/10 text-warning rounded-full mb-6">
                    <HelpCircle className="w-12 h-12 md:w-16 md:h-16" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black mb-2">No Questions Available</h2>
                <p className="text-sm md:text-base opacity-60 mb-8 max-w-sm">Please wait for the proxy server to fetch questions. They will appear here automatically.</p>
                <button onClick={onExit} className="btn btn-outline rounded-2xl px-8">Go Back</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-120px)] w-full max-w-7xl mx-auto gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-2 md:px-4 gap-4">
                <div className="flex items-center justify-between w-full sm:w-auto gap-2 md:gap-4">
                    <button onClick={onExit} className="btn btn-ghost btn-xs md:btn-sm rounded-lg md:rounded-xl">
                        <ChevronLeft className="w-4 h-4 mr-0 md:mr-1" /> <span className="hidden xs:inline">Exit</span>
                    </button>
                    <div className="badge badge-sm md:badge-lg py-3 md:py-4 px-3 md:px-6 bg-base-100 border-base-300 font-bold uppercase tracking-widest text-[10px] md:text-xs rounded-lg md:rounded-xl shadow-sm">
                        Q{currentIndex + 1} / {questions.length}
                    </div>
                </div>
                
                <div className="flex items-center justify-between w-full sm:w-auto gap-2 md:gap-4">
                    <div className="flex items-center gap-1 md:gap-2">
                        <div className="p-1.5 md:p-2 bg-primary/10 text-primary rounded-lg">
                            <Award className="w-3 h-3 md:w-4 md:h-4" />
                        </div>
                        <span className="text-[10px] md:text-sm font-bold opacity-60 uppercase tracking-widest hidden xs:inline">Full Marks: </span>
                        <span className="text-base md:text-lg font-black text-primary">{currentQ.full_marks || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsCompilerOpen(true)}
                            className="btn btn-primary btn-xs md:btn-sm rounded-lg md:rounded-xl px-2 md:px-4 font-bold uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                            <Terminal className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            <span className="hidden xs:inline">Code</span>
                            <span className="xs:hidden">C</span>
                        </button>
                        <button 
                            onClick={handleSubmitAll}
                            disabled={isSubmitting}
                            className="btn btn-success btn-xs md:btn-sm rounded-lg md:rounded-xl px-2 md:px-6 font-bold uppercase tracking-widest shadow-lg shadow-success/20"
                        >
                            {isSubmitting ? <RefreshCcw className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <Send className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />}
                            <span className="hidden xs:inline">Finish</span>
                            <span className="xs:hidden">End</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="lg:hidden flex justify-center px-4">
                <div className="tabs tabs-boxed bg-base-100 p-1 rounded-xl shadow-sm border border-base-content/5 w-full">
                    <button 
                        className={`tab flex-1 font-bold text-xs uppercase tracking-widest rounded-lg ${activeTab === 'question' ? 'tab-active bg-primary text-primary-content' : ''}`}
                        onClick={() => setActiveTab('question')}
                    >
                        Question
                    </button>
                    <button 
                        className={`tab flex-1 font-bold text-xs uppercase tracking-widest rounded-lg ${activeTab === 'response' ? 'tab-active bg-primary text-primary-content' : ''}`}
                        onClick={() => setActiveTab('response')}
                    >
                        Response
                    </button>
                </div>
            </div>

            {/* Code Compiler Overlay */}
            {isCompilerOpen && (
                <div className="fixed inset-0 z-[100] bg-base-300/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-8 animate-in fade-in duration-300">
                    <div className="bg-base-100 w-full h-full max-w-6xl rounded-2xl md:rounded-[2.5rem] shadow-2xl border border-base-content/5 overflow-hidden flex flex-col">
                        <CodeCompiler onClose={() => setIsCompilerOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main Content Split View */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 overflow-hidden min-h-0 px-2 md:px-0">
                
                {/* Left: Question Card */}
                <div className={`flex-1 flex flex-col bg-base-100 rounded-2xl md:rounded-[2.5rem] border border-base-content/5 shadow-xl shadow-base-content/5 overflow-hidden ${activeTab !== 'question' ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="px-6 md:px-10 py-4 md:py-8 border-b border-base-content/5 bg-base-200/30">
                        <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Question Content</h3>
                    </div>
                    <div className="flex-1 p-6 md:p-10 overflow-y-auto">
                        <div className="text-xl md:text-2xl font-bold leading-relaxed mb-6 md:mb-10">
                            {currentQ.question_txt}
                        </div>

                        {currentQ.image_url && (
                            <div className="mb-6 md:mb-10 w-full max-w-2xl rounded-2xl overflow-hidden border border-base-content/10 bg-base-200/50 p-2">
                                <img 
                                    src={currentQ.image_url.startsWith("http") ? currentQ.image_url : `${PROXY_URL}${currentQ.image_url.startsWith("/") ? "" : "/"}${currentQ.image_url}`} 
                                    alt="Question Diagram" 
                                    className="max-h-[300px] w-full object-contain"
                                />
                            </div>
                        )}

                        {currentQ.question_type === "MCQ" && (
                            <div className="grid grid-cols-1 gap-3 md:gap-4 max-w-xl">
                                {[1, 2, 3, 4].map((num) => (
                                    <div 
                                        key={num}
                                        className={`flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all cursor-pointer ${
                                            answers[currentQ.id] === String(num)
                                            ? "border-primary bg-primary/5 text-primary"
                                            : "border-base-content/5 bg-base-200/50 hover:bg-base-200"
                                        }`}
                                        onClick={() => handleAnswerChange(String(num))}
                                    >
                                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs md:text-sm ${
                                            answers[currentQ.id] === String(num)
                                            ? "bg-primary text-primary-content"
                                            : "bg-base-300 opacity-40"
                                        }`}>
                                            {String.fromCharCode(64 + num)}
                                        </div>
                                        <span className="font-bold text-sm md:text-base">{currentQ[`option${num}`]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Answer Card */}
                <div className={`flex-1 flex flex-col bg-base-100 rounded-2xl md:rounded-[2.5rem] border border-base-content/5 shadow-xl shadow-base-content/5 overflow-hidden ${activeTab !== 'response' ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="px-6 md:px-10 py-4 md:py-8 border-b border-base-content/5 bg-base-200/30 flex justify-between items-center">
                        <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Your Response</h3>
                        {currentQ.question_type !== "MCQ" && (
                             <span className="text-[8px] md:text-[10px] font-bold opacity-40 uppercase tracking-widest bg-base-200 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                                {currentQ.question_type}
                             </span>
                        )}
                    </div>
                    
                    <div className="flex-1 p-6 md:p-10 flex flex-col overflow-hidden">
                        {currentQ.question_type === "MCQ" ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 md:space-y-6">
                                {answers[currentQ.id] ? (
                                    <>
                                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-primary/10 text-primary flex items-center justify-center text-4xl md:text-5xl font-black border-2 border-primary/20 animate-in zoom-in duration-300">
                                            {String.fromCharCode(64 + Number(answers[currentQ.id]))}
                                        </div>
                                        <p className="font-bold opacity-60 text-sm md:text-base">Option {String.fromCharCode(64 + Number(answers[currentQ.id]))} Selected</p>
                                    </>
                                ) : (
                                    <div className="opacity-20 flex flex-col items-center gap-3 md:gap-4 italic font-medium">
                                        <HelpCircle className="w-12 h-12 md:w-16 md:h-16" />
                                        <p className="text-xs md:text-sm">Please select an option</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <textarea
                                className="flex-1 textarea textarea-bordered bg-base-200/20 focus:bg-base-100 rounded-2xl md:rounded-3xl text-lg md:text-xl font-medium leading-relaxed p-4 md:p-6 focus:outline-none border-base-content/10 w-full"
                                placeholder="Type your answer here..."
                                value={answers[currentQ.id] || ""}
                                onChange={(e) => handleAnswerChange(e.target.value)}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex justify-center p-2 md:p-4">
                <div className="join bg-base-100 shadow-lg border border-base-content/5 rounded-2xl md:rounded-[1.5rem] p-1 md:p-1.5 gap-1 md:gap-1.5 overflow-x-auto max-w-full no-scrollbar">
                    <button 
                        className="join-item btn btn-ghost btn-xs md:btn-sm rounded-lg md:rounded-xl px-2 md:px-4"
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex(currentIndex - 1)}
                    >
                        <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                    <div className="flex gap-1 md:gap-1.5">
                        {questions.map((_, idx) => (
                            <button
                                key={idx}
                                className={`btn btn-xs md:btn-sm rounded-lg md:rounded-xl min-w-[2rem] md:min-w-[3rem] ${
                                    currentIndex === idx 
                                    ? "btn-primary shadow-md shadow-primary/20" 
                                    : answers[questions[idx].id] 
                                        ? "bg-success/20 text-success hover:bg-success/30 border-none px-2 md:px-4" 
                                        : "btn-ghost opacity-40 px-2 md:px-4"
                                }`}
                                onClick={() => setCurrentIndex(idx)}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                    <button 
                        className="join-item btn btn-ghost btn-xs md:btn-sm rounded-lg md:rounded-xl px-2 md:px-4"
                        disabled={currentIndex === questions.length - 1}
                        onClick={() => setCurrentIndex(currentIndex + 1)}
                    >
                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
