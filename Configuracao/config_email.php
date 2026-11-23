<?php
// config_email.php - como o sistema envia o e-mail de comprovante.
//
// OPÇÃO 1 (mais simples, XAMPP): deixe 'smtp_host' vazio. O sistema tenta a função mail() do PHP.
//   Em muitos computadores o mail() não está configurado; nesse caso o e-mail NÃO sai, e uma cópia
//   do comprovante fica salva na pasta "logs_email" (para você mostrar no TCC).
//
// OPÇÃO 2 (e-mail de verdade): preencha o SMTP. Exemplo com Gmail:
//   'smtp_host'      => 'smtp.gmail.com',
//   'smtp_porta'     => 587,
//   'smtp_seguranca' => 'tls',                  // 'tls' (porta 587) ou 'ssl' (porta 465)
//   'smtp_usuario'   => 'seuemail@gmail.com',
//   'smtp_senha'     => 'senha-de-app',         // no Gmail: crie uma "Senha de app" na conta Google
    return [
        'smtp_host'       => '',
        'smtp_porta'      => 587,
        'smtp_seguranca'  => 'tls',
        'smtp_usuario'    => '',
        'smtp_senha'      => '',
        'remetente_email' => 'nao-responda@klpnunes.com.br',
        'remetente_nome'  => 'Mercado KLP.NUNES',
    ];
?>