import { auth, db } from './firebase.js';
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

class NotesManager {
    constructor() {
        this.currentDate = document.getElementById('currentDate');
        this.noteForm = document.getElementById('noteForm');
        this.noteContent = document.getElementById('noteContent');
        this.notesList = document.getElementById('notesList');
        this.searchInput = document.getElementById('searchNotes');
        this.loader = this.createLoader();
        this.messageArea = this.createMessageArea();

        this.autoSaveTimeout = null;
        this.currentNoteId = null;

        this.initializeEventListeners();
        this.updateCurrentDate();
        this.loadNotes();
    }

    createLoader() {
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.style.display = 'none';
        this.noteForm.appendChild(loader);
        return loader;
    }

    createMessageArea() {
        const msg = document.createElement('div');
        msg.className = 'message-area';
        this.noteForm.appendChild(msg);
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

    initializeEventListeners() {
        // Form submission
        this.noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNote();
        });

        // Auto-save
        this.noteContent.addEventListener('input', () => {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => this.autoSave(), 2000);
        });

        // Search functionality
        this.searchInput.addEventListener('input', () => this.searchNotes());
    }

    updateCurrentDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        this.currentDate.textContent = new Date().toLocaleDateString('ar', options);
    }

    async saveNote() {
        const content = this.noteContent.value.trim();
        if (!content) return;

        const noteData = {
            content,
            date: new Date().toISOString(),
            userId: auth.currentUser.uid
        };

        this.showLoader(true);
        try {
            if (this.currentNoteId) {
                await updateDoc(doc(db, 'notes', this.currentNoteId), noteData);
            } else {
                await addDoc(collection(db, 'notes'), noteData);
            }

            this.noteContent.value = '';
            this.currentNoteId = null;
            await this.loadNotes();
            this.showMessage(this.getLangMsg('تم حفظ الملاحظة بنجاح', 'Note saved successfully'), 'success');
        } catch (error) {
            console.error('Error saving note:', error);
            this.showMessage(this.getLangMsg('حدث خطأ أثناء حفظ الملاحظة', 'Error saving note'), 'error');
        }
        this.showLoader(false);
    }

    async autoSave() {
        if (this.noteContent.value.trim()) {
            await this.saveNote();
        }
    }

    async loadNotes() {
        try {
            const q = query(
                collection(db, 'notes'),
                where('userId', '==', auth.currentUser.uid),
                orderBy('date', 'desc')
            );

            const querySnapshot = await getDocs(q);
            this.renderNotes(querySnapshot.docs);
        } catch (error) {
            console.error('Error loading notes:', error);
            this.showMessage(this.getLangMsg('حدث خطأ أثناء تحميل الملاحظات', 'Error loading notes'), 'error');
        }
    }

    renderNotes(notes) {
        this.notesList.innerHTML = notes.map(doc => {
            const note = doc.data();
            const date = new Date(note.date).toLocaleDateString('ar');
            const preview = note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '');

            return `
                <div class="note-card" data-id="${doc.id}">
                    <div class="note-header">
                        <span class="note-date">
                            <i class="fas fa-calendar"></i> ${date}
                        </span>
                        <div class="note-actions">
                            <button onclick="editNote('${doc.id}')" class="btn-icon">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteNote('${doc.id}')" class="btn-icon">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="note-content">${preview}</div>
                </div>
            `;
        }).join('');
    }

    async editNote(noteId) {
        const docRef = doc(db, 'notes', noteId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            this.noteContent.value = docSnap.data().content;
            this.currentNoteId = noteId;
            this.noteContent.focus();
        }
    }

    async deleteNote(noteId) {
        if (confirm(this.getLangMsg('هل أنت متأكد من حذف هذه الملاحظة؟', 'Are you sure you want to delete this note?'))) {
            this.showLoader(true);
            try {
                await deleteDoc(doc(db, 'notes', noteId));
                await this.loadNotes();
                this.showMessage(this.getLangMsg('تم حذف الملاحظة', 'Note deleted'), 'success');
            } catch (error) {
                console.error('Error deleting note:', error);
                this.showMessage(this.getLangMsg('حدث خطأ أثناء حذف الملاحظة', 'Error deleting note'), 'error');
            }
            this.showLoader(false);
        }
    }

    searchNotes() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const notes = document.querySelectorAll('.note-card');
        
        notes.forEach(note => {
            const content = note.querySelector('.note-content').textContent.toLowerCase();
            note.style.display = content.includes(searchTerm) ? 'block' : 'none';
        });
    }
}

// Make edit and delete functions globally available
window.editNote = (noteId) => notesManager.editNote(noteId);
window.deleteNote = (noteId) => notesManager.deleteNote(noteId);

// Initialize notes functionality when the DOM is loaded
const notesManager = new NotesManager();
