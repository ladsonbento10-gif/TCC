<?php
// finalizar_pedido.php - grava o pedido do cliente logado.
// O navegador manda só QUAIS produtos e QUANTOS: preços, desconto, frete e total são recalculados aqui
// com os dados do banco (nunca se confia no valor que vem do navegador).
include("cliente_comum.php");
include("pedido_helper.php");
$idCliente = exigir_cliente();
if ($_SERVER["REQUEST_METHOD"] !== "POST") responder(["sucesso" => false, "mensagem" => "Método inválido."], 405);

$j = ler_json();
$cfg = carregar_config($conn);

// ---------- itens ----------
$itensIn = $j["itens"] ?? [];
if (!is_array($itensIn) || !count($itensIn) || count($itensIn) > 80) responder(["sucesso" => false, "mensagem" => "Seu carrinho está vazio."], 400);
$pedido = [];
foreach ($itensIn as $it) {
    $id = (int) ($it["id"] ?? 0);
    $qtd = (int) ($it["qtd"] ?? 0);
    if ($id <= 0 || $qtd < 1 || $qtd > 99) responder(["sucesso" => false, "mensagem" => "Item inválido no carrinho."], 400);
    $pedido[$id] = ($pedido[$id] ?? 0) + $qtd;
}

// ---------- endereço ----------
$e = is_array($j["endereco"] ?? null) ? $j["endereco"] : [];
$rua = trim((string) ($e["rua"] ?? ""));
$numero = trim((string) ($e["numero"] ?? ""));
$compl = trim((string) ($e["complemento"] ?? ""));
$bairro = trim((string) ($e["bairro"] ?? ""));
$cidade = trim((string) ($e["cidade"] ?? ""));
$uf = strtoupper(trim((string) ($e["uf"] ?? "")));
$cep = preg_replace("/\D/", "", (string) ($e["cep"] ?? ""));
if ($rua === "" || $numero === "" || $bairro === "" || $cidade === "" || !preg_match("/^[A-Z]{2}$/", $uf) || strlen($cep) !== 8) {
    responder(["sucesso" => false, "mensagem" => "Preencha o endereço de entrega completo (rua, número, bairro, cidade, UF e CEP com 8 números)."], 400);
}
foreach ([$rua, $numero, $compl, $bairro, $cidade] as $campo) {
    if (mb_strlen($campo) > 100) responder(["sucesso" => false, "mensagem" => "Algum campo do endereço está muito longo."], 400);
}
$enderecoTxt = "$rua, $numero" . ($compl !== "" ? " - $compl" : "") . " - $bairro - $cidade/$uf - CEP " . substr($cep, 0, 5) . "-" . substr($cep, 5);

// ---------- forma de pagamento ----------
$formaId = (int) ($j["forma_pagamento_id"] ?? 0);
$st = $conn->prepare("SELECT nome FROM forma_pagamento WHERE id_forma_pagamento = :f");
$st->execute([":f" => $formaId]);
$formaNome = $st->fetchColumn();
if ($formaNome === false) responder(["sucesso" => false, "mensagem" => "Escolha uma forma de pagamento."], 400);

$n = mb_strtolower($formaNome);
if (str_contains($n, "crédito") || str_contains($n, "credito")) $tipo = "credito";
elseif (str_contains($n, "débito") || str_contains($n, "debito")) $tipo = "debito";
elseif (str_contains($n, "pix")) $tipo = "pix";
elseif (str_contains($n, "boleto")) $tipo = "boleto";
elseif (str_contains($n, "dinheiro")) $tipo = "dinheiro";
elseif (str_contains($n, "vale")) $tipo = "vale";
else responder(["sucesso" => false, "mensagem" => "Forma de pagamento não suportada."], 400);

$final = (string) ($j["cartao_final"] ?? "");
$bandeira = (string) ($j["bandeira"] ?? "");
$bandeirasOk = ["Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Alelo", "Sodexo", "VR", "Ticket", "Outra"];
if (in_array($tipo, ["credito", "debito", "vale"], true)) {
    if (!preg_match("/^\d{4}$/", $final)) responder(["sucesso" => false, "mensagem" => "Informe os dados do cartão."], 400);
    if (!in_array($bandeira, $bandeirasOk, true)) $bandeira = "Outra";
}

$parcelasMax = max(1, (int) $cfg["parcelas_max"]);
$parcelas = $tipo === "credito" ? (int) ($j["parcelas"] ?? 1) : 1;
if ($parcelas < 1 || $parcelas > $parcelasMax) responder(["sucesso" => false, "mensagem" => "Número de parcelas inválido."], 400);

try {
    $conn->beginTransaction();
    $lock = sql_for_update($conn);

    // ---------- confere estoque e calcula o subtotal ----------
    $subtotal = 0.0;
    $linhas = [];
    $busca = $conn->prepare("SELECT id_estoque, nome_produto, preco, quantidade, ativo FROM estoque WHERE id_estoque = :id" . $lock);
    foreach ($pedido as $id => $qtd) {
        $busca->execute([":id" => $id]);
        $p = $busca->fetch(PDO::FETCH_ASSOC);
        if (!$p || (int) $p["ativo"] !== 1) {
            $conn->rollBack();
            responder(["sucesso" => false, "codigo" => "indisponivel", "produto_id" => $id, "mensagem" => "Um dos produtos não está mais disponível. Atualize o carrinho."], 409);
        }
        if ((int) $p["quantidade"] < $qtd) {
            $conn->rollBack();
            responder(["sucesso" => false, "codigo" => "sem_estoque", "produto_id" => $id,
                       "mensagem" => "Estoque insuficiente de \"" . $p["nome_produto"] . "\": restam " . (int) $p["quantidade"] . " unidade(s)."], 409);
        }
        $preco = round((float) $p["preco"], 2);
        $subtotal += round($preco * $qtd, 2);
        $linhas[] = [$id, $qtd, $preco];
    }
    $subtotal = round($subtotal, 2);

    // ---------- cupom, frete e total ----------
    $cupomIn = strtoupper(trim((string) ($j["cupom"] ?? "")));
    $desconto = 0.0;
    $cupomUsado = null;
    if ($cupomIn !== "") {
        if ($cfg["cupom_codigo"] === "" || $cupomIn !== strtoupper($cfg["cupom_codigo"]) || (float) $cfg["cupom_percentual"] <= 0) {
            $conn->rollBack();
            responder(["sucesso" => false, "mensagem" => "Cupom inválido."], 400);
        }
        $desconto = round($subtotal * (float) $cfg["cupom_percentual"] / 100, 2);
        $cupomUsado = $cupomIn;
    }
    $gratis = (float) $cfg["frete_gratis_acima"];
    $frete = ($gratis <= 0 || $subtotal >= $gratis) ? 0.0 : round((float) $cfg["frete_valor"], 2);
    $total = round($subtotal - $desconto + $frete, 2);

    $troco = null;
    if ($tipo === "dinheiro" && isset($j["troco_para"]) && $j["troco_para"] !== "" && $j["troco_para"] !== null) {
        $troco = round((float) $j["troco_para"], 2);
        if ($troco < $total) {
            $conn->rollBack();
            responder(["sucesso" => false, "mensagem" => "O valor para troco precisa ser maior ou igual ao total do pedido."], 400);
        }
    }

    // ---------- status e descrição do pagamento ----------
    $statusVenda = ["credito" => "Pago", "debito" => "Pago", "vale" => "Pago", "pix" => "Aguardando pagamento", "boleto" => "Aguardando pagamento", "dinheiro" => "Pagar na entrega"][$tipo];
    $detalhe = match ($tipo) {
        "credito" => "Cartão de crédito $bandeira final $final em {$parcelas}x",
        "debito"  => "Cartão de débito $bandeira final $final",
        "vale"    => "$formaNome $bandeira final $final",
        "pix"     => "PIX",
        "boleto"  => "Boleto bancário",
        "dinheiro" => "Dinheiro na entrega" . ($troco ? " (troco para R$ " . number_format($troco, 2, ",", ".") . ")" : ""),
    };

    // ---------- grava venda, itens (o gatilho baixa o estoque) e envio ----------
    $conn->prepare("INSERT INTO venda (cliente_id, preco_total, forma_pagamento_id, status_venda, subtotal, desconto, frete, cupom, endereco_entrega, pagamento_detalhe, parcelas, troco_para)
                    VALUES (:c, :t, :f, :s, :sub, :d, :fr, :cu, :en, :pd, :pa, :tr)")
         ->execute([":c" => $idCliente, ":t" => $total, ":f" => $formaId, ":s" => $statusVenda, ":sub" => $subtotal, ":d" => $desconto, ":fr" => $frete,
                    ":cu" => $cupomUsado, ":en" => $enderecoTxt, ":pd" => $detalhe, ":pa" => $parcelas, ":tr" => $troco]);
    $idVenda = (int) $conn->lastInsertId();

    $insItem = $conn->prepare("INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario) VALUES (:v, :p, :q, :pr)");
    foreach ($linhas as [$pid, $qtd, $preco]) {
        $insItem->execute([":v" => $idVenda, ":p" => $pid, ":q" => $qtd, ":pr" => $preco]);
    }

    $rastreio = "KLP" . str_pad((string) $idVenda, 6, "0", STR_PAD_LEFT) . strtoupper(bin2hex(random_bytes(3))) . "BR";
    $prazo = max(0, (int) $cfg["prazo_entrega_dias"]);
    $previsao = date("Y-m-d", strtotime("+$prazo day"));
    $conn->prepare("INSERT INTO envios (venda_id, status_envio, codigo_rastreio, previsao_entrega, observacoes) VALUES (:v, 'A enviar', :r, :p, :o)")
         ->execute([":v" => $idVenda, ":r" => $rastreio, ":p" => $previsao, ":o" => $enderecoTxt]);

    $conn->commit();
} catch (Throwable $ex) {
    if ($conn->inTransaction()) $conn->rollBack();
    error_log("finalizar_pedido: " . $ex->getMessage());
    responder(["sucesso" => false, "mensagem" => "Não foi possível finalizar o pedido agora. Nada foi cobrado. Tente novamente."], 500);
}

// E-mail depois de gravar: se falhar, o pedido continua valendo.
$emailStatus = "falhou";
try { $emailStatus = enviar_comprovante($conn, $idVenda, $idCliente); } catch (Throwable $ex) { error_log("comprovante: " . $ex->getMessage()); }

$c = $conn->prepare("SELECT email FROM usuario_cliente WHERE id_cliente = :c");
$c->execute([":c" => $idCliente]);
responder(["sucesso" => true, "pedido" => buscar_pedido($conn, $idVenda, $idCliente), "email" => $emailStatus, "email_destino" => $c->fetchColumn()]);
