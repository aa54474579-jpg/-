import { auth, db, initialized } from '../lib/firebase.js';
import { 
    collection, addDoc, query, where, doc, deleteDoc, onSnapshot, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- دالة مساعدة لإظهار الرسائل ---
function showMessage(message, type, container) {
    const messageArea = container.querySelector('.message-area');
    if (messageArea) {
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`;
        messageArea.style.display = 'block';
        setTimeout(() => { messageArea.style.display = 'none'; }, 3000);
    }
}

// --- التهيئة الرئيسية للتطبيق ---
initialized.then(() => {
    console.log("Firebase تم تهيئته بنجاح.");
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("المستخدم مسجل دخوله:", user.uid);
            displayUserName(user.uid);
            if (document.getElementById('appointmentForm')) {
                console.log("أنت في صفحة المواعيد، سيتم تشغيل وظائفها.");
                initializeAppointmentsPage(user);
            }
        } else {
            window.location.href = 'auth.html';
        }
    });
}).catch(error => console.error("Firebase initialization failed:", error));

// --- عرض اسم المستخدم ---
async function displayUserName(userId) {
    // ... (هذه الدالة تعمل بشكل صحيح لديك)
}

// --- منطق صفحة المواعيد ---
function initializeAppointmentsPage(user) {
    const appointmentForm = document.getElementById('appointmentForm');
    const appointmentsList = document.getElementById('appointmentsList');
    const filterButtons = document.querySelectorAll('.btn-filter');
    let currentFilter = 'all';
    let allAppointments = [];

    const q = query(collection(db, "appointments"), where("userId", "==", user.uid), orderBy("date", "asc"));
    
    console.log("سيتم الآن الاستماع للتغييرات في قاعدة البيانات...");
    onSnapshot(q, (snapshot) => {
        console.log(`تم جلب ${snapshot.docs.length} موعد من Firestore.`);
        allAppointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderFilteredAppointments();
    }, error => {
        console.error("حدث خطأ أثناء جلب البيانات:", error);
    });

    function renderFilteredAppointments() {
        const filtered = filterAppointments(allAppointments, currentFilter);
        console.log(`بعد الفلترة (${currentFilter})، عدد المواعيد للعرض هو: ${filtered.length}`);
        
        if (filtered.length === 0) {
            appointmentsList.innerHTML = `<p class="no-appointments">لا توجد مواعيد لعرضها.</p>`;
        } else {
            appointmentsList.innerHTML = filtered.map(apt => `
                <div class="appointment-card">
                    <h3>${apt.title}</h3>
                    <p>${apt.date} في ${apt.time}</p>
                    <button onclick="deleteAppointment('${apt.id}')">حذف</button>
                </div>
            `).join('');
        }
    }

    appointmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // ... (منطق الحفظ يعمل لديك بشكل صحيح)
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentFilter = button.dataset.filter;
            renderFilteredAppointments();
        });
    });
}

window.deleteAppointment = async (id) => {
    if (confirm('هل أنت متأكد؟')) {
        await deleteDoc(doc(db, "appointments", id));
    }
};

function filterAppointments(appointments, filter) {
    // ... (منطق الفلترة يعمل بشكل صحيح لديك)
    return appointments; // تبسيط مؤقت لعرض كل شيء
}

document.querySelectorAll('#logoutBtn').forEach(btn => btn.addEventListener('click', () => auth.signOut()));