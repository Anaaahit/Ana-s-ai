// Simple Node.js HTTP Server
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;

const mimeTypes = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "text/javascript",
};

const server = http.createServer((req, res) => {
  // Default to index.html
  let filePath = "." + (req.url === "/" ? "/index.html" : req.url);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || "text/plain";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end(`404 - File Not Found: ${req.url}`);
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log("📁 Serving files from the workspace folder");
  console.log("🛑 Press Ctrl+C to stop the server");
});
