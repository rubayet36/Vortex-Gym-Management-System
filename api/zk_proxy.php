<?php
// api/zk_proxy.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$request_uri = $_SERVER['REQUEST_URI'];
$pos = strpos($request_uri, 'endpoint=');
if ($pos !== false) {
    $endpoint = substr($request_uri, $pos + 9);
    $endpoint = rawurldecode($endpoint);
} else {
    $endpoint = '';
}

if (empty($endpoint)) {
    http_response_code(400);
    echo json_encode(['error' => 'Endpoint parameter is required']);
    exit;
}

$bridge_url = 'http://localhost:3001' . $endpoint;
$method = $_SERVER['REQUEST_METHOD'];
$body = file_get_contents('php://input');

$headers = [];
if (isset($_SERVER['CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}

// Try CURL first
if (function_exists('curl_init')) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $bridge_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10); // 10 seconds timeout
    
    if ($method === 'POST' || $method === 'PUT' || $method === 'DELETE') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($response === false) {
        http_response_code(502);
        echo json_encode(['error' => 'Bad Gateway: ZKTeco bridge is offline', 'details' => $curl_error]);
    } else {
        http_response_code($http_code);
        header("Content-Type: application/json");
        echo $response;
    }
} else {
    // Fallback using file_get_contents
    $opts = [
        'http' => [
            'method'  => $method,
            'header'  => implode("\r\n", $headers),
            'content' => $body,
            'timeout' => 10,
            'ignore_errors' => true // retrieve error pages as well
        ]
    ];
    
    $context  = stream_context_create($opts);
    $response = @file_get_contents($bridge_url, false, $context);
    
    if ($response === false) {
        http_response_code(502);
        echo json_encode(['error' => 'Bad Gateway: ZKTeco bridge is offline (file_get_contents fallback)']);
    } else {
        $status_code = 200;
        if (isset($http_response_header) && count($http_response_header) > 0) {
            if (preg_match('{HTTP\/\S*\s(\d{3})}', $http_response_header[0], $match)) {
                $status_code = intval($match[1]);
            }
        }
        http_response_code($status_code);
        header("Content-Type: application/json");
        echo $response;
    }
}
