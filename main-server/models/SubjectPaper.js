import sequelize from "../database.js";
import { DataTypes } from "sequelize";

const SubjectPaper = sequelize.define(
  "SubjectPaper",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    subject_fk_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    exam_batch_year: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    paper_checkers_list: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    feedback_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "SubjectPaper",
    timestamps: true,
    createdAt: "createdAt_ts",
    updatedAt: "updatedAt_ts",
  }
);

export default SubjectPaper;
