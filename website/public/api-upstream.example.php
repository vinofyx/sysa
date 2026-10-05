<?php
declare(strict_types=1);

/**
 * Copy this file to api-upstream.php in the Hostinger document root
 * (same folder as api-proxy.php). Then replace the return value with the
 * public HTTPS origin of the Node.js API. Apache does not load Node.js
 * env vars, so this file is the supported way to set the upstream.
 *
 * Return the origin only:
 *   - Include https://
 *   - No trailing slash
 *   - No /api or /api/v1 suffix (this proxy already forwards the /api path)
 *
 * Example:
 *   return 'https://api.example-host.com';
 *
 * Keep NEXT_PUBLIC_API_URL=https://sysa.in so the browser calls
 * https://sysa.in/api/v1 and this proxy reaches the Node host.
 *
 * Leave the return value empty until the Node host is live — an empty
 * origin makes /api return JSON 503 instead of calling a fake host.
 *
 * Never return https://sysa.onrender.com — Render is not used.
 */
return '';
