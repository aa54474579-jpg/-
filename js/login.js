import { auth } from '../lib/firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        showLoader(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage('تم تسجيل الدخول بنجاح', 'success');
            setTimeout(() => window.location.href = "appointments.html", 1000);
        } catch (error) {
            let message = 'خطأ في تسجيل الدخول';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            }
            showMessage(message, 'error');
        }
        showLoader(false);
    });
});
