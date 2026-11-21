<?php
// conta_cliente.php - o cliente altera os próprios dados e a senha (de verdade, no banco).
//   POST {acao:"dados", nome, email}
//   POST {acao:"senha", atual, nova}
include("cliente_comum.php");
$id = exigir_cliente();
if ($_SERVER["REQUEST_METHOD"] !== "POST") responder(["sucesso" => false, "mensagem" => "Método inválido."], 405);

$j = ler_json();
try {
    if (($j["acao"] ?? "") === "dados") {
        $nome = trim((string) ($j["nome"] ?? ""));
        $email = trim((string) ($j["email"] ?? ""));
        if (mb_strlen($nome) < 2 || mb_strlen($nome) > 100) responder(["sucesso" => false, "mensagem" => "Informe o nome (2 a 100 letras)."], 400);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 100) responder(["sucesso" => false, "mensagem" => "E-mail inválido."], 400);

        $dup = $conn->prepare("SELECT COUNT(*) FROM usuario_cliente WHERE email = :e AND id_cliente <> :id");
        $dup->execute([":e" => $email, ":id" => $id]);
        if ((int) $dup->fetchColumn() > 0) responder(["sucesso" => false, "mensagem" => "Esse e-mail já pertence a outra conta."], 409);

        $conn->prepare("UPDATE usuario_cliente SET nome = :n, email = :e WHERE id_cliente = :id")->execute([":n" => $nome, ":e" => $email, ":id" => $id]);
        $_SESSION["nome"] = $nome;
        responder(["sucesso" => true, "mensagem" => "Dados atualizados!", "nome" => $nome, "email" => $email]);
    }

    if (($j["acao"] ?? "") === "senha") {
        $atual = (string) ($j["atual"] ?? "");
        $nova = (string) ($j["nova"] ?? "");
        if (strlen($nova) < 8) responder(["sucesso" => false, "mensagem" => "A nova senha precisa ter no mínimo 8 caracteres."], 400);

        $st = $conn->prepare("SELECT senha FROM usuario_cliente WHERE id_cliente = :id");
        $st->execute([":id" => $id]);
        $hash = $st->fetchColumn();
        if (!$hash || !password_verify($atual, $hash)) responder(["sucesso" => false, "mensagem" => "A senha atual está incorreta."], 403);

        $conn->prepare("UPDATE usuario_cliente SET senha = :s WHERE id_cliente = :id")->execute([":s" => password_hash($nova, PASSWORD_DEFAULT), ":id" => $id]);
        responder(["sucesso" => true, "mensagem" => "Senha alterada com sucesso!"]);
    }

    responder(["sucesso" => false, "mensagem" => "Ação inválida."], 400);
} catch (PDOException $e) {
    error_log($e->getMessage());
    responder(["sucesso" => false, "mensagem" => "Erro ao salvar. Tente novamente."], 500);
}
