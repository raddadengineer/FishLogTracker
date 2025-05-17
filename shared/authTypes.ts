import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const updateProfileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  email: z.string().email("Please enter a valid email address").optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  bio: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  // If any password field is provided, all must be provided
  if (data.currentPassword || data.newPassword || data.confirmNewPassword) {
    return !!data.currentPassword && !!data.newPassword && !!data.confirmNewPassword;
  }
  return true;
}, {
  message: "All password fields must be provided to change password",
  path: ["currentPassword"],
}).refine(data => {
  if (data.newPassword && data.confirmNewPassword) {
    return data.newPassword === data.confirmNewPassword;
  }
  return true;
}, {
  message: "New passwords do not match",
  path: ["confirmNewPassword"],
});

// Types
export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;