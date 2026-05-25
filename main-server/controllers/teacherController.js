import Joi from "joi";
import crypto from "crypto";
import streamifier from "streamifier";
import cloudinary from "../cloudinaryConfig.js";
import SubjectPaper from "../models/SubjectPaper.js";
import PaperQuestion from "../models/PaperQuestion.js";
import ExamAnswerToken from "../models/ExamAnswerToken.js";
import ExaminationSubject from "../models/ExaminationSubject.js";
import StudentQuestionAnswer from "../models/StudentQuestionAnswer.js";
import StudentAnswerMarks from "../models/StudentAnswerMarks.js";
import SubjectStudentCheckerAssignment from "../models/SubjectStudentCheckerAssignment.js";
import User from "../models/User.js";
import sequelize from "../database.js";
import { Sequelize } from "sequelize";

// --- Helper Functions ---

// Helper function for AES-256 encryption
const encrypt = (text, key) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
};

// Helper function for AES-256 decryption
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
        return encryptedText; // Return original if decryption fails
    }
};

// --- Validation Schemas ---

const subjectPaperSchema = Joi.object({
    subject_fk_id: Joi.number().required(),
    exam_batch_year: Joi.string().max(100).required(),
    paper_checkers_list: Joi.array().items(Joi.number()).allow(null),
    status: Joi.string().valid("DRAFT", "SUBMITTED").optional(),
    questions: Joi.array()
        .items(
            Joi.object({
                question_txt: Joi.string().required(),
                question_type: Joi.string().valid("LONG", "SHORT", "MCQ").required(),
                option1: Joi.string().allow(null, "").optional(),
                option2: Joi.string().allow(null, "").optional(),
                option3: Joi.string().allow(null, "").optional(),
                option4: Joi.string().allow(null, "").optional(),
                correct_option: Joi.number().integer().valid(1, 2, 3, 4).allow(null),
                full_marks: Joi.number().required(),
                image_url: Joi.string().allow(null, "").optional(),
            })
        )
        .min(1)
        .required(),
});


// --- Teacher Controllers ---

/**
 * POST uploadQuestionImage
 * Uploads an image to Cloudinary and returns the secure URL.
 */
export const uploadQuestionImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided." });
        }

        const streamUpload = (fileBuffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "question_images",
                        resource_type: "image",
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );
                streamifier.createReadStream(fileBuffer).pipe(stream);
            });
        };

        const result = await streamUpload(req.file.buffer);
        res.status(200).json({
            message: "Image uploaded to Cloudinary successfully.",
            secure_url: result.secure_url,
        });
    } catch (err) {
        res.status(500).json({ error: "Cloudinary upload failed: " + err.message });
    }
};

/**
 * GET getAllQuestionsToSet
 * This API is used by a Teacher to see the list of subjects (and corresponding exams) 
 * they are assigned to set questions for.
 */
export const getAllQuestionsToSet = async (req, res) => {
    try {
        const userId = req.user.id;

        const subjects = await sequelize.query(
            `
            SELECT 
                es.id AS "subject_id",
                es.subject_name_txt,
                es.full_marks,
                es.pass_marks,
                e.id AS "exam_id",
                e.exam_name_txt,
                es."exam_startTime_ts",
                sp.id AS "paper_id",
                COALESCE(sp.status, 'NOT_STARTED') AS "paper_status",
                sp.exam_batch_year,
                (es."exam_startTime_ts" - INTERVAL '7 days') AS "review_deadline",
                CASE 
                    WHEN NOW() >= (es."exam_startTime_ts" - INTERVAL '7 days') THEN true 
                    ELSE false 
                END AS "is_locked"
            FROM public."ExaminationSubject" es
            JOIN public.examinations e ON es.exam_fk_id = e.id
            LEFT JOIN public."SubjectPaper" sp ON sp.subject_fk_id = es.id
            WHERE es.exam_setter_user_fk_id = :userId
            ORDER BY es."exam_startTime_ts" ASC;
            `,
            {
                replacements: { userId },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Assigned subjects fetched successfully",
            data: subjects,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching questions to set: " + err.message });
    }
};

/**
 * POST createQuestion
 * (Formerly createSubjectPaper in adminController)
 * Creates a subject paper and its encrypted questions.
 */
export const createQuestion = async (req, res) => {
    const { error, value } = subjectPaperSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const invalidQuestion = value.questions.find((q) => {
        if (q.question_type === "MCQ") {
            return !q.option1 || !q.option2 || !q.option3 || !q.option4 || !q.correct_option;
        }
        return false;
    });

    if (invalidQuestion) {
        return res.status(400).json({
            error: "MCQ question must have option1, option2, option3, option4 and correct_option.",
        });
    }

    // Verify ownership and lockout deadline
    let subject;
    try {
        const [subRow] = await sequelize.query(
            `SELECT exam_setter_user_fk_id, "exam_startTime_ts" FROM public."ExaminationSubject" WHERE id = :id`,
            {
                replacements: { id: value.subject_fk_id },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!subRow) {
            return res.status(404).json({ error: "Examination subject not found." });
        }

        if (parseInt(subRow.exam_setter_user_fk_id) !== parseInt(req.user.id)) {
            return res.status(403).json({ error: "Forbidden: You are not the assigned setter for this subject." });
        }

        subject = subRow;
    } catch (err) {
        return res.status(500).json({ error: "Error verifying subject setter: " + err.message });
    }

    // Enforce 1-week lockout deadline
    const startTime = new Date(subject.exam_startTime_ts);
    const lockoutDeadline = new Date(startTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now >= lockoutDeadline) {
        return res.status(403).json({
            error: "Forbidden: The 1-week question review deadline has passed. This paper is locked.",
            lockoutDeadline,
        });
    }

    // Check if a paper already exists
    let existingPaper;
    try {
        existingPaper = await SubjectPaper.findOne({
            where: { subject_fk_id: value.subject_fk_id }
        });

        // Enforce status checks: Can only edit if status is DRAFT or DISAPPROVED
        if (existingPaper && !["DRAFT", "DISAPPROVED"].includes(existingPaper.status)) {
            return res.status(400).json({
                error: `Cannot modify this paper. The current status is '${existingPaper.status}'. Only DRAFT or DISAPPROVED papers can be updated.`,
            });
        }
    } catch (err) {
        return res.status(500).json({ error: "Error checking existing subject paper: " + err.message });
    }

    const t = await sequelize.transaction();

    try {
        // 1. Generate a random AES-256 key for this paper
        const paperKey = crypto.randomBytes(32);

        // 2. Encrypt the paper key using the Master Key from .env
        const masterKeyHex = process.env.AES_MASTER_KEY;
        if (!masterKeyHex) {
            throw new Error("AES_MASTER_KEY not found in .env");
        }
        const encryptedPaperKey = encrypt(
            paperKey.toString("hex"),
            Buffer.from(masterKeyHex, "hex")
        );

        let paper;

        if (existingPaper) {
            // Update existing paper status & batch year
            await existingPaper.update(
                {
                    exam_batch_year: value.exam_batch_year,
                    status: value.status || "SUBMITTED",
                },
                { transaction: t }
            );

            // Clean up old questions & tokens in a dialect-safe way
            const oldQuestions = await PaperQuestion.findAll({
                where: { paper_fk_id: existingPaper.id },
                attributes: ["id"],
                transaction: t
            });
            const oldQuestionIds = oldQuestions.map((q) => q.id);

            if (oldQuestionIds.length > 0) {
                await ExamAnswerToken.destroy({
                    where: {
                        question_fk_id: {
                            [Sequelize.Op.in]: oldQuestionIds
                        }
                    },
                    transaction: t
                });

                await PaperQuestion.destroy({
                    where: {
                        id: {
                            [Sequelize.Op.in]: oldQuestionIds
                        }
                    },
                    transaction: t
                });
            }

            paper = existingPaper;
        } else {
            // Create a brand new SubjectPaper
            paper = await SubjectPaper.create(
                {
                    subject_fk_id: value.subject_fk_id,
                    exam_batch_year: value.exam_batch_year,
                    paper_checkers_list: value.paper_checkers_list,
                    status: value.status || "SUBMITTED",
                },
                { transaction: t }
            );
        }

        // 3. Encrypt and create new questions
        for (const q of value.questions) {
            const encryptedData = {
                paper_fk_id: paper.id,
                question_type: q.question_type,
                question_txt: encrypt(q.question_txt, paperKey),
                option1: q.option1 ? encrypt(q.option1, paperKey) : null,
                option2: q.option2 ? encrypt(q.option2, paperKey) : null,
                option3: q.option3 ? encrypt(q.option3, paperKey) : null,
                option4: q.option4 ? encrypt(q.option4, paperKey) : null,
                correct_option: q.correct_option ? encrypt(String(q.correct_option), paperKey) : null,
                full_marks: q.full_marks,
                image_url: q.image_url ? encrypt(q.image_url, paperKey) : null,
            };

            const question = await PaperQuestion.create(encryptedData, { transaction: t });

            // Store the encrypted paper key for this question
            await ExamAnswerToken.create(
                {
                    question_fk_id: question.id,
                    aes_256_key: encryptedPaperKey,
                },
                { transaction: t }
            );
        }

        await t.commit();

        res.status(existingPaper ? 200 : 201).json({
            message: `Subject paper and questions ${existingPaper ? "updated" : "created"} successfully with encryption.`,
            data: {
                paperId: paper.id,
                status: paper.status,
                questionsCount: value.questions.length,
            },
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: "Error saving subject paper: " + err.message });
    }
};

/**
 * GET getQuestionPaperById
 * Retrieves the decrypted question paper for a given subject if the logged-in teacher is the setter
 * and it is before the 1-week lockout deadline.
 */
export const getQuestionPaperById = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const userId = req.user.id;

        // Fetch subject details
        const [subject] = await sequelize.query(
            `
            SELECT 
                es.id AS "subject_id",
                es.subject_name_txt,
                es.exam_setter_user_fk_id,
                es."exam_startTime_ts",
                sp.id AS "paper_id",
                sp.status AS "paper_status",
                sp.feedback_note AS "paper_feedback_note",
                sp.exam_batch_year
            FROM public."ExaminationSubject" es
            LEFT JOIN public."SubjectPaper" sp ON sp.subject_fk_id = es.id
            WHERE es.id = :subjectId
            `,
            {
                replacements: { subjectId },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!subject) {
            return res.status(404).json({ error: "Examination subject not found." });
        }

        // Verify setter ownership
        if (parseInt(subject.exam_setter_user_fk_id) !== parseInt(userId)) {
            return res.status(403).json({ error: "Forbidden: You are not the assigned setter for this subject." });
        }

        // Verify lockout deadline
        const startTime = new Date(subject.exam_startTime_ts);
        const lockoutDeadline = new Date(startTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        const now = new Date();

        if (now >= lockoutDeadline) {
            return res.status(403).json({
                error: "Forbidden: Question review period has ended and this paper is strictly locked.",
                lockoutDeadline,
            });
        }

        // If no paper exists yet, return empty list of questions
        if (!subject.paper_id) {
            return res.status(200).json({
                message: "No paper created yet.",
                data: {
                    subject,
                    questions: [],
                }
            });
        }

        // Fetch encrypted questions
        const questions = await sequelize.query(
            `
            SELECT pq.*, eat.aes_256_key AS "encrypted_key"
            FROM public."PaperQuestion" pq
            LEFT JOIN public."ExamAnswerToken" eat ON pq.id = eat.question_fk_id
            WHERE pq.paper_fk_id = :paperId
            ORDER BY pq.id ASC;
            `,
            {
                replacements: { paperId: subject.paper_id },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        // Decrypt questions
        const masterKeyHex = process.env.AES_MASTER_KEY;
        if (!masterKeyHex) {
            throw new Error("AES_MASTER_KEY not found in .env");
        }
        const masterKey = Buffer.from(masterKeyHex, "hex");

        const decryptedQuestions = questions.map((q) => {
            if (!q.encrypted_key) return q;

            // Decrypt the paper key using master key
            const paperKeyHex = decrypt(q.encrypted_key, masterKey);
            const paperKey = Buffer.from(paperKeyHex, "hex");

            // Decrypt question details
            const baseQuestion = {
                id: q.id,
                question_type: q.question_type,
                question_txt: decrypt(q.question_txt, paperKey),
                full_marks: q.full_marks,
                image_url: q.image_url ? decrypt(q.image_url, paperKey) : null,
                feedback_note: q.feedback_note || null,
            };

            if (q.question_type === "MCQ") {
                return {
                    ...baseQuestion,
                    option1: decrypt(q.option1, paperKey),
                    option2: decrypt(q.option2, paperKey),
                    option3: decrypt(q.option3, paperKey),
                    option4: decrypt(q.option4, paperKey),
                    correct_option: Number(decrypt(q.correct_option, paperKey)),
                };
            }

            return baseQuestion;
        });

        res.status(200).json({
            message: "Draft question paper fetched and decrypted successfully.",
            data: {
                subject,
                questions: decryptedQuestions,
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching draft question paper: " + err.message });
    }
};


/**
 * 1. getAllAssignedPapersToCheck
 * Fetch list of subject papers that are assigned to currently logged in user.
 */
export const getAllAssignedPapersToCheck = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch papers where user is in paper_checkers_list (JSONB array)
        const papers = await sequelize.query(
            `
            SELECT 
                sp.id AS "paper_id",
                sp.subject_fk_id,
                sp.exam_batch_year,
                es.subject_name_txt,
                e.exam_name_txt
            FROM public."SubjectPaper" sp
            JOIN public."ExaminationSubject" es ON sp.subject_fk_id = es.id
            JOIN public.examinations e ON es.exam_fk_id = e.id
            WHERE sp.paper_checkers_list @> :userId::jsonb
            ORDER BY sp."createdAt_ts" DESC;
            `,
            {
                replacements: { userId: JSON.stringify([parseInt(userId)]) },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Assigned papers fetched successfully",
            data: papers,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching assigned papers: " + err.message });
    }
};

/**
 * 2. getAllStudentsAnswersToCheck
 * Use optional subject_fk_id to fetch the list of all the assigned student answers to be checked by currently logged in user.
 * If subject_fk_id is not provided, returns all submissions for all subjects assigned to the teacher.
 */
export const getAllStudentsAnswersToCheck = async (req, res) => {
    try {
        const { subject_fk_id } = req.params;
        const userId = req.user.id;

        const assignedStudents = await sequelize.query(
            `
            SELECT 
                ssca.student_user_fk_id,
                ssca.subject_fk_id,
                es.subject_name_txt,
                e.exam_name_txt,
                sp.exam_batch_year,
                COUNT(sqa.id) AS "answers_count",
                MAX(sqa."createdAt_ts") AS "last_submitted_at"
            FROM public."SubjectStudentCheckerAssignment" ssca
            JOIN public."User" u ON u.id = ssca.student_user_fk_id
            JOIN public."ExaminationSubject" es ON ssca.subject_fk_id = es.id
            JOIN public.examinations e ON es.exam_fk_id = e.id
            LEFT JOIN public."SubjectPaper" sp ON sp.subject_fk_id = ssca.subject_fk_id
            LEFT JOIN public."StudentQuestionAnswer" sqa 
                ON sqa.stud_user_fk_id = ssca.student_user_fk_id
                AND EXISTS (
                    SELECT 1 FROM public."PaperQuestion" pq2 
                    WHERE pq2.paper_fk_id = sp.id AND pq2.id = sqa.exam_question_fk_id
                )
            WHERE ssca.checker_user_fk_id = :userId
              AND (:subject_fk_id_val IS NULL OR ssca.subject_fk_id = :subject_fk_id_val)
            GROUP BY ssca.student_user_fk_id, ssca.subject_fk_id, es.subject_name_txt, e.exam_name_txt, sp.exam_batch_year
            ORDER BY MAX(sqa."createdAt_ts") DESC NULLS LAST;
            `,
            {
                replacements: {
                    subject_fk_id_val: subject_fk_id || null,
                    userId,
                },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Assigned submissions fetched successfully",
            data: assignedStudents,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching student answers: " + err.message });
    }
};

/**
 * 3. getAnswerById
 * Use answer_id to fetch the specific answer and decrypt the answer before displaying them.
 */
export const getAnswerById = async (req, res) => {
    try {
        const { answer_id } = req.params;
        const userId = req.user.id;

        // Fetch answer and its associated encryption key info
        const [result] = await sequelize.query(
            `
            SELECT 
                sqa.id AS "answer_id",
                sqa.stud_answer,
                eat.aes_256_key AS "encrypted_answer_key",
                pq.id AS "question_id",
                sp.subject_fk_id
            FROM public."StudentQuestionAnswer" sqa
            JOIN public."PaperQuestion" pq ON sqa.exam_question_fk_id = pq.id
            JOIN public."SubjectPaper" sp ON pq.paper_fk_id = sp.id
            LEFT JOIN public."ExamAnswerToken" eat ON sqa.id = eat.answer_fk_id
            WHERE sqa.id = :answer_id;
            `,
            {
                replacements: { answer_id },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!result) {
            return res.status(404).json({ error: "Answer not found." });
        }

        // Verify checker assignment
        const [assigned] = await sequelize.query(
            `SELECT id FROM public."SubjectPaper" WHERE subject_fk_id = :subject_fk_id AND paper_checkers_list @> :userId::jsonb`,
            {
                replacements: {
                    subject_fk_id: result.subject_fk_id,
                    userId: JSON.stringify([parseInt(userId)])
                },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!assigned) {
            return res.status(403).json({ error: "Forbidden: You are not an assigned checker for this subject." });
        }

        if (!result.encrypted_answer_key) {
            return res.status(200).json({
                message: "Answer fetched (no encryption found)",
                data: {
                    answer_id: result.answer_id,
                    stud_answer: result.stud_answer
                }
            });
        }

        // Decrypt the answer key using master key
        const masterKeyHex = process.env.AES_MASTER_KEY;
        const answerKeyHex = decrypt(result.encrypted_answer_key, Buffer.from(masterKeyHex, "hex"));
        const answerKey = Buffer.from(answerKeyHex, "hex");

        // Decrypt the student answer
        let decryptedAnswer = result.stud_answer;
        if (typeof result.stud_answer === "string") {
            decryptedAnswer = decrypt(result.stud_answer, answerKey);
        } else if (result.stud_answer && typeof result.stud_answer === "object" && result.stud_answer.text) {
            decryptedAnswer = {
                ...result.stud_answer,
                text: decrypt(result.stud_answer.text, answerKey),
            };
        }

        res.status(200).json({
            message: "Answer fetched and decrypted successfully",
            data: {
                answer_id: result.answer_id,
                stud_answer: decryptedAnswer
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching answer: " + err.message });
    }
};

/**
 * 3b. getStudentAnswersBySubject
 * Fetch all answers for one assigned student in one subject.
 */
export const getStudentAnswersBySubject = async (req, res) => {
    try {
        const { subject_fk_id, student_user_fk_id } = req.params;
        const userId = req.user.id;

        const assignment = await SubjectStudentCheckerAssignment.findOne({
            where: {
                subject_fk_id,
                student_user_fk_id,
                checker_user_fk_id: userId,
            },
        });

        if (!assignment) {
            return res.status(403).json({ error: "Forbidden: Student is not assigned to you for this subject." });
        }

        const answers = await sequelize.query(
            `
            SELECT
                pq.id AS "question_id",
                pq.question_type,
                pq.question_txt,
                pq.option1,
                pq.option2,
                pq.option3,
                pq.option4,
                pq.correct_option,
                pq.full_marks,
                sqa.id AS "answer_id",
                sqa.stud_answer,
                sqa."createdAt_ts" AS "submitted_at",
                eat_q.aes_256_key AS "encrypted_question_key",
                eat_a.aes_256_key AS "encrypted_answer_key",
                sam.marks_obtained,
                sam.feedback
            FROM public."PaperQuestion" pq
            JOIN public."SubjectPaper" sp ON pq.paper_fk_id = sp.id
            LEFT JOIN public."StudentQuestionAnswer" sqa 
                ON sqa.exam_question_fk_id = pq.id 
                AND sqa.stud_user_fk_id = :student_user_fk_id
            LEFT JOIN public."ExamAnswerToken" eat_q ON pq.id = eat_q.question_fk_id
            LEFT JOIN public."ExamAnswerToken" eat_a ON sqa.id = eat_a.answer_fk_id
            LEFT JOIN public."StudentAnswerMarks" sam ON sam.stud_answer_fk_id = sqa.id
            WHERE sp.subject_fk_id = :subject_fk_id
            ORDER BY pq.id ASC;
            `,
            {
                replacements: {
                    subject_fk_id,
                    student_user_fk_id,
                },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        const masterKeyHex = process.env.AES_MASTER_KEY;
        if (!masterKeyHex) {
            throw new Error("AES_MASTER_KEY not found in .env");
        }

        const decryptedAnswers = answers.map((row) => {
            let questionContent = {
                question_txt: row.question_txt,
                option1: row.option1,
                option2: row.option2,
                option3: row.option3,
                option4: row.option4,
                correct_option: row.correct_option
            };

            // Decrypt Question Content
            if (row.encrypted_question_key) {
                const paperKeyHex = decrypt(row.encrypted_question_key, Buffer.from(masterKeyHex, "hex"));
                const paperKey = Buffer.from(paperKeyHex, "hex");
                
                questionContent.question_txt = row.question_txt ? decrypt(row.question_txt, paperKey) : row.question_txt;
                questionContent.option1 = row.option1 ? decrypt(row.option1, paperKey) : null;
                questionContent.option2 = row.option2 ? decrypt(row.option2, paperKey) : null;
                questionContent.option3 = row.option3 ? decrypt(row.option3, paperKey) : null;
                questionContent.option4 = row.option4 ? decrypt(row.option4, paperKey) : null;
                questionContent.correct_option = row.correct_option ? Number(decrypt(row.correct_option, paperKey)) : null;
            }

            // Decrypt Student Answer
            let studAnswer = row.stud_answer;
            if (row.encrypted_answer_key) {
                const answerKeyHex = decrypt(row.encrypted_answer_key, Buffer.from(masterKeyHex, "hex"));
                const answerKey = Buffer.from(answerKeyHex, "hex");

                if (typeof studAnswer === "string") {
                    studAnswer = decrypt(studAnswer, answerKey);
                } else if (studAnswer && typeof studAnswer === "object" && studAnswer.text) {
                    studAnswer = {
                        ...studAnswer,
                        text: decrypt(studAnswer.text, answerKey),
                    };
                }
            }

            const { encrypted_question_key, encrypted_answer_key, ...rowData } = row;

            return {
                ...rowData,
                ...questionContent,
                stud_answer: studAnswer,
                marks_obtained: row.marks_obtained,
                feedback: row.feedback,
            };
        });

        res.status(200).json({
            message: "Student answers for subject fetched successfully",
            data: decryptedAnswers,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching student answers for subject: " + err.message });
    }
};

/**
 * 4. POST assignSubjectMarks
 * Use student_user_fk_id and (logic to link to student answers) and marks_obtained 
 * to create a StudentAnswerMarks record.
 * User feedback: "its StudentAnswerMarks use that"
 */
export const assignSubjectMarks = async (req, res) => {
    const assignMarksSchema = Joi.object({
        student_user_fk_id: Joi.number().required(),
        exam_subject_fk_id: Joi.number().required(),
        marks_obtained: Joi.number().required(),
        feedback: Joi.string().allow(null, "").optional(),
    });

    const { error, value } = assignMarksSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const userId = req.user.id;

        const assigned = await SubjectStudentCheckerAssignment.findOne({
            where: {
                subject_fk_id: value.exam_subject_fk_id,
                student_user_fk_id: value.student_user_fk_id,
                checker_user_fk_id: userId,
            },
        });

        if (!assigned) {
            return res.status(403).json({ error: "Forbidden: You are not assigned to check this student's subject." });
        }

        // Find one answer for this student and subject to link the marks to
        // If multiple answers exist, we link to the first one or logic might need refinement
        // Typically subject marks might be stored differently, but user said use StudentAnswerMarks.
        const [answer] = await sequelize.query(
            `
            SELECT sqa.id 
            FROM public."StudentQuestionAnswer" sqa
            JOIN public."PaperQuestion" pq ON sqa.exam_question_fk_id = pq.id
            JOIN public."SubjectPaper" sp ON pq.paper_fk_id = sp.id
            WHERE sqa.stud_user_fk_id = :student_user_fk_id AND sp.subject_fk_id = :exam_subject_fk_id
            LIMIT 1;
            `,
            {
                replacements: {
                    student_user_fk_id: value.student_user_fk_id,
                    exam_subject_fk_id: value.exam_subject_fk_id
                },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!answer) {
            return res.status(404).json({ error: "No answers found for this student in this subject." });
        }

        // Create or update marks
        const [marks, created] = await StudentAnswerMarks.findOrCreate({
            where: {
                stud_user_fk_id: value.student_user_fk_id,
                stud_answer_fk_id: answer.id
            },
            defaults: {
                marks_obtained: value.marks_obtained,
                feedback: value.feedback
            }
        });

        if (!created) {
            marks.marks_obtained = value.marks_obtained;
            marks.feedback = value.feedback;
            await marks.save();
        }

        res.status(200).json({
            message: created ? "Marks assigned successfully" : "Marks updated successfully",
            data: marks,
        });
    } catch (err) {
        res.status(500).json({ error: "Error assigning marks: " + err.message });
    }
};

/**
 * 4b. POST assignQuestionMark
 * Assign marks to a specific question answer.
 */
export const assignQuestionMark = async (req, res) => {
    const questionMarkSchema = Joi.object({
        answer_id: Joi.number().required(),
        marks_obtained: Joi.number().required(),
        feedback: Joi.string().allow(null, "").optional(),
    });

    const { error, value } = questionMarkSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const userId = req.user.id;
        const { answer_id, marks_obtained, feedback } = value;

        // Verify the answer exists and the teacher is assigned
        const [answer] = await sequelize.query(
            `
            SELECT 
                sqa.id, 
                sqa.stud_user_fk_id, 
                sp.subject_fk_id,
                pq.full_marks
            FROM public."StudentQuestionAnswer" sqa
            JOIN public."PaperQuestion" pq ON sqa.exam_question_fk_id = pq.id
            JOIN public."SubjectPaper" sp ON pq.paper_fk_id = sp.id
            WHERE sqa.id = :answer_id
            LIMIT 1;
            `,
            {
                replacements: { answer_id },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!answer) {
            return res.status(404).json({ error: "Answer not found." });
        }

        if (marks_obtained > answer.full_marks) {
            return res.status(400).json({ error: `Marks obtained (${marks_obtained}) cannot exceed full marks (${answer.full_marks}).` });
        }

        const assigned = await SubjectStudentCheckerAssignment.findOne({
            where: {
                subject_fk_id: answer.subject_fk_id,
                student_user_fk_id: answer.stud_user_fk_id,
                checker_user_fk_id: userId,
            },
        });

        if (!assigned) {
            return res.status(403).json({ error: "Forbidden: You are not assigned to grade this submission." });
        }

        // Create or update marks for this specific answer
        const [marks, created] = await StudentAnswerMarks.findOrCreate({
            where: {
                stud_answer_fk_id: answer_id
            },
            defaults: {
                stud_user_fk_id: answer.stud_user_fk_id,
                marks_obtained,
                feedback,
                subject_fk_id: answer.subject_fk_id
            }
        });

        if (!created) {
            marks.marks_obtained = marks_obtained;
            marks.feedback = feedback;
            await marks.save();
        }

        res.status(200).json({
            message: created ? "Question marks assigned" : "Question marks updated",
            data: marks
        });
    } catch (err) {
        res.status(500).json({ error: "Error assigning question marks: " + err.message });
    }
};

/**
 * 5. GET getStudentById
 * Fetch a comprehensive detailed response of the Student including every result.
 */
export const getStudentById = async (req, res) => {
    try {
        const { student_id } = req.params;
        const teacherCenterId = req.user.center_fk_id;

        if (!teacherCenterId) {
            return res.status(400).json({ error: "Teacher has no assigned center." });
        }

        // 1. Fetch student basic info
        const [student] = await sequelize.query(
            `SELECT 
                id, 
                (firstname_txt || ' ' || lastname_txt) AS full_name, 
                username, 
                email_txt, 
                phone_num_txt, 
                stud_batch_year, 
                stud_exam_symbol_no, 
                stud_exam_reg_no,
                center_fk_id
            FROM public."User" 
            WHERE id = :student_id AND role = 'STUDENT'`,
            {
                replacements: { student_id },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!student) {
            return res.status(404).json({ error: "Student not found." });
        }

        // Check if teacher is in the same center
        if (parseInt(student.center_fk_id) !== parseInt(teacherCenterId)) {
            return res.status(403).json({ error: "Forbidden: Student is not in your center." });
        }

        // 2. Fetch all results for the student
        const results = await sequelize.query(
            `
            SELECT 
                e.id AS exam_id,
                e.exam_name_txt,
                es.id AS subject_id,
                es.subject_name_txt,
                es.full_marks,
                es.pass_marks,
                est.status AS exam_status,
                est.submitted_at AS exam_submitted_at,
                (
                    SELECT SUM(sam.marks_obtained)
                    FROM public."StudentAnswerMarks" sam
                    JOIN public."StudentQuestionAnswer" sqa ON sam.stud_answer_fk_id = sqa.id
                    WHERE sqa.stud_user_fk_id = :student_id
                      AND sqa.subject_fk_id = es.id
                ) AS total_marks_obtained,
                (
                    SELECT COUNT(sqa.id)
                    FROM public."StudentQuestionAnswer" sqa
                    WHERE sqa.stud_user_fk_id = :student_id
                      AND sqa.subject_fk_id = es.id
                ) AS answers_submitted_count
            FROM public."ExamStudent" est
            JOIN public.examinations e ON est.exam_fk_id = e.id
            JOIN public."ExaminationSubject" es ON es.exam_fk_id = e.id
            WHERE est.student_fk_id = :student_id
            ORDER BY e."createdAt_ts" DESC, es.id ASC;
            `,
            {
                replacements: { student_id },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Student details and results fetched successfully",
            data: {
                student: student || null,
                results: results || []
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching student details: " + err.message });
    }
};

/**
 * 6. GET getAllStudentInTeacherCenter
 * Fetch a list of every student in the logged in teacher's center.
 */
export const getAllStudentInTeacherCenter = async (req, res) => {
    try {
        const userId = req.user.id;

        const [teacherCenter] = await sequelize.query(
            `SELECT u.center_fk_id, ec.center_name_txt 
             FROM public."User" u 
             LEFT JOIN public."ExaminationCenter" ec ON u.center_fk_id = ec.id 
             WHERE u.id = :userId`,
            {
                replacements: { userId },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!teacherCenter || !teacherCenter.center_fk_id) {
            return res.status(200).json({
                message: "Teacher has no assigned center.",
                data: {
                    center_name: "No Assigned Center",
                    students: []
                }
            });
        }

        const users = await sequelize.query(
            `
            SELECT 
                u.id, 
                (u.firstname_txt || ' ' || u.lastname_txt) AS "full_name", 
                u.firstname_txt,
                u.lastname_txt,
                u.username, 
                u.email_txt, 
                u.phone_num_txt, 
                u.role,
                u.stud_batch_year, 
                u.stud_exam_symbol_no,
                u.stud_exam_reg_no,
                u.is_active,
                ec.center_name_txt
            FROM public."User" u
            JOIN public."ExaminationCenter" ec ON u.center_fk_id = ec.id
            WHERE u.center_fk_id = :centerId
              AND u.role = 'STUDENT'
            ORDER BY u.firstname_txt ASC;
            `,
            {
                replacements: { centerId: teacherCenter.center_fk_id },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Center students fetched successfully",
            data: {
                center_name: teacherCenter.center_name_txt,
                students: users
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching center students: " + err.message });
    }
};

// --- Teacher Student CRUD Controllers ---

const batchYearSchema = Joi.number().integer().min(2020).max(new Date().getFullYear() + 10);

const normalizeName = (value) => {
    const cleanValue = value.trim();
    if (!cleanValue) return cleanValue;
    return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1).toLowerCase();
};

const createStudentSchema = Joi.object({
    firstname_txt: Joi.string().trim().pattern(/^[A-Za-z]+$/).required().messages({
        "string.pattern.base": "First name must contain letters only.",
    }),
    lastname_txt: Joi.string().trim().pattern(/^[A-Za-z]+$/).required().messages({
        "string.pattern.base": "Last name must contain letters only.",
    }),
    role: Joi.string().valid("STUDENT").default("STUDENT"),
    username: Joi.string().required(),
    email_txt: Joi.string().email().allow(null, ""),
    phone_num_txt: Joi.string().allow(null, ""),
    stud_batch_year: Joi.string().required(),
    stud_exam_symbol_no: Joi.string().trim().pattern(/^\d{8,10}$/).required().messages({
        "string.pattern.base": "Symbol number must contain 8 to 10 digits.",
    }),
    stud_exam_reg_no: Joi.string().trim().pattern(/^\d{8,10}$/).required().messages({
        "string.pattern.base": "Registration number must contain 8 to 10 digits.",
    }),
    is_active: Joi.boolean().default(true),
});

const updateStudentSchema = Joi.object({
    firstname_txt: Joi.string().trim().pattern(/^[A-Za-z]+$/).messages({
        "string.pattern.base": "First name must contain letters only.",
    }),
    lastname_txt: Joi.string().trim().pattern(/^[A-Za-z]+$/).messages({
        "string.pattern.base": "Last name must contain letters only.",
    }),
    email_txt: Joi.string().email().allow(null, ""),
    phone_num_txt: Joi.string().allow(null, ""),
    stud_batch_year: Joi.string(),
    stud_exam_symbol_no: Joi.string().trim().pattern(/^\d{8,10}$/).messages({
        "string.pattern.base": "Symbol number must contain 8 to 10 digits.",
    }),
    stud_exam_reg_no: Joi.string().trim().pattern(/^\d{8,10}$/).messages({
        "string.pattern.base": "Registration number must contain 8 to 10 digits.",
    }),
    is_active: Joi.boolean(),
}).unknown(true);

export const createStudent = async (req, res) => {
    const teacherCenterId = req.user.center_fk_id;
    if (!teacherCenterId) {
        return res.status(400).json({ error: "Forbidden: Teacher has no assigned center." });
    }

    const { error, value } = createStudentSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        // Check for duplicate username
        const existing = await User.findOne({ where: { username: value.username } });
        if (existing) {
            return res.status(400).json({ error: "Username already exists." });
        }

        const student = await User.create({
            ...value,
            role: "STUDENT",
            center_fk_id: teacherCenterId,
            firstname_txt: normalizeName(value.firstname_txt),
            lastname_txt: normalizeName(value.lastname_txt),
        });

        res.status(201).json({
            message: "Student created successfully",
            data: student,
        });
    } catch (err) {
        res.status(500).json({ error: "Error creating student: " + err.message });
    }
};

export const updateStudent = async (req, res) => {
    const { student_id } = req.params;
    const teacherCenterId = req.user.center_fk_id;

    if (!teacherCenterId) {
        return res.status(400).json({ error: "Forbidden: Teacher has no assigned center." });
    }

    const { error, value } = updateStudentSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const student = await User.findOne({
            where: { id: student_id, role: "STUDENT" }
        });

        if (!student) {
            return res.status(404).json({ error: "Student not found." });
        }

        if (parseInt(student.center_fk_id) !== parseInt(teacherCenterId)) {
            return res.status(403).json({ error: "Forbidden: Student is not in your center." });
        }

        const nextValue = { ...value };
        if (nextValue.firstname_txt) nextValue.firstname_txt = normalizeName(nextValue.firstname_txt);
        if (nextValue.lastname_txt) nextValue.lastname_txt = normalizeName(nextValue.lastname_txt);

        await student.update(nextValue);

        res.status(200).json({
            message: "Student updated successfully",
            data: student,
        });
    } catch (err) {
        res.status(500).json({ error: "Error updating student: " + err.message });
    }
};

export const deactivateStudent = async (req, res) => {
    const { student_id } = req.params;
    const teacherCenterId = req.user.center_fk_id;

    if (!teacherCenterId) {
        return res.status(400).json({ error: "Forbidden: Teacher has no assigned center." });
    }

    try {
        const student = await User.findOne({
            where: { id: student_id, role: "STUDENT" }
        });

        if (!student) {
            return res.status(404).json({ error: "Student not found." });
        }

        if (parseInt(student.center_fk_id) !== parseInt(teacherCenterId)) {
            return res.status(403).json({ error: "Forbidden: Student is not in your center." });
        }

        await student.update({ is_active: false });

        res.status(200).json({ message: "Student deactivated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Error deactivating student: " + err.message });
    }
};

export const activateStudent = async (req, res) => {
    const { student_id } = req.params;
    const teacherCenterId = req.user.center_fk_id;

    if (!teacherCenterId) {
        return res.status(400).json({ error: "Forbidden: Teacher has no assigned center." });
    }

    try {
        const student = await User.findOne({
            where: { id: student_id, role: "STUDENT" }
        });

        if (!student) {
            return res.status(404).json({ error: "Student not found." });
        }

        if (parseInt(student.center_fk_id) !== parseInt(teacherCenterId)) {
            return res.status(403).json({ error: "Forbidden: Student is not in your center." });
        }

        await student.update({ is_active: true });

        res.status(200).json({ message: "Student activated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Error activating student: " + err.message });
    }
};

export const deleteStudent = async (req, res) => {
    const { student_id } = req.params;
    const teacherCenterId = req.user.center_fk_id;

    if (!teacherCenterId) {
        return res.status(400).json({ error: "Forbidden: Teacher has no assigned center." });
    }

    try {
        const student = await User.findOne({
            where: { id: student_id, role: "STUDENT" }
        });

        if (!student) {
            return res.status(404).json({ error: "Student not found." });
        }

        if (parseInt(student.center_fk_id) !== parseInt(teacherCenterId)) {
            return res.status(403).json({ error: "Forbidden: Student is not in your center." });
        }

        await student.destroy();

        res.status(200).json({ message: "Student permanently removed" });
    } catch (err) {
        res.status(500).json({ error: "Could not delete student: Student may have existing records." });
    }
};

// --- Teacher Dashboard Controllers ---

const teacherAssignedExamsCte = `
    WITH assigned_exams AS (
    SELECT es.exam_fk_id AS exam_id,
           MIN(es."exam_startTime_ts") AS "exam_startTime_ts",
           BOOL_OR(es.exam_setter_user_fk_id = :userId) AS is_setter,
           BOOL_OR(sp.paper_checkers_list @> :checkerUser::jsonb) AS is_checker
    FROM public."ExaminationSubject" es
    LEFT JOIN public."SubjectPaper" sp 
        ON sp.subject_fk_id = es.id
    GROUP BY es.exam_fk_id
    HAVING 
        BOOL_OR(es.exam_setter_user_fk_id = :userId)
        OR
        BOOL_OR(sp.paper_checkers_list @> :checkerUser::jsonb)
    )
`;

export const getTeacherExamSummary = async (req, res) => {
    try {
        const userId = parseInt(req.user.id, 10);
        const checkerUser = JSON.stringify([userId]);
        const now = new Date();

        const [summary] = await sequelize.query(
            `${teacherAssignedExamsCte}
             SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (
                    WHERE e."result_time_ts" IS NOT NULL AND e."result_time_ts" < :now
                ) AS finished,
                COUNT(*) FILTER (
                    WHERE ae."exam_startTime_ts" <= :now
                      AND (e."result_time_ts" IS NULL OR e."result_time_ts" >= :now)
                ) AS ongoing,
                COUNT(*) FILTER (
                    WHERE ae."exam_startTime_ts" > :now
                ) AS upcoming
             FROM assigned_exams ae
             JOIN public.examinations e ON e.id = ae.exam_id`,
            {
                replacements: { userId, checkerUser, now },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Teacher exam summary fetched",
            data: {
                total: parseInt(summary?.total ?? 0, 10),
                finished: parseInt(summary?.finished ?? 0, 10),
                ongoing: parseInt(summary?.ongoing ?? 0, 10),
                upcoming: parseInt(summary?.upcoming ?? 0, 10),
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching teacher exam summary: " + err.message });
    }
};

export const getTeacherUpcomingExaminations = async (req, res) => {
    try {
        const userId = parseInt(req.user.id, 10);
        const checkerUser = JSON.stringify([userId]);
        const now = new Date();
        const limit = Math.min(parseInt(req.query.limit, 10) || 6, 20);

        const rows = await sequelize.query(
            `${teacherAssignedExamsCte}
             SELECT
                e.id AS "examId",
                e.exam_name_txt AS "examName",
                ae."exam_startTime_ts" AS "examStartTime",
                e."result_time_ts" AS "resultTime",
                CASE
                    WHEN ae.is_setter AND ae.is_checker THEN 'SETTER_AND_CHECKER'
                    WHEN ae.is_setter THEN 'SETTER'
                    ELSE 'CHECKER'
                END AS "assignedAs"
            FROM assigned_exams ae
            JOIN public.examinations e ON e.id = ae.exam_id
            WHERE ae."exam_startTime_ts" > :now
            ORDER BY ae."exam_startTime_ts" ASC
            LIMIT :limit`,
            {
                replacements: { userId, checkerUser, now, limit },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Teacher upcoming examinations fetched",
            data: Array.isArray(rows) ? rows : [],
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching upcoming examinations: " + err.message });
    }
};

export const getTeacherTopStudents = async (req, res) => {
    try {
        const centerId = req.user.center_fk_id;
        const limit = Math.min(parseInt(req.query.limit, 10) || 3, 10);

        if (!centerId) {
            return res.status(200).json({
                message: "Teacher has no assigned center",
                data: [],
            });
        }

        const rows = await sequelize.query(
            `SELECT
                u.id,
                u.firstname_txt,
                u.lastname_txt,
                u.username,
                COALESCE(SUM(sam.marks_obtained), 0) AS total_marks
             FROM public."User" u
             LEFT JOIN public."StudentAnswerMarks" sam ON sam.stud_user_fk_id = u.id
             WHERE u.role = 'STUDENT'
               AND u.is_active = true
               AND u.center_fk_id = :centerId
             GROUP BY u.id, u.firstname_txt, u.lastname_txt, u.username
             ORDER BY total_marks DESC
             LIMIT :limit`,
            {
                replacements: { centerId, limit },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        const data = (Array.isArray(rows) ? rows : []).map((r) => ({
            id: r.id,
            name: [r.firstname_txt, r.lastname_txt].filter(Boolean).join(" ") || r.username,
            username: r.username,
            scoreOrCgpa: Number(r.total_marks) || 0,
        }));

        res.status(200).json({ message: "Top students fetched", data });
    } catch (err) {
        res.status(500).json({ error: "Error fetching top students: " + err.message });
    }
};

export const getTeacherAverageResultsOverExaminations = async (req, res) => {
    try {
        const userId = parseInt(req.user.id, 10);
        const centerId = req.user.center_fk_id;
        const checkerUser = JSON.stringify([userId]);

        if (!centerId) {
            return res.status(200).json({
                message: "Teacher has no assigned center",
                data: [],
            });
        }

        const rows = await sequelize.query(
            `${teacherAssignedExamsCte}
              SELECT
                DATE(ae."exam_startTime_ts") AS date,
                ROUND(AVG(sam.marks_obtained)::numeric, 2) AS "averageScore"
             FROM public."StudentAnswerMarks" sam
             JOIN public."User" u ON u.id = sam.stud_user_fk_id
             LEFT JOIN public.examinations e_direct ON e_direct.id = sam.exam_fk_id
             LEFT JOIN public."ExaminationSubject" es_direct ON es_direct.id = sam.subject_fk_id
             LEFT JOIN public.examinations e_subject ON e_subject.id = es_direct.exam_fk_id
             LEFT JOIN public."StudentQuestionAnswer" sqa ON sqa.id = sam.stud_answer_fk_id
             LEFT JOIN public."PaperQuestion" pq ON pq.id = sqa.exam_question_fk_id
             LEFT JOIN public."SubjectPaper" sp ON sp.id = pq.paper_fk_id
             LEFT JOIN public."ExaminationSubject" es_chain ON es_chain.id = sp.subject_fk_id
             LEFT JOIN public.examinations e_chain ON e_chain.id = es_chain.exam_fk_id
             JOIN public.examinations e ON e.id = COALESCE(e_direct.id, e_subject.id, e_chain.id)
             JOIN assigned_exams ae ON ae.exam_id = e.id
             WHERE u.role = 'STUDENT'
               AND u.is_active = true
               AND u.center_fk_id = :centerId
             GROUP BY DATE(ae."exam_startTime_ts")
             ORDER BY date ASC`,
            {
                replacements: { userId, checkerUser, centerId },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        const data = (Array.isArray(rows) ? rows : []).map((r) => ({
            date: r.date ? (r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10)) : "",
            averageScore: Number(r.averageScore) || 0,
        }));

        res.status(200).json({
            message: "Average results over examinations fetched",
            data,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching average results trend: " + err.message });
    }
};
