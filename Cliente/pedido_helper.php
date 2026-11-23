<?php
// pedido_helper.php - busca um pedido e monta/envia o e-mail de comprovante.
    include_once __DIR__ . "/../enviar_email.php";

    function buscar_pedido(PDO $conn, int $idVenda, int $idCliente): ?array {
        $st = $conn->prepare("SELECT v.id_vendas AS id, v.data_venda, v.preco_total AS total, v.subtotal, v.desconto, v.frete, v.cupom,
        v.status_venda, v.endereco_entrega, v.pagamento_detalhe, v.parcelas, v.troco_para, v.email_status, v.forma_pagamento_id, f.nome 
        AS forma_nome, e.status_envio, e.codigo_rastreio, e.previsao_entrega, e.data_envio, e.data_entrega FROM venda v
        LEFT JOIN forma_pagamento f ON f.id_forma_pagamento = v.forma_pagamento_id LEFT JOIN envios e ON e.venda_id = v.id_vendas
        WHERE v.id_vendas = :v AND v.cliente_id = :c");
        
        $st->execute([":v" => $idVenda, ":c" => $idCliente]);
        $p = $st->fetch(PDO::FETCH_ASSOC);
        if (!$p) return null;

        $it = $conn->prepare("SELECT i.produto_id AS id, e.nome_produto AS nome, i.quantidade AS qtd, i.preco_unitario AS preco
        FROM itens_venda i INNER JOIN estoque e ON e.id_estoque = i.produto_id WHERE i.venda_id = :v ORDER BY i.id_itens_venda");
    
        $it->execute([":v" => $idVenda]);
        $p["itens"] = $it->fetchAll(PDO::FETCH_ASSOC);
        foreach (["total", "subtotal", "desconto", "frete"] as $k) $p[$k] = (float) $p[$k];
        $p["id"] = (int) $p["id"];
        $p["parcelas"] = (int) $p["parcelas"];
        $p["troco_para"] = $p["troco_para"] !== null ? (float) $p["troco_para"] : null;
        foreach ($p["itens"] as &$i) { $i["id"] = (int) $i["id"]; $i["qtd"] = (int) $i["qtd"]; $i["preco"] = (float) $i["preco"]; }
        return $p;
    }

    function _r($v): string { return "R$ " . number_format((float) $v, 2, ",", "."); }
    function _h($v): string { return htmlspecialchars((string) $v, ENT_QUOTES, "UTF-8"); }

    function html_comprovante(array $p, array $cliente, array $cfg): string {
        $loja = _h($cfg["nome_loja"]);
        $linhas = "";
        foreach ($p["itens"] as $i) {
            $linhas .= "<tr><td style='padding:6px 8px;border-bottom:1px solid #e3efe7'>" . _h($i["nome"]) . "</td>"
                     . "<td style='padding:6px 8px;border-bottom:1px solid #e3efe7;text-align:center'>" . (int) $i["qtd"] . "</td>"
                     . "<td style='padding:6px 8px;border-bottom:1px solid #e3efe7;text-align:right'>" . _r($i["preco"]) . "</td>"
                    . "<td style='padding:6px 8px;border-bottom:1px solid #e3efe7;text-align:right'>" . _r($i["preco"] * $i["qtd"]) . "</td></tr>";
        }
        $desc = $p["desconto"] > 0 ? "<tr><td colspan='3' style='text-align:right;padding:4px 8px'>Desconto" . ($p["cupom"] ? " (" . _h($p["cupom"]) . ")" : "") . "</td><td style='text-align:right;padding:4px 8px'>- " . _r($p["desconto"]) . "</td></tr>" : "";
        $frete = $p["frete"] > 0 ? _r($p["frete"]) : "Grátis";

        $instrucao = "";
        switch ($p["status_venda"]) {
            case "Aguardando pagamento":
                $instrucao = "Seu pedido está aguardando o pagamento. Abra <strong>Meus Pedidos</strong> na loja para ver o QR Code / código PIX ou a linha digitável do boleto.";
            break;
            case "Pagar na entrega":
                $instrucao = "Pagamento em dinheiro na entrega." . ($p["troco_para"] ? " Troco para " . _r($p["troco_para"]) . "." : "") . " Tenha o valor em mãos.";
            break;
            case "Pago":
                $instrucao = "Pagamento confirmado. Já estamos separando o seu pedido.";
            break;
        }
        $prev = $p["previsao_entrega"] ? date("d/m/Y", strtotime($p["previsao_entrega"])) : "a combinar";

        return "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'></head>"
        . "<body style='margin:0;background:#edf7f0;font-family:Arial,Helvetica,sans-serif;color:#173322'>"
        . "<div style='max-width:620px;margin:0 auto;background:#fff'>"
        . "<div style='background:#063b1c;color:#fff;padding:20px 24px'><div style='font-size:20px;font-weight:bold'>🛒 $loja</div>"
        . "<div style='font-size:13px;color:#cfe9d7'>Comprovante de compra</div></div>"
        . "<div style='padding:22px 24px'>"
        . "<p style='margin:0 0 6px'>Olá, <strong>" . _h($cliente["nome"]) . "</strong>! Recebemos o seu pedido.</p>"
        . "<p style='margin:0 0 16px;font-size:14px'>Pedido <strong>#" . (int) $p["id"] . "</strong> · " . date("d/m/Y H:i", strtotime($p["data_venda"])) . "</p>"
        . ($instrucao ? "<div style='background:#e5f5ea;border-left:4px solid #1f9c50;padding:10px 12px;margin-bottom:18px;font-size:14px'>$instrucao</div>" : "")
        . "<table style='width:100%;border-collapse:collapse;font-size:14px'><thead><tr style='background:#f3faf5'>"
        . "<th style='text-align:left;padding:6px 8px'>Produto</th><th style='padding:6px 8px'>Qtd.</th><th style='text-align:right;padding:6px 8px'>Unit.</th><th style='text-align:right;padding:6px 8px'>Total</th></tr></thead><tbody>$linhas</tbody>"
        . "<tfoot><tr><td colspan='3' style='text-align:right;padding:4px 8px'>Subtotal</td><td style='text-align:right;padding:4px 8px'>" . _r($p["subtotal"]) . "</td></tr>$desc"
        . "<tr><td colspan='3' style='text-align:right;padding:4px 8px'>Frete</td><td style='text-align:right;padding:4px 8px'>$frete</td></tr>"
        . "<tr><td colspan='3' style='text-align:right;padding:8px;font-weight:bold'>Total</td><td style='text-align:right;padding:8px;font-weight:bold;font-size:16px'>" . _r($p["total"]) . "</td></tr></tfoot></table>"
        . "<h3 style='margin:22px 0 6px;font-size:15px;color:#157a3d'>Pagamento</h3>"
        . "<p style='margin:0;font-size:14px'>" . _h($p["pagamento_detalhe"] ?: $p["forma_nome"]) . " · <strong>" . _h($p["status_venda"]) . "</strong></p>"
        . "<h3 style='margin:22px 0 6px;font-size:15px;color:#157a3d'>Entrega</h3>"
        . "<p style='margin:0;font-size:14px'>" . _h($p["endereco_entrega"]) . "</p>"
        . "<p style='margin:8px 0 0;font-size:14px'>Previsão de entrega: <strong>$prev</strong><br>Status: <strong>" . _h($p["status_envio"] ?: "A enviar") . "</strong><br>"
        . "Código de rastreio: <strong style='letter-spacing:1px'>" . _h($p["codigo_rastreio"] ?: "—") . "</strong></p>"
        . "<p style='margin:24px 0 0;font-size:12px;color:#718078'>Acompanhe tudo em <strong>Meus Pedidos</strong> na loja. Guarde este e-mail como comprovante.</p>"
        . "</div></div></body></html>";
    }

// Envia o comprovante e guarda o resultado em venda.email_status. Devolve 'enviado' | 'simulado' | 'falhou'.   
    function enviar_comprovante(PDO $conn, int $idVenda, int $idCliente): string {
        $p = buscar_pedido($conn, $idVenda, $idCliente);
        $c = $conn->prepare("SELECT nome, email FROM usuario_cliente WHERE id_cliente = :c");
        $c->execute([":c" => $idCliente]);
        $cliente = $c->fetch(PDO::FETCH_ASSOC);
        if (!$p || !$cliente) return "falhou";

        $cfg = carregar_config($conn);
        $status = enviar_email($cliente["email"], "Comprovante do pedido #" . $p["id"] . " - " . $cfg["nome_loja"], html_comprovante($p, $cliente, $cfg));
        $conn->prepare("UPDATE venda SET email_status = :s WHERE id_vendas = :v")->execute([":s" => $status, ":v" => $idVenda]);
        return $status;
    } 
?>