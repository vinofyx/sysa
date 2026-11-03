<?php
/**
 * Hostinger reverse proxy to the existing Express API.
 *
 * Shared Apache hosting cannot run Node.js. When the API runs on a separate
 * Node.js host, this script forwards /api/* — including Razorpay webhooks —
 * with the raw body intact so HMAC verification still matches. It is not a
 * fake health endpoint.
 *
 * Upstream origin comes from api-upstream.php (copy api-upstream.example.php)
 * or the SYSA_API_UPSTREAM environment variable. Do not hardcode a hosting
 * vendor URL in this file.
 */
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(0);

// Proxy loop prevention: detect if incoming request was already forwarded by this proxy
if (!empty($_SERVER['HTTP_X_SYSA_PROXY'])) {
    http_response_code(508);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'code' => 'PROXY_LOOP_DETECTED',
            'message' => 'Proxy loop detected: request has already passed through this proxy',
        ],
    ]);
    exit;
}

if (!function_exists('getallheaders')) {
    function getallheaders(): array
    {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (strpos($name, 'HTTP_') === 0) {
                $key = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                $headers[$key] = $value;
            }
        }
        if (!empty($_SERVER['CONTENT_TYPE'])) {
            $headers['Content-Type'] = $_SERVER['CONTENT_TYPE'];
        }
        if (!empty($_SERVER['CONTENT_LENGTH'])) {
            $headers['Content-Length'] = $_SERVER['CONTENT_LENGTH'];
        }
        return $headers;
    }
}

function sysa_api_upstream_origin(): string
{
    $configFile = __DIR__ . '/api-upstream.php';
    if (is_file($configFile)) {
        $configured = include $configFile;
        if (is_string($configured)) {
            $configured = trim($configured);
            if ($configured !== '') {
                return rtrim($configured, '/');
            }
        }
    }

    $fromEnv = getenv('SYSA_API_UPSTREAM');
    if (is_string($fromEnv) && trim($fromEnv) !== '') {
        return rtrim(trim($fromEnv), '/');
    }

    return '';
}

$upstreamOrigin = sysa_api_upstream_origin();

// Validate upstream origin URL
$parsedUpstream = parse_url($upstreamOrigin);
$upstreamScheme = strtolower($parsedUpstream['scheme'] ?? '');
$upstreamHost = strtolower($parsedUpstream['host'] ?? '');
$currentHost = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);

if (
    $upstreamOrigin === '' ||
    !in_array($upstreamScheme, ['http', 'https'], true) ||
    $upstreamHost === '' ||
    stripos($upstreamOrigin, 'onrender.com') !== false
) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'code' => 'UPSTREAM_NOT_CONFIGURED',
            'message' => 'API upstream is not properly configured. Ensure api-upstream.php returns a valid URL (e.g. https://api.sysa.in). Render is not used.',
        ],
    ]);
    exit;
}

// Disallow proxying to self (prevent infinite proxy loops)
if ($upstreamHost === $currentHost || ($currentHost === 'sysa.in' && $upstreamHost === 'sysa.in')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'code' => 'PROXY_CONFIG_ERROR',
            'message' => 'Upstream origin cannot point to the website domain itself.',
        ],
    ]);
    exit;
}

// Extract path
$apiPath = $_SERVER['REDIRECT_SYSA_API'] ?? $_SERVER['SYSA_API'] ?? '';
if ($apiPath === '') {
    $apiPath = $_SERVER['REDIRECT_URL'] ?? (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
}

// Prevent directory traversal or invalid characters
if (strpos($apiPath, '..') !== false || strpos($apiPath, "\0") !== false) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => ['code' => 'INVALID_PATH', 'message' => 'Invalid request path']]);
    exit;
}

// Allow /api and /api/*
if ($apiPath !== '/api' && strpos($apiPath, '/api/') !== 0) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => ['code' => 'NOT_FOUND', 'message' => 'Not found']]);
    exit;
}

$query = $_SERVER['QUERY_STRING'] ?? '';
$requestUri = $apiPath . ($query !== '' ? '?' . $query : '');
$target = $upstreamOrigin . $requestUri;

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$body = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)
    ? file_get_contents('php://input')
    : '';

$forwardHeaders = [];
$seen = [];
foreach (getallheaders() ?: [] as $name => $value) {
    $lower = strtolower((string) $name);
    if (in_array($lower, ['host', 'connection', 'content-length', 'accept-encoding'], true)) {
        continue;
    }
    $seen[$lower] = true;
    $forwardHeaders[] = $name . ': ' . $value;
}

// PHP/CGI on Apache often omits Authorization from getallheaders().
$authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if ($authorization !== '' && !isset($seen['authorization'])) {
    $forwardHeaders[] = 'Authorization: ' . $authorization;
}

$contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
if ($contentType !== '' && !isset($seen['content-type'])) {
    $forwardHeaders[] = 'Content-Type: ' . $contentType;
}

// Add proxy metadata and loop protection headers
$forwardHeaders[] = 'X-SYSA-Proxy: 1';
$forwardHeaders[] = 'X-Forwarded-For: ' . ($_SERVER['REMOTE_ADDR'] ?? '');
$forwardHeaders[] = 'X-Forwarded-Proto: https';
$forwardHeaders[] = 'X-Forwarded-Host: ' . ($_SERVER['HTTP_HOST'] ?? 'sysa.in');

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $forwardHeaders,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
    CURLOPT_RESOLVE => ['api.sysa.in:443:147.93.17.165'],
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_TIMEOUT => 45,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => 0,
]);
if ($body !== '' && $body !== false) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
if ($response === false) {
    $errNo = curl_errno($ch);
    $errMsg = curl_error($ch);
    error_log("[SYSA_API_PROXY] Upstream request failed (curl $errNo: $errMsg) to $target");
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'code' => 'UPSTREAM_UNAVAILABLE',
            'message' => 'API upstream unreachable: ' . ($errMsg ?: 'cURL error ' . $errNo),
        ],
    ]);
    curl_close($ch);
    exit;
}

$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);

http_response_code($status > 0 ? $status : 502);
foreach (explode("\r\n", $rawHeaders) as $line) {
    if ($line === '' || strpos(strtolower($line), 'http/') === 0) {
        continue;
    }
    $lower = strtolower($line);
    if (
        strpos($lower, 'transfer-encoding:') === 0 ||
        strpos($lower, 'connection:') === 0 ||
        strpos($lower, 'content-length:') === 0
    ) {
        continue;
    }
    header($line, false);
}
echo $responseBody;

