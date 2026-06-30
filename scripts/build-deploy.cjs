const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "outputs", "finance-pwa");
const outputDir = path.join(root, "outputs", "finance-pwa-online");
const version = process.env.DEPLOY_VERSION || buildVersion();

const publicFiles = [
  "index.html",
  "app.js",
  "styles.css",
  "service-worker.js",
  "manifest.webmanifest",
  "supabase-config.js",
  "_headers",
  "_redirects",
  "netlify.toml",
  "vercel.json"
];

const publicDirs = ["assets"];

main();

function main() {
  assertPathInside(outputDir, path.join(root, "outputs"));
  assertExists(sourceDir);

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  publicFiles.forEach(copyPublicFile);
  publicDirs.forEach(copyPublicDir);
  writeDeployInfo();

  console.log(`Deploy pronto em ${relative(outputDir)}`);
  console.log(`Versao PWA: ${version}`);
}

function copyPublicFile(fileName) {
  const source = path.join(sourceDir, fileName);
  const target = path.join(outputDir, fileName);
  assertExists(source);

  const content = fs.readFileSync(source, "utf8");
  fs.writeFileSync(target, withVersion(fileName, content), "utf8");
}

function copyPublicDir(dirName) {
  const source = path.join(sourceDir, dirName);
  const target = path.join(outputDir, dirName);
  assertExists(source);
  fs.cpSync(source, target, { recursive: true });
}

function withVersion(fileName, content) {
  if (fileName === "index.html") {
    return content
      .replace(/styles\.css\?v=\d+/g, `styles.css?v=${version}`)
      .replace(/supabase-config\.js\?v=\d+/g, `supabase-config.js?v=${version}`)
      .replace(/app\.js\?v=\d+/g, `app.js?v=${version}`);
  }

  if (fileName === "app.js") {
    return content.replace(/service-worker\.js\?v=\d+/g, `service-worker.js?v=${version}`);
  }

  if (fileName === "service-worker.js") {
    return content
      .replace(/ponte-financeira-v\d+/g, `ponte-financeira-v${version}`)
      .replace(/styles\.css\?v=\d+/g, `styles.css?v=${version}`)
      .replace(/supabase-config\.js\?v=\d+/g, `supabase-config.js?v=${version}`)
      .replace(/app\.js\?v=\d+/g, `app.js?v=${version}`);
  }

  return content;
}

function writeDeployInfo() {
  const info = {
    app: "Ponte Financeira",
    version,
    generatedAt: new Date().toISOString(),
    site: "https://pontefinanceira.netlify.app/"
  };
  fs.writeFileSync(path.join(outputDir, "deploy-info.json"), `${JSON.stringify(info, null, 2)}\n`, "utf8");
}

function buildVersion() {
  const now = new Date();
  const parts = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0")
  ];
  return parts.join("");
}

function assertExists(targetPath) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Arquivo ou pasta nao encontrado: ${relative(targetPath)}`);
  }
}

function assertPathInside(targetPath, parentPath) {
  const target = path.resolve(targetPath);
  const parent = path.resolve(parentPath);
  const relativePath = path.relative(parent, target);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Caminho de saida invalido: ${target}`);
  }
}

function relative(targetPath) {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}
