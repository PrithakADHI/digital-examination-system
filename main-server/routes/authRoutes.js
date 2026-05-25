import express from "express";
import {
  loginUser,
  registerUser,
  refreshAccessToken,
  profile,
  submitInstitution,
  completeTemporaryPassword,
} from "../controllers/authController.js";
import multer from "multer";
import { validateRequest } from "../middlewares/validate.js";
import { userValidationRules } from "../validationRules.js";

const authRouter = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

authRouter.post(
  "/register",
  upload.single("profilePicture"),
  userValidationRules.registerUser,
  registerUser
);
authRouter.post(
  "/login",
  userValidationRules.loginUser,
  validateRequest,
  loginUser
);
authRouter.post(
  "/token",
  userValidationRules.refreshAccessToken,
  validateRequest,
  refreshAccessToken
);
authRouter.post(
  "/complete-temporary-password",
  userValidationRules.completeTemporaryPassword,
  validateRequest,
  completeTemporaryPassword
);

authRouter.get("/profile/:id", userValidationRules.profile, profile);

authRouter.post("/submitInstitution", submitInstitution);

export default authRouter;
