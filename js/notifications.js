import { auth, db } from '../lib/firebase.js';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

class NotificationManager {
    constructor() {
        this.checkPermission();
        this.initializeNotifications();
    }

    async checkPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.setupNotifications();
            }
        }
    }

    setupNotifications() {
        // مثال: إشعار عند إضافة موعد جديد
        document.addEventListener('appointmentAdded', (e) => {
            new Notification('تم إضافة موعد جديد!', {
                body: `عنوان الموعد: ${e.detail.title}`,
                icon: 'assets/logo.png'
            });
        });
    }

    initializeNotifications() {
        // يمكن إضافة منطق إضافي هنا حسب الحاجة
    }
}

export const notificationManager = new NotificationManager();
