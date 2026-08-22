// AES-GCM helpers for storing seller payment credentials at rest.
const enc = new TextEncoder();
const dec = new TextDecoder();

async function getKey() {
  const raw = Deno.env.get("SELLER_CREDENTIALS_ENC_KEY");
  if (!raw) throw new Error("SELLER_CREDENTIALS_ENC_KEY not configured");
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(raw));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain)));
  const out = new Uint8Array(iv.length + buf.length);
  out.set(iv, 0);
  out.set(buf, iv.length);
  return btoa(String.fromCharCode(...out));
}

export async function decryptSecret(payload: string): Promise<string> {
  const key = await getKey();
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return dec.decode(plain);
}
