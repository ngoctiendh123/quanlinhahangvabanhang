import { db } from "./fire.js";
import { setDoc, doc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { saveRevenueToIndexedDB } from "./index.js";

document.addEventListener("DOMContentLoaded", function () {
    const tableId = localStorage.getItem("tableId");
    const totalAmount = localStorage.getItem("totalAmount");
    const cartItems = JSON.parse(localStorage.getItem("cartItems")) || [];

    const tableIdElement = document.getElementById("table-id");
    const totalAmountElement = document.getElementById("total-amount");
    const cartList = document.getElementById("cart-list");

    if (tableIdElement) tableIdElement.innerText = `Bàn ăn: ${tableId}`;
    if (totalAmountElement) totalAmountElement.innerText = `Tổng tiền: ${totalAmount} VND`;

    if (cartList) {
        cartItems.forEach(item => {
            let li = document.createElement("li");
            li.textContent = `${item.name} - ${item.price} VND (x${item.quantity})`;
            cartList.appendChild(li);
        });
    }

    if (tableId && totalAmount) {
        generateQRCode(tableId, totalAmount);
    } else {
        console.error("❌ Thiếu thông tin để tạo mã QR!");
    }

    const confirmPaymentBtn = document.getElementById("confirm-payment-btn");
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener("click", async function () {
            await confirmCashPayment();
        });
    }
});

// Hàm tạo mã QR thanh toán
function generateQRCode(tableId, totalAmount) {
    const qrImg = document.getElementById("qr-code");
    if (!qrImg) {
        console.error("❌ Không tìm thấy thẻ <img id='qr-code'> trong HTML.");
        return;
    }

    const qrUrl = `https://img.vietqr.io/image/MbBank-0858282188-compact.jpg?amount=${totalAmount}&addInfo=ThanhToanBàn${tableId}&size=300x300`;
    qrImg.src = qrUrl;
    console.log("✅ Mã QR đã được tạo:", qrUrl);
}

// Hàm xác nhận thanh toán tiền mặt & lưu vào Firebase
async function confirmCashPayment() {
    const tableId = localStorage.getItem("tableId");
    let totalAmount = parseFloat(localStorage.getItem("totalAmount"));
    const cartItems = JSON.parse(localStorage.getItem("cartItems")) || [];

    if (!tableId || isNaN(totalAmount) || totalAmount <= 0 || cartItems.length === 0) {
        alert("❌ Thông tin thanh toán không hợp lệ!");
        return;
    }

    try {
        const revenueId = await getNextRevenueId();

        const orderData = {
            id: revenueId, 
            tableId: tableId,
            totalAmount: totalAmount,  // Kiểm tra chắc chắn trường này có giá trị
            items: cartItems,
            timestamp: getCurrentVietnamTime()  // Cập nhật thời gian theo múi giờ Việt Nam
        };

        console.log("✅ Dữ liệu doanh thu:", orderData);  // Kiểm tra dữ liệu trước khi lưu vào Firebase

        // Lưu vào Firebase
        await setDoc(doc(db, "revenue", revenueId.toString()), orderData);
        console.log(`✅ Đơn hàng ${revenueId} đã lưu vào Firebase!`);

        // Lưu vào IndexedDB
        await saveRevenueToIndexedDB(orderData);
        console.log("✅ Dữ liệu đã được đồng bộ xuống IndexedDB!");

        // Xóa giỏ hàng khỏi localStorage
        localStorage.removeItem(`cart_ban${tableId}`);
        localStorage.removeItem("cartItems");
        localStorage.removeItem("tableId");
        localStorage.removeItem("totalAmount");

        // Thông báo thanh toán thành công
        alert(`✅ Thanh toán tiền mặt cho Bàn số ${tableId} đã thành công!`);

        // Chuyển trang sau khi thanh toán
        window.location.href = "quanlibanan.html";
    } catch (error) {
        console.error("❌ Lỗi khi thanh toán:", error);
        alert("❌ Không thể lưu thanh toán, vui lòng thử lại!");
    }
}

// Hàm lấy thời gian thực theo múi giờ Việt Nam
function getCurrentVietnamTime() {
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false
    };

    const vietnamTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', ...options });
    
    return vietnamTime.replace(',', ''); // Loại bỏ dấu phẩy giữa giờ phút giây và ngày tháng
}

// Lấy ID tự động tăng cho doanh thu
async function getNextRevenueId() {
    try {
        const revenueCollection = collection(db, "revenue");
        const snapshot = await getDocs(revenueCollection);

        // Lấy danh sách ID hiện tại trong collection revenue
        let ids = snapshot.docs.map(doc => parseInt(doc.id, 10)).filter(id => !isNaN(id));

        // Nếu không có ID nào, bắt đầu từ 1
        if (ids.length === 0) {
            return 1;
        }

        // Sắp xếp ID theo thứ tự tăng dần và lấy ID tiếp theo
        ids.sort((a, b) => a - b);
        const nextId = ids[ids.length - 1] + 1; // ID tiếp theo là ID lớn nhất + 1

        return nextId;
    } catch (error) {
        console.error("❌ Lỗi khi lấy ID tự động tăng:", error);
        throw new Error("Không thể lấy ID tự động tăng!");
    }
}
