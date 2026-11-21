document.addEventListener("DOMContentLoaded", () => {
    // O menu lateral, o nome do administrador e o "Sair" ficam em admin_menu.js.
    // Gráfico dos 6 meses.
    const canvas = document.getElementById("salesChart");
    if (canvas && window.Chart) { // sem internet o gráfico não carrega, mas o resto da página funciona
        const ctx = canvas.getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "rgba(31, 156, 80, 0.30)");
        gradient.addColorStop(1, "rgba(31, 156, 80, 0.0)");

        window.salesChartInst = new Chart(ctx, {
            type: "line",
            data: {
                labels: [], // preenchido pelo banco (admin_painel.js)
                datasets: [{
                    label: "Vendas (R$)",
                    data: [],
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
                            color: "#5a7a63",
                            font: { size: 11 }
                        },
                        grid: { color: "#edf7f0" }
                    },
                    x: {
                        ticks: { color: "#5a7a63", font: { size: 11 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }
});