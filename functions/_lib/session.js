// Sesión sin estado para Cloudflare Pages Functions: una cookie firmada con
// HMAC-SHA256 (los Workers no guardan estado, así que la firma es la seguridad).

const enc = new TextEncoder();

function bytesToB64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToB64url(new Uint8Array(sig));
}

// Crea el valor de cookie: base64url(payload).firma
export async function createSession(secret, payload, maxAgeSec) {
  const data = { ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSec };
  const body = bytesToB64url(enc.encode(JSON.stringify(data)));
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

// Verifica firma y expiración; devuelve el payload o null.
export async function verifySession(secret, value) {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = await hmac(secret, body);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  let data;
  try { data = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))); }
  catch { return null; }
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

export function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const m = header.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export const COOKIE_NAME = "lunari_session";
