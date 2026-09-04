import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resilient Chat Media & Voice Note Upload Service
 * Prioritizes Firebase Storage with automatic fallback to Supabase Storage
 * and safe DataURL encoding for lightweight payloads.
 */
export async function uploadChatAttachment(
  fileOrBlob: Blob | File,
  folder: "images" | "videos" | "voice_notes" | "files" = "files",
  customFileName?: string
): Promise<string> {
  const extension =
    customFileName?.split(".").pop() ||
    (fileOrBlob.type.includes("image")
      ? "jpg"
      : fileOrBlob.type.includes("video")
      ? "mp4"
      : fileOrBlob.type.includes("audio")
      ? "webm"
      : "bin");

  const fileName = customFileName || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
  const storagePath = `chat_uploads/${folder}/${fileName}`;

  // 1. Attempt Firebase Storage upload
  try {
    const storage = getStorage(app);
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, fileOrBlob, {
      contentType: fileOrBlob.type || undefined,
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    if (downloadUrl) return downloadUrl;
  } catch (firebaseErr) {
    console.warn("Firebase Storage upload fallback triggered:", firebaseErr);
  }

  // 2. Attempt Supabase Storage fallback
  try {
    const { data: supaData, error: supaErr } = await supabase.storage
      .from("chat_attachments")
      .upload(storagePath, fileOrBlob, {
        upsert: true,
        contentType: fileOrBlob.type || undefined,
      });

    if (!supaErr && supaData?.path) {
      const { data: publicUrlData } = supabase.storage
        .from("chat_attachments")
        .getPublicUrl(supaData.path);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (supaErr) {
    console.warn("Supabase Storage fallback failed:", supaErr);
  }

  // 3. Fallback for lightweight attachments (under 900KB) to Data URL so operations never block
  return new Promise<string>((resolve, reject) => {
    if (fileOrBlob.size > 1024 * 1024) {
      reject(new Error("Storage upload failed and file exceeds 1MB fallback limit."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(fileOrBlob);
  });
}
