// lint-staged runs from the repository root, but each app's ESLint flat config
// (and Next.js's own ESLint plugin) assumes it is invoked with that app's directory
// as the working directory. Rather than fight glob-relative `files` matching across
// that CWD mismatch, each workspace's own `lint:fix` script is invoked directly —
// it already runs with the correct `--workspace` CWD via npm.
module.exports = {
  'apps/web/**/*.{ts,tsx,js,jsx}': (filenames) => [
    `prettier --write ${filenames.map((f) => `"${f}"`).join(' ')}`,
    'npm run lint:fix --workspace=apps/web',
  ],
  'apps/api/**/*.{ts,js}': (filenames) => [
    `prettier --write ${filenames.map((f) => `"${f}"`).join(' ')}`,
    'npm run lint:fix --workspace=apps/api',
  ],
  '**/*.{json,md,css}': (filenames) => [
    `prettier --write --ignore-path .prettierignore ${filenames.map((f) => `"${f}"`).join(' ')}`,
  ],
};
