<?php
    include("../conexao_tcc.php");

    $sql = "SELECT e.id_estoque,e.nome_produto,e.descricao,e.quantidade,e.preco,
        e.ativo,e.data_cadastro, c.nome AS categoria, m.nome AS marca
        FROM estoque e INNER JOIN categoria c ON e.categoria_id = c.id_categoria
        INNER JOIN marca m     ON e.marca_id     = m.id_marca ORDER BY e.id_estoque DESC";

    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Produtos Cadastrados</title>
    <link rel="stylesheet" href="estoque.css">
</head>
<body>
<div class="container">

    <a href="estoque.php" class="btn-voltar">← Cadastrar Produto</a>
    <h1>Produtos Cadastrados</h1>

    <?php if (count($produtos) > 0): ?>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Produto</th>
                <th>Descrição</th>
                <th>Marca</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Preço</th>
                <th>Status</th>
                <th>Data Cadastro</th>
                <th>Ações</th> <!-- Nova coluna para Editar/Excluir -->
            </tr>
        </thead>
        <tbody>
            <?php foreach ($produtos as $p): ?>
            <tr>
                <td><?= $p['id_estoque'] ?></td>
                <td><?= htmlspecialchars($p['nome_produto']) ?></td>
                <td><?= htmlspecialchars($p['descricao']) ?></td>
                <td><?= htmlspecialchars($p['marca']) ?></td>
                <td><?= htmlspecialchars($p['categoria']) ?></td>
                <td><?= $p['quantidade'] ?></td>
                <td class="preco">R$ <?= number_format($p['preco'], 2, ',', '.') ?></td>
                <td>
                    <?php if ($p['ativo']): ?>
                        <span class="ativo">Ativo</span>
                    <?php else: ?>
                        <span class="inativo">Inativo</span>
                    <?php endif; ?>
                </td>
                <td><?= date('d/m/Y H:i', strtotime($p['data_cadastro'])) ?></td>
                <td>
                    <!-- Links provisórios para as futuras funções de edição e exclusão -->
                    <a href="editar_produto.php?id=<?= $p['id_estoque'] ?>" class="btn-acao btn-editar">✏️ Editar</a>
                    <a href="excluir_produto.php?id=<?= $p['id_estoque'] ?>" class="btn-acao btn-excluir" onclick="return confirm('Deseja realmente excluir este produto?')">🗑️ Excluir</a>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <?php else: ?>
        <div class="sem-produto">Nenhum produto cadastrado.</div>
    <?php endif; ?>

</div>
</body>
</html>