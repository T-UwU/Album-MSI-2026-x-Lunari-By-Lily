// GET /api/login  ->  redirige al portal de autorización de Discord.
// Pide scope "identify guilds" para poder leer a qué servidores pertenece.
export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const redirectUri = env.DISCORD_REDIRECT_URI || `${url.origin}/api/callback`;
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
    prompt: "consent",
  });
  return Response.redirect(
    `https://discord.com/oauth2/authorize?${params.toString()}`, 302
  );
}
