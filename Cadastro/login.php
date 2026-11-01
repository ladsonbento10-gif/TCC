<?php
// login.php - login único: entra como administrador ou como cliente, pelo e-mail e senha.
session_start();
include("../conexao_tcc.php");

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store");

function responder($dados, $codigo = 200) {
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    responder(["sucesso" => false, "mensagem" => "Método inválido."], 405);
}

$email = trim($_POST["email"] ?? "");
$senha = $_POST["senha"] ?? "";

if ($email === "" || $senha === "") {
    responder(["sucesso" => false, "mensagem" => "Preencha o e-mail e a senha."], 400);
}

try {
    // 1) Administrador
    $stmt = $conn->prepare("SELECT id_admin, nome, senha FROM usuario_admin WHERE email = :email");
    $stmt->execute([":email" => $email]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $admin) {
        if (password_verify($senha, $admin["senha"])) {
            session_regenerate_id(true);
            $_SESSION["id_admin"] = $admin["id_admin"];
            $_SESSION["nome"]     = $admin["nome"];
            responder([
                "sucesso" => true,
                "tipo"    => "admin",
                "nome"    => $admin["nome"],
                "destino" => "../Administrador/Area_do_Admin.html"
            ]);
        }
    }

    // 2) Cliente (pode haver cadastros repetidos com o mesmo e-mail: testa a senha em cada um)
    $stmt = $conn->prepare("SELECT id_cliente, nome, senha FROM usuario_cliente WHERE email = :email");
    $stmt->execute([":email" => $email]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $cliente) {
        if (password_verify($senha, $cliente["senha"])) {
            session_regenerate_id(true);
            $_SESSION["id_cliente"] = $cliente["id_cliente"];
            $_SESSION["nome"]       = $cliente["nome"];
            responder([
                "sucesso" => true,
                "tipo"    => "cliente",
                "nome"    => $cliente["nome"],
                "id"      => (string) $cliente["id_cliente"],
                "destino" => "../Cliente/Area_do_Cliente.html"
            ]);
        }
    }

    responder(["sucesso" => false, "mensagem" => "E-mail ou senha incorretos. Tente novamente."], 401);
} catch (PDOException $e) {
    error_log($e->getMessage());
    responder(["sucesso" => false, "mensagem" => "Erro ao consultar o banco de dados."], 500);
}
