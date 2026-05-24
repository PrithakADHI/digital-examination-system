import { useEffect, useCallback, useState } from "react";
import axios from "axios";

// Using window.location.hostname for easier local testing or the configured PROXY_URL
const PROXY_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"; 

export const useQuestionFetcher = (enabled) => {
    const [questions, setQuestions] = useState([]);

    const fetchQuestions = useCallback(async () => {
        try {
            console.log("[Fetcher] Fetching questions from proxy...");
            const response = await axios.get(`${PROXY_URL}/questions`);
            if (response.data && response.data.data) {
                const fetched = response.data.data;
                if (fetched.length > 0) {
                    localStorage.setItem("exam_questions", JSON.stringify(fetched));
                    setQuestions(fetched);
                    console.log(`[Fetcher] Stored ${fetched.length} questions in localStorage.`);
                }
            }
        } catch (err) {
            console.error("[Fetcher] Error fetching questions:", err.message);
        }
    }, []);

    useEffect(() => {
        // Load initially from localStorage if any
        const stored = localStorage.getItem("exam_questions");
        if (stored) {
            try { setQuestions(JSON.parse(stored)); } catch (e) {}
        }

        if (!enabled) return;

        // Fetch immediately
        fetchQuestions();

        // Fetch every minute
        const interval = setInterval(fetchQuestions, 60000);

        return () => clearInterval(interval);
    }, [enabled, fetchQuestions]);

    return { questions };
};
