// Local dev-only: runs the API exactly like dev-api.bat, but with Razorpay
// disabled. api/.env holds LIVE Razorpay keys; empty process-env values are
// never overridden by dotenv and the API treats blank as unset, so this
// process cannot create live orders or charges. Swap in rzp_test_ keys via
// api/.env.local to run a real test-mode payment instead.
const { spawn } = require('node:child_process');
const path = require('node:path');

const env = {
  ...process.env,
  RAZORPAY_KEY_ID: '',
  RAZORPAY_KEY_SECRET: '',
  RAZORPAY_WEBHOOK_SECRET: '',
};

const child = spawn('cmd', ['/d', '/c', path.join(__dirname, 'dev-api.bat')], {
  cwd: path.join(__dirname, '..'),
  env,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 1));
