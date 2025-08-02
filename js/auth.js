import { auth, db } from '../lib/firebase.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { addDoc, collection } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// دوال مساعدة
function showMessage(text, type) {
    const messageArea = document.getElementById('messageArea');
    messageArea.textContent = text;
    messageArea.className = `message-area ${type}`;
}

function clearMessage() {
    const messageArea = document.getElementById('messageArea');
    messageArea.className = 'message-area';
    messageArea.textContent = '';
}

function showLoader(show) {
    const loader = document.querySelector('.loader');
    const btnText = document.getElementById('btnText');
    if (loader && btnText) {
        loader.style.display = show ? 'block' : 'none';
        btnText.style.visibility = show ? 'hidden' : 'visible';
    }
}

function handleAuthError(error) {
    let message = 'حدث خطأ غير متوقع';
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'البريد الإلكتروني مستخدم بالفعل';
            break;
        case 'auth/invalid-email':
            message = 'البريد الإلكتروني غير صحيح';
            break;
        case 'auth/weak-password':
            message = 'كلمة المرور ضعيفة جداً';
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            break;
    }
    showMessage(message, 'error');
}

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', () => {
    const loginToggle = document.getElementById('loginToggle');
    const registerToggle = document.getElementById('registerToggle');
    const authForm = document.getElementById('authForm');
    const registerFields = document.querySelectorAll('.register-fields');
    let isLoginMode = false;

    function switchMode(login) {
        isLoginMode = login;
        
        // تحديث الواجهة
        loginToggle.classList.toggle('active', login);
        registerToggle.classList.toggle('active', !login);
        document.getElementById('btnText').textContent = login ? 'تسجيل دخول' : 'إنشاء حساب';
        
        // إدارة حقول النموذج
        const fullNameGroup = document.getElementById('fullName').closest('.form-group');
        const phoneGroup = document.getElementById('phone').closest('.form-group');
        const confirmPasswordGroup = document.getElementById('confirmPassword').closest('.form-group');
        
        [fullNameGroup, phoneGroup, confirmPasswordGroup].forEach(el => {
            if (el) el.style.display = login ? 'none' : 'block';
        });

        // تحديث required attributes
        document.getElementById('fullName').required = !login;
        document.getElementById('phone').required = !login;
        document.getElementById('confirmPassword').required = !login;
        
        clearMessage();
    }

    // إضافة مستمعي الأحداث للأزرار
    loginToggle.addEventListener('click', () => switchMode(true));
    registerToggle.addEventListener('click', () => switchMode(false));

    // معالجة تقديم النموذج
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!validateForm(isLoginMode)) {
            return;
        }

        showLoader(true);
        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
                showMessage('تم تسجيل الدخول بنجاح', 'success');
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await addDoc(collection(db, "users"), {
                    uid: userCredential.user.uid,
                    fullName: document.getElementById('fullName').value,
                    phone: document.getElementById('phone').value,
                    email: email,
                    createdAt: new Date()
                });
                showMessage('تم إنشاء الحساب بنجاح', 'success');
            }
            setTimeout(() => window.location.href = "appointments.html", 1000);
        } catch (error) {
            handleAuthError(error);
        }
        showLoader(false);
    });

    // تهيئة الصفحة في وضع إنشاء حساب
    switchMode(false);
});

function validateForm(isLogin) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showMessage('الرجاء ملء جميع الحقول المطلوبة', 'error');
        return false;
    }

    if (!isLogin) {
        const fullName = document.getElementById('fullName').value;
        const phone = document.getElementById('phone').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!fullName || fullName.length < 3) {
            showMessage('الرجاء إدخال اسم صحيح', 'error');
            return false;
        }

        if (!phone || !/^[0-9]{10}$/.test(phone)) {
            showMessage('الرجاء إدخال رقم هاتف صحيح', 'error');
            return false;
        }

        if (password !== confirmPassword) {
            showMessage('كلمات المرور غير متطابقة', 'error');
            return false;
        }
    }

    if (password.length < 6) {
        showMessage('كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل', 'error');
        return false;
    }

    return true;
}
                setTimeout(() => window.location.href = 'appointments.html', 1000);
            } catch (error) {
                handleAuthError(error);
            }
            showLoader(false);
        });
    }

    // تهيئة الصفحة في وضع إنشاء الحساب
    switchMode(false);
});
