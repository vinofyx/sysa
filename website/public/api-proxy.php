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
if (
    $upstreamOrigin === '' ||
    stripos($upstreamOrigin, 'onrender.com') !== false
) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => [
            'message' => 'API upstream is not configured. Copy api-upstream.example.php to api-upstream.php and set the Node.js API origin. Render is not used.',
        ],
    ]);
    exit;
}

$apiPath = $_SERVER['REDIRECT_SYSA_API'] ?? $_SERVER['SYSA_API'] ?? '';
if ($apiPath === '') {
    $apiPath = $_SERVER['REDIRECT_URL'] ?? (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
}
$query = $_SERVER['QUERY_STRING'] ?? '';
$requestUri = $apiPath . ($query !== '' ? '?' . $query : '');
$path = $apiPath;

if (strpos($path, '/api/') !== 0) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => ['message' => 'Not found']]);
    exit;
}

$target = $upstreamOrigin . $requestUri;
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
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
$forwardHeaders[] = 'X-Forwarded-For: ' . ($_SERVER['REMOTE_ADDR'] ?? '');
$forwardHeaders[] = 'X-Forwarded-Proto: https';
$forwardHeaders[] = 'X-Forwarded-Host: ' . ($_SERVER['HTTP_HOST'] ?? 'sysa.in');

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $forwardHeaders,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
]);
if ($body !== '' && $body !== false) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => ['message' => 'API upstream unreachable']]);
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
