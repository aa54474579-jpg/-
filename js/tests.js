import { auth, db } from '../lib/firebase.js';
import { 
    collection, 
    addDoc,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// التحقق من تسجيل الدخول
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    loadTestsForDate(document.getElementById('selectedDate').value);
});

function showLoader(show) {
    let loader = document.querySelector('.loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.className = 'loader';
        loader.style.display = 'none';
        document.getElementById('testsForm').appendChild(loader);
    }
    loader.style.display = show ? 'block' : 'none';
}

function showMessage(message, type = 'success') {
    let msg = document.querySelector('.message-area');
    if (!msg) {
        msg = document.createElement('div');
        msg.className = 'message-area';
        document.getElementById('testsForm').appendChild(msg);
    }
    msg.textContent = message;
    msg.className = `message-area ${type}`;
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
}

function getLangMsg(arMsg, enMsg) {
    return document.documentElement.lang === 'ar' ? arMsg : enMsg;
}

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('selectedDate').value = today;

    const form = document.getElementById('testsForm');
    const dateInput = document.getElementById('selectedDate');
    
    // تحميل بيانات اليوم المحدد
    dateInput.addEventListener('change', (e) => {
        loadTestsForDate(e.target.value);
    });

    // التنقل بين الأيام
    document.getElementById('prevDay').addEventListener('click', () => {
        const date = new Date(dateInput.value);
        date.setDate(date.getDate() - 1);
        dateInput.value = date.toISOString().split('T')[0];
        loadTestsForDate(dateInput.value);
    });

    document.getElementById('nextDay').addEventListener('click', () => {
        const date = new Date(dateInput.value);
        date.setDate(date.getDate() + 1);
        dateInput.value = date.toISOString().split('T')[0];
        loadTestsForDate(dateInput.value);
    });

    // حساب المتوسط تلقائياً
    form.addEventListener('input', (e) => {
        if (e.target.type === 'number') {
            calculateAverage();
        }
    });

    // حفظ البيانات
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader(true);

        const readings = {};
        const formData = new FormData(form);
        for (let [key, value] of formData.entries()) {
            readings[key] = value;
        }

        try {
            const testsRef = collection(db, "tests");
            await addDoc(testsRef, {
                userId: auth.currentUser.uid,
                date: dateInput.value,
                readings: readings,
                average: calculateAverage(),
                timestamp: Timestamp.now()
            });

            showMessage(getLangMsg('تم حفظ القراءات بنجاح!', 'Readings saved successfully'), 'success');
        } catch (error) {
            console.error("Error saving tests:", error);
            showMessage(getLangMsg('حدث خطأ أثناء حفظ القراءات', 'Error saving readings'), 'error');
        }
        showLoader(false);
    });
});

async function loadTestsForDate(date) {
    const testsRef = collection(db, "tests");
    const q = query(
        testsRef,
        where("userId", "==", auth.currentUser.uid),
        where("date", "==", date)
    );

    const querySnapshot = await getDocs(q);
    const form = document.getElementById('testsForm');
    
    if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        for (let [key, value] of Object.entries(data.readings)) {
            const input = form.elements[key];
            if (input) input.value = value;
        }
        calculateAverage();
    } else {
        form.reset();
        document.getElementById('average').textContent = '-';
    }
}

function calculateAverage() {
    const numberInputs = document.querySelectorAll('input[type="number"]');
    let sum = 0;
    let count = 0;

    numberInputs.forEach(input => {
        if (input.value) {
            sum += parseFloat(input.value);
            count++;
        }
    });

    const average = count > 0 ? Math.round(sum / count) : 0;
    document.getElementById('average').textContent = average || '-';
    return average;
}
