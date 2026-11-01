<?php
// perfil_admin.php - dados pessoais do administrador logado.
//   GET                      -> devolve nome, e-mail e cargo
//   POST acao=dados          -> altera nome e e-mail
//   POST acao=senha          -> altera a senha (exige a senha atual)
session_start();
include("../conexao_tcc.php");

header("Content-Type: application/json; charset=UTF-8");

function responder($dados, $codigo = 200) {
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit();
}

if (!isset($_SESSION['id_admin'])) {
    responder(["sucesso" => false, "mensagem" => "Acesso negado. Faça login como administrador."], 401);
}

$id = (int) $_SESSION['id_admin'];
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $acao = $_POST['acao'] ?? "";

        if ($acao === "dados") {
            $nome  = trim($_POST['nome'] ?? "");
            $email = trim($_POST['email'] ?? "");

            if ($nome === "" || $email === "") {
                responder(["sucesso" => false, "mensagem" => "Preencha nome e e-mail."], 400);
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                responder(["sucesso" => false, "mensagem" => "E-mail inválido."], 400);
            }

            // O login é feito pelo nome, então ele não pode repetir.
            $stmt = $conn->prepare("SELECT id_admin FROM usuario_admin WHERE (nome = :nome OR email = :email) AND id_admin <> :id");
            $stmt->execute([":nome" => $nome, ":email" => $email, ":id" => $id]);
            if ($stmt->fetch()) {
                responder(["sucesso" => false, "mensagem" => "Já existe outro administrador com esse nome ou e-mail."], 409);
            }

            $stmt = $conn->prepare("UPDATE usuario_admin SET nome = :nome, email = :email WHERE id_admin = :id");
            $stmt->execute([":nome" => $nome, ":email" => $email, ":id" => $id]);
            $_SESSION['nome'] = $nome;

            responder(["sucesso" => true, "mensagem" => "Dados atualizados com sucesso.", "nome" => $nome, "email" => $email]);
        }

        if ($acao === "senha") {
            $atual     = $_POST['senha_atual'] ?? "";
            $nova      = $_POST['senha_nova'] ?? "";
            $confirmar = $_POST['senha_confirmar'] ?? "";

            if ($atual === "" || $nova === "" || $confirmar === "") {
                responder(["sucesso" => false, "mensagem" => "Preencha todos os campos de senha."], 400);
            }
            if (strlen($nova) < 6) {
                responder(["sucesso" => false, "mensagem" => "A nova senha deve ter pelo menos 6 caracteres."], 400);
            }
            if ($nova !== $confirmar) {
                responder(["sucesso" => false, "mensagem" => "A confirmação não confere com a nova senha."], 400);
            }

            $stmt = $conn->prepare("SELECT senha FROM usuario_admin WHERE id_admin = :id");
            $stmt->execute([":id" => $id]);
            $hash = $stmt->fetchColumn();
            if (!$hash || !password_verify($atual, $hash)) {
                responder(["sucesso" => false, "mensagem" => "Senha atual incorreta."], 403);
            }

            $stmt = $conn->prepare("UPDATE usuario_admin SET senha = :senha WHERE id_admin = :id");
            $stmt->execute([":senha" => password_hash($nova, PASSWORD_DEFAULT), ":id" => $id]);

            responder(["sucesso" => true, "mensagem" => "Senha alterada com sucesso."]);
        }

        responder(["sucesso" => false, "mensagem" => "Ação inválida."], 400);
    }

    $stmt = $conn->prepare("SELECT a.nome, a.email, c.nome AS cargo
                            FROM usuario_admin a LEFT JOIN cargo c ON c.id_cargo = a.cargo_id
                            WHERE a.id_admin = :id");
    $stmt->execute([":id" => $id]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$admin) {
        responder(["sucesso" => false, "mensagem" => "Administrador não encontrado."], 404);
    }
    responder(["sucesso" => true, "admin" => $admin]);
} catch (PDOException $e) {
    responder(["sucesso" => false, "mensagem" => "Erro no banco de dados: " . $e->getMessage()], 500);
}
?>
