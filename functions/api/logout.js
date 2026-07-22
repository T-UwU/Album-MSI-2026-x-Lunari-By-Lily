// GET /api/logout  ->  borra la cookie de sesión y vuelve al login.
import { COOKIE_NAME } from "../_lib/session.js";

export async function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}/`, "Set-Cookie": cookie },
  });
}
