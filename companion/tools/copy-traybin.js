// systray2 yardimci programini exe'nin yanina kopyalar.
// Bu dosyalar exe'nin icine gomulemez, disarida durmalari gerekir.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "node_modules", "systray2", "traybin");
const dest = path.join(root, "dist", "traybin");

if (!fs.existsSync(src)) {
  console.log("systray2/traybin not found, skipping.");
  process.exit(0);
}

fs.cpSync(src, dest, { recursive: true });
console.log("traybin copied to dist/");
