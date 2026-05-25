import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import passport from "passport";
import streamifier from "streamifier";

import LocalStrategy from "passport-local";
import User from "../models/User.js";
import Token from "../models/Token.js";
import cloudinary from "../cloudinaryConfig.js";
import sequelize from "../database.js";
import { Sequelize } from "sequelize";
import OnboardingInstitution from "../models/OnboardingInstitution.js";

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.SECRET_KEY, { expiresIn: "1d" });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

passport.use(
  new LocalStrategy(
    {
      usernameField: "email", // Keeping request field name as "email"
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ where: { email_txt: email } });
        if (!user) {
          return done(null, false, { message: "User not found." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Controller functions
export const registerUser = async (req, res) => {
  const {
    username,
    email,
    password,
    firstName,
    lastName,
    role,
    phone_num_txt,
    stud_center_fk_id,
    stud_batch_year,
    stud_exam_symbol_no,
    stud_exam_reg_no,
  } = req.body;
  const file = req.file;

  let uploadResult = { secure_url: null, public_id: null };

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    if (file) {
      const streamUpload = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "profile_pictures",
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

      uploadResult = await streamUpload(file.buffer);
    }

    console.log("uploadResult", uploadResult);

    const userExists = await User.findOne({
      where: {
        [Sequelize.Op.or]: [{ username }, { email_txt: email }],
      },
    });

    if (userExists) {
      return res
        .status(400)
        .json({ message: "Username or email already exists." });
    }

    const newUser = await User.create({
      firstname_txt: firstName,
      lastname_txt: lastName,
      role,
      username,
      email_txt: email,
      password: hashedPassword,
      phone_num_txt,
      stud_center_fk_id,
      stud_batch_year,
      stud_exam_symbol_no,
      stud_exam_reg_no,
      profilePicture: uploadResult.secure_url,
      profilePicturePublicId: uploadResult.public_id,
    });

    res
      .status(201)
      .json({ message: `User ${newUser.username} registered successfully.` });
  } catch (err) {
    res.status(500).json({ error: "Error registering user: " + err.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email_txt: email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Generate JWT
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await Token.create({ refreshToken });

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email_txt,
        firstName: user.firstname_txt,
        lastName: user.lastname_txt,
        role: user.role,
        profilePicture: user.profilePicture,
        profilePicturePublicId: user.profilePicturePublicId,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Error logging in: " + err.message });
  }
};

export const profile = async (req, res) => {
  const { id } = req.params;

  try {
    const [user] = await sequelize.query(
      `
      SELECT id, username, email_txt, firstname_txt, lastname_txt, role, phone_num_txt, center_fk_id, stud_batch_year, stud_exam_symbol_no, stud_exam_reg_no, "profilePicture", "profilePicturePublicId"
	    FROM public."User" WHERE id = :userId;
      `,
      {
        type: Sequelize.QueryTypes.SELECT,
        replacements: { userId: id },
      }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({
      message: "User found successfully",
      data: user,
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching user: " + err.message });
  }
};


export const refreshAccessToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Refresh Token is required." });
  }

  try {
    const findRefreshToken = await Token.findOne({
      where: { refreshToken: token },
    });

    if (!findRefreshToken) {
      return res.status(403).json({ error: "Refresh Token not valid." });
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await Token.destroy({ where: { refreshToken: token } }); // Cycling old Refresh Token
    await Token.create({ refreshToken: newRefreshToken });

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error("Error Occurred: ", err.message);
    return res
      .status(500)
      .json({ error: "Error refreshing token: " + err.message });
  }
};

export const submitInstitution = async (req, res) => {
  const { full_name_txt, institution_email, institution_name, role } = req.body;

  try {
    const institution = await OnboardingInstitution.create({
      full_name_txt,
      institution_email,
      institution_name,
      role,
    });

    return res.status(201).json({
      message: "Institution submitted successfully",
      data: institution,
    });
  } catch (error) {
    console.error("Error submitting institution: ", error.message);
    return res.status(500).json({
      error: "Error submitting institution: " + error.message,
    });
  }
};
