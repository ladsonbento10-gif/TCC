<?php
// Diz à Área do Cliente quem está logado (lê a sessão criada em recebedados_cliente.php)
session_start();
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");

if (empty($_SESSION['id_cliente'])) {
    http_response_code(401);
    echo json_encode(['logado' => false]);
    exit();
}

include ("../conexao_tcc.php");

try {
    $stmt = $conn->prepare("SELECT id_cliente, nome, cpf, email FROM usuario_cliente WHERE id_cliente = :id");
    $stmt->bindParam(':id', $_SESSION['id_cliente']);
    $stmt->execute();
    $c = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$c) { // conta apagada: encerra a sessão
        $_SESSION = [];
        session_destroy();
        http_response_code(401);
        echo json_encode(['logado' => false]);
        exit();
    }

    echo json_encode([
        'logado' => true,
        'id'     => (string) $c['id_cliente'],
        'nome'   => $c['nome'],
        'cpf'    => $c['cpf'] ?? '',
        'email'  => $c['email'] ?? ''
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['logado' => false, 'erro' => 'banco']);
}