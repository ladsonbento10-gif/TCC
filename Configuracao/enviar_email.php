<?php
    // enviar_email.php - envia e-mail HTML (SMTP se configurado, senão mail()).
    // Se nada funcionar, guarda uma cópia em logs_email/ e devolve "simulado". 
    // enviar_email($para, $assunto, $html) devolve: 'enviado' | 'simulado' | 'falhou'

    function _email_cabecalho_texto(string $t): string {
        return '=?UTF-8?B?' . base64_encode($t) . '?=';
    }

    function _smtp_ler($sock): string {
        $resp = '';
        while (($linha = fgets($sock, 515)) !== false) {
            $resp .= $linha;
            if (strlen($linha) < 4 || $linha[3] === ' ') break;
        }
        return $resp;
    }

    function _smtp_cmd($sock, string $cmd, array $ok): bool {
        fwrite($sock, $cmd . "\r\n");
        $r = _smtp_ler($sock);
        return in_array((int) substr($r, 0, 3), $ok, true);
    }

    function _smtp_enviar(array $c, string $para, string $assunto, string $corpoMime): bool {
        $host = $c['smtp_host'];
        $porta = (int) $c['smtp_porta'];
        $ssl = $c['smtp_seguranca'] === 'ssl';
        $sock = @stream_socket_client(($ssl ? 'ssl://' : 'tcp://') . $host . ':' . $porta, $en, $es, 12);
        if (!$sock) return false;
        stream_set_timeout($sock, 12);
        $ok = false;
    try{
        if ((int) substr(_smtp_ler($sock), 0, 3) !== 220) throw new Exception('banner');
        $nome = $_SERVER['SERVER_NAME'] ?? 'localhost';
        if (!_smtp_cmd($sock, "EHLO $nome", [250])) throw new Exception('ehlo');
        if (!$ssl && $c['smtp_seguranca'] === 'tls') {
            if (!_smtp_cmd($sock, 'STARTTLS', [220])) throw new Exception('starttls');
            if (!stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new Exception('tls');
            if (!_smtp_cmd($sock, "EHLO $nome", [250])) throw new Exception('ehlo2');
        }
        if ($c['smtp_usuario'] !== '') {
            if (!_smtp_cmd($sock, 'AUTH LOGIN', [334])) throw new Exception('auth');
            if (!_smtp_cmd($sock, base64_encode($c['smtp_usuario']), [334])) throw new Exception('user');
            if (!_smtp_cmd($sock, base64_encode($c['smtp_senha']), [235])) throw new Exception('senha');
        }
        $de = $c['smtp_usuario'] !== '' && filter_var($c['smtp_usuario'], FILTER_VALIDATE_EMAIL) ? $c['smtp_usuario'] : $c['remetente_email'];
        if (!_smtp_cmd($sock, "MAIL FROM:<$de>", [250])) throw new Exception('from');
        if (!_smtp_cmd($sock, "RCPT TO:<$para>", [250, 251])) throw new Exception('rcpt');
        if (!_smtp_cmd($sock, 'DATA', [354])) throw new Exception('data');
        $dados = str_replace("\n.", "\n..", $corpoMime);
        fwrite($sock, $dados . "\r\n.\r\n");
        $ok = (int) substr(_smtp_ler($sock), 0, 3) === 250;
        _smtp_cmd($sock, 'QUIT', [221]);
    } catch (Exception $e) {
        $ok = false;
    }
    fclose($sock);
    return $ok;
}

    function _guardar_copia_email(string $para, string $assunto, string $html): void {
        $dir = __DIR__ . '/logs_email';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
            @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n"); // não deixa abrir pelo navegador
            @file_put_contents($dir . '/index.html', '');
        }
        $arq = $dir . '/' . date('Ymd_His') . '_' . substr(md5($para . microtime()), 0, 6) . '.html';
        @file_put_contents($arq, "<!-- Para: $para | Assunto: $assunto -->\n" . $html);
    }

    function enviar_email(string $para, string $assunto, string $html): string {
        if (!filter_var($para, FILTER_VALIDATE_EMAIL)) return 'falhou';

        $c = @include __DIR__ . '/config_email.php';
        if (!is_array($c)) $c = [];
        $c += ['smtp_host' => '', 'smtp_porta' => 587, 'smtp_seguranca' => 'tls', 'smtp_usuario' => '', 'smtp_senha' => '',
           'remetente_email' => 'nao-responda@localhost', 'remetente_nome' => 'Mercado'];

        $de = $c['remetente_email'];
        $cab  = "MIME-Version: 1.0\r\n";
        $cab .= "From: " . _email_cabecalho_texto($c['remetente_nome']) . " <$de>\r\n";
        $cab .= "Content-Type: text/html; charset=UTF-8\r\n";
        $cab .= "Content-Transfer-Encoding: base64\r\n";
        $corpo = chunk_split(base64_encode($html));

        $enviou = false;
        if ($c['smtp_host'] !== '') {
            $mime = $cab . "To: <$para>\r\nSubject: " . _email_cabecalho_texto($assunto) . "\r\nDate: " . date('r') . "\r\n\r\n" . $corpo;
            $enviou = _smtp_enviar($c, $para, $assunto, $mime);
            if ($enviou) return 'enviado';
            _guardar_copia_email($para, $assunto, $html);
            return 'falhou';
        }

        $enviou = @mail($para, _email_cabecalho_texto($assunto), $corpo, $cab);
        if ($enviou) return 'enviado';

        _guardar_copia_email($para, $assunto, $html);
        return 'simulado';
    }
?>