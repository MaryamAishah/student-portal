"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import type { ActionResult } from "@/lib/actions/auth-actions";

export async function createCourseAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("admin");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    return { error: "Course name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("courses").insert({
    name,
    description: description || null,
    created_by: profile.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/courses");
  return { error: null };
}

export async function addLessonAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("admin");
  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!courseId || !title) {
    return { error: "Lesson title is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("lessons").insert({
    course_id: courseId,
    title,
    description: description || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null };
}

export async function updateLessonAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("admin");
  const lessonId = String(formData.get("lessonId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!lessonId || !title) {
    return { error: "Lesson title is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .update({ title, description: description || null })
    .eq("id", lessonId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null };
}

export async function deleteLessonAction(lessonId: string, courseId: string) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase.from("lessons").delete().eq("id", lessonId);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function assignTeacherAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("admin");
  const courseId = String(formData.get("courseId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");

  if (!courseId || !teacherId) {
    return { error: "Select a teacher." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("course_teachers")
    .insert({ course_id: courseId, teacher_id: teacherId });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null };
}

export async function removeTeacherAction(courseId: string, teacherId: string) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase
    .from("course_teachers")
    .delete()
    .eq("course_id", courseId)
    .eq("teacher_id", teacherId);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function enrollStudentAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("admin");
  const courseId = String(formData.get("courseId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  if (!courseId || !studentId) {
    return { error: "Select a student." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .insert({ course_id: courseId, student_id: studentId });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return { error: null };
}

export async function removeEnrollmentAction(courseId: string, studentId: string) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase
    .from("enrollments")
    .delete()
    .eq("course_id", courseId)
    .eq("student_id", studentId);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteCourseAction(courseId: string) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase.from("courses").delete().eq("id", courseId);
  redirect("/admin/courses");
}
