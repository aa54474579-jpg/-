// js/auth.js

import { auth, db } from '../lib/firebase.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { addDoc, collection } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- الدوال المساعدة التي تم إضافتها ---
function showMessage(text, type) {
    const messageArea = document.getElementById('messageArea');
    if (messageArea) {
        messageArea.textContent = text;
        messageArea.className = `message-area ${type}`;
        messageArea.style.display = 'block';
    }
}

function clearMessage() {
    const messageArea = document.getElementById('messageArea');
    if (messageArea) {
        messageArea.textContent = '';
        messageArea.style.display = 'none';
    }
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
    let message = 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.';
    console.error("Auth Error Code:", error.code);

    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'هذا البريد الإلكتروني مستخدم بالفعل. هل تريد تسجيل الدخول؟';
            break;
        case 'auth/invalid-email':
            message = 'صيغة البريد الإلكتروني غير صحيحة.';
            break;
        case 'auth/weak-password':
            message = 'كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 أحرف على الأقل.';
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
             message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
            break;
        case 'auth/network-request-failed':
            message = 'فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.';
            break;
    }
    showMessage(message, 'error');
}
// --- نهاية الدوال المساعدة ---

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const toggleLink = document.getElementById('toggleLink');
    const formTitle = document.getElementById('formTitle');
    const btnText = document.getElementById('btnText');
    const registerFields = document.querySelectorAll('.register-field');

    let isLoginMode = false;

    const toggleMode = () => {
        isLoginMode = !isLoginMode;
        
        formTitle.textContent = isLoginMode ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
        btnText.textContent = isLoginMode ? 'تسجيل دخول' : 'إنشاء حساب';
        toggleLink.textContent = isLoginMode ? 'ليس لديك حساب؟ إنشاء حساب' : 'لديك حساب بالفعل؟ تسجيل الدخول';

        registerFields.forEach(field => {
            field.style.display = isLoginMode ? 'none' : 'block';
            const input = field.querySelector('input');
            if (input) {
                input.required = !isLoginMode;
            }
        });
        
        authForm.reset();
        clearMessage();
    };

    if (toggleLink) {
        toggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleMode();
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            showLoader(true);
            try {
                if (isLoginMode) {
                    await signInWithEmailAndPassword(auth, email, password);
                    showMessage('تم تسجيل الدخول بنجاح', 'success');
                } else {
                    const fullName = document.getElementById('fullName').value;
                    const phone = document.getElementById('phone').value;
                    const confirmPassword = document.getElementById('confirmPassword').value;

                    if (password !== confirmPassword) {
                        showMessage('كلمات المرور غير متطابقة', 'error');
                        showLoader(false);
                        return;
                    }

                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await addDoc(collection(db, "users"), {
                        uid: userCredential.user.uid,
                        fullName: fullName,
                        phone: phone,
                        email: email,
                        createdAt: new Date()
                    });
                    showMessage('تم إنشاء الحساب بنجاح', 'success');
                }
                setTimeout(() => window.location.href = "appointments.html", 1500);
            } catch (error) {
                handleAuthError(error);
            }
            showLoader(false);
        });
    }
});