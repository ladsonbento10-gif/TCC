<?php
// configuracao.php - configurações da loja (somente administrador logado).
//   GET  -> valores atuais
//   POST -> salva (valida tudo antes)
include("../conexao_tcc.php");
include("../config_loja.php");
include("../Administrador/controle_acesso.php");
exigir_admin();

header("Content-Type: application/json; charset=UTF-8");
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

function responder(array $d, int $codigo = 200): void {
    http_response_code($codigo);
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        responder(["sucesso" => true, "config" => carregar_config($conn)]);
    }

    $atual = config_padrao();
    $novo = [];
    foreach ($atual as $chave => $_) {
        $novo[$chave] = trim((string) ($_POST[$chave] ?? ""));
    }

    $erro = null;
    $numero = function (string $chave, float $min, float $max, string $nome) use (&$novo, &$erro) {
        $v = str_replace(",", ".", $novo[$chave]);
        if ($v === "" || !is_numeric($v) || (float) $v < $min || (float) $v > $max) {
            $erro = $erro ?? "$nome inválido (use um valor entre $min e $max).";
        } else {
            $novo[$chave] = (string) (float) $v;
        }
    };
    $numero("estoque_baixo", 0, 100000, "Estoque baixo");
    $numero("frete_valor", 0, 10000, "Valor do frete");
    $numero("frete_gratis_acima", 0, 1000000, "Frete grátis acima de");
    $numero("prazo_entrega_dias", 0, 30, "Prazo de entrega");
    $numero("cupom_percentual", 0, 100, "Desconto do cupom");
    $numero("parcelas_max", 1, 12, "Parcelas");
    if ($erro) responder(["sucesso" => false, "mensagem" => $erro], 400);

    $novo["prazo_entrega_dias"] = (string) (int) $novo["prazo_entrega_dias"];
    $novo["estoque_baixo"] = (string) (int) $novo["estoque_baixo"];
    $novo["parcelas_max"] = (string) (int) $novo["parcelas_max"];

    if ($novo["nome_loja"] === "" || mb_strlen($novo["nome_loja"]) > 80) responder(["sucesso" => false, "mensagem" => "Informe o nome da loja (até 80 letras)."], 400);
    if ($novo["email_loja"] !== "" && !filter_var($novo["email_loja"], FILTER_VALIDATE_EMAIL)) responder(["sucesso" => false, "mensagem" => "E-mail da loja inválido."], 400);
    if (mb_strlen($novo["telefone_loja"]) > 20) responder(["sucesso" => false, "mensagem" => "Telefone muito longo."], 400);
    if (!preg_match('/^[A-Za-z0-9_-]{0,30}$/', $novo["cupom_codigo"])) responder(["sucesso" => false, "mensagem" => "O cupom só pode ter letras, números, - e _ (até 30)."], 400);
    $novo["cupom_codigo"] = strtoupper($novo["cupom_codigo"]);
    if (mb_strlen($novo["pix_chave"]) > 77) responder(["sucesso" => false, "mensagem" => "Chave PIX muito longa."], 400);
    if (mb_strlen($novo["pix_nome"]) > 25 || mb_strlen($novo["pix_cidade"]) > 15) responder(["sucesso" => false, "mensagem" => "Nome do PIX (até 25) ou cidade (até 15) muito longos."], 400);

    $conn->exec("CREATE TABLE IF NOT EXISTS configuracao (chave varchar(50) NOT NULL PRIMARY KEY, valor text) DEFAULT CHARSET=utf8mb4");
    $conn->beginTransaction();
    $stmt = $conn->prepare("INSERT INTO configuracao (chave, valor) VALUES (:c, :v) ON DUPLICATE KEY UPDATE valor = VALUES(valor)");
    foreach ($novo as $chave => $valor) {
        $stmt->execute([":c" => $chave, ":v" => $valor]);
    }
    $conn->commit();
    responder(["sucesso" => true, "mensagem" => "Configurações salvas com sucesso!", "config" => carregar_config($conn)]);
} catch (PDOException $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    error_log($e->getMessage());
    responder(["sucesso" => false, "mensagem" => "Erro ao salvar. Tente novamente."], 500);
}
