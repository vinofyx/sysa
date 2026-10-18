// `npm install` lifecycle hook (package.json "prepare"). Installs the git
// hooks for development. Production installs (NODE_ENV=production, e.g.
// Hostinger) omit devDependencies, so husky is absent there and this must
// exit cleanly instead of failing `npm ci` — but only there: a missing husky
// in a development install, or any hook-installation failure, still fails.

/** npm omits devDependencies for NODE_ENV=production, --omit=dev or --production. */
function isProductionInstall() {
  const omit = process.env.npm_config_omit ?? '';
  return (
    process.env.NODE_ENV === 'production' ||
    omit.split(/[\s,]+/).includes('dev') ||
    process.env.npm_config_production === 'true'
  );
}

let husky;
try {
  husky = (await import('husky')).default;
} catch (error) {
  const huskyMissing =
    error?.code === 'ERR_MODULE_NOT_FOUND' && /'husky'/.test(String(error.message));
  if (huskyMissing && isProductionInstall()) process.exit(0);
  if (huskyMissing) {
    console.error('husky is not installed — run `npm install` to set up the git hooks.');
    process.exit(1);
  }
  throw error;
}

// husky 9 reports problems by returning a message instead of throwing.
// These two are deliberate skips; every other message is a real failure.
const SKIPS = ['HUSKY=0 skip install', ".git can't be found"];
const message = husky();
if (message && SKIPS.includes(message)) {
  console.log(`husky - ${message}`);
} else if (message) {
  console.error(`husky - git hooks were not installed: ${message}`);
  process.exit(1);
}
