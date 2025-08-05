import { auth, db, initialized } from '../lib/firebase.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    limit, 
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

class DashboardManager {
    constructor() {
        this.stats = {
            appointments: 0,
            tests: 0,
            notes: 0
        };
        this.init();
    }

    async init() {
        await initialized;
        this.loadStats();
        this.loadUpcomingAppointments();
        this.loadTestsChart();
        this.setupRealtimeUpdates();
    }

    async loadStats() {
        const userId = auth.currentUser.uid;
        try {
            // تحميل إحصائيات المواعيد
            const appointmentsQuery = query(
                collection(db, "appointments"),
                where("userId", "==", userId)
            );
            const appointmentsCount = (await getDocs(appointmentsQuery)).size;
            document.getElementById('appointmentsCount').textContent = appointmentsCount;

            // تحميل إحصائيات التحاليل
            const testsQuery = query(
                collection(db, "tests"),
                where("userId", "==", userId)
            );
            const testsCount = (await getDocs(testsQuery)).size;
            document.getElementById('testsCount').textContent = testsCount;

            // تحميل إحصائيات الملاحظات
            const notesQuery = query(
                collection(db, "notes"),
                where("userId", "==", userId)
            );
            const notesCount = (await getDocs(notesQuery)).size;
            document.getElementById('notesCount').textContent = notesCount;
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    }

    async loadUpcomingAppointments() {
        const userId = auth.currentUser.uid;
        try {
            const today = new Date();
            const q = query(
                collection(db, "appointments"),
                where("userId", "==", userId),
                where("date", ">=", today.toISOString().split('T')[0]),
                orderBy("date"),
                limit(5)
            );

            const querySnapshot = await getDocs(q);
            const appointments = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.renderUpcomingAppointments(appointments);
        } catch (error) {
            console.error("Error loading upcoming appointments:", error);
        }
    }

    renderUpcomingAppointments(appointments) {
        const container = document.getElementById('upcomingAppointments');
        if (appointments.length === 0) {
            container.innerHTML = '<p class="no-data">لا توجد مواعيد قادمة</p>';
            return;
        }

        container.innerHTML = appointments.map(apt => `
            <div class="upcoming-item">
                <div class="upcoming-date">
                    <i class="fas fa-calendar"></i>
                    ${new Date(apt.date).toLocaleDateString('ar')}
                </div>
                <div class="upcoming-details">
                    <h4>${apt.title}</h4>
                    <p><i class="fas fa-clock"></i> ${apt.time}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${apt.location}</p>
                </div>
            </div>
        `).join('');
    }

    async loadTestsChart() {
        // تنفيذ في الإصدار القادم
        console.log("Tests chart loading...");
    }

    setupRealtimeUpdates() {
        const userId = auth.currentUser.uid;
        
        // مراقبة التغييرات في المواعيد
        onSnapshot(
            query(collection(db, "appointments"), where("userId", "==", userId)),
            (snapshot) => {
                this.updateAppointmentsCount(snapshot.size);
                this.loadUpcomingAppointments();
            }
        );

        // مراقبة التغييرات في التحاليل
        onSnapshot(
            query(collection(db, "tests"), where("userId", "==", userId)),
            (snapshot) => {
                this.updateTestsCount(snapshot.size);
                this.loadTestsChart();
            }
        );

        // مراقبة التغييرات في الملاحظات
        onSnapshot(
            query(collection(db, "notes"), where("userId", "==", userId)),
            (snapshot) => {
                this.updateNotesCount(snapshot.size);
            }
        );
    }

    updateAppointmentsCount(count) {
        document.getElementById('appointmentsCount').textContent = count;
    }

    updateTestsCount(count) {
        document.getElementById('testsCount').textContent = count;
    }

    updateNotesCount(count) {
        document.getElementById('notesCount').textContent = count;
    }
}
// js/dashboard.js
// ... (الكود الحالي) ...

class DashboardManager {
    constructor() {
        // ...
        this.testsChart = null; // للاحتفاظ بالرسم البياني وتحديثه
        this.init();
    }
    
    // ...
    
    async loadTestsChart() {
        const userId = auth.currentUser.uid;
        try {
            const today = new Date();
            const lastMonth = new Date();
            lastMonth.setDate(today.getDate() - 30);

            const q = query(
                collection(db, "tests"),
                where("userId", "==", userId),
                where("timestamp", ">=", lastMonth),
                orderBy("timestamp", "asc")
            );

            const querySnapshot = await getDocs(q);
            const testsData = querySnapshot.docs.map(doc => doc.data());

            this.renderTestsChart(testsData);
        } catch (error) {
            console.error("Error loading tests for chart:", error);
        }
    }

    renderTestsChart(data) {
        const ctx = document.getElementById('testsChart').getContext('2d');
        if (!data || data.length === 0) {
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            ctx.fillText("لا توجد بيانات كافية لعرض الرسم البياني", 150, 100);
            return;
        }

        const labels = data.map(d => new Date(d.date).toLocaleDateString('ar-EG'));
        const averages = data.map(d => d.average);
        
        if (this.testsChart) {
            this.testsChart.destroy(); // تدمير الرسم البياني القديم قبل رسم الجديد
        }

        this.testsChart = new Chart(ctx, {
            type: 'line', // نوع الرسم البياني
            data: {
                labels: labels,
                datasets: [{
                    label: 'متوسط القراءات اليومي',
                    data: averages,
                    borderColor: 'rgba(42, 157, 143, 1)',
                    backgroundColor: 'rgba(42, 157, 143, 0.2)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }

    // ... (باقي الكود)
}
// تهيئة لوحة التحكم
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});
