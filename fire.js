import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { 
    getFirestore, collection, getDocs, setDoc, doc, onSnapshot, query, where, deleteDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";


// ✅ Cấu hình Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCg1SRJw2BRm5501jNXBwaMFlF_NFXgqo",
    authDomain: "quanlinhahang-e9a38.firebaseapp.com",
    projectId: "quanlinhahang-e9a38",
    storageBucket: "quanlinhahang-e9a38.appspot.com",
    messagingSenderId: "334232846720",
    appId: "1:334232846720:web:122dc4ff290d563b078165",
    measurementId: "G-FC4GH2YVBM"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
window.firebaseDB = db;

// ===============================
// 🔍 **Kiểm tra món ăn đã tồn tại**
// ===============================
import { openIndexedDB, getAllFoodsFromIndexedDB } from "./index.js";




// ===============================
// 🆔 **Lấy ID tiếp theo dạng số**
// ===============================
async function getNextFoodId() {
    const foodsCollection = collection(db, "foods");
    const snapshot = await getDocs(foodsCollection);
    
    let ids = snapshot.docs.map(doc => parseInt(doc.id, 10)).filter(id => !isNaN(id));
    ids.sort((a, b) => a - b);

    let nextId = 1;
    for (let id of ids) {
        if (id !== nextId) break;
        nextId++;
    }

    return nextId.toString();
}

// ===============================
// 🍽️ **Thêm món ăn vào Firebase**
// ===============================
// 🔍 **Hàm kiểm tra món ăn đã tồn tại trong Firebase**
async function foodExists(name) {
    const foodsCollection = collection(db, "foods");
    const q = query(foodsCollection, where("name", "==", name.trim()));
    const snapshot = await getDocs(q);
    return !snapshot.empty; // Nếu có món ăn trùng tên, trả về true
}

// 🔥 Xuất hàm để sử dụng ở nơi khác nếu cần
export { foodExists };

async function addFood(name, price) {
    try {
        if (!name || !price) throw new Error("⚠️ Vui lòng nhập đầy đủ thông tin món ăn!");

        // ✅ Kiểm tra món ăn đã tồn tại hay chưa
        if (await foodExists(name)) {
            alert(`⚠️ Món "${name}" đã tồn tại trong danh sách!`);
            return;
        }

        const newId = await getNextFoodId();
        await setDoc(doc(db, "foods", newId), { 
            name: name.trim(),
            price: parseFloat(price)
        });

        alert(`✅ Món \"${name}\" đã thêm thành công!`);
    } catch (error) {
        console.error("❌ Lỗi khi thêm món ăn:", error);
        alert("❌ Không thể thêm món ăn, vui lòng thử lại!");
    }
}
async function fetchFoods() {
    const foodsCollection = collection(db, "foods");
    const snapshot = await getDocs(foodsCollection);
    
    let foods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    renderFoodList(foods);
}

// ===============================
// 🗑️ **Xóa món ăn khỏi Firebase và IndexedDB**
// ===============================
async function deleteFood(foodId) {
    try {
        if (!foodId) throw new Error("⚠️ Vui lòng cung cấp ID món ăn để xóa!");

        console.log("🔄 Bắt đầu xóa món ăn với ID:", foodId);

        // ✅ Xóa món ăn khỏi Firebase
        await deleteDoc(doc(db, "foods", foodId));
        console.log(`✅ Đã xóa món ăn ID ${foodId} khỏi Firebase!`);

        // ✅ Xóa món ăn khỏi IndexedDB
        const indexedDBInstance = await openIndexedDB();

        // Kiểm tra objectStore trước khi mở transaction
        if (!indexedDBInstance.objectStoreNames.contains("foods")) {
            throw new Error("❌ Không tìm thấy bảng 'foods' trong IndexedDB!");
        }

        const transaction = indexedDBInstance.transaction(["foods"], "readwrite");
        const store = transaction.objectStore("foods");
        transaction.oncomplete = () => {
            console.log(`✅ Đã xóa món ăn ID ${foodId} khỏi IndexedDB!`);
            alert(`✅ Món ăn ID ${foodId} đã được xóa thành công!`);
        };
        
        transaction.onerror = (event) => {
            console.error("❌ Lỗi khi xóa món ăn khỏi IndexedDB:", event.target.error);
            alert("❌ Không thể xóa món ăn trong IndexedDB!");
        };
        const idToDelete = isNaN(foodId) ? foodId : parseInt(foodId, 10);
        
        // 🔥 Gọi xóa trước khi đặt sự kiện
        store.delete(idToDelete);  
    } catch (error) {
        console.error("❌ Lỗi khi xóa món ăn:", error);
        alert(`❌ Lỗi khi xóa món ăn: ${error.message}`);
    }
}


// ===============================
// 🔄 **Quản lý IndexedDB**
// ===============================


async function syncFirebaseToIndexedDB() {
    try {
        console.log("🔄 Đang đồng bộ Firebase xuống IndexedDB...");
        const snapshot = await getDocs(collection(window.firebaseDB, "foods"));

        let firebaseData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        await updateIndexedDB(firebaseData);
    } catch (error) {
        console.error("❌ Lỗi khi đồng bộ Firebase xuống IndexedDB:", error);
    }

    // 🔄 Lắng nghe Firebase → Cập nhật IndexedDB khi có thay đổi
    onSnapshot(collection(window.firebaseDB, "foods"), async (snapshot) => {
        let firebaseData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // 🔍 Kiểm tra xem dữ liệu Firebase và IndexedDB có giống nhau không
        const indexedDBData = await getAllFoodsFromIndexedDB();
        if (!isDataEqual(firebaseData, indexedDBData)) {
            console.log("🔄 Firebase thay đổi → Cập nhật IndexedDB!");
            await updateIndexedDB(firebaseData);
        } else {
            console.log("✅ Firebase và IndexedDB đã đồng nhất, không cần cập nhật.");
        }
    });
}



async function updateIndexedDB(firebaseData) {
    let db = await openIndexedDB();

    return new Promise((resolve, reject) => {
        let transaction = db.transaction("foods", "readwrite");
        let store = transaction.objectStore("foods");

        store.clear(); // Xóa dữ liệu cũ

        let promises = firebaseData.map(food => {
            return new Promise((res, rej) => {
                let request = store.put(food);
                request.onsuccess = () => res();
                request.onerror = () => rej("❌ Lỗi khi thêm dữ liệu vào IndexedDB");
            });
        });

        // Đợi tất cả dữ liệu được thêm vào rồi mới đóng transaction
        Promise.all(promises)
            .then(() => {
                console.log("✅ IndexedDB đã cập nhật xong!");
                resolve();
            })
            .catch(error => {
                console.error("❌ Lỗi khi cập nhật IndexedDB:", error);
                reject(error);
            });
    });
}

// 📥 **Hàm lấy toàn bộ dữ liệu từ IndexedDB**


// 🔍 **Hàm kiểm tra xem hai danh sách dữ liệu có giống nhau không**
function isDataEqual(firebaseData, indexedDBData) {
    if (firebaseData.length !== indexedDBData.length) return false;

    let firebaseMap = new Map(firebaseData.map(food => [food.id, food]));
    
    for (let food of indexedDBData) {
        let correspondingFood = firebaseMap.get(food.id);
        if (!correspondingFood || !isObjectEqual(food, correspondingFood)) {
            return false;
        }
    }
    
    return true;
}

// 🔍 **Hàm kiểm tra hai đối tượng có giống nhau không (tránh cập nhật không cần thiết)**
function isObjectEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}



// ✅ Kích hoạt đồng bộ khi mở trang
syncFirebaseToIndexedDB();




// ===============================
// ✏️ **Sửa món ăn trong Firebase và IndexedDB**
// ===============================
async function updateFood(foodId, newName, newPrice) {
    try {
        console.log("🔄 Đang sửa món ăn trên Firebase với ID:", foodId);

        const db = getFirestore();
        const foodRef = doc(db, "foods", foodId);
        const foodSnapshot = await getDoc(foodRef);

        if (foodSnapshot.exists()) {
            console.log("✅ Món ăn tìm thấy trên Firebase:", foodSnapshot.data());

            // Cập nhật món ăn trên Firebase
            await updateDoc(foodRef, {
                name: newName,
                price: newPrice
            });

            alert("✅ Cập nhật món ăn thành công!");
            location.reload(); // Tải lại trang để hiển thị dữ liệu mới
        } else {
            alert("❌ Món ăn không tồn tại trong Firebase!");
        }
    } catch (error) {
        console.error("❌ Lỗi khi sửa món ăn trên Firebase:", error);
    }
}
async function fetchFoodListFromFirebase() {
    try {
        const foodsCollection = collection(db, "foods");
        const snapshot = await getDocs(foodsCollection);
        
        let foods = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("✅ Lấy dữ liệu từ Firebase thành công!", foods);
        renderFoodList(foods); // 🖥️ Hiển thị món ăn lên giao diện
    } catch (error) {
        console.error("❌ Lỗi khi lấy danh sách món ăn từ Firebase:", error);
    }
}

// ✅ Xuất hàm để có thể import ở nơi khác
export { fetchFoodListFromFirebase };

// Sửa món ăn trên Firestore thay vì Realtime Database
// function updateFoodInFirebase(foodId, newName, newPrice) {
//     const foodRef = doc(db, 'foods', foodId);

//     console.log("🔄 Đang cập nhật Firebase...", foodId, newName, newPrice);

//     updateDoc(foodRef, { 
//         name: newName, 
//         price: newPrice 
//     })
//     .then(() => {
//         console.log("✅ Firebase đã cập nhật món ăn!");

//         // 🔥 Kiểm tra Firebase bằng cách lấy dữ liệu mới nhất
//         fetchFoodListFromFirebase();
//     })
//     .catch((error) => {
//         console.error("❌ Lỗi khi cập nhật Firebase:", error);
//     });
// }


// ✅ Kích hoạt đồng bộ Firebase → IndexedDB


export { db, addFood, deleteFood, updateFood,fetchFoods };
// ===============================
// 💰 **Lưu doanh thu khi thanh toán**
// ===============================

// 🆔 Lấy ID tiếp theo của revenue dựa trên ID của foods
async function getNextRevenueId() {
    const foodsCollection = collection(db, "foods");
    const snapshot = await getDocs(foodsCollection);

    let ids = snapshot.docs.map(doc => parseInt(doc.id, 10)).filter(id => !isNaN(id));
    ids.sort((a, b) => a - b);

    let nextId = 1;
    for (let id of ids) {
        if (id !== nextId) break;
        nextId++;
    }

    return nextId.toString();  // Trả về ID số tự động dưới dạng chuỗi
}



async function saveRevenue(foodName, totalAmount, quantity, tableId) {
    if (!foodName || !totalAmount || !quantity || !tableId) {
        console.error("❌ Thiếu thông tin khi lưu doanh thu:", { foodName, totalAmount, quantity, tableId });
        return;
    }

    const revenueId = await getNextRevenueId();  
    const revenueRef = doc(db, "revenue", revenueId);
    const itemId = revenueId;
    const foodRef = doc(collection(revenueRef, "items"), itemId);

    try {
        await setDoc(foodRef, { 
            foodName: foodName, 
            totalAmount: totalAmount, 
            quantity: quantity,
            tableId: tableId,
            timestamp: new Date().toISOString(),
        });

        console.log(`✅ Lưu doanh thu thành công!`, { revenueId, itemId, tableId });
    } catch (e) {
        console.error("❌ Lỗi khi lưu dữ liệu doanh thu:", e);
    }
}






// ===============================
// 🔄 **Đồng bộ doanh thu từ Firebase xuống IndexedDB**
// ===============================
async function syncRevenueToIndexedDB() {
    const db = await openIndexedDB();

    console.log("🔄 Đang đồng bộ doanh thu từ Firebase xuống IndexedDB...");

    const snapshot = await getDocs(collection(window.firebaseDB, "revenue"));
    let firebaseData = snapshot.docs.map(doc => ({
        id: doc.id, // ID của revenue document sẽ là số (1, 2, 3,...)
        items: doc.data().items || [] // Lấy tất cả các món ăn từ sub-collection "items"
    }));

    // ✅ Cập nhật vào IndexedDB
    await updateRevenueIndexedDB(firebaseData);
    console.log("✅ Đã đồng bộ Firebase → IndexedDB (doanh thu)!");
}





// ===============================
// 📦 **Mở IndexedDB và đảm bảo có bảng revenue**
// ===============================
if (!window.indexedDBInstance) {
    window.indexedDBInstance = null;
}




async function updateRevenueIndexedDB(firebaseData) {
    const db = await openIndexedDB();
    if (!db.objectStoreNames.contains("revenue")) return;
    let transaction = db.transaction(["revenue"], "readwrite");
    let store = transaction.objectStore("revenue");

    store.clear().onsuccess = async () => {
        await Promise.all(firebaseData.map(revenue => store.put(revenue)));
        console.log("✅ IndexedDB đã cập nhật doanh thu!");
    };
}




// ✅ Xuất các hàm để sử dụng
export { saveRevenue, syncRevenueToIndexedDB };
