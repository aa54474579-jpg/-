// js/database.js

import { auth, db, initialized } from '../lib/firebase.js';
import { 
    collection, addDoc, query, where, doc, deleteDoc, onSnapshot, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- دوال مساعدة ---
function showMessage(message, type, container) {
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

// --- التهيئة الرئيسية ---
initialized.then(() => {
    auth.onAuthStateChanged(user => {
        if (user) {
            displayUserName(user.uid);
            // تحقق إذا كنا في صفحة المواعيد وقم بتشغيل وظائفها
            if (document.getElementById('appointmentForm')) {
                initializeAppointmentsPage(user);
            }
        } else {
            window.location.href = 'auth.html';
        }
    });
}).catch(error => console.error("Firebase initialization failed:", error));

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

// --- منطق صفحة المواعيد ---
function initializeAppointmentsPage(user) {
    const appointmentForm = document.getElementById('appointmentForm');
    const appointmentsList = document.getElementById('appointmentsList');
    const filterButtons = document.querySelectorAll('.btn-filter');
    let currentFilter = 'all';

    // 1. الاستماع للتغييرات في قاعدة البيانات
    const q = query(collection(db, "appointments"), where("userId", "==", user.uid), orderBy("date", "asc"));
    onSnapshot(q, (snapshot) => {
        const allAppointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAppointments(allAppointments, currentFilter); // عرض البيانات بعد كل تغيير
    });

    // 2. دالة العرض
    function renderAppointments(appointments, filter) {
        const filteredAppointments = filterAppointments(appointments, filter);
        if (filteredAppointments.length === 0) {
            appointmentsList.innerHTML = `<p class="no-appointments">لا توجد مواعيد لعرضها.</p>`;
            return;
        }
        appointmentsList.innerHTML = filteredAppointments.map(apt => `
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
                </div>
            </div>
        `).join('');
    }

    // 3. منطق حفظ موعد جديد
    appointmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const appointmentData = {
            userId: user.uid,
            title: document.getElementById('title').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            location: document.getElementById('location').value,
            notes: document.getElementById('notes').value,
            smsReminder: document.getElementById('smsReminder').checked
        };
        try {
            await addDoc(collection(db, "appointments"), appointmentData);
            showMessage("تم حفظ الموعد بنجاح!", "success", appointmentForm);
            appointmentForm.reset();
        } catch (error) {
            showMessage("خطأ في حفظ الموعد.", "error", appointmentForm);
        }
    });

    // 4. ربط أزرار الفلترة
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentFilter = button.dataset.filter;
            document.querySelector('.btn-filter.active').classList.remove('active');
            button.classList.add('active');
            // إعادة العرض بناءً على الفلتر الجديد (لا حاجة لجلب البيانات مرة أخرى)
            const q = query(collection(db, "appointments"), where("userId", "==", user.uid), orderBy("date", "asc"));
            getDocs(q).then(snapshot => {
                 const allAppointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                 renderAppointments(allAppointments, currentFilter);
            });
        });
    });
}

// --- دوال عامة للحذف والتعديل ---
window.deleteAppointment = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا الموعد؟')) {
        await deleteDoc(doc(db, "appointments", id));
    }
};
window.editAppointment = (id) => { alert(`ميزة التعديل للموعد ${id} قيد التطوير.`); };

// --- دالة الفلترة ---
function filterAppointments(appointments, filter) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    switch(filter) {
        case 'today':
            return appointments.filter(apt => new Date(apt.date).toDateString() === today.toDateString());
        case 'week':
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            return appointments.filter(apt => new Date(apt.date) >= today && new Date(apt.date) < nextWeek);
        case 'month':
            const nextMonth = new Date(today);
            nextMonth.setMonth(today.getMonth() + 1);
            return appointments.filter(apt => new Date(apt.date) >= today && new Date(apt.date) < nextMonth);
        default:
            return appointments;
    }
}

// تسجيل الخروج
document.querySelectorAll('#logoutBtn').forEach(btn => btn.addEventListener('click', () => auth.signOut()));