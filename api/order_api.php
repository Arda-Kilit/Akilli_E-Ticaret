<?php
/**
 * Sipariş İşlemleri API
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
$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'create':
        // Sepeti kontrol et
        $stmt = $db->prepare("
            SELECT ci.*, p.name, p.price, p.sale_price, p.quantity as stock,
                   pv.price_difference, pv.variant_name
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN product_variants pv ON ci.variant_id = pv.id
            WHERE ci.user_id = ?
        ");
        $stmt->execute([$user_id]);
        $cart_items = $stmt->fetchAll();
        
        if (empty($cart_items)) {
            $response['message'] = 'Sepetiniz boş!';
            break;
        }
        
        // Stok kontrolü
        foreach ($cart_items as $item) {
            $price = $item['sale_price'] ?? $item['price'];
            if ($item['price_difference']) {
                $price += $item['price_difference'];
            }
            
            if ($item['stock'] < $item['quantity']) {
                $response['message'] = "'{$item['name']}' için yeterli stok yok!";
                echo json_encode($response);
                exit;
            }
        }
        
        // Adres kontrolü
        $address_id = intval($data['address_id'] ?? 0);
        $stmt = $db->prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ?");
        $stmt->execute([$address_id, $user_id]);
        if (!$stmt->fetch()) {
            $response['message'] = 'Geçerli bir adres seçiniz!';
            break;
        }
        
        // Hesaplamalar
        $subtotal = 0;
        foreach ($cart_items as $item) {
            $price = $item['sale_price'] ?? $item['price'];
            if ($item['price_difference']) {
                $price += $item['price_difference'];
            }
            $subtotal += $price * $item['quantity'];
        }
        
        $shipping = $subtotal >= 150 ? 0 : 29.99;
        $tax = $subtotal * 0.18;
        $total = $subtotal + $shipping + $tax;
        
        // Kupon kontrolü
        $coupon_discount = 0;
        $coupon_code = sanitize($data['coupon_code'] ?? '');
        if ($coupon_code) {
            $stmt = $db->prepare("
                SELECT * FROM coupons 
                WHERE code = ? AND is_active = 1 
                AND (start_date IS NULL OR start_date <= CURDATE())
                AND (end_date IS NULL OR end_date >= CURDATE())
                AND (usage_limit IS NULL OR usage_count < usage_limit)
            ");
            $stmt->execute([$coupon_code]);
            $coupon = $stmt->fetch();
            
            if ($coupon && $subtotal >= $coupon['min_purchase']) {
                if ($coupon['type'] == 'percentage') {
                    $coupon_discount = $subtotal * ($coupon['value'] / 100);
                    if ($coupon['max_discount'] && $coupon_discount > $coupon['max_discount']) {
                        $coupon_discount = $coupon['max_discount'];
                    }
                } else {
                    $coupon_discount = $coupon['value'];
                }
                $total -= $coupon_discount;
                
                // Kullanım sayısını artır
                $db->prepare("UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?")
                   ->execute([$coupon['id']]);
            }
        }
        
        // Sipariş oluştur
        $order_number = generateOrderNumber();
        $payment_method = sanitize($data['payment_method'] ?? 'credit_card');
        
        $stmt = $db->prepare("
            INSERT INTO orders (
                order_number, user_id, address_id, status, payment_method,
                payment_status, subtotal, shipping_cost, tax_amount,
                discount_amount, total_amount, coupon_code, notes
            ) VALUES (?, ?, ?, 'pending', ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $order_number, $user_id, $address_id, $payment_method,
            $subtotal, $shipping, $tax, $coupon_discount, $total,
            $coupon_code, sanitize($data['notes'] ?? '')
        ]);
        
        $order_id = $db->lastInsertId();
        
        // Sipariş ürünlerini ekle
        foreach ($cart_items as $item) {
            $price = $item['sale_price'] ?? $item['price'];
            if ($item['price_difference']) {
                $price += $item['price_difference'];
            }
            
            $stmt = $db->prepare("
                INSERT INTO order_items (
                    order_id, product_id, variant_id, product_name,
                    variant_name, price, quantity, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $order_id, $item['product_id'], $item['variant_id'],
                $item['name'], $item['variant_name'], $price,
                $item['quantity'], $price * $item['quantity']
            ]);
            
            // Stok düş
            $db->prepare("UPDATE products SET quantity = quantity - ? WHERE id = ?")
               ->execute([$item['quantity'], $item['product_id']]);
        }
        
        // Sepeti temizle
        $db->prepare("DELETE FROM cart_items WHERE user_id = ?")->execute([$user_id]);
        
        // Log kaydı
        $db->prepare("
            INSERT INTO activity_logs (user_id, action, entity_type, entity_id, new_values)
            VALUES (?, 'order_created', 'order', ?, ?)
        ")->execute([$user_id, $order_id, json_encode(['order_number' => $order_number])]);
        
        $response['success'] = true;
        $response['message'] = 'Siparişiniz alındı!';
        $response['order_number'] = $order_number;
        break;
        
    case 'list':
        $stmt = $db->prepare("
            SELECT o.*, 
                   (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
            FROM orders o
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        ");
        $stmt->execute([$user_id]);
        $orders = $stmt->fetchAll();
        
        foreach ($orders as &$order) {
            $stmt = $db->prepare("
                SELECT oi.*, pi.image_path as image
                FROM order_items oi
                LEFT JOIN product_images pi ON 
                    (SELECT id FROM products WHERE name = oi.product_name LIMIT 1) = pi.product_id 
                    AND pi.is_main = 1
                WHERE oi.order_id = ?
                LIMIT 1
            ");
            $stmt->execute([$order['id']]);
            $order['first_item'] = $stmt->fetch();
        }
        
        $response['success'] = true;
        $response['orders'] = $orders;
        break;
        
    case 'detail':
        $order_id = intval($_GET['id'] ?? 0);
        
        $stmt = $db->prepare("
            SELECT o.*, a.title as address_title, a.first_name, a.last_name,
                   a.phone, a.city, a.district, a.address
            FROM orders o
            JOIN addresses a ON o.address_id = a.id
            WHERE o.id = ? AND o.user_id = ?
        ");
        $stmt->execute([$order_id, $user_id]);
        $order = $stmt->fetch();
        
        if (!$order) {
            $response['message'] = 'Sipariş bulunamadı!';
            break;
        }
        
        $stmt = $db->prepare("
            SELECT oi.*, pi.image_path as image
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
            WHERE oi.order_id = ?
        ");
        $stmt->execute([$order_id]);
        $order['items'] = $stmt->fetchAll();
        
        $response['success'] = true;
        $response['order'] = $order;
        break;
        
    default:
        $response['message'] = 'Geçersiz işlem!';
}

echo json_encode($response);
?>