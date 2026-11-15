// Regenerates worker/static-assets.js from src/ (the embedded fallback used only
// when the Workers static-assets binding is unavailable). Run after any UI change:
//   node scripts/build-static-assets.mjs
import { readFile, writeFile } from "node:fs/promises";

const FILES = [["/", "src/index.html"], ["/app.js", "src/app.js"], ["/styles.css", "src/styles.css"], ["/text-direction.js", "src/text-direction.js"], ["/magnifying-glass.svg", "src/magnifying-glass.svg"]];
const entries = [];
for (const [path, file] of FILES) entries.push(`[${JSON.stringify(path)},decodeURIComponent(${JSON.stringify(encodeURIComponent(await readFile(file, "utf8")))})]`);
const current = await readFile("worker/static-assets.js", "utf8");
const tail = current.slice(current.indexOf("\n", current.indexOf("const ASSETS = new Map(")) + 1);
await writeFile("worker/static-assets.js", `const ASSETS = new Map([${entries.join(",")}]);\n` + tail);
console.log("worker/static-assets.js regenerated from src/");
