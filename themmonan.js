// 🔥 Import Firestore từ fire.js
import { addFood } from "./fire.js";

// 📌 Bắt sự kiện khi nhấn nút "Thêm Món"
document.getElementById("addFoodBtn").addEventListener("click", async () => {
    let name = document.getElementById("foodName").value.trim();
    let price = document.getElementById("foodPrice").value.trim();

    if (!name || !price) {
        alert("⚠️ Vui lòng nhập đầy đủ thông tin món ăn!");
        return;
    }

    try {
        await addFood(name, price); // 🔥 Kiểm tra & thêm món ăn
        document.getElementById("foodName").value = "";
        document.getElementById("foodPrice").value = "";
    } catch (error) {
        console.error("❌ Lỗi khi thêm món ăn:", error);
        alert("❌ Không thể thêm món ăn, vui lòng thử lại!");
    }
});
