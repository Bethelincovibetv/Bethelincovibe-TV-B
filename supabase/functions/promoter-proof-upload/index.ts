import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HUB_URL = Deno.env.get("SUPABASE_URL")!;
const HUB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TV_URL = Deno.env.get("TV_SUPABASE_URL") || "https://gndcgttnpxsjufmehgyi.supabase.co";
const TV_ANON_KEY = Deno.env.get("TV_SUPABASE_ANON_KEY") || "";
const db = createClient(HUB_URL, HUB_SERVICE_KEY);
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: cors});
const fail = (message: string, status = 400, code?: string) => json({success:false,error:{message,...(code ? {code}: {})}}, status);
const uuid = (v: unknown) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

async function authenticate(req: Request) {
  const header = req.headers.get("Authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token || !TV_ANON_KEY) return null;
  const response = await fetch(`${TV_URL}/auth/v1/user`, {headers:{apikey:TV_ANON_KEY,Authorization:`Bearer ${token}`}});
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id && uuid(user.id) ? user : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  if (req.method !== "POST") return fail("Method not allowed", 405);
  try {
    const user = await authenticate(req);
    if (!user) return fail("Your session is invalid or expired", 401, "INVALID_SESSION");
    const form = await req.formData();
    const file = form.get("file");
    const promoterId = String(form.get("promoter_id") || "");
    if (!(file instanceof File)) return fail("Audience proof image is required", 422, "FILE_REQUIRED");
    if (!uuid(promoterId)) return fail("Invalid promoter id", 422, "VALIDATION_ERROR");
    const {data: promoter, error: promoterError} = await db.from("promoters").select("id,external_user_id").eq("id", promoterId).maybeSingle();
    if (promoterError) return fail(promoterError.message, 500, "DB_ERROR");
    if (!promoter) return fail("Promoter profile not found", 404, "NOT_FOUND");
    if (promoter.external_user_id !== user.id) return fail("Not authorized", 403, "FORBIDDEN");
    const allowed = new Set(["image/jpeg","image/png","image/webp","image/gif"]);
    if (!allowed.has(file.type)) return fail("Invalid image format. Supported formats: JPG, PNG, WEBP, GIF.", 422, "INVALID_FILE_TYPE");
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) return fail("Screenshot image size must be between 1 byte and 10MB.", 422, "INVALID_FILE_SIZE");
    const extension = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${promoterId}/${crypto.randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const {error: uploadError} = await db.storage.from("promoter-proofs").upload(path, bytes, {contentType:file.type, upsert:false});
    if (uploadError) return fail(`Failed to upload audience proof: ${uploadError.message}`, 500, "UPLOAD_FAILED");
    const {data:urlData} = db.storage.from("promoter-proofs").getPublicUrl(path);
    return json({success:true,data:{url:urlData.publicUrl,path,bucket:"promoter-proofs"}}, 201);
  } catch (error) {
    console.error("Proof upload error", error);
    return fail(error instanceof Error ? error.message : "Failed to upload audience proof", 500, "UPLOAD_FAILED");
  }
});
