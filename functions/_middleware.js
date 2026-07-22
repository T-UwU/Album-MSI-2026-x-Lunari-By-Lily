// Middleware raíz: protege el álbum y sus recursos. Solo pasan quienes tengan una
// sesión válida (creada tras verificar la membresía del servidor en /api/callback).
// Todo lo demás (login, css/js/img, /api/*) queda abierto.
import { verifySession, getCookie, COOKIE_NAME } from "./_lib/session.js";

function isProtected(pathname) {
  // La portada del álbum la usa la pantalla de login, así que se deja pública.
  if (pathname === "/album/pages/page_00.jpg") return false;
  return (
    pathname === "/album.html" ||
    pathname.startsWith("/album/") ||   // páginas, slots.json, collection.json
    pathname.startsWith("/figures/")    // las figuras
  );
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!isProtected(url.pathname)) return next();

  const session = await verifySession(env.SESSION_SECRET, getCookie(request, COOKIE_NAME));
  if (session) return next();

  // Sin sesión válida: la página redirige al login; los recursos dan 401.
  if (url.pathname === "/album.html") {
    return Response.redirect(`${url.origin}/?need_login=1`, 302);
  }
  return new Response("No autorizado — inicia sesión con Discord.", { status: 401 });
}
