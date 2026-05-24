import crypto from "crypto";
import Examination from "../models/Examination.js";
import ExaminationSubject from "../models/ExaminationSubject.js";
import SubjectPaper from "../models/SubjectPaper.js";
import PaperQuestion from "../models/PaperQuestion.js";
import ExamAnswerToken from "../models/ExamAnswerToken.js";
import StudentQuestionAnswer from "../models/StudentQuestionAnswer.js";
import ExamStudent from "../models/ExamStudent.js";
import User from "../models/User.js";
import sequelize from "../database.js";
import { Sequelize } from "sequelize";

// Helper function for AES-256 encryption
const encrypt = (text, key) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
};

// Helper function for AES-256 decryption (consistent with adminController.js)
const decrypt = (encryptedText, key) => {
    if (!encryptedText) return null;
    try {
        const [ivHex, encrypted] = encryptedText.split(":");
        if (!ivHex || !encrypted) return encryptedText;
        const iv = Buffer.from(ivHex, "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (err) {
        console.error("Decryption failed:", err.message);
        return encryptedText;
    }
};

export const getExaminationsForProxy = async (req, res) => {
    try {
        const centerId = req.examinationCenter.id;

        console.log(centerId);

        const examinations = await sequelize.query(
            `
            SELECT e.*,
                   COALESCE(
                     (SELECT json_agg(json_build_object(
                        'id', s.id,
                        'subject_name_txt', s.subject_name_txt,
                        'full_marks', s.full_marks,
                        'pass_marks', s.pass_marks,
                        'exam_startTime_ts', s."exam_startTime_ts"
                      ))
                      FROM public."ExaminationSubject" s
                      WHERE s.exam_fk_id = e.id),
                     '[]'
                   ) AS subjects
            FROM public.examinations e
            WHERE :centerId::text IN (
                SELECT jsonb_array_elements_text(e.center_fk_list)
            )
            ORDER BY e."createdAt_ts" DESC
            `,
            {
                replacements: { centerId },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Examinations fetched successfully",
            data: examinations,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching examinations: " + err.message });
    }
};

export const getQuestionsForProxy = async (req, res) => {
    const { subjectId } = req.params;
    try {
        // 1. Fetch the subject to check start time
        const subject = await ExaminationSubject.findByPk(subjectId);
        if (!subject) {
            return res.status(404).json({ error: "Subject not found" });
        }

        const startTime = new Date(subject.exam_startTime_ts);
        const now = new Date();

        const isTimeExceeded = now >= startTime;

        // 2. Fetch all questions for this examination
        const results = await sequelize.query(
            `
            SELECT pq.*, sp.subject_fk_id,
                   eat.aes_256_key as encrypted_key
            FROM public."PaperQuestion" pq
            JOIN public."SubjectPaper" sp ON pq.paper_fk_id = sp.id
            LEFT JOIN public."ExamAnswerToken" eat ON pq.id = eat.question_fk_id
            WHERE sp.subject_fk_id = :subjectId
            `,
            {
                replacements: { subjectId },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!isTimeExceeded) {
            return res.status(403).json({
                error: "Forbidden: Subject examination has not started yet. Questions cannot be accessed before the start time.",
                startTime: subject.exam_startTime_ts
            });
        }

        // 3. Decrypt questions
        const masterKeyHex = process.env.AES_MASTER_KEY;
        if (!masterKeyHex) {
            throw new Error("AES_MASTER_KEY not found in .env");
        }
        const masterKey = Buffer.from(masterKeyHex, "hex");

        const decryptedQuestions = results.map((q) => {
            if (!q.encrypted_key) return q;

            // 1. Decrypt the paper key using master key
            const paperKeyHex = decrypt(q.encrypted_key, masterKey);
            const paperKey = Buffer.from(paperKeyHex, "hex");

            // 2. Decrypt question data using the paper key
            const baseQuestion = {
                id: q.id,
                paper_fk_id: q.paper_fk_id,
                subject_fk_id: q.subject_fk_id,
                exam_fk_id: subject.exam_fk_id,
                question_type: q.question_type,
                question_txt: decrypt(q.question_txt, paperKey),
                full_marks: q.full_marks,
                image_url: q.image_url ? decrypt(q.image_url, paperKey) : null,
            };

            if (q.question_type === "MCQ") {
                return {
                    ...baseQuestion,
                    option1: decrypt(q.option1, paperKey),
                    option2: decrypt(q.option2, paperKey),
                    option3: decrypt(q.option3, paperKey),
                    option4: decrypt(q.option4, paperKey),
                };
            }

            return baseQuestion;
        });

        res.status(200).json({
            message: "Questions fetched and decrypted successfully",
            decrypted: true,
            data: decryptedQuestions,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching questions: " + err.message });
    }
};

/**
 * bulkCreateStudentAnswers
 * Accepts an array of student answers from the proxy and bulk creates/updates them.
 */
export const bulkCreateStudentAnswers = async (req, res) => {
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: "answers array is required." });
    }

    const t = await sequelize.transaction();

    try {
        const masterKeyHex = process.env.AES_MASTER_KEY;
        if (!masterKeyHex) {
            throw new Error("AES_MASTER_KEY not found in .env");
        }
        const masterKey = Buffer.from(masterKeyHex, "hex");

        const results = [];
        const studentExamPairs = new Set(); // To track unique (student, exam) pairs

        for (const ans of answers) {
            const { stud_user_fk_id, exam_question_fk_id, stud_answer, exam_fk_id, subject_fk_id } = ans;
            studentExamPairs.add(`${stud_user_fk_id}-${exam_fk_id}`);

            // 1. Generate a unique random key for THIS specific student answer
            const randomAnswerKey = crypto.randomBytes(32);

            // 2. Encrypt the student's answer using the random key
            const answerString = typeof stud_answer === "string" ? stud_answer : JSON.stringify(stud_answer);
            const encryptedAnswer = encrypt(answerString, randomAnswerKey);

            // 3. Encrypt the random key using the Master Key
            const encryptedRandomKey = encrypt(randomAnswerKey.toString("hex"), masterKey);

            // 4. Create/Update the student answer record
            // We use findOne + create/update instead of bulkCreate to easily get the ID for the token
            let [answerRecord, created] = await StudentQuestionAnswer.findOrCreate({
                where: {
                    stud_user_fk_id,
                    exam_question_fk_id
                },
                defaults: {
                    stud_answer: encryptedAnswer,
                    exam_fk_id,
                    subject_fk_id
                },
                transaction: t
            });

            if (!created) {
                await answerRecord.update({
                    stud_answer: encryptedAnswer,
                    exam_fk_id,
                    subject_fk_id
                }, { transaction: t });
            }

            // 5. Create/Update the secondary token record for this answer
            // Use findOne/upsert to handle updates if manual sync is called again
            await ExamAnswerToken.upsert({
                answer_fk_id: answerRecord.id,
                aes_256_key: encryptedRandomKey
            }, { transaction: t });

            results.push(answerRecord);
        }

        // 6. Ensure ExamStudent table is populated for each student-exam pair
        for (const pair of studentExamPairs) {
            const [studentId, examId] = pair.split("-");
            
            // We use findOrCreate then update to ensure it's marked as SUBMITTED
            const [examStudent, created] = await ExamStudent.findOrCreate({
                where: {
                    student_fk_id: studentId,
                    exam_fk_id: examId
                },
                defaults: {
                    status: "SUBMITTED",
                    submitted_at: new Date()
                },
                transaction: t
            });

            if (!created) {
                await examStudent.update({
                    status: "SUBMITTED",
                    submitted_at: new Date()
                }, { transaction: t });
            }
        }

        await t.commit();

        res.status(200).json({
            message: `Successfully synced ${results.length} answers with unique encryption keys.`,
        });
    } catch (err) {
        await t.rollback();
        console.error("Bulk sync error:", err.message);
        res.status(500).json({ error: "Error during bulk sync: " + err.message });
    }
};

export const getStudentsInCenter = async (req, res) => {
    try {
        const centerId = req.examinationCenter.id;
        const students = await User.findAll({
            where: {
                center_fk_id: centerId,
                role: "STUDENT",
                is_active: true
            },
            attributes: ['id', 'firstname_txt', 'lastname_txt', 'username', 'stud_exam_symbol_no', 'stud_exam_reg_no'],
            order: [['firstname_txt', 'ASC']]
        });
        res.status(200).json({
            message: "Students fetched successfully",
            data: students
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching students: " + err.message });
    }
};
