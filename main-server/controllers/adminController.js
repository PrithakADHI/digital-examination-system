import Joi from "joi";
import crypto from "crypto";
import Examination from "../models/Examination.js";
import ExaminationSubject from "../models/ExaminationSubject.js";
import bcrypt from "bcrypt";
import ExaminationCenter from "../models/ExaminationCenter.js";
import SubjectPaper from "../models/SubjectPaper.js";
import PaperQuestion from "../models/PaperQuestion.js";
import ExamAnswerToken from "../models/ExamAnswerToken.js";
import sequelize from "../database.js";
import { Sequelize } from "sequelize";
import User from "../models/User.js";
import SubjectStudentCheckerAssignment from "../models/SubjectStudentCheckerAssignment.js";

// --- Helper Functions (from SubjectPaper) ---

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

const comprehensiveExamSchema = Joi.object({
    exam_name_txt: Joi.string().max(255).required(),
    result_time_ts: Joi.date().allow(null),
    center_fk_list: Joi.array().items(Joi.number()).allow(null),
    subjects: Joi.array().items(
        Joi.object({
            subject_name_txt: Joi.string().max(255).required(),
            exam_setter_user_fk_id: Joi.number().required(),
            full_marks: Joi.number().integer().required(),
            pass_marks: Joi.number().integer().required(),
            exam_startTime_ts: Joi.date().required(),
        })
    ).min(1).required(),
});

const examinationCenterSchema = Joi.object({
    center_name_txt: Joi.string().max(255).required(),
    whitelist_ip: Joi.string().max(255).allow(null, ""),
    whitelist_url: Joi.string().max(255).allow(null, ""),
});

const digitsSchema = Joi.string()
    .trim()
    .pattern(/^\d{8,10}$/)
    .messages({
        "string.pattern.base": "Must contain 8 to 10 digits.",
    });

const batchYearSchema = Joi.number().integer().min(2020).max(new Date().getFullYear() + 10);

const normalizeName = (value) => {
    const cleanValue = value.trim();
    if (!cleanValue) return cleanValue;
    return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1).toLowerCase();
};

const createUserSchema = Joi.object({
    firstname_txt: Joi.string().trim().pattern(/^[A-Za-z]+$/).required().messages({
        "string.pattern.base": "First name must contain letters only.",
    }),
    lastname_txt: Joi.string().trim().pattern(/^[A-Za-z]+$/).required().messages({
        "string.pattern.base": "Last name must contain letters only.",
    }),
    role: Joi.string().valid("SUPERADMIN", "ADMIN", "TEACHER", "STUDENT").required(),
    username: Joi.string().required(),
    email_txt: Joi.string().email().allow(null, ""),
    phone_num_txt: Joi.string().allow(null, ""),
    center_fk_id: Joi.number().allow(null),
    stud_batch_year: Joi.when("role", {
        is: "STUDENT",
        then: batchYearSchema.required(),
        otherwise: batchYearSchema.allow(null, ""),
    }),
    stud_exam_symbol_no: Joi.when("role", {
        is: "STUDENT",
        then: Joi.string().trim().pattern(/^\d{8,10}$/).required().messages({
            "string.pattern.base": "Symbol number must contain 8 to 10 digits.",
        }),
        otherwise: Joi.string().allow(null, ""),
    }),
    stud_exam_reg_no: Joi.when("role", {
        is: "STUDENT",
        then: Joi.string().trim().pattern(/^\d{8,10}$/).required().messages({
            "string.pattern.base": "Registration number must contain 8 to 10 digits.",
        }),
        otherwise: Joi.string().allow(null, ""),
    }),
    is_active: Joi.boolean().default(true),
});

const updateUserSchema = Joi.object({
    firstname_txt: Joi.string().trim().pattern(/^[A-Za-z]+$/).messages({
        "string.pattern.base": "First name must contain letters only.",
    }),
    lastname_txt: Joi.string().trim().pattern(/^[A-Za-z]+$/).messages({
        "string.pattern.base": "Last name must contain letters only.",
    }),
    role: Joi.string().valid("SUPERADMIN", "ADMIN", "TEACHER", "STUDENT"),
    email_txt: Joi.string().email().allow(null, ""),
    phone_num_txt: Joi.string().allow(null, ""),
    center_fk_id: Joi.number().allow(null),
    stud_batch_year: Joi.when("role", {
        is: "STUDENT",
        then: batchYearSchema.required(),
        otherwise: batchYearSchema.allow(null, ""),
    }),
    stud_exam_symbol_no: Joi.when("role", {
        is: "STUDENT",
        then: Joi.string().trim().pattern(/^\d{8,10}$/).required().messages({
            "string.pattern.base": "Symbol number must contain 8 to 10 digits.",
        }),
        otherwise: Joi.string().allow(null, ""),
    }),
    stud_exam_reg_no: Joi.when("role", {
        is: "STUDENT",
        then: Joi.string().trim().pattern(/^\d{8,10}$/).required().messages({
            "string.pattern.base": "Registration number must contain 8 to 10 digits.",
        }),
        otherwise: Joi.string().allow(null, ""),
    }),
    is_active: Joi.boolean(),
}).unknown(true);

const assignStudentsSchema = Joi.object({
    subject_fk_id: Joi.number().required(),
    checker_user_fk_id: Joi.number().required(),
    student_user_fk_ids: Joi.array().items(Joi.number()).min(1).required(),
});

// --- Examination Controllers ---

function validateExaminationDates(subjects, result_time_ts) {
    if (!subjects || subjects.length === 0) {
        return null;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const minStartTime = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    // 1. Validate that each subject starts at least 2 weeks from now
    for (const sub of subjects) {
        if (!sub.exam_startTime_ts) continue;
        const subDate = new Date(sub.exam_startTime_ts);
        if (subDate < minStartTime) {
            return `Subject '${sub.subject_name_txt}' start time must be at least 2 weeks from today (no earlier than ${minStartTime.toLocaleDateString()}).`;
        }
    }

    // 2. Validate that subjects are in chronological order (at least 24 hours between consecutive subjects)
    for (let i = 1; i < subjects.length; i++) {
        const prev = subjects[i - 1];
        const curr = subjects[i];
        if (!prev.exam_startTime_ts || !curr.exam_startTime_ts) continue;

        const prevDate = new Date(prev.exam_startTime_ts);
        const currDate = new Date(curr.exam_startTime_ts);
        const minAllowedNext = new Date(prevDate.getTime() + 24 * 60 * 60 * 1000 - 60000); // 1 minute grace

        if (currDate < minAllowedNext) {
            return `Subject '${curr.subject_name_txt}' must start at least 24 hours after '${prev.subject_name_txt}' (${prevDate.toLocaleDateString()}).`;
        }
    }

    // 3. Validate result date time (must be at least 2 weeks after the start of the final subject)
    if (result_time_ts) {
        const subjectDates = subjects
            .map((s) => s.exam_startTime_ts)
            .filter(Boolean)
            .map((d) => new Date(d).getTime());

        if (subjectDates.length > 0) {
            const finalSubjectTime = Math.max(...subjectDates);
            const minResultTime = new Date(finalSubjectTime + 14 * 24 * 60 * 60 * 1000 - 60000); // 1 minute grace
            const resultDate = new Date(result_time_ts);

            if (resultDate < minResultTime) {
                return `Result publication date must be at least 2 weeks after the final subject's start date (no earlier than ${minResultTime.toLocaleDateString()}).`;
            }
        }
    }

    return null;
}

export const createComprehensiveExamination = async (req, res) => {
    const { error, value } = comprehensiveExamSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const dateValidationError = validateExaminationDates(value.subjects, value.result_time_ts);
    if (dateValidationError) {
        return res.status(400).json({ error: dateValidationError });
    }

    // 0. Validate that all centers exist (using a raw SQL query)
    if (value.center_fk_list && value.center_fk_list.length > 0) {
        try {
            const [countResult] = await sequelize.query(
                `SELECT COUNT(*) as count FROM public."ExaminationCenter" WHERE id IN (:ids)`,
                {
                    replacements: { ids: value.center_fk_list },
                    type: Sequelize.QueryTypes.SELECT,
                }
            );

            if (parseInt(countResult.count) !== value.center_fk_list.length) {
                return res
                    .status(400)
                    .json({ error: "One or more examination centers do not exist." });
            }
        } catch (err) {
            return res
                .status(500)
                .json({ error: "Error validating centers: " + err.message });
        }
    }

    // 1. Validate that all exam setters exist and have allowed roles
    const examSetterIds = [...new Set(value.subjects.map((s) => s.exam_setter_user_fk_id))];
    try {
        const validSetters = await sequelize.query(
            `SELECT id FROM public."User" WHERE id IN (:ids) AND role != 'STUDENT'`,
            {
                replacements: { ids: examSetterIds },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (validSetters.length !== examSetterIds.length) {
            return res
                .status(400)
                .json({ error: "One or more exam setter users do not exist or are students." });
        }
    } catch (err) {
        return res
            .status(500)
            .json({ error: "Error validating exam setters: " + err.message });
    }

    const t = await sequelize.transaction();
    try {
        // 2. Create the Examination
        const examination = await Examination.create({
            exam_name_txt: value.exam_name_txt,
            creator_user_fk_id: req.user.id,
            result_time_ts: value.result_time_ts,
            center_fk_list: value.center_fk_list,
        }, { transaction: t });

        // 3. Create the Examination Subjects
        const subjectsToCreate = value.subjects.map(s => ({
            ...s,
            exam_fk_id: examination.id
        }));

        await ExaminationSubject.bulkCreate(subjectsToCreate, { transaction: t });

        await t.commit();

        res.status(201).json({
            message: "Examination and subjects created successfully",
            data: {
                examination,
                subjectsCount: subjectsToCreate.length
            }
        });

    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: "Error creating comprehensive examination: " + err.message });
    }
};

export const getExaminationById = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await sequelize.query(
            `
      SELECT e.*,
             (SELECT MIN(esub."exam_startTime_ts") FROM public."ExaminationSubject" esub WHERE esub.exam_fk_id = e.id) AS exam_startTime_ts,
             u.username AS creator_username,
             u.firstname_txt AS creator_firstname,
             u.lastname_txt AS creator_lastname,
             COALESCE(
               (SELECT json_agg(
                 json_build_object(
                   'id', s.id,
                   'subject_name_txt', s.subject_name_txt,
                   'full_marks', s.full_marks,
                   'pass_marks', s.pass_marks,
                   'exam_startTime_ts', s."exam_startTime_ts",
                   'exam_setter_user_fk_id', s.exam_setter_user_fk_id,
                   'setter_username', us.username,
                   'setter_firstname', us.firstname_txt,
                   'setter_lastname', us.lastname_txt
                 )
               )
               FROM public."ExaminationSubject" s
               LEFT JOIN public."User" us ON s.exam_setter_user_fk_id = us.id
               WHERE s.exam_fk_id = e.id),
               '[]'
             ) AS subjects,
             COALESCE(
               (SELECT json_agg(c.*)
                FROM public."ExaminationCenter" c
                WHERE c.id::text IN (
                  SELECT jsonb_array_elements_text(e.center_fk_list)
                )
               ),
               '[]'
             ) AS centers
      FROM public.examinations e
      LEFT JOIN public."User" u ON e.creator_user_fk_id = u.id
      WHERE e.id = :id;
      `,
            {
                replacements: { id },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!result) {
            return res.status(404).json({ error: "Examination not found" });
        }

        const { subjects, centers, ...examinationData } = result;

        res.status(200).json({
            message: "Examination fetched successfully",
            data: {
                examination: examinationData,
                subjects: subjects,
                centers: centers,
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching examination: " + err.message });
    }
};

export const getAllExaminations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const normalizedSearch = req.query.search?.trim();
        const searchPattern = normalizedSearch ? `%${normalizedSearch}%` : null;

        const searchClause = normalizedSearch
            ? `
                WHERE (
                    CAST(e.id AS TEXT) ILIKE :searchPattern
                    OR COALESCE(e."exam_name_txt", '') ILIKE :searchPattern
                    OR CAST(
                        (SELECT MIN(esub."exam_startTime_ts") FROM public."ExaminationSubject" esub WHERE esub.exam_fk_id = e.id)
                        AS TEXT
                    ) ILIKE :searchPattern
                    OR CAST(e."result_time_ts" AS TEXT) ILIKE :searchPattern
                    OR EXISTS (
                        SELECT 1
                        FROM public."ExaminationCenter" c
                        WHERE c.id::text IN (
                            SELECT jsonb_array_elements_text(e.center_fk_list)
                        )
                        AND COALESCE(c.center_name_txt, '') ILIKE :searchPattern
                    )
                )
            `
            : "";

        const examinations = await sequelize.query(
            `
            SELECT e.*,
                   (SELECT MIN(esub."exam_startTime_ts") FROM public."ExaminationSubject" esub WHERE esub.exam_fk_id = e.id) AS exam_startTime_ts,
                   COALESCE(
                     (SELECT json_agg(json_build_object('id', c.id, 'center_name_txt', c.center_name_txt))
                      FROM public."ExaminationCenter" c
                      WHERE c.id::text IN (
                        SELECT jsonb_array_elements_text(e.center_fk_list)
                      )
                     ),
                     '[]'
                   ) AS centers_detail
            FROM public.examinations e
            ${searchClause}
            ORDER BY e."createdAt_ts" DESC 
            LIMIT :limit OFFSET :offset
            `,
            {
                replacements: { limit, offset, ...(searchPattern ? { searchPattern } : {}) },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        const countQuery = `
            SELECT COUNT(*) as count
            FROM public.examinations e
            ${searchClause}
        `;

        const [totalResult] = await sequelize.query(
            countQuery,
            {
                replacements: searchPattern ? { searchPattern } : {},
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        const total = parseInt(totalResult.count);

        res.status(200).json({
            message: "Examinations fetched successfully",
            data: examinations,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching examinations: " + err.message });
    }
};

export const patchExaminationCenters = async (req, res) => {
    const { id } = req.params;
    const { center_fk_list } = req.body;

    if (!Array.isArray(center_fk_list)) {
        return res.status(400).json({ error: "center_fk_list must be an array" });
    }

    try {
        const exam = await Examination.findByPk(id);
        if (!exam) {
            return res.status(404).json({ error: "Examination not found" });
        }

        // Validate centers exist
        if (center_fk_list.length > 0) {
            const [countResult] = await sequelize.query(
                `SELECT COUNT(*) as count FROM public."ExaminationCenter" WHERE id IN (:ids)`,
                { 
                    replacements: { ids: center_fk_list }, 
                    type: Sequelize.QueryTypes.SELECT 
                }
            );
            if (parseInt(countResult.count) !== center_fk_list.length) {
                return res.status(400).json({ error: "One or more examination centers do not exist." });
            }
        }

        await exam.update({ center_fk_list });

        res.status(200).json({
            message: "Examination centers updated successfully",
            data: exam
        });
    } catch (err) {
        res.status(500).json({ error: "Error updating centers: " + err.message });
    }
};

export const updateExamination = async (req, res) => {
    const { id } = req.params;
    const { error, value } = comprehensiveExamSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const dateValidationError = validateExaminationDates(value.subjects, value.result_time_ts);
    if (dateValidationError) {
        return res.status(400).json({ error: dateValidationError });
    }
    if (value.center_fk_list && value.center_fk_list.length > 0) {
        try {
            const [countResult] = await sequelize.query(
                `SELECT COUNT(*) as count FROM public."ExaminationCenter" WHERE id IN (:ids)`,
                { replacements: { ids: value.center_fk_list }, type: Sequelize.QueryTypes.SELECT }
            );
            if (parseInt(countResult.count, 10) !== value.center_fk_list.length) {
                return res.status(400).json({ error: "One or more examination centers do not exist." });
            }
        } catch (err) {
            return res.status(500).json({ error: "Error validating centers: " + err.message });
        }
    }
    const examSetterIds = [...new Set(value.subjects.map((s) => s.exam_setter_user_fk_id))];
    try {
        const validSetters = await sequelize.query(
            `SELECT id FROM public."User" WHERE id IN (:ids) AND role != 'STUDENT'`,
            { replacements: { ids: examSetterIds }, type: Sequelize.QueryTypes.SELECT }
        );
        if ((Array.isArray(validSetters) ? validSetters.length : 0) !== examSetterIds.length) {
            return res.status(400).json({ error: "One or more exam setter users do not exist or are students." });
        }
    } catch (err) {
        return res.status(500).json({ error: "Error validating exam setters: " + err.message });
    }
    const t = await sequelize.transaction();
    try {
        const exam = await Examination.findByPk(id);
        if (!exam) {
            await t.rollback();
            return res.status(404).json({ error: "Examination not found" });
        }
        await exam.update(
            {
                exam_name_txt: value.exam_name_txt,
                result_time_ts: value.result_time_ts,
                center_fk_list: value.center_fk_list,
            },
            { transaction: t }
        );
        await ExaminationSubject.destroy({ where: { exam_fk_id: id }, transaction: t });
        const subjectsToCreate = value.subjects.map((s) => ({
            ...s,
            exam_fk_id: id,
        }));
        await ExaminationSubject.bulkCreate(subjectsToCreate, { transaction: t });
        await t.commit();
        res.status(200).json({
            message: "Examination updated successfully",
            data: { examination: exam, subjectsCount: subjectsToCreate.length },
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: "Error updating examination: " + err.message });
    }
};

export const deleteExamination = async (req, res) => {
    const { id } = req.params;
    try {
        const exam = await Examination.findByPk(id);
        if (!exam) {
            return res.status(404).json({ error: "Examination not found" });
        }
        await ExaminationSubject.destroy({ where: { exam_fk_id: id } });
        await exam.destroy();
        res.status(200).json({ message: "Examination deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Error deleting examination: " + err.message });
    }
};

// --- Dashboard Controllers ---

export const getExamSummary = async (req, res) => {
    try {
        const now = new Date();
        const [totalRow] = await sequelize.query(
            `SELECT COUNT(*) AS count FROM public.examinations`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        const [ongoingRow] = await sequelize.query(
            `SELECT COUNT(*) AS count FROM public.examinations e
             WHERE EXISTS (
                 SELECT 1 FROM public."ExaminationSubject" sub
                 WHERE sub.exam_fk_id = e.id
                 AND sub."exam_startTime_ts" <= :now
             ) AND (e."result_time_ts" IS NULL OR e."result_time_ts" >= :now)`,
            { replacements: { now }, type: Sequelize.QueryTypes.SELECT }
        );
        const [finishedRow] = await sequelize.query(
            `SELECT COUNT(*) AS count FROM public.examinations
             WHERE "result_time_ts" IS NOT NULL AND "result_time_ts" < :now`,
            { replacements: { now }, type: Sequelize.QueryTypes.SELECT }
        );
        const total = parseInt(totalRow?.count ?? 0, 10);
        const ongoing = parseInt(ongoingRow?.count ?? 0, 10);
        const finished = parseInt(finishedRow?.count ?? 0, 10);
        res.status(200).json({
            message: "Exam summary fetched",
            data: { total, ongoing, finished },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching exam summary: " + err.message });
    }
};

export const getUserCounts = async (req, res) => {
    try {
        const rows = await sequelize.query(
            `SELECT role, COUNT(*) AS count FROM public."User" WHERE is_active = true GROUP BY role`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
        const teachers = list.find((r) => r.role === "TEACHER")?.count ?? 0;
        const students = list.find((r) => r.role === "STUDENT")?.count ?? 0;
        const admins =
            (list.find((r) => r.role === "ADMIN")?.count ?? 0) +
            (list.find((r) => r.role === "SUPERADMIN")?.count ?? 0);
        res.status(200).json({
            message: "User counts fetched",
            data: { teachers: parseInt(teachers, 10), students: parseInt(students, 10), admins: parseInt(admins, 10) },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching user counts: " + err.message });
    }
};

export const getTopStudents = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 3, 10);
        const top = await sequelize.query(
            `SELECT u.id, u.firstname_txt, u.lastname_txt, u.username,
                    COALESCE(SUM(sam.marks_obtained), 0) AS total_marks
             FROM public."User" u
             LEFT JOIN public."StudentAnswerMarks" sam ON sam.stud_user_fk_id = u.id
             WHERE u.role = 'STUDENT' AND u.is_active = true
             GROUP BY u.id, u.firstname_txt, u.lastname_txt, u.username
             ORDER BY total_marks DESC
             LIMIT :limit`,
            { replacements: { limit }, type: Sequelize.QueryTypes.SELECT }
        );
        const data = (Array.isArray(top) ? top : [top]).map((r) => ({
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

export const getExamsCreationTrend = async (req, res) => {
    try {
        const result = await sequelize.query(
            `SELECT DATE("createdAt_ts") AS date, COUNT(*) AS count
             FROM public.examinations
             GROUP BY DATE("createdAt_ts")
             ORDER BY date ASC`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        const data = (Array.isArray(result) ? result : [result]).map((r) => ({
            date: r.date ? (r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10)) : "",
            count: parseInt(r.count, 10),
        }));
        res.status(200).json({ message: "Exams creation trend fetched", data });
    } catch (err) {
        res.status(500).json({ error: "Error fetching exams creation trend: " + err.message });
    }
};

export const getExamAverageScores = async (req, res) => {
    try {
        const result = await sequelize.query(
            `SELECT e.id AS "examinationId", e.exam_name_txt AS "examinationName",
                    AVG(stud_total.total) AS "averageScore"
             FROM public.examinations e
             INNER JOIN (
               SELECT exam_fk_id, stud_user_fk_id, SUM(marks_obtained) AS total
               FROM public."StudentAnswerMarks"
               WHERE exam_fk_id IS NOT NULL
               GROUP BY exam_fk_id, stud_user_fk_id
             ) stud_total ON stud_total.exam_fk_id = e.id
             GROUP BY e.id, e.exam_name_txt
             ORDER BY e."createdAt_ts" DESC`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        const data = (Array.isArray(result) ? result : [result]).map((r) => ({
            examinationId: r.examinationId,
            examinationName: r.examinationName,
            averageScore: Number(r.averageScore) != null ? Math.round(Number(r.averageScore) * 10) / 10 : null,
        }));
        res.status(200).json({ message: "Exam average scores fetched", data });
    } catch (err) {
        res.status(500).json({ error: "Error fetching exam average scores: " + err.message });
    }
};

// --- Examination Center Controllers ---

export const createCenter = async (req, res) => {
    const { error, value } = examinationCenterSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const exam_center_id = crypto.randomUUID();
        const provision_key = crypto.randomBytes(32).toString("hex");
        const provision_key_hash = await bcrypt.hash(provision_key, 10);

        const center = await ExaminationCenter.create({
            ...value,
            exam_center_id,
            provision_key_hash,
        });

        res.status(201).json({
            message: "Examination center created successfully",
            data: {
                ...center.toJSON(),
                provision_key, // This is visible only once
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Error creating center: " + err.message });
    }
};

export const getAllCenters = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const centers = await sequelize.query(
            `SELECT * FROM public."ExaminationCenter" WHERE deleted = false ORDER BY "createdAt_ts" DESC LIMIT :limit OFFSET :offset`,
            {
                replacements: { limit, offset },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        const [totalResult] = await sequelize.query(
            `SELECT COUNT(*) as count FROM public."ExaminationCenter"`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        const total = parseInt(totalResult.count);

        res.status(200).json({
            message: "Centers fetched successfully",
            data: centers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching centers: " + err.message });
    }
};

export const getCenterById = async (req, res) => {
    const { id } = req.params;
    try {
        const [center] = await sequelize.query(
            `SELECT * FROM public."ExaminationCenter" WHERE id = :id`,
            {
                replacements: { id },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!center) {
            return res.status(404).json({ error: "Examination center not found" });
        }
        res.status(200).json({
            message: "Center found successfully",
            data: center,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching center: " + err.message });
    }
};

export const updateCenter = async (req, res) => {
    const { id } = req.params;
    const { error, value } = examinationCenterSchema.validate(req.body);

    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const center = await ExaminationCenter.findByPk(id);
        if (!center || center.deleted) {
            return res.status(404).json({ error: "Examination center not found" });
        }

        await center.update(value);
        res.status(200).json({
            message: "Center updated successfully",
            data: center,
        });
    } catch (err) {
        res.status(500).json({ error: "Error updating center: " + err.message });
    }
};

export const patchCenter = async (req, res) => {
    const { id } = req.params;
    const patchSchema = Joi.object({
        center_name_txt: Joi.string().max(255).optional(),
        whitelist_ip: Joi.string().max(255).allow(null, "").optional(),
        whitelist_url: Joi.string().max(255).allow(null, "").optional(),
    });

    const { error, value } = patchSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const center = await ExaminationCenter.findByPk(id);
        if (!center || center.deleted) {
            return res.status(404).json({ error: "Examination center not found" });
        }

        await center.update(value);
        res.status(200).json({
            message: "Center updated successfully",
            data: center,
        });
    } catch (err) {
        res.status(500).json({ error: "Error patching center: " + err.message });
    }
};

export const deleteCenter = async (req, res) => {
    const { id } = req.params;
    try {
        const center = await ExaminationCenter.findByPk(id);
        if (!center || center.deleted) {
            return res.status(404).json({ error: "Examination center not found" });
        }

        await center.update({ deleted: true });

        // Optimized: Only fetch examinations that contain this center
        // Note: Using parseInt(id) because the schema defines center_fk_list as Joi.number()
        const examinations = await Examination.findAll({
            where: {
                center_fk_list: {
                    [Sequelize.Op.contains]: [parseInt(id)]
                }
            }
        });

        // Use for...of to correctly await each update
        for (const examination of examinations) {
            const center_fk_list = examination.center_fk_list || [];
            // Filter out the deleted center (comparing as strings to handle both Number and String IDs uniformly)
            const new_center_fk_list = center_fk_list.filter((center_fk) => String(center_fk) !== String(id));
            await examination.update({ center_fk_list: new_center_fk_list });
        }

        res.status(200).json({
            message: "Center deleted and removed from examination lists successfully",
        });
    } catch (err) {
        res.status(500).json({ error: "Error deleting center: " + err.message });
    }
};

// --- Subject Paper Controllers ---



// --- Student Assignment Controllers ---

/**
 * POST assignStudentsForChecking
 * Assign a list of students to a teacher for one subject.
 */
export const assignStudentsForChecking = async (req, res) => {
    const { error, value } = assignStudentsSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const t = await sequelize.transaction();
    try {
        const { subject_fk_id, checker_user_fk_id, student_user_fk_ids } = value;

        const payload = student_user_fk_ids.map((studentUserId) => ({
            subject_fk_id,
            student_user_fk_id: studentUserId,
            checker_user_fk_id,
        }));

        await SubjectStudentCheckerAssignment.bulkCreate(payload, {
            transaction: t,
            updateOnDuplicate: ["checker_user_fk_id", "updatedAt_ts"],
        });

        await t.commit();

        res.status(200).json({
            message: "Students assigned for checking successfully",
            data: {
                subject_fk_id,
                checker_user_fk_id,
                assigned_count: student_user_fk_ids.length,
            },
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: "Error assigning students for checking: " + err.message });
    }
};

/**
 * POST assignBulkStudentsForChecking
 * Passes on 1 checker_user_fk_id and multiple student_user_fk_id and does BulkCreate.
 */
export const assignBulkStudentsForChecking = async (req, res) => {
    const { error, value } = assignStudentsSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const t = await sequelize.transaction();
    try {
        const { subject_fk_id, checker_user_fk_id, student_user_fk_ids } = value;

        const payload = student_user_fk_ids.map((studentUserId) => ({
            subject_fk_id,
            student_user_fk_id: studentUserId,
            checker_user_fk_id,
        }));

        await SubjectStudentCheckerAssignment.bulkCreate(payload, {
            transaction: t,
            updateOnDuplicate: ["checker_user_fk_id", "updatedAt_ts"],
        });

        await t.commit();

        res.status(200).json({
            message: "Bulk students assigned for checking successfully",
            data: {
                subject_fk_id,
                checker_user_fk_id,
                assigned_count: student_user_fk_ids.length,
            },
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: "Error bulk assigning students for checking: " + err.message });
    }
};

/**
 * GET getAnswersBySubject
 * Fetch list of students who have submitted answers for a given subject.
 * Returns unique students along with their assignment status.
 */
export const getAnswersBySubject = async (req, res) => {
    try {
        const { subject_fk_id } = req.params;

        const students = await sequelize.query(
            `
            SELECT 
                u.id AS "student_id",
                (u.firstname_txt || ' ' || u.lastname_txt) AS "full_name",
                u.username,
                MAX(sqa."createdAt_ts") AS "submitted_at",
                ssca.checker_user_fk_id,
                (cu.firstname_txt || ' ' || cu.lastname_txt) AS "checker_name"
            FROM public."User" u
            JOIN public."StudentQuestionAnswer" sqa ON u.id = sqa.stud_user_fk_id
            JOIN public."PaperQuestion" pq ON pq.id = sqa.exam_question_fk_id
            JOIN public."SubjectPaper" sp ON sp.id = pq.paper_fk_id
            LEFT JOIN public."SubjectStudentCheckerAssignment" ssca 
                ON ssca.student_user_fk_id = u.id 
                AND ssca.subject_fk_id = sp.subject_fk_id
            LEFT JOIN public."User" cu ON cu.id = ssca.checker_user_fk_id
            WHERE sp.subject_fk_id = :subject_fk_id
            GROUP BY u.id, u.firstname_txt, u.lastname_txt, u.username, ssca.checker_user_fk_id, cu.firstname_txt, cu.lastname_txt
            ORDER BY MAX(sqa."createdAt_ts") DESC;
            `,
            {
                replacements: { subject_fk_id },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Students with answers fetched successfully",
            data: students
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching students with answers: " + err.message });
    }
};

export const getAllSubjectPapers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const papers = await sequelize.query(
            `SELECT * FROM public."SubjectPaper" ORDER BY "createdAt_ts" DESC LIMIT :limit OFFSET :offset`,
            {
                replacements: { limit, offset },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        const [totalResult] = await sequelize.query(
            `SELECT COUNT(*) as count FROM public."SubjectPaper"`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        const total = parseInt(totalResult.count);

        res.status(200).json({
            message: "Subject papers fetched successfully",
            data: papers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching subject papers: " + err.message });
    }
};

export const getSubjectPaperById = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await sequelize.query(
            `
      SELECT sp.*,
             es."exam_startTime_ts",
             json_build_object(
               'id', es.id,
               'subject_name_txt', es.subject_name_txt,
               'full_marks', es.full_marks,
               'pass_marks', es.pass_marks
             ) AS subject,
             COALESCE(
               (SELECT json_agg(
                 json_build_object(
                   'id', pq.id,
                   'question_type', pq.question_type,
                   'question_txt', pq.question_txt,
                   'option1', CASE WHEN pq.question_type = 'MCQ' THEN pq.option1 ELSE NULL END,
                   'option2', CASE WHEN pq.question_type = 'MCQ' THEN pq.option2 ELSE NULL END,
                   'option3', CASE WHEN pq.question_type = 'MCQ' THEN pq.option3 ELSE NULL END,
                   'option4', CASE WHEN pq.question_type = 'MCQ' THEN pq.option4 ELSE NULL END,
                   'encrypted_key', eat.aes_256_key
                 )
               )
               FROM public."PaperQuestion" pq
               LEFT JOIN public."ExamAnswerToken" eat ON pq.id = eat.question_fk_id
               WHERE pq.paper_fk_id = sp.id),
               '[]'
             ) AS questions
      FROM public."SubjectPaper" sp
      JOIN public."ExaminationSubject" es ON sp.subject_fk_id = es.id
      JOIN public.examinations e ON es.exam_fk_id = e.id
      WHERE sp.id = :id;
      `,
            {
                replacements: { id },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!result) {
            return res.status(404).json({ error: "Subject paper not found" });
        }

        // Validation: Check if the examination has started
        const startTime = new Date(result.exam_startTime_ts);
        const now = new Date();

        if (now < startTime) {
            return res.status(403).json({
                error: "Forbidden: Examination has not started yet. Questions cannot be accessed before the start time.",
                startTime: result.exam_startTime_ts
            });
        }

        const masterKeyHex = process.env.AES_MASTER_KEY;
        if (!masterKeyHex) {
            throw new Error("AES_MASTER_KEY not found in .env");
        }
        const masterKey = Buffer.from(masterKeyHex, "hex");

        // Decrypt questions
        const decryptedQuestions = result.questions.map((q) => {
            // 1. Decrypt the paper key using master key
            const paperKeyHex = decrypt(q.encrypted_key, masterKey);
            const paperKey = Buffer.from(paperKeyHex, "hex");

            // 2. Decrypt question data using the paper key
            const baseQuestion = {
                id: q.id,
                question_type: q.question_type,
                question_txt: decrypt(q.question_txt, paperKey),
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

        const { questions, subject, exam_startTime_ts, subject_fk_id, ...paperData } = result;

        res.status(200).json({
            message: "Subject paper fetched successfully and decrypted.",
            data: {
                paper: {
                    ...paperData,
                    subject,
                },
                questions: decryptedQuestions,
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching subject paper: " + err.message });
    }
};

export const deleteSubjectPaper = async (req, res) => {
    const { id } = req.params;
    try {
        const paper = await SubjectPaper.findByPk(id);
        if (!paper) {
            return res.status(404).json({ error: "Subject paper not found" });
        }

        await paper.destroy();
        res.status(200).json({
            message: "Subject paper deleted successfully",
        });
    } catch (err) {
        res.status(500).json({ error: "Error deleting subject paper: " + err.message });
    }
};

export const createUser = async (req, res) => {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.create({
            ...value,
            firstname_txt: normalizeName(value.firstname_txt),
            lastname_txt: normalizeName(value.lastname_txt),
        });
        res.status(201).json({ message: "User created", data: user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const bulkCreateUsers = async (req, res) => {
    const usersData = req.body;

    if (!Array.isArray(usersData)) {
        return res.status(400).json({ error: "Data must be an array of users." });
    }

    const results = {
        successCount: 0,
        errorCount: 0,
        createdUsers: [],
        errors: [] // Stores which index failed and why
    };

    for (let i = 0; i < usersData.length; i++) {
        const currentUser = usersData[i];

        // 1. Individual Validation
        const { error, value } = createUserSchema.validate(currentUser);

        if (error) {
            results.errorCount++;
            results.errors.push({
                index: i,
                username: currentUser.username || "Unknown",
                reason: error.details[0].message
            });
            continue; // Skip to next user
        }

        try {
            // 2. Check for Duplicate Username manually (since bulkCreate bypasses some hooks)
            const existing = await User.findOne({ where: { username: value.username } });
            if (existing) {
                results.errorCount++;
                results.errors.push({
                    index: i,
                    username: value.username,
                    reason: "Username already exists in database"
                });
                continue;
            }

            // 3. Create the valid user
            const newUser = await User.create({
                ...value,
                firstname_txt: normalizeName(value.firstname_txt),
                lastname_txt: normalizeName(value.lastname_txt),
            });
            results.successCount++;
            results.createdUsers.push(newUser);

        } catch (dbErr) {
            results.errorCount++;
            results.errors.push({
                index: i,
                username: value.username,
                reason: "Database error: " + dbErr.message
            });
        }
    }

    // 4. Send back the partial success report
    res.status(207).json({ // 207 = Multi-Status
        message: "Bulk processing complete",
        summary: {
            totalProcessed: usersData.length,
            success: results.successCount,
            failed: results.errorCount
        },
        data: results.createdUsers,
        failures: results.errors
    });
};

export const getAllUsers = async (req, res) => {
    try {
        const { role, center, active, search } = req.query;
        let filter = {};
        const normalizedSearch = search?.trim();
        const searchValue = normalizedSearch?.toLowerCase();

        if (role) filter.role = role;
        if (center) filter.center_fk_id = center;
        if (active) filter.is_active = active === "true";
        if (normalizedSearch) {
            const searchPattern = `%${normalizedSearch}%`;
            filter[Sequelize.Op.or] = [
                { username: { [Sequelize.Op.iLike]: searchPattern } },
                { firstname_txt: { [Sequelize.Op.iLike]: searchPattern } },
                { lastname_txt: { [Sequelize.Op.iLike]: searchPattern } },
                Sequelize.where(Sequelize.cast(Sequelize.col("role"), "text"), {
                    [Sequelize.Op.iLike]: searchPattern,
                }),
                { stud_exam_symbol_no: { [Sequelize.Op.iLike]: searchPattern } },
                { stud_exam_reg_no: { [Sequelize.Op.iLike]: searchPattern } },
                { stud_batch_year: { [Sequelize.Op.iLike]: searchPattern } },
                Sequelize.where(Sequelize.col("center.center_name_txt"), {
                    [Sequelize.Op.iLike]: searchPattern,
                }),
            ];
        }

        const order = normalizedSearch
            ? [
                  [
                      Sequelize.literal(`
                        CASE
                          WHEN LOWER("User"."firstname_txt") = ${sequelize.escape(normalizedSearch.toLowerCase())} THEN 120
                          WHEN LOWER("User"."firstname_txt") LIKE ${sequelize.escape(`${searchValue}%`)} THEN 110
                          WHEN LOWER("User"."firstname_txt") LIKE ${sequelize.escape(`%${searchValue}%`)} THEN 100
                          WHEN LOWER("User"."lastname_txt") LIKE ${sequelize.escape(`${searchValue}%`)} THEN 90
                          WHEN LOWER("User"."username") LIKE ${sequelize.escape(`${searchValue}%`)} THEN 80
                          WHEN LOWER(CONCAT_WS(' ', "User"."firstname_txt", "User"."lastname_txt")) LIKE ${sequelize.escape(`${searchValue}%`)} THEN 70
                          WHEN LOWER("User"."lastname_txt") LIKE ${sequelize.escape(`%${searchValue}%`)} THEN 60
                          WHEN LOWER("User"."username") LIKE ${sequelize.escape(`%${searchValue}%`)} THEN 50
                          WHEN LOWER("User"."stud_exam_symbol_no") LIKE ${sequelize.escape(`%${searchValue}%`)} THEN 40
                          WHEN LOWER("User"."stud_exam_reg_no") LIKE ${sequelize.escape(`%${searchValue}%`)} THEN 35
                          WHEN LOWER("User"."stud_batch_year") LIKE ${sequelize.escape(`%${searchValue}%`)} THEN 30
                          WHEN LOWER("center"."center_name_txt") LIKE ${sequelize.escape(`%${searchValue}%`)} THEN 20
                          WHEN LOWER(CAST("User"."role" AS TEXT)) LIKE ${sequelize.escape(`%${searchValue}%`)} THEN 10
                          ELSE 0
                        END
                      `),
                      "DESC",
                  ],
                  ["createdAt_ts", "DESC"],
              ]
            : [["createdAt_ts", "DESC"]];

        const users = await User.findAll({
            where: filter,
            include: [
                {
                    model: ExaminationCenter,
                    as: "center",
                    attributes: ["id", "center_name_txt"],
                    required: false,
                },
            ],
            order,
        });
        res.status(200).json({ data: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getUserById = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        res.status(200).json({ data: user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



export const updateUser = async (req, res) => {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const nextValue = {
            ...value,
        };

        if (nextValue.firstname_txt) nextValue.firstname_txt = normalizeName(nextValue.firstname_txt);
        if (nextValue.lastname_txt) nextValue.lastname_txt = normalizeName(nextValue.lastname_txt);

        await user.update(nextValue);
        res.status(200).json({ message: "Updated successfully", data: user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        await user.destroy();
        res.status(200).json({ message: "User permanently removed" });
    } catch (err) {
        res.status(500).json({ error: "Could not delete: User may have existing records." });
    }
};

export const deactivateUser = async (req, res) => {
    try {
        await User.update({ is_active: false }, { where: { id: req.params.id } });
        res.status(200).json({ message: "User deactivated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const activateUser = async (req, res) => {
    try {
        await User.update({ is_active: true }, { where: { id: req.params.id } });
        res.status(200).json({ message: "User activated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getQuestionsReviewList = async (req, res) => {
    try {
        const papers = await sequelize.query(
            `
            SELECT 
                es.id AS "subject_id",
                es.subject_name_txt,
                es.full_marks,
                es.pass_marks,
                es."exam_startTime_ts",
                e.id AS "exam_id",
                e.exam_name_txt,
                u.id AS "setter_id",
                (u.firstname_txt || ' ' || u.lastname_txt) AS "setter_name",
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
            JOIN public."User" u ON es.exam_setter_user_fk_id = u.id
            LEFT JOIN public."SubjectPaper" sp ON sp.subject_fk_id = es.id
            ORDER BY es."exam_startTime_ts" ASC;
            `,
            {
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Assigned review papers fetched successfully.",
            data: papers,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching review papers: " + err.message });
    }
};

export const getQuestionsReviewDetail = async (req, res) => {
    try {
        const { paperId } = req.params;

        // Fetch subject details for this paper
        const [paperDetails] = await sequelize.query(
            `
            SELECT 
                sp.id AS "paper_id",
                sp.status AS "paper_status",
                sp.exam_batch_year,
                es.id AS "subject_id",
                es.subject_name_txt,
                es."exam_startTime_ts",
                e.id AS "exam_id",
                e.exam_name_txt,
                u.id AS "setter_id",
                (u.firstname_txt || ' ' || u.lastname_txt) AS "setter_name"
            FROM public."SubjectPaper" sp
            JOIN public."ExaminationSubject" es ON sp.subject_fk_id = es.id
            JOIN public.examinations e ON es.exam_fk_id = e.id
            JOIN public."User" u ON es.exam_setter_user_fk_id = u.id
            WHERE sp.id = :paperId
            `,
            {
                replacements: { paperId },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!paperDetails) {
            return res.status(404).json({ error: "Subject paper not found." });
        }

        // Verify lockout deadline
        const startTime = new Date(paperDetails.exam_startTime_ts);
        const lockoutDeadline = new Date(startTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        const now = new Date();

        if (now >= lockoutDeadline) {
            return res.status(403).json({
                error: "Forbidden: Question review period has ended and the paper is locked under security protocol.",
                lockoutDeadline,
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
                replacements: { paperId },
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

            // Decrypt paper key
            const paperKeyHex = decrypt(q.encrypted_key, masterKey);
            const paperKey = Buffer.from(paperKeyHex, "hex");

            // Decrypt question details
            const baseQuestion = {
                id: q.id,
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
                    correct_option: Number(decrypt(q.correct_option, paperKey)),
                };
            }

            return baseQuestion;
        });

        res.status(200).json({
            message: "Decrypted question paper fetched for review successfully.",
            data: {
                paper: paperDetails,
                questions: decryptedQuestions,
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching questions for review: " + err.message });
    }
};

export const approveOrDisapproveQuestionPaper = async (req, res) => {
    try {
        const { paperId } = req.params;
        const { action } = req.body; // 'APPROVE' or 'DISAPPROVE'

        if (!action || !["APPROVE", "DISAPPROVE"].includes(action)) {
            return res.status(400).json({ error: "Action must be 'APPROVE' or 'DISAPPROVE'." });
        }

        const nextStatus = action === "APPROVE" ? "APPROVED" : "DISAPPROVED";

        // Check paper existence and lockout deadline
        const paper = await SubjectPaper.findByPk(paperId);
        if (!paper) {
            return res.status(404).json({ error: "Subject paper not found." });
        }

        const subject = await ExaminationSubject.findByPk(paper.subject_fk_id);
        if (!subject) {
            return res.status(404).json({ error: "Associated subject not found." });
        }

        const startTime = new Date(subject.exam_startTime_ts);
        const lockoutDeadline = new Date(startTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        const now = new Date();

        if (now >= lockoutDeadline) {
            return res.status(403).json({
                error: "Forbidden: The 1-week lockout deadline has passed. Decisions are locked.",
                lockoutDeadline,
            });
        }

        await paper.update({ status: nextStatus });

        res.status(200).json({
            message: `Subject paper successfully ${action.toLowerCase()}d.`,
            data: {
                paperId: paper.id,
                status: paper.status,
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Error reviewing subject paper: " + err.message });
    }
};