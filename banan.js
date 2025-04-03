import { getAllFoodsFromIndexedDB, listenToFirebase } from './index.js';
import { updateFood, deleteFood as deleteFoodFromList } from './fire.js';

function goBack() {
    window.location.href = "quanlibanan.html"; // Quay về danh sách bàn ăn
}

// Gán sự kiện cho nút "Quay lại" để tránh lỗi không tìm thấy hàm
document.addEventListener("DOMContentLoaded", async function () {
    try {
        // Xử lý nút "Quay lại"
        const backBtn = document.querySelector(".back-btn");
        if (backBtn) {
            backBtn.addEventListener("click", goBack);
        }

        // Xử lý nút "Thanh toán"
        const checkoutBtn = document.getElementById("checkout-btn");
        if (checkoutBtn) {
            checkoutBtn.addEventListener("click", function () {
                handleCheckout(getTableIdFromUrl());
            });
        }   

        // Mở IndexedDB và lấy danh sách món ăn
        await openIndexedDB();
        const foods = await getAllFoodsFromIndexedDB();
        renderFoodList(foods); // Hàm renderFoodList bạn đã có sẵn
        const tableId = getTableIdFromUrl();  // Lấy ID bàn từ URL
        renderCart(tableId);
        listenToFirebase();
    } catch (error) {
        console.error(error);
    }
});
// Lắng nghe sự kiện thay đổi trong localStorage
window.addEventListener("storage", function(event) {
    if (event.key === "cartItems" || event.key === "tableId" || event.key === "price") {
        console.log("Dữ liệu trong localStorage đã thay đổi:", event);
        // Cập nhật lại giao diện hoặc làm các thao tác khác
    }
});


// ✅ Mở IndexedDB một lần duy nhất
let dbInstance = null;
async function openIndexedDB() {
    if (dbInstance) return dbInstance;
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("FoodDB", 4);
        request.onupgradeneeded = function (event) {
            let db = event.target.result;
            if (!db.objectStoreNames.contains("foods")) {
                db.createObjectStore("foods", { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = function (event) {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };
        request.onerror = function () {
            reject("❌ Lỗi mở IndexedDB!");
        };
    });
}

// ✅ Load món ăn từ IndexedDB


// ✅ Hiển thị danh sách món ăn
export function renderFoodList(foods) {
    let foodList = document.getElementById("food-list");
    if (!foodList) return;
    foodList.innerHTML = "<h3>📖 Danh sách món ăn</h3>";

    foods.forEach(food => {
        let div = document.createElement("div");
        div.classList.add("food-item");
        div.innerHTML = `
            <span>${food.name} - ${food.price} VND</span>
            <div class="food-buttons">
        <button class="edit-food" data-id="${food.id}">✏</button>
        <button class="delete-food" data-id="${food.id}">🗑</button>
        <button class="add-to-cart" data-id="${food.id}" data-name="${food.name}" data-price="${food.price}">🛒</button>
    </div>
        `;
        foodList.appendChild(div);
    });

    // ✅ Gán sự kiện cho các nút sau khi render lại
    attachEventListeners();
}

// ✅ Gán sự kiện cho các nút thêm vào giỏ hàng, sửa và xóa
function attachEventListeners() {
    document.querySelectorAll(".add-to-cart").forEach(button => {
        button.addEventListener("click", function () {
            addToCart(getTableIdFromUrl(), this.getAttribute("data-id"), this.getAttribute("data-name"), this.getAttribute("data-price"));
        });
    });

    document.querySelectorAll(".edit-food").forEach(button => {
        button.addEventListener("click", (event) => {
            const foodId = event.target.getAttribute('data-id');
            
            // Thay vì gọi editFood, gọi trực tiếp updateFood để cập nhật món ăn
            const newName = prompt("Nhập tên món ăn mới:");
            const newPrice = prompt("Nhập giá món ăn mới:");

            if (newName && newPrice) {
                // Gọi hàm updateFood từ fire.js
                updateFood(foodId, newName, newPrice);  // Gọi trực tiếp hàm updateFood để sửa món ăn
            } else {
                alert("Vui lòng cung cấp đủ thông tin!");
            }
        });
    });

    document.querySelectorAll(".delete-food").forEach(button => {
        button.addEventListener("click", function () {
            const foodId = this.getAttribute("data-id");

            const confirmDelete = confirm("Bạn có chắc chắn muốn xóa món ăn này không?");
            if (confirmDelete) {
                deleteFood(foodId);
            } else {
                alert("❌ Bạn đã hủy việc xóa món ăn.");
            }
        });
    });
}

// ✅ Thêm món ăn vào giỏ hàng
function addToCart(tableId, id, name, price) {
    if (!id || !name || !price) {
        alert("❌ Lỗi: Món ăn không hợp lệ!");
        return;
    }

    let cart = loadCart(tableId); // Lấy giỏ hàng của bàn từ localStorage
    let existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price: parseInt(price), quantity: 1 });
    }

    saveCart(tableId, cart); // Lưu giỏ hàng vào localStorage
    renderCart(tableId); // Cập nhật lại giỏ hàng trên giao diện
}

// Lưu giỏ hàng vào localStorage cho mỗi bàn
function saveCart(tableId, cart) {
    localStorage.setItem(`cart_ban${tableId}`, JSON.stringify(cart));
}

// Lấy giỏ hàng từ localStorage cho bàn cụ thể
function loadCart(tableId) {
    return JSON.parse(localStorage.getItem(`cart_ban${tableId}`)) || [];
}


// Hiển thị giỏ hàng bên phải màn hình
function renderCart(tableId) {
    let cartItemsContainer = document.getElementById("cart-items");
    let cart = loadCart(tableId); // Lấy giỏ hàng của bàn từ localStorage

    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "<p>🛒 Giỏ hàng trống!</p>";
        return;
    }

    cart.forEach(item => {
        let itemDiv = document.createElement("div");
        itemDiv.classList.add("cart-item");
        itemDiv.innerHTML = `
            <span>${item.name} - ${item.price} VND (x${item.quantity})</span>
            <button class="decrease-qty" data-id="${item.id}">➖</button>
            <button class="increase-qty" data-id="${item.id}">➕</button>
            <button class="remove-item" data-id="${item.id}">❌</button>
        `;
        cartItemsContainer.appendChild(itemDiv);
    });

    // Gán sự kiện cho các nút tăng, giảm số lượng, xóa món ăn
    document.querySelectorAll(".increase-qty").forEach(button => {
        button.addEventListener("click", function () {
            updateQuantity(tableId, this.getAttribute("data-id"), 1);
        });
    });

    document.querySelectorAll(".decrease-qty").forEach(button => {
        button.addEventListener("click", function () {
            updateQuantity(tableId, this.getAttribute("data-id"), -1);
        });
    });

    document.querySelectorAll(".remove-item").forEach(button => {
        button.addEventListener("click", function () {
            removeFromCart(tableId, this.getAttribute("data-id"));
        });
    });
}

// Cập nhật số lượng món ăn trong giỏ hàng
function updateQuantity(tableId, id, change) {
    let cart = loadCart(tableId);
    let item = cart.find(item => item.id === id);

    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== id);
        }
    }

    saveCart(tableId, cart); // Lưu lại giỏ hàng sau khi thay đổi
    renderCart(tableId); // Cập nhật lại giỏ hàng trên giao diện
}

// Xóa món ăn khỏi giỏ hàng
function removeFromCart(tableId, id) {
    let cart = loadCart(tableId);
    cart = cart.filter(item => item.id !== id);

    saveCart(tableId, cart); // Lưu giỏ hàng đã thay đổi vào localStorage
    renderCart(tableId); // Cập nhật lại giỏ hàng trên giao diện
}

// Xử lý thanh toán
// Xử lý thanh toán
// Lấy danh sách món ăn trong giỏ hàng từ IndexedDB
// Xử lý thanh toán
function handleCheckout(tableId) {
    try {
        const cartItems = loadCart(tableId); // 🔥 Lấy giỏ hàng từ localStorage thay vì IndexedDB
        if (!cartItems || cartItems.length === 0) {
            alert("❌ Giỏ hàng trống!");
            return;
        }

        // Tính tổng tiền từ giỏ hàng
        const totalAmount = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

        // Lưu thông tin vào localStorage để hiển thị ở trang thanh toán
        localStorage.setItem("tableId", tableId);
        localStorage.setItem("totalAmount", totalAmount);
        localStorage.setItem("cartItems", JSON.stringify(cartItems)); // 🔥 Lưu cả giỏ hàng để hiển thị

        // Chuyển sang trang thanh toán
        window.location.href = "thanhtoan.html";
    } catch (error) {
        console.error("❌ Lỗi khi thanh toán: ", error);
    }
}





// ✅ Lấy tableId từ URL
function getTableIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get("tableId") || "1";
    console.log("Table ID:", tableId); // Log ra tableId để kiểm tra
    return tableId;
}

// Xử lý thanh toán
