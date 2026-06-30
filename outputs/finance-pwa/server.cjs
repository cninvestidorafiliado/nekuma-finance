const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const authUser = process.env.FINANCE_USER || "familia";
const authPassword = process.env.FINANCE_PASSWORD || "";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".sql": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function isAuthorized(request) {
  if (!authPassword) return false;
  const header = request.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;

  const token = header.slice("Basic ".length);
  const [user, password] = Buffer.from(token, "base64").toString("utf8").split(":");
  return user === authUser && password === authPassword;
}

function requestAuth(response) {
  response.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="Ponte Financeira"',
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end("Login necessario.");
}

const server = http.createServer((request, response) => {
  if (!isAuthorized(request)) {
    requestAuth(response);
    return;
  }

  const safeUrl = decodeURIComponent(request.url.split("?")[0]);
  const requestedPath = safeUrl === "/" ? "/index.html" : safeUrl;
  const filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mime[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(data);
  });
});

server.listen(port, host, () => {
  if (process.stdout.isTTY) {
    console.log(`Ponte Financeira running at http://${host}:${port}`);
    console.log(`Login: ${authUser}`);
    if (!authPassword) console.log("Defina FINANCE_PASSWORD para acessar o servidor local.");
  }
});
