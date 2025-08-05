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
    orderBy,
    enableNetwork,
    disableNetwork
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// الانتظار حتى تكتمل عملية تهيئة Firebase
initialized.then(() => {
    // التحقق من تسجيل الدخول
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'index.html';
        }
    });

    // تعديل إضافة موعد جديد
    window.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('appointmentForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                showLoader(true);
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

                const docRef = await addDoc(collection(db, "appointments"), appointmentData);
                
                if (docRef.id) {
                    showMessage('تم حفظ الموعد بنجاح!', 'success');
                    form.reset();
                    await loadAppointments(); // إعادة تحميل المواعيد مباشرة
                }
            } catch (error) {
                console.error("Error adding appointment:", error);
                showMessage('حدث خطأ أثناء حفظ الموعد', 'error');
            } finally {
                showLoader(false);
            }
        });
        
        // تحميل المواعيد عند فتح الصفحة
        loadAppointments();
    });

    // إضافة عرض اسم المستخدم
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        // عرض اسم المستخدم
        const userQuery = query(collection(db, "users"), where("uid", "==", user.uid));
        const userDoc = await getDocs(userQuery);
        if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            document.getElementById('userNameValue').textContent = userData.fullName;
        }
    });

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // إضافة حالة الشبكة
    let isOnline = navigator.onLine;

    window.addEventListener('online', () => {
        isOnline = true;
        enableNetwork(db).then(() => {
            console.log('تم استعادة اتصال الشبكة');
            // مزامنة البيانات مرة أخرى
            loadAppointments();
        });
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        disableNetwork(db).then(() => {
            console.log('تم تعطيل اتصال الشبكة');
        });
    });

    // تحسين وظيفة تحميل المواعيد
    async function loadAppointments(filter = 'all') {
        const appointmentsList = document.getElementById('appointmentsList');
        if (!appointmentsList) return;

        try {
            showLoader(true);
            
            const baseQuery = query(
                collection(db, "appointments"),
                where("userId", "==", auth.currentUser.uid)
            );

            // استخدام onSnapshot للتحديثات في الوقت الحقيقي ودعم العمل دون اتصال
            onSnapshot(baseQuery, 
                (querySnapshot) => {
                    if (querySnapshot.empty) {
                        appointmentsList.innerHTML = '<p class="no-appointments">لا توجد مواعيد</p>';
                        return;
                    }

                    let appointments = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // تطبيق الفلاتر في الذاكرة
                    appointments = filterAppointments(appointments, filter);
                    
                    // فرز المواعيد
                    appointments.sort((a, b) => new Date(a.date) - new Date(b.date));

                    renderAppointments(appointments, appointmentsList);
                },
                (error) => {
                    console.error('Error loading appointments:', error);
                    showMessage('حدث خطأ أثناء تحميل المواعيد', 'error');
                }
            );

        } catch (error) {
            console.error('Error loading appointments:', error);
            showMessage('حدث خطأ أثناء تحميل المواعيد', 'error');
        } finally {
            showLoader(false);
        }
    }

    // وظائف التعديل والحذف
    window.editAppointment = async function(id) {
        try {
            const docRef = doc(db, "appointments", id);
            const docSnap = await getDocs(query(collection(db, "appointments"), where("__name__", "==", id)));
            if (!docSnap.empty) {
                const data = docSnap.docs[0].data();
                document.getElementById('title').value = data.title;
                document.getElementById('date').value = data.date;
                document.getElementById('time').value = data.time;
                document.getElementById('location').value = data.location;
                document.getElementById('notes').value = data.notes || '';
                document.getElementById('smsReminder').checked = !!data.smsReminder;

                // عند الحفظ، يتم التحديث بدلاً من الإضافة
                const form = document.getElementById('appointmentForm');
                form.onsubmit = async function(e) {
                    e.preventDefault();
                    try {
                        await updateDoc(docRef, {
                            title: document.getElementById('title').value,
                            date: document.getElementById('date').value,
                            time: document.getElementById('time').value,
                            location: document.getElementById('location').value,
                            notes: document.getElementById('notes').value,
                            smsReminder: document.getElementById('smsReminder').checked,
                        });
                        alert('تم تحديث الموعد بنجاح!');
                        form.reset();
                        form.onsubmit = null; // إعادة الوظيفة الافتراضية
                        loadAppointments();
                    } catch (err) {
                        alert('حدث خطأ أثناء التحديث');
                    }
                };
            }
        } catch (err) {
            alert('حدث خطأ أثناء تحميل بيانات الموعد');
        }
    };

    window.deleteAppointment = async function(id) {
        if (!confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;
        try {
            await deleteDoc(doc(db, "appointments", id));
            alert('تم حذف الموعد');
            loadAppointments();
        } catch (err) {
            alert('حدث خطأ أثناء الحذف');
        }
    };

    // إضافة مستمعي أحداث للفلاتر
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.btn-filter.active').classList.remove('active');
            e.target.classList.add('active');
            loadAppointments(e.target.dataset.filter);
        });
    });

    // تسجيل الخروج
    window.logout = () => {
        auth.signOut();
    };

    // زر تسجيل الخروج الجديد
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }

    // إضافة مراقب للتغييرات في الوقت الفعلي
    function initializeRealtimeListeners(userId) {
        // مراقبة المواعيد
        const appointmentsQuery = query(
            collection(db, "appointments"),
            where("userId", "==", userId),
            orderBy("date", "desc")
        );

        onSnapshot(appointmentsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" || change.type === "modified") {
                    updateUI('appointments', change.doc.data());
                }
            });
        });

        // مراقبة التحاليل
        const testsQuery = query(
            collection(db, "tests"),
            where("userId", "==", userId)
        );

        onSnapshot(testsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" || change.type === "modified") {
                    updateUI('tests', change.doc.data());
                }
            });
        });

        // مراقبة الملاحظات
        const notesQuery = query(
            collection(db, "notes"),
            where("userId", "==", userId)
        );

        onSnapshot(notesQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" || change.type === "modified") {
                    updateUI('notes', change.doc.data());
                }
            });
        });
    }

    // تعديل وظيفة تحديث واجهة المستخدم
    function updateUI(type, data) {
        try {
            switch(type) {
                case 'appointments':
                    if (document.getElementById('appointmentsList')) {
                        loadAppointments();
                    }
                    break;
                case 'tests':
                    if (document.getElementById('testsForm')) {
                        loadTestsForDate(data.date);
                    }
                    break;
                case 'notes':
                    if (document.getElementById('notesList')) {
                        const notesManager = window.notesManager;
                        if (notesManager) notesManager.loadNotes();
                    }
                    break;
            }
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    // تهيئة المراقبة عند تسجيل الدخول
    auth.onAuthStateChanged((user) => {
        if (user) {
            initializeRealtimeListeners(user.uid);
        }
    });
}).catch(error => {
    console.error("فشل في تهيئة Firebase:", error);
    alert("فشل في الاتصال بالخدمة. يرجى تحديث الصفحة.");
});

// إضافة وظائف مساعدة
function showLoader(show) {
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

function showMessage(message, type) {
    const messageArea = document.querySelector('.message-area');
    if (messageArea) {
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`;
        messageArea.style.display = 'block';
        setTimeout(() => {
            messageArea.style.display = 'none';
        }, 3000);
    }
}

function filterAppointments(appointments, filter) {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    switch(filter) {
        case 'today':
            return appointments.filter(apt => new Date(apt.date).toDateString() === today.toDateString());
        case 'week':
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            return appointments.filter(apt => {
                const aptDate = new Date(apt.date);
                return aptDate >= today && aptDate <= nextWeek;
            });
        case 'month':
            const nextMonth = new Date(today);
            nextMonth.setMonth(today.getMonth() + 1);
            return appointments.filter(apt => {
                const aptDate = new Date(apt.date);
                return aptDate >= today && aptDate <= nextMonth;
            });
        default:
            return appointments;
    }
}
    console.error("فشل في تهيئة Firebase:", error);
    alert("فشل في الاتصال بالخدمة. يرجى تحديث الصفحة.");
;

// إضافة وظائف مساعدة
function showLoader(show) {
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

function showMessage(message, type) {
    const messageArea = document.querySelector('.message-area');
    if (messageArea) {
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`;
        messageArea.style.display = 'block';
        setTimeout(() => {
            messageArea.style.display = 'none';
        }, 3000);
    }
}

function filterAppointments(appointments, filter) {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    switch(filter) {
        case 'today':
            return appointments.filter(apt => new Date(apt.date).toDateString() === today.toDateString());
        case 'week':
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            return appointments.filter(apt => {
                const aptDate = new Date(apt.date);
                return aptDate >= today && aptDate <= nextWeek;
            });
        case 'month':
            const nextMonth = new Date(today);
            nextMonth.setMonth(today.getMonth() + 1);
            return appointments.filter(apt => {
                const aptDate = new Date(apt.date);
                return aptDate >= today && aptDate <= nextMonth;
            });
        default:
            return appointments;
    }
}
