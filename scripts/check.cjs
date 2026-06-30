const { spawnSync } = require("child_process");

const files = [
  "outputs/finance-pwa/app.js",
  "outputs/finance-pwa/service-worker.js",
  "scripts/build-deploy.cjs",
  "scripts/check.cjs"
];

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log("Validacao concluida.");
