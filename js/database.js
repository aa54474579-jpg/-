// js/database.js

import { app, auth, db, initialized } from '../lib/firebase.js';
import { 
    collection, 
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// =================================================================
// الدوال المساعدة العامة
// =================================================================
function showLoader(show) {
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

function showMessage(message, type, container = document) {
    const messageArea = container.querySelector('.message-area');
    if (messageArea) {
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`;
        messageArea.style.display = 'block';
        setTimeout(() => {
            messageArea.style.display = 'none';
        }, 3000);
    }
}

// =================================================================
// التهيئة العامة والمصادقة
// =================================================================
initialized.then(() => {
    auth.onAuthStateChanged(user => {
        if (user) {
            // عرض اسم المستخدم في كل الصفحات
            displayUserName(user.uid);
            // تهيئة وظائف الصفحة الحالية
            initializePageFunctions(); 
        } else {
            // إذا لم يكن المستخدم مسجلاً، اذهب لصفحة المصادقة
            window.location.href = 'auth.html';
        }
    });
}).catch(error => {
    console.error("فشل في تهيئة Firebase:", error);
    alert("فشل في الاتصال بالخدمة. يرجى تحديث الصفحة.");
});

async function displayUserName(userId) {
    const userNameElements = document.querySelectorAll('#userNameValue');
    if (userNameElements.length === 0) return;

    try {
        const userQuery = query(collection(db, "users"), where("uid", "==", userId));
        const userDocSnapshot = await getDocs(userQuery);

        if (!userDocSnapshot.empty) {
            const userData = userDocSnapshot.docs[0].data();
            userNameElements.forEach(el => el.textContent = userData.fullName);
        }
    } catch (error) {
        console.error("Error fetching user name:", error);
    }
}

// تسجيل الخروج
window.logout = () => {
    auth.signOut().catch(error => console.error('Sign out error', error));
};

// ربط زر الخروج في كل الصفحات
document.querySelectorAll('#logoutBtn').forEach(btn => btn.addEventListener('click', window.logout));


// =================================================================
// تهيئة وظائف الصفحات المختلفة
// =================================================================
function initializePageFunctions() {
    // --- منطق صفحة المواعيد (appointments.html) ---
    if (document.getElementById('appointmentForm')) {
        const appointmentForm = document.getElementById('appointmentForm');
        const appointmentsList = document.getElementById('appointmentsList');
        const filterButtons = document.querySelectorAll('.btn-filter');
        let currentFilter = 'all';

        // --- دالة عرض المواعيد ---
        const renderAppointments = (appointments) => {
            if (!appointmentsList) return;
            if (appointments.length === 0) {
                appointmentsList.innerHTML = `<p class="no-appointments">لا توجد مواعيد لعرضها حسب الفلتر المحدد.</p>`;
                return;
            }
            // **هذا هو الجزء الذي كان ناقصاً**
            appointmentsList.innerHTML = appointments.map(apt => `
                <div class="appointment-card" id="apt-${apt.id}">
                    <div class="appointment-header">
                        <h3>${apt.title}</h3>
                        <div class="appointment-actions">
                            <button onclick="editAppointment('${apt.id}')" class="btn-icon"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteAppointment('${apt.id}')" class="btn-icon btn-danger"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="appointment-details">
                        <p><i class="fas fa-calendar"></i> ${new Date(apt.date).toLocaleDateString('ar-SA')}</p>
                        <p><i class="fas fa-clock"></i> ${apt.time}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${apt.location}</p>
                        ${apt.notes ? `<p><i class="fas fa-sticky-note"></i> ${apt.notes}</p>` : ''}
                        ${apt.smsReminder ? '<p class="reminder-active"><i class="fas fa-bell"></i> تفعيل التذكير</p>' : ''}
                    </div>
                </div>
            `).join('');
        };

        // --- دالة جلب وتصفية المواعيد ---
        const loadAndRenderAppointments = () => {
            if (!auth.currentUser) return;
            const q = query(collection(db, "appointments"), where("userId", "==", auth.currentUser.uid), orderBy("date", "asc"));
            
            onSnapshot(q, (snapshot) => {
                const allAppointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const filtered = filterAppointments(allAppointments, currentFilter);
                renderAppointments(filtered);
            }, (error) => {
                console.error("Error fetching appointments: ", error);
                showMessage("حدث خطأ في جلب المواعيد.", "error", appointmentForm.parentElement);
            });
        };

        // --- منطق الحفظ (هذا الجزء كان ناقصاً) ---
        appointmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const appointmentData = {
                userId: auth.currentUser.uid,
                title: document.getElementById('title').value,
                date: document.getElementById('date').value,
                time: document.getElementById('time').value,
                location: document.getElementById('location').value,
                notes: document.getElementById('notes').value,
                smsReminder: document.getElementById('smsReminder').checked,
                createdAt: new Date().toISOString()
            };
            try {
                await addDoc(collection(db, "appointments"), appointmentData);
                showMessage("تم حفظ الموعد بنجاح!", "success", appointmentForm.parentElement);
                appointmentForm.reset();
            } catch (error) {
                console.error("Error adding document: ", error);
                showMessage("حدث خطأ أثناء حفظ الموعد.", "error", appointmentForm.parentElement);
            }
        });

        // --- ربط أزرار الفلترة ---
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                document.querySelector('.btn-filter.active').classList.remove('active');
                button.classList.add('active');
                currentFilter = button.dataset.filter;
                loadAndRenderAppointments(); // إعادة العرض عند تغيير الفلتر
            });
        });

        // --- تشغيل جلب البيانات عند تحميل الصفحة ---
        loadAndRenderAppointments();
    }
    // يمكنك إضافة منطق الصفحات الأخرى هنا بنفس الطريقة
    // if (document.getElementById('testsForm')) { ... }
}


// =================================================================
// وظائف عامة يمكن استدعاؤها من HTML
// =================================================================

window.deleteAppointment = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا الموعد؟')) {
        try {
            await deleteDoc(doc(db, "appointments", id));
            // سيقوم onSnapshot بتحديث الواجهة تلقائياً
        } catch (error) {
            console.error("Error deleting appointment: ", error);
            alert('حدث خطأ أثناء الحذف.');
        }
    }
};

window.editAppointment = (id) => {
    alert(`ميزة التعديل للموعد رقم ${id} لم تكتمل بعد.`);
    // هنا يمكنك إضافة منطق فتح نافذة منبثقة أو تعديل مباشر
};


// =================================================================
// دالة الفلترة
// =================================================================
function filterAppointments(appointments, filter) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch(filter) {
        case 'today':
            return appointments.filter(apt => new Date(apt.date).toDateString() === today.toDateString());
        case 'week':
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            return appointments.filter(apt => {
                const aptDate = new Date(apt.date);
                return aptDate >= today && aptDate < nextWeek;
            });
        case 'month':
            const nextMonth = new Date(today);
            nextMonth.setMonth(today.getMonth() + 1);
            return appointments.filter(apt => {
                const aptDate = new Date(apt.date);
                return aptDate >= today && aptDate < nextMonth;
            });
        default: // 'all'
            return appointments;
    }
}