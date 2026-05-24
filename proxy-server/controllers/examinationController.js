import cron from "node-cron";
import fs from "fs";
import path from "path";
import axios from "axios";
import mainServerClient from "../utils/mainServerClient.js";
import ProxySetting from "../models/ProxySetting.js";
import Question from "../models/Question.js";

const activeCronJobs = {};

/**
 * Fetches available examinations for this proxy from the main server.
 */
export const getExaminations = async (req, res) => {
    try {
        const response = await mainServerClient.get("/proxy/examinations");
        res.status(200).json(response.data);
    } catch (err) {
        console.error("Error fetching examinations from main server:", err.message);
        console.log(err);
        res.status(500).json({ error: "Failed to fetch examinations from main server: " + err.message });
    }
};

/**
 * Fetches all students in this center from the main server.
 */
export const getStudents = async (req, res) => {
    try {
        const response = await mainServerClient.get("/proxy/students");
        res.status(200).json(response.data);
    } catch (err) {
        console.error("Error fetching students from main server:", err.message);
        res.status(500).json({ error: "Failed to fetch students from main server: " + err.message });
    }
};

/**
 * Selects an examination and starts a cron job to fetch questions.
 */
export const selectExamination = async (req, res) => {
    const { examId, subjectId, startTime } = req.body;
    if (!examId || !subjectId || !startTime) {
        return res.status(400).json({ error: "examId, subjectId and startTime are required" });
    }

    try {
        const setting = await ProxySetting.findOne();
        if (!setting) {
            return res.status(404).json({ error: "Proxy settings not found" });
        }

        await setting.update({ 
            selected_examination_id: examId,
            selected_subject_id: subjectId,
            selected_examination_start_time: startTime
        });

        // Start cron job (it will check the time inside)
        startQuestionFetchCron(examId);

        res.status(200).json({
            message: `Examination ${examId} selected. Question fetcher scheduled.`,
            examId,
        });
    } catch (err) {
        res.status(500).json({ error: "Error selecting examination: " + err.message });
    }
};

/**
 * Helper to download diagram image from cloud Cloudinary URL and save locally on Proxy disk.
 */
const downloadImage = async (url, questionId) => {
    try {
        if (!url || !url.startsWith("http")) {
            return url;
        }

        const dir = "./question-images";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        let ext = ".png";
        try {
            const urlPath = new URL(url).pathname;
            const urlExt = path.extname(urlPath);
            if (urlExt) {
                ext = urlExt;
            }
        } catch (e) {
            // Keep fallback
        }

        const localFilename = `question_${questionId}${ext}`;
        const localPath = path.join(dir, localFilename);

        console.log(`[ImageDownloader] Downloading diagram from ${url} to ${localPath}...`);

        const response = await axios({
            method: "GET",
            url: url,
            responseType: "stream",
        });

        const writer = fs.createWriteStream(localPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        console.log(`[ImageDownloader] Successfully downloaded diagram locally for question ${questionId}.`);
        return `/question-images/${localFilename}`;
    } catch (err) {
        console.error(`[ImageDownloader] Error downloading image for question ${questionId}:`, err.message);
        return url;
    }
};

/**
 * Periodically attempts to fetch and store questions for an examination.
 */
export const fetchAndStoreQuestions = async (examId) => {
    try {
        const setting = await ProxySetting.findOne();
        if (!setting || setting.selected_examination_id != examId) return;

        const startTime = new Date(setting.selected_examination_start_time);
        const now = new Date();

        if (now < startTime) {
            console.log(`[Cron] Skipping fetch for exam ${examId}. Exam starts at ${startTime.toLocaleString()}. Current time: ${now.toLocaleString()}`);
            return;
        }

        console.log(`[Cron] Attempting to fetch questions for subject ${setting.selected_subject_id}...`);
        const response = await mainServerClient.get(`/proxy/get-questions/${setting.selected_subject_id}`);
        
        if (response.status === 200 && response.data.decrypted) {
            const questions = response.data.data;
            
            // Store in SQLite
            for (const q of questions) {
                let finalImageUrl = null;
                if (q.image_url) {
                    finalImageUrl = await downloadImage(q.image_url, q.id);
                }

                await Question.upsert({
                    id: q.id,
                    paper_fk_id: q.paper_fk_id,
                    subject_fk_id: q.subject_fk_id,
                    exam_fk_id: q.exam_fk_id,
                    question_txt: q.question_txt,
                    question_type: q.question_type,
                    option1: q.option1,
                    option2: q.option2,
                    option3: q.option3,
                    option4: q.option4,
                    full_marks: q.full_marks,
                    image_url: finalImageUrl,
                });
            }

            console.log(`[Cron] Successfully fetched and stored ${questions.length} questions for exam ${examId}.`);
            
            // Stop cron job
            if (activeCronJobs[examId]) {
                activeCronJobs[examId].stop();
                delete activeCronJobs[examId];
                console.log(`[Cron] Stopped cron job for exam ${examId}.`);
            }
        } else {
            console.log(`[Cron] Questions for exam ${examId} are not yet decrypted (StartTime not reached).`);
        }
    } catch (err) {
        console.error(`[Cron] Error fetching questions for exam ${examId}:`, err.message);
    }
};

/**
 * Schedules a cron job for an examination.
 */
export const startQuestionFetchCron = (examId) => {
    if (activeCronJobs[examId]) {
        activeCronJobs[examId].stop();
    }

    // Run every minute
    const job = cron.schedule("* * * * *", () => {
        fetchAndStoreQuestions(examId);
    });

    activeCronJobs[examId] = job;
    console.log(`[Cron] Scheduled question fetcher for exam ${examId} every minute.`);
    
    // Run immediately once
    fetchAndStoreQuestions(examId);
};

/**
 * Fetches all locally stored questions.
 */
export const getLocalQuestions = async (req, res) => {
    try {
        const questions = await Question.findAll({ order: [['id', 'ASC']] });
        res.status(200).json({ data: questions });
    } catch (err) {
        res.status(500).json({ error: "Error fetching local questions: " + err.message });
    }
};

/**
 * Re-initializes cron jobs on server startup for any selected examination that lacks questions.
 */
export const initializeCronJobs = async () => {
    try {
        const setting = await ProxySetting.findOne();
        if (setting && setting.selected_examination_id) {
            const examId = setting.selected_examination_id;
            
            // Check if questions already exist
            const count = await Question.count();
            if (count === 0 && setting.selected_subject_id) {
                console.log(`[Startup] Recalculating cron job for selected subject ${setting.selected_subject_id}.`);
                startQuestionFetchCron(examId);
            } else {
                console.log(`[Startup] Questions already exist locally for exam ${examId}. Not starting cron.`);
            }
        }
    } catch (err) {
        console.error("Error initializing cron jobs on startup:", err.message);
    }
};
/**
 * Removes the selected examination and stops the cron job.
 */
export const removeExamination = async (req, res) => {
    try {
        const setting = await ProxySetting.findOne();
        if (!setting) {
            return res.status(404).json({ error: "Proxy settings not found" });
        }

        const examId = setting.selected_examination_id;
        
        // Update settings
        await setting.update({ 
            selected_examination_id: null,
            selected_subject_id: null,
            selected_examination_start_time: null
        });

        // Stop cron job
        if (examId && activeCronJobs[examId]) {
            activeCronJobs[examId].stop();
            delete activeCronJobs[examId];
            console.log(`[Manual] Stopped cron job for exam ${examId} as it was removed.`);
        }

        // Clear local questions
        const deletedCount = await Question.destroy({ where: {} });
        console.log(`[Manual] Deleted ${deletedCount} questions associated with exam ${examId}.`);

        res.status(200).json({ message: "Examination removed successfully" });
    } catch (err) {
        res.status(500).json({ error: "Error removing examination: " + err.message });
    }
};
