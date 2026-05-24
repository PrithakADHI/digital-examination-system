import sequelize from "../database.js";
import { DataTypes } from "sequelize";

const PaperQuestion = sequelize.define(
  "PaperQuestion",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    paper_fk_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    question_txt: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    question_type: {
      type: DataTypes.ENUM("LONG", "SHORT", "MCQ"),
      allowNull: false,
    },
    option1: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    option2: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    option3: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    option4: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    correct_option: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    full_marks: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    image_url: {
      type: DataTypes.TEXT("long"),
      allowNull: true
    }
  },
  {
    tableName: "PaperQuestion",
    timestamps: true,
    createdAt: "createdAt_ts",
    updatedAt: "updatedAt_ts",
  }
);

export default PaperQuestion;
