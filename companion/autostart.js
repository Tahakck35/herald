// Windows'ta oturum acilisinda otomatik baslatma.
// HKCU altindaki Run anahtarini kullanir, yonetici izni gerekmez.

const { execFile } = require("child_process");

const KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const VALUE = "Herald";

const supported = process.platform === "win32" && !!process.pkg;

function reg(args) {
  return new Promise((resolve) => {
    execFile("reg", args, { windowsHide: true }, (err, stdout) => {
      resolve({ ok: !err, out: stdout || "" });
    });
  });
}

async function isEnabled() {
  if (!supported) return false;

  const { ok, out } = await reg(["query", KEY, "/v", VALUE]);
  if (!ok) return false;

  return out.toLowerCase().includes(process.execPath.toLowerCase());
}

async function enable() {
  if (!supported) return false;

  // tirnak icinde tam yol, bosluklu klasorlerde de calisir
  const { ok } = await reg([
    "add", KEY, "/v", VALUE, "/t", "REG_SZ", "/d", `"${process.execPath}"`, "/f"
  ]);

  return ok;
}

async function disable() {
  if (!supported) return false;

  const { ok } = await reg(["delete", KEY, "/v", VALUE, "/f"]);
  return ok;
}

async function toggle() {
  const on = await isEnabled();

  if (on) {
    await disable();
    return false;
  }

  await enable();
  return true;
}

module.exports = { supported, isEnabled, enable, disable, toggle };
