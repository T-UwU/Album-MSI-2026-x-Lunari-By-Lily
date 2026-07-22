// GET /api/callback?code=...  ->  vuelta desde Discord.
// Intercambia el code por token, comprueba que la persona esté en el servidor de
// Legión Lunari, y si lo está crea la cookie de sesión y abre el álbum.
import { createSession, COOKIE_NAME } from "../_lib/session.js";

const LUNARI_GUILD_DEFAULT = "1265737550753169448";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

function redirect(origin, path, extraHeaders) {
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}${path}`, ...(extraHeaders || {}) },
  });
}

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  if (!code) return redirect(origin, "/?error=nocode");

  const redirectUri = env.DISCORD_REDIRECT_URI || `${origin}/api/callback`;

  // 1) code -> token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) return redirect(origin, "/?error=token");
  const token = await tokenRes.json();
  const auth = { Authorization: `Bearer ${token.access_token}` };

  // 2) ¿está en el servidor de Legión Lunari?
  const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", { headers: auth });
  if (!guildsRes.ok) return redirect(origin, "/?error=guilds");
  const guilds = await guildsRes.json();
  const guildId = env.LUNARI_GUILD_ID || LUNARI_GUILD_DEFAULT;
  const isMember = Array.isArray(guilds) && guilds.some((g) => g.id === guildId);
  if (!isMember) return redirect(origin, "/?denied=1");

  // 3) quién es
  const meRes = await fetch("https://discord.com/api/users/@me", { headers: auth });
  const me = meRes.ok ? await meRes.json() : { id: "member", username: "member" };

  // 4) cookie de sesión firmada y al álbum
  const value = await createSession(env.SESSION_SECRET, { id: me.id, name: me.username }, SESSION_MAX_AGE);
  const cookie = `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
  return redirect(origin, "/album.html", { "Set-Cookie": cookie });
}
