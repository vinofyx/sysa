// `npm install` lifecycle hook (package.json "prepare"). Installs the git
// hooks for development; production installs (NODE_ENV=production, e.g.
// Hostinger) omit devDependencies, so husky is absent there and this must
// exit cleanly instead of failing `npm ci`.
let husky;
try {
  husky = (await import('husky')).default;
} catch (error) {
  // Only the expected case — husky itself not installed — is skipped; a
  // broken husky install (or any other error) still fails loudly.
  if (error?.code === 'ERR_MODULE_NOT_FOUND' && /'husky'/.test(String(error.message))) {
    process.exit(0);
  }
  throw error;
}
const message = husky();
if (message) console.log(message);
