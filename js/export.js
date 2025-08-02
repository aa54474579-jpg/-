import { auth, db } from './firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

class ExportManager {
    constructor() {
        this.form = document.getElementById('exportForm');
        this.previewBtn = document.getElementById('previewBtn');
        this.exportPDF = document.getElementById('exportPDF');
        this.exportImage = document.getElementById('exportImage');
        this.shareBtn = document.getElementById('shareBtn');
        this.previewContent = document.getElementById('previewContent');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.previewBtn.addEventListener('click', () => this.generatePreview());
        this.exportPDF.addEventListener('click', () => this.generatePDF());
        this.exportImage.addEventListener('click', () => this.generateImage());
        this.shareBtn.addEventListener('click', () => this.shareData());
    }

    async fetchData(startDate, endDate, types) {
        const userId = auth.currentUser.uid;
        let allData = [];

        for (const type of types) {
            const q = query(
                collection(db, type),
                where('userId', '==', userId),
                where('date', '>=', startDate),
                where('date', '<=', endDate)
            );

            const querySnapshot = await getDocs(q);
            allData.push(...querySnapshot.docs.map(doc => ({
                type,
                id: doc.id,
                ...doc.data()
            })));
        }

        return allData;
    }

    async generatePreview() {
        const formData = new FormData(this.form);
        const types = formData.getAll('dataType');
        const startDate = formData.get('startDate');
        const endDate = formData.get('endDate');

        if (!types.length) {
            alert('الرجاء اختيار نوع البيانات');
            return;
        }

        const data = await this.fetchData(startDate, endDate, types);
        this.renderPreview(data);
    }

    renderPreview(data) {
        this.previewContent.innerHTML = data.map(item => {
            switch(item.type) {
                case 'appointments':
                    return this.renderAppointment(item);
                case 'tests':
                    return this.renderTest(item);
                case 'notes':
                    return this.renderNote(item);
                default:
                    return '';
            }
        }).join('');
    }

    renderAppointment(item) {
        return `
            <div class="preview-item">
                <h4>${item.title}</h4>
                <p>التاريخ: ${new Date(item.date).toLocaleDateString('ar')}</p>
                <p>الوقت: ${item.time}</p>
                <p>المكان: ${item.location}</p>
            </div>
        `;
    }

    renderTest(item) {
        return `
            <div class="preview-item">
                <h4>قراءات ${new Date(item.date).toLocaleDateString('ar')}</h4>
                <p>المتوسط: ${item.average}</p>
            </div>
        `;
    }

    renderNote(item) {
        return `
            <div class="preview-item">
                <h4>ملاحظة ${new Date(item.date).toLocaleDateString('ar')}</h4>
                <p>${item.content}</p>
            </div>
        `;
    }

    async generatePDF() {
        const element = this.previewContent;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData, 'JPEG', 10, 10, 190, 0);
        pdf.save('medical-data.pdf');
    }

    async generateImage() {
        const element = this.previewContent;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true
        });
        
        const link = document.createElement('a');
        link.download = 'medical-data.png';
        link.href = canvas.toDataURL();
        link.click();
    }

    async shareData() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'بياناتي الطبية',
                    text: this.previewContent.innerText,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            alert('مشاركة البيانات غير متاحة على هذا المتصفح');
        }
    }
}

// Initialize export functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExportManager();
});
