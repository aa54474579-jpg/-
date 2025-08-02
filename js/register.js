import { auth, db } from '../lib/firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { addDoc, collection } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

function showMessage(text, type) {
    const messageArea = document.getElementById('messageArea');
    messageArea.textContent = text;
    messageArea.className = `message-area ${type}`;
}

function showLoader(show) {
    const loader = document.querySelector('.loader');
    const btnText = document.getElementById('btnText');
    if (loader && btnText) {
        loader.style.display = show ? 'block' : 'none';
        btnText.style.visibility = show ? 'hidden' : 'visible';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // التحقق من صحة البيانات
        if (!fullName || fullName.length < 3) {
            showMessage('الرجاء إدخال اسم صحيح', 'error');
            return;
        }

        if (!phone || !/^[0-9]{10}$/.test(phone)) {
            showMessage('الرجاء إدخال رقم هاتف صحيح', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('كلمات المرور غير متطابقة', 'error');
            return;
        }

        if (password.length < 6) {
            showMessage('كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل', 'error');
            return;
        }

        showLoader(true);
        try {
            // إنشاء حساب المستخدم
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // حفظ البيانات الإضافية في Firestore
            await addDoc(collection(db, "users"), {
                uid: userCredential.user.uid,
                fullName: fullName,
                phone: phone,
                email: email,
                createdAt: new Date()
            });

            showMessage('تم إنشاء الحساب بنجاح', 'success');
            setTimeout(() => window.location.href = "appointments.html", 1500);
        } catch (error) {
            let message = 'حدث خطأ غير متوقع';
            if (error.code === 'auth/email-already-in-use') {
                message = 'البريد الإلكتروني مستخدم بالفعل';
            }
            showMessage(message, 'error');
        }
        showLoader(false);
    });
});
