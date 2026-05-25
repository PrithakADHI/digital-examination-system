import crypto from "crypto";
import bcrypt from "bcrypt";
import ExaminationCenter from "../models/ExaminationCenter.js";
import { encrypt } from "../utils/encryption.js";

/**
 * Registers an examination center with a secret key
 * @param {express.Request} req 
 * @param {express.Response} res 
 */
export const registerExamCenter = async (req, res) => {
    const { exam_center_id, provision_key } = req.body;

    if (!exam_center_id || !provision_key) {
        return res.status(400).json({ error: "exam_center_id and provision_key are required" });
    }

    try {
        const center = await ExaminationCenter.findOne({ where: { exam_center_id } });

        if (!center) {
            return res.status(404).json({ error: "Examination center not found" });
        }

        if (center.secret_key_hash) {
            return res.status(400).json({ error: "Examination center already registered" });
        }

        const isMatch = await bcrypt.compare(provision_key, center.provision_key_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid provision key" });
        }

        const secret_key = crypto.randomBytes(32).toString("hex");
        const secret_key_hash = encrypt(secret_key); // Use encryption as agreed

        await center.update({
            secret_key_hash, // Named as hash in model but stores encrypted value
        });

        res.status(200).json({
            message: "Examination center registered successfully",
            secret_key,
        });
    } catch (err) {
        res.status(500).json({ error: "Error registering center: " + err.message });
    }
};
