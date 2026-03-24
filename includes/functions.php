<?php
/**
 * Genel Yardımcı Fonksiyonlar
 */

// Oturum kontrolü
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function isAdmin() {
    return isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
}

function requireAuth() {
    if (!isLoggedIn()) {
        header('Location: login.php');
        exit;
    }
}

function requireAdmin() {
    if (!isAdmin()) {
        header('Location: index.php');
        exit;
    }
}

// Güvenlik
function csrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrf($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Formatlama
function formatPrice($price) {
    return '₺' . number_format($price, 2, ',', '.');
}

function formatDate($date, $format = 'd.m.Y') {
    return date($format, strtotime($date));
}

// Dosya yükleme
function uploadFile($file, $directory = 'uploads/') {
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $filename = $file['name'];
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    
    if (!in_array($ext, $allowed)) {
        return ['success' => false, 'message' => 'Geçersiz dosya formatı!'];
    }
    
    if ($file['size'] > 5 * 1024 * 1024) {
        return ['success' => false, 'message' => 'Dosya boyutu 5MB\'ı geçemez!'];
    }
    
    $newName = uniqid() . '_' . time() . '.' . $ext;
    $path = $directory . $newName;
    
    if (move_uploaded_file($file['tmp_name'], '../' . $path)) {
        return ['success' => true, 'path' => $path];
    }
    
    return ['success' => false, 'message' => 'Dosya yüklenemedi!'];
}

// Bildirim
function setFlash($type, $message) {
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function getFlash() {
    if (isset($_SESSION['flash'])) {
        $flash = $_SESSION['flash'];
        unset($_SESSION['flash']);
        return $flash;
    }
    return null;
}

// Sayfalama
function paginate($total, $perPage = 12) {
    $page = max(1, intval($_GET['page'] ?? 1));
    $totalPages = ceil($total / $perPage);
    $offset = ($page - 1) * $perPage;
    
    return [
        'page' => $page,
        'perPage' => $perPage,
        'totalPages' => $totalPages,
        'offset' => $offset,
        'hasPrev' => $page > 1,
        'hasNext' => $page < $totalPages
    ];
}
?>