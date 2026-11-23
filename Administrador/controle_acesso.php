<?php
// controle_acesso.php - garante que só o administrador logado acessa o arquivo PHP que incluir este.
//
// Uso:   include("../Administrador/controle_acesso.php");  exigir_admin();
    function exigir_admin(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        if (empty($_SESSION['id_admin'])) {
            http_response_code(401);
            header("Content-Type: application/json; charset=UTF-8");
            echo json_encode(["sucesso" => false, "mensagem" => "Acesso negado. Faça login como administrador."], JSON_UNESCAPED_UNICODE);
            exit();
        }
    }
?>