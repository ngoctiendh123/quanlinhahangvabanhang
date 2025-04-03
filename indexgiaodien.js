document.addEventListener("DOMContentLoaded", function () {
    const links = document.querySelectorAll("nav ul li a");

    links.forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            const page = this.getAttribute("href");
            if (page !== "/quanlibanan.html") {
                window.location.href = page; // Chuyển đến trang được chọn
            } else {
                alert("Tính năng này đang được phát triển!");
            }
            if (page !== "/quanlibanhang.html") {
                window.location.href = page; // Chuyển đến trang được chọn
            } else {
                alert("Tính năng này đang được phát triển!");
            }
        });
    });

    // Xử lý lưu dữ liệu dựa trên trạng thái mạng
    
function saveProduct(product) {
    if (navigator.onLine) {
        addProductToFirebase(product);
    } else {
        addProductToIndexedDB(product);
    }
}
    
});
// Kiểm tra xem trình duyệt có hỗ trợ service workers không
