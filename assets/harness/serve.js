/* serve.js — dev/play static server that sends Cache-Control: no-store on every response.
 * Copy to <game>/tools/serve.js next to the game (like simulate.js/smoke.js).
 *
 * WHY THIS EXISTS (2026-10-25, The Smallpox Tree round-3 feedback): python -m http.server
 * and npx http-server send no cache headers, and Chrome's heuristic cache then serves the
 * OLD js/mod.js after a fix — "the fix doesn't take effect on refresh". A ?v= query busts
 * CSS links, but the engine's loader reads modFiles from mod.js, so modFiles URLs cannot
 * take a version parameter — the SERVER side is the only channel that fixes it. Always
 * verify and playtest against this server, not a bare file server.
 *
 * USAGE: node tools/serve.js [port] [gameDir]   (port default 8395; gameDir default = the
 * folder containing this script's parent, i.e. the game root when copied to tools/) */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.argv[2] || 8395);
const argDir = process.argv[3] ? path.resolve(process.argv[3]) : path.resolve(__dirname, "..");
const root = fs.existsSync(path.join(argDir, "js", "mod.js")) ? argDir : process.cwd();
if (!fs.existsSync(path.join(root, "js", "mod.js"))) {
    console.error("no js/mod.js under " + root + " — pass the game folder as the second argument");
    process.exit(2);
}
const MIME = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
    ".svg": "image/svg+xml", ".ico": "image/x-icon", ".json": "application/json",
    ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8",
};

http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const file = path.normalize(path.join(root, urlPath));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end("not found"); }
        res.writeHead(200, {
            "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
            "Cache-Control": "no-store",
        });
        res.end(data);
    });
}).listen(port, "0.0.0.0", () => console.log(`serving ${root} on http://127.0.0.1:${port} (no-store)`));
