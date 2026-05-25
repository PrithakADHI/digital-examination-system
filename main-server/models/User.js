import sequelize from "../database.js";
import { DataTypes } from "sequelize";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    firstname_txt: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastname_txt: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("SUPERADMIN", "ADMIN", "TEACHER", "STUDENT"),
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    email_txt: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone_num_txt: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    center_fk_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    stud_batch_year: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    stud_exam_symbol_no: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    stud_exam_reg_no: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    profilePicture: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    profilePicturePublicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: true
    },
    random_pass_assigned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
  },
  {
    tableName: "User",
    timestamps: true,
    createdAt: "createdAt_ts",
    updatedAt: "updatedAt_ts",
  }
);

export default User;