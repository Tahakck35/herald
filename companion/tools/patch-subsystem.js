// dist/Herald.exe icinde PE basligindaki Subsystem alanini GUI'ye cevirir.
// 3 = konsol, 2 = pencere. Sadece 2 bayt yerinde degisir; dosya boyutu ayni kalir,
// bu yuzden pkg'nin dosya sonuna ekledigi veri bozulmaz.

const fs = require("fs");
const path = require("path");

const exe = path.join(__dirname, "..", "dist", "Herald.exe");

if (!fs.existsSync(exe)) {
  console.error("dist/Herald.exe not found.");
  process.exit(1);
}

const fd = fs.openSync(exe, "r+");

try {
  const head = Buffer.alloc(0x40);
  fs.readSync(fd, head, 0, 0x40, 0);

  if (head.toString("ascii", 0, 2) !== "MZ") throw new Error("not a PE file");

  const peOffset = head.readUInt32LE(0x3c);

  const sig = Buffer.alloc(4);
  fs.readSync(fd, sig, 0, 4, peOffset);
  if (sig.readUInt32LE(0) !== 0x00004550) throw new Error("PE signature not found");

  // COFF header 20 bayt, optional header ondan sonra baslar.
  // Subsystem, optional header'in 68. baytinda.
  const subsystemOffset = peOffset + 4 + 20 + 68;

  const current = Buffer.alloc(2);
  fs.readSync(fd, current, 0, 2, subsystemOffset);
  const value = current.readUInt16LE(0);

  if (value === 2) {
    console.log("Already a GUI binary, nothing to do.");
  } else if (value === 3) {
    const gui = Buffer.alloc(2);
    gui.writeUInt16LE(2, 0);
    fs.writeSync(fd, gui, 0, 2, subsystemOffset);
    console.log("Console window disabled (subsystem 3 -> 2).");
  } else {
    console.log("Unexpected subsystem value:", value, "- left unchanged.");
  }
} catch (e) {
  console.error("Patch failed:", e.message);
  process.exitCode = 1;
} finally {
  fs.closeSync(fd);
}
