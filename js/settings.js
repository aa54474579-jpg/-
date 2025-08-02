import { auth, db } from './firebase.js';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';

class SettingsManager {
    constructor() {
        this.form = document.getElementById('settingsForm');
        this.deleteBtn = document.getElementById('deleteAccount');
        this.userSettings = {};
        this.loader = this.createLoader();
        this.messageArea = this.createMessageArea();

        this.initializeEventListeners();
        this.loadUserSettings();
    }

    createLoader() {
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.style.display = 'none';
        this.form.appendChild(loader);
        return loader;
    }

    createMessageArea() {
        const msg = document.createElement('div');
        msg.className = 'message-area';
        this.form.appendChild(msg);
        return msg;
    }

    showLoader(show) {
        this.loader.style.display = show ? 'block' : 'none';
    }

    showMessage(message, type = 'success') {
        this.messageArea.textContent = message;
        this.messageArea.className = `message-area ${type}`;
        this.messageArea.style.display = 'block';
        setTimeout(() => {
            this.messageArea.style.display = 'none';
        }, 3000);
    }

    getLangMsg(arMsg, enMsg) {
        return document.documentElement.lang === 'ar' ? arMsg : enMsg;
    }

    async loadUserSettings() {
        try {
            const userId = auth.currentUser.uid;
            const docRef = doc(db, 'users', userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                this.userSettings = docSnap.data();
                this.populateForm();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    populateForm() {
        const { fullName, email, phone, smsNotification, notificationTime, language } = this.userSettings;
        
        this.form.fullName.value = fullName || '';
        this.form.email.value = email || '';
        this.form.phone.value = phone || '';
        this.form.smsNotification.checked = smsNotification || false;
        this.form.notificationTime.value = notificationTime || '1hour';
        this.form.language.value = language || 'ar';
    }

    async saveSettings() {
        this.showLoader(true);
        try {
            const userId = auth.currentUser.uid;
            const settings = {
                fullName: this.form.fullName.value,
                email: this.form.email.value,
                phone: this.form.phone.value,
                smsNotification: this.form.smsNotification.checked,
                notificationTime: this.form.notificationTime.value,
                language: this.form.language.value,
                updatedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, 'users', userId), settings);
            this.showMessage(this.getLangMsg('تم حفظ الإعدادات بنجاح', 'Settings saved successfully'), 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showMessage(this.getLangMsg('حدث خطأ أثناء حفظ الإعدادات', 'Error saving settings'), 'error');
        }
        this.showLoader(false);
    }

    async handleAccountDeletion() {
        if (!confirm(this.getLangMsg('هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه.', 'Are you sure you want to delete your account? This action cannot be undone.'))) {
            return;
        }
        this.showLoader(true);
        try {
            const userId = auth.currentUser.uid;

            await deleteDoc(doc(db, 'users', userId));

            // حذف جميع المواعيد
            const appointmentsRef = collection(db, 'appointments');
            const appointmentsQ = query(appointmentsRef, where('userId', '==', userId));
            const appointmentsSnap = await getDocs(appointmentsQ);
            for (const docItem of appointmentsSnap.docs) {
                await deleteDoc(docItem.ref);
            }

            // حذف جميع التحاليل
            const testsRef = collection(db, 'tests');
            const testsQ = query(testsRef, where('userId', '==', userId));
            const testsSnap = await getDocs(testsQ);
            for (const docItem of testsSnap.docs) {
                await deleteDoc(docItem.ref);
            }

            // حذف جميع الملاحظات
            const notesRef = collection(db, 'notes');
            const notesQ = query(notesRef, where('userId', '==', userId));
            const notesSnap = await getDocs(notesQ);
            for (const docItem of notesSnap.docs) {
                await deleteDoc(docItem.ref);
            }

            await deleteUser(auth.currentUser);

            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error deleting account:', error);
            this.showMessage(this.getLangMsg('حدث خطأ أثناء حذف الحساب', 'Error deleting account'), 'error');
        }
        this.showLoader(false);
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});
