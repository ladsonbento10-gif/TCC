<?php   
    // config_loja.php - configurações da loja (tabela `configuracao`), com valores padrão.
    // Usado pelo painel do administrador (Configurações) e pela loja do cliente.

    function config_padrao(): array {
        return [
            'nome_loja'          => 'Mercado KLP.NUNES',
            'email_loja'         => '',
            'telefone_loja'      => '',
            'estoque_baixo'      => '10',
            'frete_valor'        => '9.90',
            'frete_gratis_acima' => '100',
            'prazo_entrega_dias' => '2',
            'cupom_codigo'       => 'KLP10',
            'cupom_percentual'   => '10',
            'parcelas_max'       => '6',
            'pix_chave'          => '',
            'pix_nome'           => 'MERCADO KLP NUNES',
            'pix_cidade'         => 'TUBARAO',
        ];
    }

    function carregar_config(PDO $conn): array {
        $cfg = config_padrao();
        try{
            $linhas = $conn->query("SELECT chave, valor FROM configuracao")->fetchAll(PDO::FETCH_KEY_PAIR);
            foreach ($linhas as $k => $v) {
                if(array_key_exists($k, $cfg)) $cfg[$k] = (string) $v;
            }
        }catch(PDOException $e){
            // tabela ainda não criada: usa os valores padrão
        }
        return $cfg;
    }
// Só o que a loja do cliente pode ver (nada de e-mail interno etc.)
    function config_publica(array $cfg): array {
        return [
            'nome_loja'          => $cfg['nome_loja'],
            'telefone_loja'      => $cfg['telefone_loja'],
            'frete_valor'        => (float) $cfg['frete_valor'],
            'frete_gratis_acima' => (float) $cfg['frete_gratis_acima'],
            'prazo_entrega_dias' => (int) $cfg['prazo_entrega_dias'],
            'cupom_percentual'   => (float) $cfg['cupom_percentual'],
            'cupom_codigo'       => $cfg['cupom_codigo'], // cupom promocional: aparece no banner da loja
            'cupom_ativo'        => $cfg['cupom_codigo'] !== '' && (float) $cfg['cupom_percentual'] > 0,
            'parcelas_max'       => max(1, (int) $cfg['parcelas_max']),
            'pix_nome'           => $cfg['pix_nome'],
            'pix_cidade'         => $cfg['pix_cidade'],
            'pix_chave'          => $cfg['pix_chave'],
        ];
    }
?>