<?php
/**
 * Kullanıcı İşlemleri API (Profil, Favoriler)
 */
header('Content-Type: application/json');
session_start();
require_once '../includes/db.php';

$response = ['success' => false, 'message' => ''];

if (!isset($_SESSION['user_id'])) {
    $response['message'] = 'Giriş yapmanız gerekiyor!';
    echo json_encode($response);
    exit;
}

$user_id = $_SESSION['user_id'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'profile':
        // Profil bilgilerini getir
        $stmt = $db->prepare("SELECT id, first_name, last_name, email, phone FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch();

        if ($user) {
            $response['success'] = true;
            $response['user'] = $user;
        } else {
            $response['message'] = 'Kullanıcı bulunamadı!';
        }
        break;

    case 'update_profile':
        // Profil güncelle
        $first_name = sanitize($data['first_name'] ?? '');
        $last_name = sanitize($data['last_name'] ?? '');
        $phone = sanitize($data['phone'] ?? '');

        if (empty($first_name) || empty($last_name)) {
            $response['message'] = 'Ad ve soyad alanları zorunludur!';
            break;
        }

        $stmt = $db->prepare("UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?");
        if ($stmt->execute([$first_name, $last_name, $phone, $user_id])) {
            $response['success'] = true;
            $response['message'] = 'Profil bilgileri güncellendi!';
            $_SESSION['user_name'] = $first_name . ' ' . $last_name;
        } else {
            $response['message'] = 'Güncelleme sırasında bir hata oluştu!';
        }
        break;

    case 'change_password':
        // Şifre değiştir
        $current = $data['current_password'] ?? '';
        $new = $data['new_password'] ?? '';

        if (empty($current) || empty($new) || strlen($new) < 6) {
            $response['message'] = 'Geçerli bir şifre giriniz (min 6 karakter)!';
            break;
        }

        // Mevcut şifreyi kontrol et
        $stmt = $db->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch();

        if (password_verify($current, $user['password'])) {
            $new_hash = password_hash($new, PASSWORD_BCRYPT);
            $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
            if ($stmt->execute([$new_hash, $user_id])) {
                $response['success'] = true;
                $response['message'] = 'Şifreniz başarıyla değiştirildi!';
            } else {
                $response['message'] = 'Şifre güncellenirken bir hata oluştu!';
            }
        } else {
            $response['message'] = 'Mevcut şifreniz hatalı!';
        }
        break;

    case 'addresses':
        // Kullanıcının adreslerini getir
        $stmt = $db->prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC");
        $stmt->execute([$user_id]);
        $addresses = $stmt->fetchAll();

        $response['success'] = true;
        $response['addresses'] = $addresses;
        break;

    case 'add_address':
        // Yeni adres ekle
        $title = sanitize($data['title'] ?? '');
        $first_name = sanitize($data['first_name'] ?? '');
        $last_name = sanitize($data['last_name'] ?? '');
        $phone = sanitize($data['phone'] ?? '');
        $city = sanitize($data['city'] ?? '');
        $district = sanitize($data['district'] ?? '');
        $address = sanitize($data['address'] ?? '');
        $is_default = !empty($data['is_default']) ? 1 : 0;

        if (empty($title) || empty($first_name) || empty($last_name) || empty($phone) || empty($city) || empty($district) || empty($address)) {
            $response['message'] = 'Lütfen tüm alanları doldurunuz!';
            break;
        }

        if ($is_default) {
            $db->prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?")->execute([$user_id]);
        }

        $stmt = $db->prepare("INSERT INTO addresses (user_id, title, first_name, last_name, phone, city, district, address, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if ($stmt->execute([$user_id, $title, $first_name, $last_name, $phone, $city, $district, $address, $is_default])) {
            $response['success'] = true;
            $response['message'] = 'Adres başarıyla eklendi!';
            $response['address_id'] = $db->lastInsertId();
        } else {
            $response['message'] = 'Adres eklenirken bir hata oluştu!';
        }
        break;

    case 'delete_address':
        $address_id = intval($data['address_id'] ?? 0);
        $stmt = $db->prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?");
        if ($stmt->execute([$address_id, $user_id])) {
            $response['success'] = true;
            $response['message'] = 'Adres silindi!';
        } else {
            $response['message'] = 'Adres silinirken hata oluştu!';
        }
        break;

    case 'favorites':
        // Favori listesini getir
        $stmt = $db->prepare("
            SELECT p.*, pi.image_path as image
            FROM favorites f
            JOIN products p ON f.product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
        ");
        $stmt->execute([$user_id]);
        $favorites = $stmt->fetchAll();

        $response['success'] = true;
        $response['favorites'] = $favorites;
        break;

    case 'add_favorite':
        $product_id = intval($data['product_id'] ?? 0);
        try {
            $stmt = $db->prepare("INSERT INTO favorites (user_id, product_id) VALUES (?, ?)");
            $stmt->execute([$user_id, $product_id]);
            $response['success'] = true;
            $response['message'] = 'Ürün favorilere eklendi!';
        } catch (PDOException $e) {
            $response['message'] = 'Ürün zaten favorilerinizde!';
        }
        break;

    case 'remove_favorite':
        $product_id = intval($data['product_id'] ?? 0);
        $stmt = $db->prepare("DELETE FROM favorites WHERE user_id = ? AND product_id = ?");
        if ($stmt->execute([$user_id, $product_id])) {
            $response['success'] = true;
            $response['message'] = 'Ürün favorilerden çıkarıldı!';
        } else {
            $response['message'] = 'İşlem sırasında hata oluştu!';
        }
        break;

    default:
        $response['message'] = 'Geçersiz işlem!';
}

echo json_encode($response);
?>