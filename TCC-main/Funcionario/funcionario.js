document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            localStorage.setItem("menuAdminRecolhido", sidebar.classList.contains("collapsed") ? "1" : "0");
        });

        if (localStorage.getItem("menuAdminRecolhido") === "1") {
            sidebar.classList.add("collapsed");
        }
    }
});
