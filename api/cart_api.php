<?php
/**
 * Sepet İşlemleri API
 */

header('Content-Type: application/json');
session_start();
require_once '../includes/db.php';

$response = ['success' => false, 'message' => ''];

// Giriş kontrolü
if (!isset($_SESSION['user_id'])) {
    $response['message'] = 'Giriş yapmanız gerekiyor!';
    echo json_encode($response);
    exit;
}

$user_id = $_SESSION['user_id'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'add':
        $product_id = intval($data['product_id'] ?? 0);
        $variant_id = !empty($data['variant_id']) ? intval($data['variant_id']) : null;
        $quantity = max(1, intval($data['quantity'] ?? 1));
        
        // Ürün kontrolü
        $stmt = $db->prepare("SELECT quantity FROM products WHERE id = ? AND is_active = 1");
        $stmt->execute([$product_id]);
        $product = $stmt->fetch();
        
        if (!$product) {
            $response['message'] = 'Ürün bulunamadı!';
            break;
        }
        
        // Stok kontrolü
        if ($product['quantity'] < $quantity) {
            $response['message'] = 'Yeterli stok yok!';
            break;
        }
        
        // Sepette var mı kontrolü
        $stmt = $db->prepare("
            SELECT id, quantity FROM cart_items 
            WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
        ");
        $stmt->execute([$user_id, $product_id, $variant_id, $variant_id]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            // Güncelle
            $new_qty = $existing['quantity'] + $quantity;
            $stmt = $db->prepare("UPDATE cart_items SET quantity = ? WHERE id = ?");
            $stmt->execute([$new_qty, $existing['id']]);
        } else {
            // Ekle
            $stmt = $db->prepare("
                INSERT INTO cart_items (user_id, product_id, variant_id, quantity) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$user_id, $product_id, $variant_id, $quantity]);
        }
        
        $response['success'] = true;
        $response['message'] = 'Ürün sepete eklendi!';
        break;
        
    case 'remove':
        $item_id = intval($data['item_id'] ?? 0);
        
        $stmt = $db->prepare("DELETE FROM cart_items WHERE id = ? AND user_id = ?");
        if ($stmt->execute([$item_id, $user_id])) {
            $response['success'] = true;
            $response['message'] = 'Ürün sepetten kaldırıldı!';
        } else {
            $response['message'] = 'İşlem başarısız!';
        }
        break;
        
    case 'update':
        $item_id = intval($data['item_id'] ?? 0);
        $quantity = max(1, intval($data['quantity'] ?? 1));
        
        $stmt = $db->prepare("UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?");
        if ($stmt->execute([$quantity, $item_id, $user_id])) {
            // Alt toplam hesapla
            $stmt = $db->prepare("
                SELECT ci.*, p.price, p.sale_price, pv.price_difference 
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                LEFT JOIN product_variants pv ON ci.variant_id = pv.id
                WHERE ci.id = ?
            ");
            $stmt->execute([$item_id]);
            $item = $stmt->fetch();
            
            $price = $item['sale_price'] ?? $item['price'];
            if ($item['price_difference']) {
                $price += $item['price_difference'];
            }
            $subtotal = $price * $quantity;
            
            $response['success'] = true;
            $response['subtotal'] = number_format($subtotal, 2);
        }
        break;
        
    case 'count':
        $stmt = $db->prepare("SELECT SUM(quantity) as count FROM cart_items WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $result = $stmt->fetch();
        
        $response['success'] = true;
        $response['count'] = intval($result['count'] ?? 0);
        break;
        
    case 'list':
        $stmt = $db->prepare("
            SELECT ci.id, ci.quantity, ci.product_id, ci.variant_id,
                   p.name, p.slug, p.price, p.sale_price,
                   pv.variant_name, pv.price_difference,
                   pi.image_path as image
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN product_variants pv ON ci.variant_id = pv.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
            WHERE ci.user_id = ?
            ORDER BY ci.created_at DESC
        ");
        $stmt->execute([$user_id]);
        $items = $stmt->fetchAll();
        
        $total = 0;
        foreach ($items as &$item) {
            $price = $item['sale_price'] ?? $item['price'];
            if ($item['price_difference']) {
                $price += $item['price_difference'];
            }
            $item['unit_price'] = $price;
            $item['subtotal'] = $price * $item['quantity'];
            $total += $item['subtotal'];
        }
        
        $response['success'] = true;
        $response['items'] = $items;
        $response['total'] = number_format($total, 2);
        break;
        
    case 'clear':
        $stmt = $db->prepare("DELETE FROM cart_items WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $response['success'] = true;
        $response['message'] = 'Sepet temizlendi!';
        break;
        
    default:
        $response['message'] = 'Geçersiz işlem!';
}

echo json_encode($response);
?>