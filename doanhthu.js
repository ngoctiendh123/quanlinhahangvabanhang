import { openIndexedDB } from "./index.js"; // Đảm bảo đường dẫn chính xác

document.addEventListener("DOMContentLoaded", async function () {
    await displayRevenue();
    
    const backButton = document.getElementById("back-btn");
    if (backButton) {
        backButton.addEventListener("click", function() {
            window.location.href = "quanlibanan.html"; // Chuyển hướng về trang quanlibanan.html
        });
    }
});

// ===========================
// 📊 **Lấy doanh thu từ IndexedDB & hiển thị**
// ===========================
async function getRevenueFromIndexedDB() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        let transaction = db.transaction("revenue", "readonly");
        let store = transaction.objectStore("revenue");
        let request = store.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = () => {
            reject("❌ Lỗi khi lấy dữ liệu doanh thu từ IndexedDB");
        };
    });
}

async function displayRevenue() {
    let revenueList = document.getElementById("revenue-list");
    if (!revenueList) {
        console.error("❌ Không tìm thấy phần tử #revenue-list trong HTML!");
        return;
    }

    let revenues = await getRevenueFromIndexedDB();
    revenueList.innerHTML = ""; // Xóa nội dung cũ

    revenues.forEach((revenue) => {
        let totalAmount = revenue.totalAmount ? revenue.totalAmount.toLocaleString() + " VND" : "0 VND";
        let tableId = revenue.tableId || "Không xác định";
        let timestamp = revenue.timestamp ? new Date(revenue.timestamp).toLocaleString() : "Chưa có";

        let row = document.createElement("tr");
        row.innerHTML = `
            <td>${revenue.id || "Không xác định"}</td>
            <td>${tableId}</td>
            <td>${totalAmount}</td>
            <td>${timestamp}</td>
        `;
        revenueList.appendChild(row);
    });
}
