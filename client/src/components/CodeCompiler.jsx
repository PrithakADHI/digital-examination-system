import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Play, RotateCcw, Terminal, Clock, AlertCircle, CheckCircle2, X } from "lucide-react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext.jsx";

const PROXY_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

const LANGUAGES = [
  { id: "python", name: "Python", defaultCode: 'print("Hello, World!")' },
  { id: "c", name: "C", defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
  { id: "cpp", name: "C++", defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}' },
  { id: "java", name: "Java", defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
];

const STORAGE_KEY_PREFIX = "student_compiler_";

export default function CodeCompiler({ onClose }) {
  const { theme } = useTheme();
  
  // Initialize language from localStorage or default
  const [language, setLanguage] = useState(() => {
    const savedLangId = localStorage.getItem(`${STORAGE_KEY_PREFIX}lang`);
    return LANGUAGES.find((l) => l.id === savedLangId) || LANGUAGES[0];
  });

  // Initialize code from localStorage or default for the current language
  const [code, setCode] = useState(() => {
    const savedCode = localStorage.getItem(`${STORAGE_KEY_PREFIX}code_${language.id}`);
    return savedCode !== null ? savedCode : language.defaultCode;
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const editorRef = useRef(null);

  // Debounced saving to localStorage
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}code_${language.id}`, code);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}lang`, language.id);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [code, language]);

  const handleLanguageChange = (e) => {
    const selected = LANGUAGES.find((l) => l.id === e.target.value);
    setLanguage(selected);
    
    // Load saved code for the new language if available
    const savedCode = localStorage.getItem(`${STORAGE_KEY_PREFIX}code_${selected.id}`);
    setCode(savedCode !== null ? savedCode : selected.defaultCode);
    setResult(null);
  };

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await axios.post(`${PROXY_URL}/run-code`, { 
        language: language.id, 
        code 
      });
      setResult(response.data);
    } catch (error) {
      setResult({
        error: "Execution failed",
        stderr: error.response?.data?.details || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}code_${language.id}`);
    setCode(language.defaultCode);
    setResult(null);
  };

  return (
    <div className="flex flex-col h-full gap-4 animate-in slide-in-from-right duration-300">
      {/* Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4 p-3 md:p-4 glass-effect border-b border-base-content/5">
        <div className="flex items-center gap-2 md:gap-4 flex-1">
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight">Compiler</h1>
            <p className="text-[8px] md:text-[10px] font-bold opacity-40 uppercase tracking-widest hidden sm:block">Secure Sandbox Environment</p>
          </div>
          <div className="divider divider-horizontal mx-0 hidden xs:flex" />
          <select 
            className="select select-bordered select-xs md:select-sm w-24 md:w-32 bg-base-100/50 rounded-lg md:rounded-xl text-[10px] md:text-sm"
            value={language.id}
            onChange={handleLanguageChange}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button 
            className="btn btn-ghost btn-xs md:btn-sm rounded-lg md:rounded-xl gap-2 h-8 md:h-10"
            onClick={handleReset}
            disabled={loading}
          >
            <RotateCcw size={14} className="md:w-[16px]" />
            <span className="hidden md:inline">Reset</span>
          </button>
          <button 
            className={`btn btn-primary btn-xs md:btn-sm rounded-lg md:rounded-xl gap-2 px-3 md:px-6 h-8 md:h-10 shadow-lg shadow-primary/20 ${loading ? 'loading' : ''}`}
            onClick={handleRun}
            disabled={loading}
          >
            {!loading && <Play size={14} className="md:w-[16px]" fill="currentColor" />}
            <span className="text-[10px] md:text-sm">{loading ? 'Running' : 'Run'}</span>
          </button>
          <button 
            className="btn btn-ghost btn-circle btn-xs md:btn-sm rounded-lg md:rounded-xl ml-1 md:ml-2"
            onClick={onClose}
          >
            <X size={16} className="md:w-[20px]" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 md:gap-4 min-h-0 p-3 md:p-4 pt-0 overflow-y-auto lg:overflow-hidden">
        {/* Editor Pane */}
        <div className="flex-[2] flex flex-col bg-base-100 rounded-2xl md:rounded-3xl border border-base-content/5 shadow-xl overflow-hidden relative group min-h-[300px] lg:min-h-0">
          <div className="flex items-center gap-2 px-4 py-2 md:py-3 border-b border-base-content/5 bg-base-200/50">
            <div className="w-2 h-2 rounded-full bg-error/40" />
            <div className="w-2 h-2 rounded-full bg-warning/40" />
            <div className="w-2 h-2 rounded-full bg-success/40" />
            <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">Main.{language.id === 'cpp' ? 'cpp' : language.id}</span>
          </div>
          <div className="flex-1 p-1 md:p-2">
            <Editor
              height="100%"
              theme={theme === "dark" ? "vs-dark" : "light"}
              language={language.id === "cpp" ? "cpp" : language.id}
              value={code}
              onChange={(value) => setCode(value)}
              onMount={(editor) => (editorRef.current = editor)}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'Fira Code', 'Courier New', monospace",
                roundedSelection: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 10, bottom: 10 },
              }}
            />
          </div>
        </div>

        {/* Results Pane */}
        <div className="flex-1 flex flex-col bg-base-100 rounded-2xl md:rounded-3xl border border-base-content/5 shadow-xl overflow-hidden min-h-[200px] lg:min-h-0">
          <div className="flex items-center gap-2 px-4 py-2 md:py-3 border-b border-base-content/5 bg-base-200/50">
            <Terminal size={12} className="opacity-40" />
            <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest opacity-40">Output Console</span>
          </div>
          <div className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar font-mono text-xs md:text-sm">
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4">
                <Terminal size={48} strokeWidth={1} />
                <p className="text-center italic font-medium">Run your code to see results here</p>
              </div>
            )}

            {loading && (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <div className="loading loading-spinner loading-lg text-primary" />
                <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40 animate-pulse">Processing...</p>
              </div>
            )}

            {result && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                {/* Stats */}
                <div className="flex flex-wrap gap-3">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${result.timeout ? 'bg-error/5 border-error/20 text-error' : 'bg-success/5 border-success/20 text-success'}`}>
                    {result.timeout ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{result.timeout ? 'Timeout' : 'Output Success'}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 bg-base-200/50 border-base-content/5">
                    <Clock size={14} className="opacity-40" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {result.duration >= 1000 ? (result.duration / 1000).toFixed(2) + 's' : result.duration + 'ms'}
                    </span>
                  </div>
                </div>

                {/* Output Sections */}
                {result.stdout && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Standard Output</p>
                    <pre className="bg-success/5 border border-success/10 p-4 rounded-2xl text-success whitespace-pre-wrap leading-relaxed shadow-inner">
                      {result.stdout}
                    </pre>
                  </div>
                )}

                {result.stderr && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Error Log</p>
                    <pre className="bg-error/5 border border-error/10 p-4 rounded-2xl text-error whitespace-pre-wrap leading-relaxed shadow-inner">
                      {result.stderr}
                    </pre>
                  </div>
                )}

                {!result.stdout && !result.stderr && !result.timeout && (
                  <div className="p-4 rounded-2xl bg-base-200/50 italic opacity-40 text-center border-2 border-dashed border-base-content/5">
                    No output data returned.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
