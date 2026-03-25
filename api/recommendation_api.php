<?php
/**
 * Öneri Sistemi API - "Bunu Alan Bunu da Aldı"
 */
header('Content-Type: application/json');
require_once '../includes/db.php';

$response = ['success' => false, 'message' => ''];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'frequently_bought':
        // Sepetteki ürünlere göre öneriler
        session_start();
        if (!isset($_SESSION['user_id'])) {
            // Giriş yapılmamışsa popüler ürünleri getir
            $stmt = $db->query("
                SELECT p.*, pi.image_path as image, 'Popüler Ürünler' as reason
                FROM products p
                LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
                WHERE p.is_active = 1
                ORDER BY p.view_count DESC
                LIMIT 4
            ");
            $products = $stmt->fetchAll();
        } else {
            $user_id = $_SESSION['user_id'];

            // Sepetteki ürünleri al
            $stmt = $db->prepare("
                SELECT DISTINCT product_id FROM cart_items WHERE user_id = ?
            ");
            $stmt->execute([$user_id]);
            $cartProducts = $stmt->fetchAll(PDO::FETCH_COLUMN);

            if (empty($cartProducts)) {
                // Sepet boşsa popüler ürünleri getir
                $stmt = $db->query("
                    SELECT p.*, pi.image_path as image, 'Popüler Ürünler' as reason
                    FROM products p
                    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
                    WHERE p.is_active = 1
                    ORDER BY p.view_count DESC
                    LIMIT 4
                ");
                $products = $stmt->fetchAll();
            } else {
                // Sepetteki ürünlere göre önerileri getir
                $placeholders = implode(',', array_fill(0, count($cartProducts), '?'));
                $stmt = $db->prepare("
                    SELECT DISTINCT pr.recommended_product_id, p.*, pi.image_path as image,
                           CONCAT('Bunu alanlar ', (SELECT name FROM products WHERE id = pr.product_id LIMIT 1), ' ürününü de aldı') as reason
                    FROM product_recommendations pr
                    JOIN products p ON pr.recommended_product_id = p.id
                    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
                    WHERE pr.product_id IN ($placeholders) AND p.id NOT IN ($placeholders) AND p.is_active = 1
                    ORDER BY pr.strength_score DESC
                    LIMIT 4
                ");
                $params = array_merge($cartProducts, $cartProducts);
                $stmt->execute($params);
                $products = $stmt->fetchAll();

                if (empty($products)) {
                    // Öneri yoksa en çok satanları getir
                    $stmt = $db->query("
                        SELECT p.*, pi.image_path as image, 'En Çok Satanlar' as reason
                        FROM products p
                        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
                        WHERE p.is_active = 1
                        ORDER BY p.view_count DESC
                        LIMIT 4
                    ");
                    $products = $stmt->fetchAll();
                }
            }
        }

        $response['success'] = true;
        $response['products'] = $products;
        break;

    case 'related':
        // Belirli bir ürüne benzer ürünler
        $product_id = intval($_GET['product_id'] ?? 0);

        $stmt = $db->prepare("
            SELECT p.*, pi.image_path as image,
                   (SELECT category_id FROM products WHERE id = ?) as product_category,
                   (SELECT COUNT(*) FROM order_items WHERE product_id = ?) as order_count
            FROM products p
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
            WHERE p.id != ? AND p.is_active = 1
            ORDER BY 
                CASE WHEN p.category_id = (SELECT category_id FROM products WHERE id = ?) THEN 1 ELSE 0 END DESC,
                p.view_count DESC
            LIMIT 4
        ");
        $stmt->execute([$product_id, $product_id, $product_id, $product_id]);
        $products = $stmt->fetchAll();

        $response['success'] = true;
        $response['products'] = $products;
        break;

    default:
        $response['message'] = 'Geçersiz işlem!';
}

echo json_encode($response);
?>