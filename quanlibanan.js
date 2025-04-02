document.addEventListener("DOMContentLoaded", function () {
    const menuToggle = document.getElementById("menu-toggle");
    const menuSection = document.getElementById("menu-section");

    // Xử lý khi bấm vào nút menu
    menuToggle.addEventListener("click", function () {
        menuSection.classList.toggle("menu-active");
    });

    // Ẩn menu nếu bấm ra ngoài
    document.addEventListener("click", function (event) {
        if (!menuSection.contains(event.target) && !menuToggle.contains(event.target)) {
            menuSection.classList.remove("menu-active");
        }
    });

    // Hiển thị danh sách bàn
    const tablesContainer = document.getElementById("tables-container");

    function renderTables() {
        tablesContainer.innerHTML = "";
        for (let i = 1; i <= 15; i++) {
            const table = document.createElement("div");
            table.classList.add("table");
            table.textContent = `Bàn ${i}`; 
            table.dataset.tableId = i;
            table.addEventListener("click", () => openTable(i));
            tablesContainer.appendChild(table);
        }
    }

    function openTable(tableId) {
        window.location.href = `banan.html?tableId=${tableId}`;
    }

    renderTables();
});
