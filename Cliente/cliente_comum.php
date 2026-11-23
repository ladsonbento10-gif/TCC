<?php
// cliente_comum.php - base dos arquivos PHP da loja do cliente (sessão, conexão, JSON).
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    include_once __DIR__ . "/../conexao_tcc.php";
    include_once __DIR__ . "/../config_loja.php";

    header("Content-Type: application/json; charset=UTF-8");
    header("Cache-Control: no-store, no-cache, must-revalidate");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    function responder(array $dados, int $codigo = 200): void {
        http_response_code($codigo);
        echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
        exit();
    }

// Devolve o id do cliente logado ou responde 401.
    function exigir_cliente(): int {
        if (empty($_SESSION['id_cliente'])) {
            responder(["sucesso" => false, "logado" => false, "mensagem" => "Faça login para continuar."], 401);
        }
        return (int) $_SESSION['id_cliente'];
    }

    function ler_json(): array {
        $j = json_decode(file_get_contents("php://input"), true);
        return is_array($j) ? $j : [];
    }

// "FOR UPDATE" trava a linha do produto enquanto o pedido é gravado (só existe no MySQL/MariaDB).
    function sql_for_update(PDO $conn): string {
        return $conn->getAttribute(PDO::ATTR_DRIVER_NAME) === "mysql" ? " FOR UPDATE" : "";
    }
?>