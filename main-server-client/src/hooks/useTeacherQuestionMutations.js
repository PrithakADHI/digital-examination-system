import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as teacherApi from "../api/teacher.js";
import { teacherKeys } from "../api/queryKeys.js";

export function useCreateTeacherQuestionPaper() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: teacherApi.createTeacherQuestionPaper,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: teacherKeys.assignedQuestionsToWrite() });
      if (variables?.subject_fk_id) {
        qc.invalidateQueries({ queryKey: ["questionPaper", String(variables.subject_fk_id)] });
      }
    },
  });
}
