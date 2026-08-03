import express from "express";
import {
  loginUser,
  registerUser,
  refreshAccessToken,
  profile
} from "../controllers/authController.js";
import { saveProvisionKey, registerWithMainServer, getRegistrationStatus } from "../controllers/registrationController.js";
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
  validateRequest,
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

authRouter.get("/profile/:id", userValidationRules.profile, profile);

// Proxy Registration Routes
authRouter.get("/registration-status", getRegistrationStatus);
authRouter.post("/save-provision-key", saveProvisionKey);
authRouter.post("/register-with-main", registerWithMainServer);

export default authRouter;
