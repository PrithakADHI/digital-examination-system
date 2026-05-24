import sequelize from "../database.js";
import { Sequelize } from "sequelize";

/**
 * GET getStudentProfile
 * Fetches the logged-in student's academic credentials and their assigned exam center.
 */
export const getStudentProfile = async (req, res) => {
    try {
        const studentId = req.user.id;

        const [profile] = await sequelize.query(
            `
            SELECT 
                u.id, 
                u.firstname_txt, 
                u.lastname_txt, 
                u.email_txt, 
                u.phone_num_txt, 
                u.stud_batch_year, 
                u.stud_exam_symbol_no, 
                u.stud_exam_reg_no,
                u."profilePicture",
                ec.center_name_txt,
                ec.exam_center_id
            FROM public."User" u
            LEFT JOIN public."ExaminationCenter" ec ON u.center_fk_id = ec.id
            WHERE u.id = :studentId AND u.role = 'STUDENT';
            `,
            {
                replacements: { studentId },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!profile) {
            return res.status(404).json({ error: "Student profile not found." });
        }

        res.status(200).json({
            message: "Student profile fetched successfully",
            data: profile,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching profile: " + err.message });
    }
};

/**
 * GET getStudentExamSummary
 * Fetches statistics counts of registered, ongoing, completed, and total exams.
 */
export const getStudentExamSummary = async (req, res) => {
    try {
        const studentId = req.user.id;

        const [summary] = await sequelize.query(
            `
            WITH StudentExams AS (
                SELECT 
                    e.id,
                    COALESCE(es.status, 'REGISTERED') AS status
                FROM public.examinations e
                JOIN public."User" u ON u.id = :studentId
                LEFT JOIN public."ExamStudent" es ON es.exam_fk_id = e.id AND es.student_fk_id = :studentId
                WHERE u.center_fk_id IS NOT NULL
                  AND u.center_fk_id::text IN (
                      SELECT jsonb_array_elements_text(e.center_fk_list)
                  )
            )
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS finished,
                COUNT(*) FILTER (WHERE status = 'STARTED') AS ongoing,
                COUNT(*) FILTER (WHERE status = 'REGISTERED') AS upcoming
            FROM StudentExams;
            `,
            {
                replacements: { studentId },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Student exam summary fetched successfully",
            data: {
                total: parseInt(summary?.total ?? 0, 10),
                finished: parseInt(summary?.finished ?? 0, 10),
                ongoing: parseInt(summary?.ongoing ?? 0, 10),
                upcoming: parseInt(summary?.upcoming ?? 0, 10),
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching exam summary: " + err.message });
    }
};

/**
 * GET getStudentUpcomingExaminations
 * Lists upcoming subject schedules sorted chronologically for this student.
 */
export const getStudentUpcomingExaminations = async (req, res) => {
    try {
        const studentId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit, 10) || 6, 20);
        const now = new Date();

        const rows = await sequelize.query(
            `
            SELECT 
                e.id AS "examId",
                e.exam_name_txt AS "examName",
                esub.id AS "subjectId",
                esub.subject_name_txt AS "subjectName",
                esub."exam_startTime_ts" AS "examStartTime",
                esub.pass_marks AS "passMarks"
            FROM public.examinations e
            JOIN public."ExaminationSubject" esub ON esub.exam_fk_id = e.id
            JOIN public."User" u ON u.id = :studentId
            WHERE u.center_fk_id IS NOT NULL
              AND u.center_fk_id::text IN (
                  SELECT jsonb_array_elements_text(e.center_fk_list)
              )
              AND esub."exam_startTime_ts" > :now
            ORDER BY esub."exam_startTime_ts" ASC
            LIMIT :limit;
            `,
            {
                replacements: { studentId, now, limit },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Student upcoming examinations fetched successfully",
            data: Array.isArray(rows) ? rows : [],
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching upcoming examinations: " + err.message });
    }
};

/**
 * GET getStudentAverageResultsOverExaminations
 * Retrieves average scores per completed and graded examination to display on the performance line chart.
 */
export const getStudentAverageResultsOverExaminations = async (req, res) => {
    try {
        const studentId = req.user.id;
        const now = new Date();

        const rows = await sequelize.query(
            `
            WITH ExamMarks AS (
                SELECT 
                    e.id AS exam_id,
                    e.exam_name_txt,
                    MIN(esub."exam_startTime_ts") AS exam_startTime,
                    SUM(COALESCE(sfm.total_subject_full_marks, 0)) AS total_full_marks,
                    SUM(COALESCE(sm.marks_obtained, 0)) AS total_marks_obtained
                FROM public.examinations e
                JOIN public."ExamStudent" est ON e.id = est.exam_fk_id AND est.student_fk_id = :studentId
                JOIN public."ExaminationSubject" esub ON e.id = esub.exam_fk_id
                LEFT JOIN (
                    SELECT 
                        subject_fk_id,
                        SUM(marks_obtained) AS marks_obtained
                    FROM public."StudentAnswerMarks"
                    WHERE stud_user_fk_id = :studentId
                    GROUP BY subject_fk_id
                ) sm ON esub.id = sm.subject_fk_id
                LEFT JOIN (
                    SELECT 
                        sp.subject_fk_id,
                        SUM(pq.full_marks) AS total_subject_full_marks
                    FROM public."SubjectPaper" sp
                    JOIN public."PaperQuestion" pq ON sp.id = pq.paper_fk_id
                    GROUP BY sp.subject_fk_id
                ) sfm ON esub.id = sfm.subject_fk_id
                WHERE est.status = 'SUBMITTED'
                  AND e.result_time_ts IS NOT NULL
                  AND e.result_time_ts <= :now
                GROUP BY e.id
            )
            SELECT 
                exam_id,
                exam_name_txt AS "examName",
                DATE(exam_startTime) AS date,
                CASE 
                    WHEN total_full_marks > 0 THEN ROUND((total_marks_obtained * 100.0 / total_full_marks)::numeric, 2)
                    ELSE 0
                END AS "scorePercentage"
            FROM ExamMarks
            ORDER BY exam_startTime ASC;
            `,
            {
                replacements: { studentId, now },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        const data = (Array.isArray(rows) ? rows : []).map((r) => ({
            date: r.date ? (r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10)) : "",
            averageScore: Number(r.scorePercentage) || 0,
            examName: r.examName,
        }));

        res.status(200).json({
            message: "Student results trend fetched successfully",
            data,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching results trend: " + err.message });
    }
};

export const getAllExaminations = async (req, res) => {
    try {
        const studentId = req.user.id;

        const examinations = await sequelize.query(
            `
            SELECT 
                e.id,
                e.exam_name_txt,
                MIN(esub."exam_startTime_ts") AS exam_startTime_ts,
                e.result_time_ts,
                COALESCE(es.status, 'REGISTERED') AS status
            FROM public.examinations e
            JOIN public."User" u ON u.id = :studentId
            LEFT JOIN public."ExaminationSubject" esub ON esub.exam_fk_id = e.id
            LEFT JOIN public."ExamStudent" es ON es.exam_fk_id = e.id AND es.student_fk_id = :studentId
            WHERE u.center_fk_id IS NOT NULL
              AND u.center_fk_id::text IN (
                  SELECT jsonb_array_elements_text(e.center_fk_list)
              )
            GROUP BY e.id, es.status;
            `,
            {
                replacements: { studentId },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        res.status(200).json({
            message: "Student examinations fetched successfully",
            data: examinations,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching examinations: " + err.message });
    }
};

/**
 * GET getExaminationById
 * Get this specific examination with the current user's all details.
 * Marks and feedbacks are only returned if result_time_ts has passed.
 */
export const getExaminationById = async (req, res) => {
    try {
        const studentId = req.user.id;
        const examId = req.params.id;
        const now = new Date();

        const [result] = await sequelize.query(
            `
            WITH SubjectMarks AS (
                SELECT 
                    subject_fk_id,
                    stud_user_fk_id,
                    SUM(marks_obtained) AS marks_obtained,
                    string_agg(feedback, ' | ') AS combined_feedback
                FROM public."StudentAnswerMarks"
                WHERE stud_user_fk_id = :studentId
                GROUP BY subject_fk_id, stud_user_fk_id
            ),
            SubjectFullMarks AS (
                SELECT 
                    sp.subject_fk_id,
                    SUM(pq.full_marks) AS total_subject_full_marks
                FROM public."SubjectPaper" sp
                JOIN public."PaperQuestion" pq ON sp.id = pq.paper_fk_id
                GROUP BY sp.subject_fk_id
            )
            SELECT 
                e.id AS exam_id,
                e.exam_name_txt,
                MIN(es."exam_startTime_ts") AS exam_startTime_ts,
                e.result_time_ts,
                json_agg(
                    json_build_object(
                        'subject_id', es.id,
                        'subject_name_txt', es.subject_name_txt,
                        'exam_startTime_ts', es."exam_startTime_ts",
                        'full_marks', COALESCE(sfm.total_subject_full_marks, 0),
                        'pass_marks', es.pass_marks,
                        'marks_obtained', CASE 
                            WHEN e.result_time_ts IS NULL OR e.result_time_ts > :now THEN NULL
                            ELSE COALESCE(sm.marks_obtained, 0)
                        END,
                        'feedback', CASE 
                            WHEN e.result_time_ts IS NULL OR e.result_time_ts > :now THEN NULL
                            ELSE sm.combined_feedback
                        END,
                        'status', CASE 
                            WHEN e.result_time_ts IS NULL OR e.result_time_ts > :now THEN 'PENDING'
                            WHEN sm.marks_obtained IS NULL THEN 'PENDING'
                            WHEN sm.marks_obtained >= es.pass_marks THEN 'PASS' 
                            ELSE 'FAIL' 
                        END
                    )
                ) AS subjects,
                CASE 
                    WHEN e.result_time_ts IS NULL OR e.result_time_ts > :now THEN NULL
                    ELSE SUM(COALESCE(sm.marks_obtained, 0))
                END AS total_marks_obtained,
                SUM(COALESCE(sfm.total_subject_full_marks, 0)) AS total_full_marks
            FROM public.examinations e
            JOIN public."ExaminationSubject" es ON e.id = es.exam_fk_id
            JOIN public."ExamStudent" est ON e.id = est.exam_fk_id AND est.student_fk_id = :studentId
            LEFT JOIN SubjectMarks sm ON es.id = sm.subject_fk_id
            LEFT JOIN SubjectFullMarks sfm ON es.id = sfm.subject_fk_id
            WHERE e.id = :examId
            GROUP BY e.id;
            `,
            {
                replacements: { studentId, examId, now },
                type: Sequelize.QueryTypes.SELECT,
            }
        );

        if (!result) {
            return res.status(404).json({ error: "Examination not found or you have not attended it." });
        }

        res.status(200).json({
            message: "Examination details fetched successfully",
            data: result,
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching examination details: " + err.message });
    }
};
