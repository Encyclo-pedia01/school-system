import { z } from "zod";

const uuid = z.string().uuid();
const score = z.coerce.number().finite().min(0, "Score cannot be below 0").max(100, "Score cannot exceed 100");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const resultSubmissionSchema = z.object({
  studentId: uuid,
  classId: uuid,
  termId: uuid,
  subject: z.string().trim().min(1, "Subject is required").max(120),
  assessmentScores: z.array(z.object({
    assessmentId: uuid,
    score: z.coerce.number().finite().min(0, "Score cannot be below 0").max(100, "Score cannot exceed 100"),
  })).min(1, "Enter at least one assessment score"),
  examScore: score,
});

export const gradingKeySchema = z.object({
  termId: uuid,
  classId: uuid.nullable().optional(),
  subject: z.string().trim().min(1, "Subject is required").max(120),
  continuousAssessmentWeight: z.coerce.number().finite().min(0).max(100),
  examWeight: z.coerce.number().finite().min(0).max(100),
  gradeBands: z.array(z.object({
    minimum: z.coerce.number().finite().min(0).max(100),
    label: z.string().trim().min(1).max(16),
  })).min(1),
}).superRefine((value, context) => {
  if (Math.abs(value.continuousAssessmentWeight + value.examWeight - 100) > 0.0001) {
    context.addIssue({
      code: "custom",
      message: "Assessment and exam weights must total 100%.",
      path: ["examWeight"],
    });
  }

  if (!value.gradeBands.some((band) => band.minimum === 0)) {
    context.addIssue({
      code: "custom",
      message: "Add a grade band starting at 0.",
      path: ["gradeBands"],
    });
  }

  if (new Set(value.gradeBands.map((band) => band.minimum)).size !== value.gradeBands.length) {
    context.addIssue({
      code: "custom",
      message: "Each grade band needs a unique minimum score.",
      path: ["gradeBands"],
    });
  }
});

export const staffCheckinSchema = z.object({
  staffId: uuid,
  stationId: uuid.nullable().optional(),
});

export const attendanceRecordSchema = z.object({
  studentId: uuid,
  classId: uuid,
  termId: uuid,
  attendanceDate: z.string().date(),
  status: z.enum(["present", "absent", "late", "excused"]),
});

export const schoolSettingsSchema = z.object({
  schoolStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid 24-hour time."),
  timezone: z.string().trim().min(1).max(80),
});

export const insightStatusSchema = z.object({
  insightId: uuid,
  status: z.enum(["actioned", "dismissed"]),
});

export const institutionSelectionSchema = z.object({
  institutionId: uuid,
});

export type ActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};
