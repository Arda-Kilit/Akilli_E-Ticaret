<?php
/**
 * Ürün İşlemleri API
 */

header('Content-Type: application/json');
require_once '../includes/db.php';

$response = ['success' => false, 'message' => ''];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = 12;
        $offset = ($page - 1) * $limit;
        
        $category = intval($_GET['category'] ?? 0);
        $search = sanitize($_GET['search'] ?? '');
        $sort = sanitize($_GET['sort'] ?? 'newest');
        $min_price = floatval($_GET['min_price'] ?? 0);
        $max_price = floatval($_GET['max_price'] ?? 999999);
        
        // WHERE koşulları
        $where = ["p.is_active = 1"];
        $params = [];
        
        if ($category) {
            $where[] = "p.category_id = ?";
            $params[] = $category;
        }
        
        if ($search) {
            $where[] = "(p.name LIKE ? OR p.description LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        if ($min_price > 0) {
            $where[] = "COALESCE(p.sale_price, p.price) >= ?";
            $params[] = $min_price;
        }
        
        if ($max_price < 999999) {
            $where[] = "COALESCE(p.sale_price, p.price) <= ?";
            $params[] = $max_price;
        }
        
        $whereClause = implode(' AND ', $where);
        
        // Sıralama
        $orderBy = match($sort) {
            'price_asc' => 'COALESCE(p.sale_price, p.price) ASC',
            'price_desc' => 'COALESCE(p.sale_price, p.price) DESC',
            'popular' => 'p.view_count DESC',
            default => 'p.created_at DESC'
        };
        
        // Toplam sayı
        $countStmt = $db->prepare("SELECT COUNT(*) FROM products p WHERE $whereClause");
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        // Ürünleri çek
        $sql = "
            SELECT p.*, c.name as category_name, c.slug as category_slug,
                   pi.image_path as image,
                   (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND is_approved = 1) as rating,
                   (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND is_approved = 1) as review_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
            WHERE $whereClause
            ORDER BY $orderBy
            LIMIT $limit OFFSET $offset
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();
        
        // Fiyat formatı
        foreach ($products as &$product) {
            $product['final_price'] = $product['sale_price'] ?? $product['price'];
            $product['discount_percent'] = $product['sale_price'] 
                ? round((1 - $product['sale_price'] / $product['price']) * 100) 
                : 0;
        }
        
        $response['success'] = true;
        $response['products'] = $products;
        $response['pagination'] = [
            'current_page' => $page,
            'total_pages' => ceil($total / $limit),
            'total_items' => $total,
            'per_page' => $limit
        ];
        break;
        
    case 'detail':
        $slug = sanitize($_GET['slug'] ?? '');
        
        $stmt = $db->prepare("
            SELECT p.*, c.name as category_name, c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.slug = ? AND p.is_active = 1
        ");
        $stmt->execute([$slug]);
        $product = $stmt->fetch();
        
        if (!$product) {
            $response['message'] = 'Ürün bulunamadı!';
            break;
        }
        
        // Görüntülenme sayısını artır
        $db->prepare("UPDATE products SET view_count = view_count + 1 WHERE id = ?")
           ->execute([$product['id']]);
        
        // Görseller
        $stmt = $db->prepare("SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order");
        $stmt->execute([$product['id']]);
        $product['images'] = $stmt->fetchAll();
        
        // Varyantlar
        $stmt = $db->prepare("SELECT * FROM product_variants WHERE product_id = ?");
        $stmt->execute([$product['id']]);
        $product['variants'] = $stmt->fetchAll();
        
        // Değerlendirmeler
        $stmt = $db->prepare("
            SELECT r.*, u.first_name, u.last_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ? AND r.is_approved = 1
            ORDER BY r.created_at DESC
            LIMIT 10
        ");
        $stmt->execute([$product['id']]);
        $product['reviews'] = $stmt->fetchAll();
        
        // Öneriler (Bunu alan bunu da aldı)
        $stmt = $db->prepare("
            SELECT p.*, pi.image_path as image, pr.strength_score
            FROM product_recommendations pr
            JOIN products p ON pr.recommended_product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
            WHERE pr.product_id = ? AND p.is_active = 1
            ORDER BY pr.strength_score DESC
            LIMIT 4
        ");
        $stmt->execute([$product['id']]);
        $product['recommendations'] = $stmt->fetchAll();
        
        $response['success'] = true;
        $response['product'] = $product;
        break;
        
    case 'featured':
        $stmt = $db->query("
            SELECT p.*, c.name as category_name, pi.image_path as image
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
            WHERE p.is_featured = 1 AND p.is_active = 1
            ORDER BY p.created_at DESC
            LIMIT 8
        ");
        $response['success'] = true;
        $response['products'] = $stmt->fetchAll();
        break;
        
    case 'categories':
        $stmt = $db->query("
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
            WHERE c.is_active = 1
            GROUP BY c.id
            ORDER BY c.sort_order
        ");
        $response['success'] = true;
        $response['categories'] = $stmt->fetchAll();
        break;
        
    default:
        $response['message'] = 'Geçersiz işlem!';
}

echo json_encode($response);
?>