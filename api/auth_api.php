<?php
/**
 * Kullanıcı Giriş/Kayıt API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

session_start();
require_once '../includes/db.php';

$response = ['success' => false, 'message' => ''];

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'register':
        // Kayıt işlemi
        $data = json_decode(file_get_contents('php://input'), true);
        
        $first_name = sanitize($data['first_name'] ?? '');
        $last_name = sanitize($data['last_name'] ?? '');
        $email = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
        $phone = sanitize($data['phone'] ?? '');
        $password = $data['password'] ?? '';
        
        // Validasyon
        if (empty($first_name) || empty($last_name) || empty($email) || empty($password)) {
            $response['message'] = 'Tüm alanları doldurunuz!';
            break;
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $response['message'] = 'Geçerli bir e-posta adresi giriniz!';
            break;
        }
        
        if (strlen($password) < 6) {
            $response['message'] = 'Şifre en az 6 karakter olmalıdır!';
            break;
        }
        
        // E-posta kontrolü
        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            $response['message'] = 'Bu e-posta adresi zaten kayıtlı!';
            break;
        }
        
        // Şifre hashleme
        $password_hash = password_hash($password, PASSWORD_BCRYPT);
        
        // Kullanıcı ekleme
        $stmt = $db->prepare("
            INSERT INTO users (first_name, last_name, email, phone, password, role, status) 
            VALUES (?, ?, ?, ?, ?, 'customer', 'active')
        ");
        
        if ($stmt->execute([$first_name, $last_name, $email, $phone, $password_hash])) {
            $response['success'] = true;
            $response['message'] = 'Kayıt başarılı! Giriş yapabilirsiniz.';
        } else {
            $response['message'] = 'Kayıt sırasında bir hata oluştu!';
        }
        break;
        
    case 'login':
        // Giriş işlemi
        $data = json_decode(file_get_contents('php://input'), true);
        
        $email = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
        $password = $data['password'] ?? '';
        $remember = $data['remember'] ?? false;
        
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ? AND status = 'active'");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            // Session oluştur
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            
            // Remember me
            if ($remember) {
                $token = bin2hex(random_bytes(32));
                setcookie('remember_token', $token, time() + 30 * 24 * 60 * 60, '/');
                // Token veritabanına kaydedilebilir
            }
            
            $response['success'] = true;
            $response['message'] = 'Giriş başarılı!';
            $response['user'] = [
                'id' => $user['id'],
                'name' => $user['first_name'] . ' ' . $user['last_name'],
                'email' => $user['email'],
                'role' => $user['role']
            ];
        } else {
            $response['message'] = 'E-posta veya şifre hatalı!';
        }
        break;
        
    case 'check':
        // Oturum kontrolü
        if (isset($_SESSION['user_id'])) {
            $response['success'] = true;
            $response['user'] = [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['user_name'],
                'email' => $_SESSION['user_email'],
                'role' => $_SESSION['user_role']
            ];
        } else {
            $response['message'] = 'Oturum bulunamadı!';
        }
        break;
        
    case 'logout':
        // Çıkış işlemi
        session_destroy();
        setcookie('remember_token', '', time() - 3600, '/');
        $response['success'] = true;
        $response['message'] = 'Çıkış yapıldı!';
        break;
        
    default:
        $response['message'] = 'Geçersiz işlem!';
}

echo json_encode($response);
?>