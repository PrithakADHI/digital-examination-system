import { body, param } from "express-validator";

export const userValidationRules = {
  registerUser: [
    body("email").isEmail().withMessage("A valid email is required."),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long."),
    body("firstname_txt").notEmpty().withMessage("First name is required."),
    body("lastname_txt").notEmpty().withMessage("Last name is required."),
    body("role").isIn(["ADMIN", "TEACHER", "STUDENT"]).withMessage("Role is required."),  
    body("username").notEmpty().withMessage("Username is required."),
    body("phone_num_txt").notEmpty().withMessage("Phone number is required."),
    body("stud_center_fk_id").if(body("role").equals("STUDENT")).notEmpty().withMessage("Student center is required."),
    body("stud_batch_year").if(body("role").equals("STUDENT")).notEmpty().withMessage("Student batch year is required."),
    body("stud_exam_symbol_no").if(body("role").equals("STUDENT")).notEmpty().withMessage("Student exam symbol no is required."),
    body("stud_exam_reg_no").if(body("role").equals("STUDENT")).notEmpty().withMessage("Student exam reg no is required."),
  ],
  loginUser: [
    body("email").isEmail().withMessage("A valid email is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  refreshAccessToken: [
    body("token").notEmpty().withMessage("Refresh Token is required."),
  ],
  completeTemporaryPassword: [
    body("email").isEmail().withMessage("A valid email is required."),
    body("currentPassword").notEmpty().withMessage("Current password is required."),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long."),
  ],
  profile: [
    param("id").notEmpty().withMessage("User ID is required."),
  ]
};
