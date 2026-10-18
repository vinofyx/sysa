// `npm install` lifecycle hook (package.json "prepare"). Installs the git
// hooks for development; production installs (NODE_ENV=production, e.g.
// Hostinger) omit devDependencies, so husky is absent there and this must
// exit cleanly instead of failing `npm ci`.
let husky;
try {
  husky = (await import('husky')).default;
} catch {
  process.exit(0);
}
const message = husky();
if (message) console.log(message);
