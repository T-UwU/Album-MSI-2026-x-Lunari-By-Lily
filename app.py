import os
import re

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    jsonify,
    send_from_directory,
    abort,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STICKERS_DIR = os.path.join(BASE_DIR, "MSI_Stickers")

TOTAL_SLOTS = 140

app = Flask(__name__)
app.secret_key = os.environ.get("MSI_SECRET_KEY", "legion-lunari-dev-key")

NAME_RE = re.compile(r"^[A-Za-z]+-(\d+)$")
IMG_EXT = (".png", ".jpg", ".jpeg", ".webp")
SAFE_USER = re.compile(r"^[A-Za-z0-9_.-]{1,40}$")


def sticker_number(filename):
    stem, ext = os.path.splitext(filename)
    if ext.lower() not in IMG_EXT:
        return None
    m = NAME_RE.match(stem)
    if not m:
        return None
    n = int(m.group(1))
    return n if 1 <= n <= TOTAL_SLOTS else None


def build_collection(user):
    """Devuelve qué números tiene la usuaria y la URL de cada figura."""
    user_dir = os.path.join(STICKERS_DIR, user)
    owned = {}
    if os.path.isdir(user_dir):
        for fn in sorted(os.listdir(user_dir)):
            n = sticker_number(fn)
            if n is not None:
                owned[n] = url_for("sticker", user=user, filename=fn)
    return {
        "user": user,
        "owned": owned,
        "ownedCount": len(owned),
        "total": TOTAL_SLOTS,
    }


def current_user():
    return session.get("user")


@app.route("/")
def index():
    if not current_user():
        return redirect(url_for("login"))
    return render_template("album.html", user=current_user())


@app.route("/login")
def login():
    if current_user():
        return redirect(url_for("index"))
    discord_soon = request.args.get("discord") == "1"
    return render_template("login.html", discord_soon=discord_soon)


@app.route("/login/guest", methods=["POST"])
def login_guest():
    """Login de invitada: se elige un nombre y se carga su carpeta de figuras."""
    name = (request.form.get("username") or "").strip() or "lilywaterbug"
    if not SAFE_USER.match(name):
        return redirect(url_for("login"))
    session["user"] = name
    return redirect(url_for("index"))


@app.route("/login/discord")
def login_discord():
    """Stub de Discord OAuth2 (ver README para conectarlo de verdad a futuro)."""
    return redirect(url_for("login", discord=1))


@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))


@app.route("/api/collection")
def api_collection():
    user = current_user()
    if not user:
        return jsonify({"error": "no autenticada"}), 401
    return jsonify(build_collection(user))


@app.route("/stickers/<user>/<path:filename>")
def sticker(user, filename):
    if not SAFE_USER.match(user):
        abort(404)
    directory = os.path.join(STICKERS_DIR, user)
    if not os.path.isdir(directory):
        abort(404)
    return send_from_directory(directory, filename)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
