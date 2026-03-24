<?php
session_start();
require_once 'db.php';
require_once 'functions.php';

$cartCount = 0;
if (isLoggedIn()) {
    $stmt = $db->prepare("SELECT SUM(quantity) FROM cart_items WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $cartCount = intval($stmt->fetchColumn() ?? 0);
}
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?? 'AkıllıShop' ?> - Modern Alışveriş</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="assets/css/responsive.css">
    <?php if (isAdmin()): ?>
    <link rel="stylesheet" href="assets/css/admin.css">
    <?php endif; ?>
</head>
<body>
    <!-- Header HTML içeriği (önceki index.html'den) -->
    <header class="main-header">
        <!-- ... -->
    </header>