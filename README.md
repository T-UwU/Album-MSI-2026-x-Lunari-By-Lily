# Álbum MSI 2026 · Legión Lunari × Lunari By Lily

Álbum de stickers digital e interactivo para la comunidad de **Legión Lunari**, con temática del **MSI 2026**. 

![resumen](static/album/pages/page_00.jpg)

## Estructura del proyecto

```
dist/                     Sitio estático 
├── index.html            Pantalla de login
├── album.html            Álbum (protegido)
├── css/style.css         
├── js/
│   ├── album.js          Lógica del álbum
│   ├── embers.js         Fondo animado
│   └── vendor/           page-flip
├── pack/                 Apertura de sobres
├── img/                  Logos e imágenes
├── figures/lilywaterbug/    
└── album/
    ├── pages/            Páginas del álbum
    ├── slots.json        Posición de los huecos de los stickers por página
    └── collection.json   

functions/                Cloudflare Pages Functions
├── _middleware.js        
├── _lib/session.js       
└── api/
    ├── login.js          
    ├── callback.js       
    └── logout.js         
```

## Cómo funciona el acceso

La persona pulsa Continuar con Discord que ejecuta `/api/login` y la envía al portal de OAuth de Discord (scopes `identify` y `guilds`), después Discord vuelve a `/api/callback`, que intercambia el código por un token y consulta a qué servidores pertenece, y si está en el servidor de **Legión Lunari**, se crea una cookie de sesión firmada (HMAC-SHA256) válida por 7 días y se abre el álbum, si no, se muestra un aviso de acceso denegado. El `_middleware.js` verifica esa cookie en cada carga de `/album.html`, las páginas y los stickers.

## Backend

La carpeta `functions/` son*Cloudflare Pages Functions. Cada archivo bajo `functions/api/` se convierte en una ruta (`/api/...`).

| Archivo / Ruta | Qué hace |
| --- | --- |
| `_middleware.js` | Se ejecuta antes de servir cualquier recurso. Bloquea lo protegido (`/album.html`, `/album/*` y `/figures/*`) y deja muestra lo público (login, `css`/`js`/`img`, `/api/*` y la portada `page_00.jpg`). Con sesión válida deja pasar (`next()`); sin ella redirige `/album.html` al login (`?need_login=1`) y responde `401` a los recursos. |
| `_lib/session.js` | La sesión vive dentro de una cookie firmada, ya que los Workers no guardan estado. `createSession` codifica los datos + expiración (`exp`) en base64url y los firma con HMAC-SHA256 usando `SESSION_SECRET`; `verifySession` recalcula la firma y la compara en tiempo constante, rechazando cookies alteradas o expiradas. Expone también `getCookie` y `COOKIE_NAME` (`lunari_session`). Como `SESSION_SECRET` solo lo conoce el servidor, nadie puede fabricar una cookie válida. |
| `api/login.js` / `GET /api/login` | Redirige al portal de autorización de Discord (`response_type=code`) pidiendo los scopes `identify` y `guilds`. |
| `api/callback.js` / `GET /api/callback?code=...` | Verificación de Discord: Cambia el `code` por un token, consulta `/users/@me/guilds` y comprueba la membresía del servidor de Legión Lunari, si no es miembro redirige a `/?denied=1`, si lo es, lee su identidad (`/users/@me`), crea la cookie de sesión (7 días, `HttpOnly; Secure; SameSite=Lax`) y abre `/album.html`. Cualquier fallo redirige al login con `?error=...`. |
| `api/logout.js` / `GET /api/logout` | Borra la cookie de sesión (`Max-Age=0`) y devuelve a la pantalla de login. |

## Cómo funcionan las animaciones

Todas las animaciones son CSS + JavaScript puro.

### Libro 3D del login (`index.html`)

El álbum de la portada es un `<div>` con `transform-style: preserve-3d` y varias caras (frente, lomo, cantos) posicionadas en 3D. Un script escucha el movimiento del puntero y calcula la distancia del cursor al centro de la escena para ajustar `rotateY` y `rotateX` del libro en tiempo real, con topes (clamps) para que no gire de más. La rotación de reposo es `rotateY(-20deg) rotateX(6deg)`. En móvil se controla con `touchmove`, y un toque, sin arrastrar, equivale a pulsar el botón de login.

### Fondo animado (`js/embers.js`)

Un `<canvas>` a pantalla completa dibuja aprox 90 partículas con `requestAnimationFrame`. Cada partícula sube lentamente, se desplaza en horizontal (drift) y parpadea con una onda senoidal (`Math.sin`) para simular el titileo de una brasa. Los colores alternan entre dorado y rojo, y cada partícula usa `shadowBlur` para el resplandor. Al llegar arriba, la partícula se recicla abajo. Si el usuario tiene el movimiento reducido activado, el efecto no se ejecuta.

### Pasar páginas (`js/album.js` + `js/vendor/page-flip`)

El álbum usa la librería page-flip para el efecto de pasar hojas como una revista real. Además de la navegación normal, al saltar a una sección lejana desde las pestañas se hace un encadenado de volteos, se reduce dinámicamente el tiempo de cada flip según la distancia, usando `TURN_TIME` entre 110 y 300 ms, para que el salto se sienta rápido pero sin cortar la animación, y luego se restaura el tiempo normal.

### Carta holográfica (`js/album.js`, `holoCard`)

Al abrir una figurita en grande, la carta reacciona al puntero con un efecto de inclinación 3D:

- Se calcula la posición relativa del cursor sobre la carta (`px`, `py`) y se aplica `perspective(900px) rotateX() rotateY() scale(1.02)`, inclinándola hacia donde apunta el ratón.
- Una capa shine mueve su `background-position` según el cursor para simular el reflejo holográfico que "viaja" por la carta. Una capa glare actualiza sus variables CSS `--gx`/`--gy` para colocar el brillo especular justo bajo el puntero. El color de acento (`--lb-accent`) cambia según la rareza de la figurita.
- Al salir el puntero (`pointerleave`), la carta vuelve suavemente a su posición plana. En móvil funciona con `touchmove`.

### Apertura de sobres (`pack/pack.js`)

Es la animación más compleja del proyecto (en teoría). Se lanza con `PackOpening.open(cards)`, que crea un overlay a pantalla completa y devuelve una `Promise` que se resuelve al cerrarlo. Todo se dibuja con DOM + un `<canvas>` de partículas y no usa ninguna librería.

> Antes de empezar, los stickers se ordenan por rareza ascendente (`RANK`) para que la mejor carta se revele al final como un booster pack real.

**Fases de la animación:**

| # | Fase | Qué ocurre |
| --- | --- | --- |
| 1 | **Sobre** | Aparece un sobre (_booster_) construido en 3D con varias capas (`b-glow`, cantos `b-edge`, tira `b-strip`, cuerpo con portada y foil). Flota y se inclina siguiendo el cursor con `tiltFromPoint`, que convierte la posición del puntero en `rotateX`/`rotateY` (hasta ±26° / ±34°). Funciona con ratón (`pointermove`) y en móvil (`touchmove`). |
| 2 | **Rasgar** | Al tocar el sobre se aplican las clases `tearing` → `open`, y tras el gesto salta un estallido de aprox 55 chispas doradas y rojas desde la parte superior. Luego entra la fase `phase-cards`. |
| 3 | **Revelado** | Cada toque llama a `advance()` donde la carta actual hace un _flip_ (`flipped`) mostrando el arte, y 300 ms después dispara un `burst` de partículas cuya cantidad depende de la rareza (`BURST`: 26 especial · 32 rara · 46 épica · 72 legendaria), con el color de acento de esa rareza + dorado. Al mismo tiempo se muestra el meta (`FICHA NN` + rareza) y se enciende un punto de progreso (`pp-dot`). |
| 4 | **Bandeja** | Cada carta ya revelada se encoge (`scale(0.34)`) y se coloca en una fila centrada en la parte de abajo (`tray`/`trayX`), dejando sitio a la siguiente. |
| 5 | **Cierre** | Cuando se revelan todas, `finish()` muestra el resumen ("N stickers nuevas se añadieron a tu álbum") y lanza `confetti(130)`. Se cierra con la x, la tecla **Escape** o el botón "Verlas en el álbum" (`cleanup`, que resuelve la `Promise`). |


**Cartas holográficas dentro del sobre.** Mientras una ficha está enfocada, también se inclina con el cursor y mueve un _glare_ especular con las variables CSS `--gx`/`--gy`, igual que la carta holográfica del álbum.

**Motor de partículas (`createFX`).** Un `<canvas>` con `requestAnimationFrame` gestiona dos tipos de partícula:

- **`spark`** : salen en un ángulo aleatorio con velocidad radial, tienen gravedad (`vy += 0.14`), se desvanecen según `life`/`decay` y brillan con `shadowBlur`.
- **`confetti`**: rectángulos que caen desde arriba girando sobre sí mismos.

Las partículas muertas se filtran cada frame, y `stop()` detiene el bucle y limpia los listeners al cerrar.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `DISCORD_CLIENT_ID` | ID de la aplicación de Discord |
| `DISCORD_CLIENT_SECRET` | Secreto de la aplicación de Discord |
| `DISCORD_REDIRECT_URI` | (Opcional) URL de callback; por defecto `<origin>/api/callback` |
| `LUNARI_GUILD_ID` | (Opcional) ID del servidor de Legión Lunari a validar |
| `SESSION_SECRET` | Clave para firmar la cookie de sesión (mantener secreta) |
