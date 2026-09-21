      // controla os steppers de quantidade e recalcula os totais
      const itens = document.querySelectorAll(".item");

      function formatar(valor) {
        return valor.toLocaleString("pt-br", {
          style: "currency",
          currency: "BRL",
        });
      }

      function recalcular() {
        let subtotal = 0;
        let totalUnidades = 0;

        itens.forEach((item) => {
          if (item.style.display === "none") return;
          const preco = parseFloat(item.dataset.preco);
          const qtdInput = item.querySelector(".qtd input");
          const qtd = parseInt(qtdInput.value) || 0;
          const linhaValor = preco * qtd;
          item.querySelector(".valor-item").textContent = formatar(linhaValor);
          subtotal += linhaValor;
          totalUnidades += qtd;
        });

        const desconto = subtotal > 0 ? 2.8 : 0;
        const total = Math.max(subtotal - desconto, 0);

        document.getElementById("subtotal").textContent = formatar(subtotal);
        document.getElementById("desconto").textContent =
          subtotal > 0 ? "− " + formatar(desconto) : formatar(0);
        document.getElementById("total").textContent = formatar(total);
        document.getElementById("resumo-topo").textContent =
          totalUnidades > 0
            ? `${totalUnidades} ${totalUnidades === 1 ? "item selecionado" : "itens selecionados"}, prontos para a entrega.`
            : "Sua sacola está esperando os primeiros produtos.";

        const algumVisivel = Array.from(itens).some(
          (i) => i.style.display !== "none",
        );
        document.getElementById("lista-itens").style.display = algumVisivel
          ? "block"
          : "none";
        document.getElementById("carrinho-vazio").style.display = algumVisivel
          ? "none"
          : "block";
      }

      itens.forEach((item) => {
        const input = item.querySelector(".qtd input");
        item.querySelector(".menos").addEventListener("click", () => {
          input.value = Math.max((parseInt(input.value) || 1) - 1, 1);
          recalcular();
        });
        item.querySelector(".mais").addEventListener("click", () => {
          input.value = (parseInt(input.value) || 1) + 1;
          recalcular();
        });
        input.addEventListener("change", () => {
          if (!input.value || parseInt(input.value) < 1) input.value = 1;
          recalcular();
        });
        item.querySelector(".remover").addEventListener("click", () => {
          item.style.display = "none";
          recalcular();
        });
      });

      document.getElementById("esvaziar").addEventListener("click", () => {
        itens.forEach((item) => (item.style.display = "none"));
        recalcular();
      });

      recalcular();