document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");

    // Menu lateral: recolhe/expande mantendo apenas os ícones quando recolhido.
    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            localStorage.setItem("menuAdminRecolhido", sidebar.classList.contains("collapsed") ? "1" : "0");
        });

        if (localStorage.getItem("menuAdminRecolhido") === "1") {
            sidebar.classList.add("collapsed");
        }
    }

    // Mostra o nome do administrador que acabou de entrar.
    const nomeAdmin = localStorage.getItem("nomeAdmin");
    if (nomeAdmin) {
        const nomeHeader = document.getElementById("nomeAdminHeader");
        const nomeBoasVindas = document.getElementById("nomeAdminBoasVindas");

        if (nomeHeader) nomeHeader.textContent = nomeAdmin;
        if (nomeBoasVindas) nomeBoasVindas.textContent = nomeAdmin;
    }

    // Confirmação antes de sair.
    const btnSair = document.getElementById("btnSair");
    if (btnSair) {
        btnSair.addEventListener("click", (event) => {
            const confirmou = confirm("Tem certeza que deseja sair da Área do Administrador?");

            if (!confirmou) {
                event.preventDefault();
            }
        });
    }

    // Gráfico dos 6 meses.
    const canvas = document.getElementById("salesChart");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "rgba(31, 156, 80, 0.30)");
        gradient.addColorStop(1, "rgba(31, 156, 80, 0.0)");

        new Chart(ctx, {
            type: "line",
            data: {
                labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
                datasets: [{
                    label: "Vendas (R$)",
                    data: [8000, 10000, 13000, 10000, 15000, 22000],
                    borderColor: "#1f9c50",
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: "#1f9c50",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return " Vendas: R$ " + context.parsed.y.toLocaleString("pt-BR");
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return "R$ " + value.toLocaleString("pt-BR");
                            },
                            color: "#64748b",
                            font: { size: 11 }
                        },
                        grid: { color: "#f1f5f9" }
                    },
                    x: {
                        ticks: { color: "#64748b", font: { size: 11 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }
});
