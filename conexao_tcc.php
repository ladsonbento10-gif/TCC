<?php
// conexao_tcc.php - conexão com o MySQL/MariaDB do XAMPP (usuário root, sem senha, banco mercado_tcc).
// Se você colocou senha no MySQL, troque o "" abaixo.
try {
    $conn = new PDO(
        "mysql:host=localhost;dbname=mercado_tcc;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    error_log("conexao_tcc: " . $e->getMessage());
    if (!headers_sent()) {
        http_response_code(500);
        header("Content-Type: application/json; charset=UTF-8");
    }
    echo json_encode([
        "sucesso" => false,
        "erro" => "banco",
        "mensagem" => "Não foi possível conectar ao banco de dados. Ligue o MySQL no painel do XAMPP e importe o banco (abra http://localhost/TCC-main/verificar_instalacao.php).",
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
