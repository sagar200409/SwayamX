// ======================
// CONSTANTS AND CONFIGURATION
// ======================
const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "admin123"
};

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Notification sound URL
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3";

// ======================
// STORAGE MANAGEMENT
// ======================
class StorageManager {
    static initialize() {
        if (!localStorage.getItem('events')) {
            localStorage.setItem('events', JSON.stringify({}));
        }
        if (!localStorage.getItem('students')) {
            localStorage.setItem('students', JSON.stringify([]));
        }
        if (localStorage.getItem('notificationsEnabled') === null) {
            localStorage.setItem('notificationsEnabled', 'true');
        }
    }

    static getEvents() {
        return JSON.parse(localStorage.getItem('events')) || {};
    }

    static getEventsByDate(date) {
        const events = this.getEvents();
        return events[date] || [];
    }

    static saveEvent(date, eventData) {
        const events = this.getEvents();
        if (!events[date]) events[date] = [];
        
        eventData.id = Date.now().toString();
        events[date].push(eventData);
        localStorage.setItem('events', JSON.stringify(events));
        return eventData;
    }

    static deleteEvent(date, eventId) {
        const events = this.getEvents();
        if (events[date]) {
            events[date] = events[date].filter(e => e.id !== eventId);
            if (events[date].length === 0) delete events[date];
            localStorage.setItem('events', JSON.stringify(events));
            return true;
        }
        return false;
    }

    static getStudents() {
        return JSON.parse(localStorage.getItem('students')) || [];
    }

    static addStudent(student) {
        const students = this.getStudents();
        student.batch = student.batch || '24-25';
        student.company = student.company || '';
        student.package = student.package || '';
        student.department = student.department || '';
        students.push(student);
        localStorage.setItem('students', JSON.stringify(students));
        return student;
    }

    static deleteStudent(index) {
        const students = this.getStudents();
        students.splice(index, 1);
        localStorage.setItem('students', JSON.stringify(students));
    }
}

// ======================
// NOTIFICATION MANAGER
// ======================
class NotificationManager {
    static init() {
        this.notificationSound = new Audio(NOTIFICATION_SOUND_URL);
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notification-container';
        this.notificationContainer.className = 'notification-container';
        document.body.appendChild(this.notificationContainer);
    }

    static showEventNotification(event, dateStr) {
        // Check if already notified
        const notificationKey = `notified_${dateStr}_${event.id}`;
        if (localStorage.getItem(notificationKey)) return;
        localStorage.setItem(notificationKey, 'true');

        // Play sound if enabled
        if (localStorage.getItem('notificationsEnabled') === 'true') {
            this.notificationSound.currentTime = 0;
            this.notificationSound.play().catch(e => console.log('Notification sound failed:', e));
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <i class="fas fa-calendar-exclamation"></i>
            <div class="notification-content">
                <h4>Upcoming Event: ${event.name}</h4>
                <p>${new Date(dateStr).toLocaleDateString()} - ${event.summary}</p>
            </div>
        `;
        
        this.notificationContainer.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    static checkUpcomingEvents() {
        if (localStorage.getItem('notificationsEnabled') !== 'true') return;

        const events = StorageManager.getEvents();
        const now = new Date();
        const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        Object.keys(events).forEach(dateStr => {
            const eventDate = new Date(dateStr);
            if (eventDate > now && eventDate <= twentyFourHoursLater) {
                events[dateStr].forEach(event => {
                    this.showEventNotification(event, dateStr);
                });
            }
        });
    }

    static setupNotificationToggle() {
        const toggle = document.getElementById('notification-toggle');
        if (!toggle) return;

        const updateToggleState = () => {
            const isEnabled = localStorage.getItem('notificationsEnabled') === 'true';
            const icon = toggle.querySelector('i');
            const text = toggle.querySelector('.info-text');
            
            icon.className = isEnabled ? 'fas fa-bell' : 'fas fa-bell-slash';
            text.textContent = isEnabled ? 'Notifications ON' : 'Notifications OFF';
        };

        toggle.addEventListener('click', () => {
            const currentlyEnabled = localStorage.getItem('notificationsEnabled') === 'true';
            localStorage.setItem('notificationsEnabled', (!currentlyEnabled).toString());
            updateToggleState();
            
            if (!currentlyEnabled) {
                this.checkUpcomingEvents();
            }
        });

        updateToggleState();
    }
}

// ======================
// UI HELPERS
// ======================
class UIHelper {
    static setupFormLoading(formId, buttonText) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', () => {
                const button = form.querySelector('button[type="submit"]');
                button.innerHTML = `<span class="loading"></span> ${buttonText}...`;
                button.disabled = true;
            });
        }
    }

    static showSuccessMessage(form, message) {
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        form.insertBefore(successMsg, form.firstChild);
        setTimeout(() => successMsg.remove(), 3000);
    }

    static resetFormButton(form) {
        const button = form.querySelector('button[type="submit"]');
        const icon = form.id.includes('event') ? 'fa-plus' : 'fa-user-plus';
        button.innerHTML = `<i class="fas ${icon}"></i> ${button.textContent.split('...')[0]}`;
        button.disabled = false;
    }
}

// ======================
// CALENDAR MANAGEMENT
// ======================
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const monthYearDisplay = document.getElementById('current-month-year');
        
        calendarGrid.innerHTML = '';
        monthYearDisplay.textContent = `${MONTH_NAMES[this.currentMonth]} ${this.currentYear}`;
        
        // Day headers
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });
        
        // Get first day and days in month
        const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        
        // Previous month days
        const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
        for (let i = 0; i < firstDay; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day empty';
            dayElement.textContent = daysInPrevMonth - firstDay + i + 1;
            calendarGrid.appendChild(dayElement);
        }
        
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = i;
            dayElement.appendChild(dayNumber);
            
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const events = StorageManager.getEventsByDate(dateStr);
            
            if (events.length > 0) {
                const eventDot = document.createElement('span');
                eventDot.className = 'event-dot';
                eventDot.textContent = events.length > 1 ? events.length : '';
                dayNumber.appendChild(eventDot);
                
                dayElement.addEventListener('click', () => this.showEventsModal(dateStr));
            } else {
                dayElement.addEventListener('click', () => this.showEventsModal(dateStr));
            }
            
            calendarGrid.appendChild(dayElement);
        }
        
        // Next month days
        const totalCells = firstDay + daysInMonth;
        const remainingCells = 42 - totalCells;
        for (let i = 1; i <= remainingCells; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day empty';
            dayElement.textContent = i;
            calendarGrid.appendChild(dayElement);
        }
    }

    showEventsModal(dateStr) {
        const modal = document.getElementById('events-modal');
        const dateTitle = document.getElementById('modal-date-title');
        const eventsList = document.getElementById('events-list');
        const noEventsMsg = document.getElementById('no-events-msg');
        
        const date = new Date(dateStr);
        dateTitle.textContent = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const events = StorageManager.getEventsByDate(dateStr);
        eventsList.innerHTML = '';
        
        if (events.length > 0) {
            noEventsMsg.style.display = 'none';
            events.forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'event-item';
                eventElement.innerHTML = `
                    <h3>${event.name}</h3>
                    ${event.image ? `<img src="${event.image}" alt="${event.name}">` : ''}
                    <p>${event.summary}</p>
                `;
                eventsList.appendChild(eventElement);
            });
        } else {
            noEventsMsg.style.display = 'block';
        }
        
        modal.style.display = 'block';
    }

    navigateMonth(direction) {
        if (direction === 'prev') {
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
        } else {
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
        }
        this.renderCalendar();
    }
}

// ======================
// ADMIN PANEL MANAGEMENT
// ======================
class AdminPanel {
    static init() {
        if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
            window.location.href = 'admin.html';
            return;
        }

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab).classList.add('active');
            });
        });

        document.getElementById('add-event-form')?.addEventListener('submit', AdminPanel.handleEventFormSubmit);
        document.getElementById('add-student-form')?.addEventListener('submit', AdminPanel.handleStudentFormSubmit);

        AdminPanel.renderEventsFolderView();
        AdminPanel.renderStudentsList();
        AdminPanel.renderStudentGallery();
        AdminPanel.updateAdminStats();
        AdminPanel.updateActivityLog();
    }

    static handleEventFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        
        submitButton.innerHTML = `<span class="loading"></span> Adding Event...`;
        submitButton.disabled = true;
        
        const date = document.getElementById('event-date').value;
        const name = document.getElementById('event-name').value;
        const summary = document.getElementById('event-summary').value;
        const imageInput = document.getElementById('event-image');
        
        if (!date || !name || !summary) {
            alert('Please fill all required fields');
            UIHelper.resetFormButton(form);
            return;
        }
        
        const eventData = { name, summary, image: '' };
        
        const handleEventSubmission = () => {
            const savedEvent = StorageManager.saveEvent(date, eventData);
            AdminPanel.renderEventsFolderView();
            
            if (document.getElementById('calendar-grid')) {
                const eventDate = new Date(date);
                const calendar = new CalendarManager();
                calendar.currentMonth = eventDate.getMonth();
                calendar.currentYear = eventDate.getFullYear();
                calendar.renderCalendar();
            }
            
            form.reset();
            UIHelper.showSuccessMessage(form, `Event "${savedEvent.name}" added successfully!`);
            UIHelper.resetFormButton(form);
            dispatchEvent(new Event('eventsUpdated'));
        };
        
        if (imageInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => {
                eventData.image = e.target.result;
                handleEventSubmission();
            };
            reader.onerror = () => {
                alert('Error reading image file');
                UIHelper.resetFormButton(form);
            };
            reader.readAsDataURL(imageInput.files[0]);
        } else {
            handleEventSubmission();
        }
    }

    static handleStudentFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        
        submitButton.innerHTML = `<span class="loading"></span> Adding Student...`;
        submitButton.disabled = true;
        
        const name = document.getElementById('student-name').value;
        const batch = document.getElementById('student-batch').value;
        const company = document.getElementById('student-company').value;
        const packageVal = document.getElementById('student-package').value;
        const department = document.getElementById('student-department').value;
        const imageInput = document.getElementById('student-image');
        
        if (!name || imageInput.files.length === 0) {
            alert('Please fill all required fields');
            UIHelper.resetFormButton(form);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const student = { 
                name, 
                image: e.target.result,
                batch,
                company,
                package: packageVal,
                department
            };
            StorageManager.addStudent(student);
            AdminPanel.renderStudentsList();
            
            if (document.getElementById('student-gallery')) {
                AdminPanel.renderStudentGallery();
            }
            
            form.reset();
            UIHelper.showSuccessMessage(form, `Student "${student.name}" added successfully!`);
            UIHelper.resetFormButton(form);
            dispatchEvent(new Event('studentsUpdated'));
        };
        
        reader.onerror = () => {
            alert('Error reading image file');
            UIHelper.resetFormButton(form);
        };
        
        reader.readAsDataURL(imageInput.files[0]);
    }

    static renderEventsFolderView() {
        const container = document.getElementById('events-folder-view');
        if (!container) return;
        
        const events = StorageManager.getEvents();
        container.innerHTML = '';
        
        const sortedDates = Object.keys(events).sort((a, b) => new Date(b) - new Date(a));
        
        sortedDates.forEach(date => {
            const folder = document.createElement('div');
            folder.className = 'date-folder';
            
            const header = document.createElement('div');
            header.className = 'folder-header';
            header.innerHTML = `
                <h3>${new Date(date).toLocaleDateString()}</h3>
                <span>${events[date].length} events</span>
            `;
            
            const eventsList = document.createElement('div');
            eventsList.className = 'events-list';
            
            events[date].forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.className = 'event-item';
                eventItem.innerHTML = `
                    <h4>${event.name}</h4>
                    <p>${event.summary}</p>
                    ${event.image ? `<img src="${event.image}" alt="${event.name}" class="thumbnail">` : ''}
                    <button class="delete-btn" data-date="${date}" data-id="${event.id}">Delete</button>
                `;
                eventsList.appendChild(eventItem);
            });
            
            folder.appendChild(header);
            folder.appendChild(eventsList);
            container.appendChild(folder);
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const date = this.dataset.date;
                const id = this.dataset.id;
                
                if (confirm('Delete this event?')) {
                    StorageManager.deleteEvent(date, id);
                    AdminPanel.renderEventsFolderView();
                    
                    if (document.getElementById('calendar-grid')) {
                        const eventDate = new Date(date);
                        const calendar = new CalendarManager();
                        calendar.currentMonth = eventDate.getMonth();
                        calendar.currentYear = eventDate.getFullYear();
                        calendar.renderCalendar();
                    }
                    dispatchEvent(new Event('eventsUpdated'));
                }
            });
        });
    }

    static renderStudentsList() {
        const container = document.getElementById('students-list');
        if (!container) return;
        
        const students = StorageManager.getStudents();
        container.innerHTML = '';
        
        students.forEach((student, index) => {
            const studentItem = document.createElement('div');
            studentItem.className = 'student-item';
            studentItem.innerHTML = `
                <img src="${student.image}" alt="${student.name}" style="width: 100px; height: 100px; object-fit: cover;">
                <div class="student-details">
                    <h4>${student.name}</h4>
                    <div class="student-meta">
                        ${student.batch ? `<span><i class="fas fa-graduation-cap"></i> ${student.batch}</span>` : ''}
                        ${student.department ? `<span><i class="fas fa-building"></i> ${student.department}</span>` : ''}
                    </div>
                    ${student.company ? `<div class="company-info"><i class="fas fa-briefcase"></i> ${student.company}</div>` : ''}
                    ${student.package ? `<div class="package-info"><i class="fas fa-rupee-sign"></i> ${student.package} LPA</div>` : ''}
                </div>
                <button class="delete-btn" data-index="${index}">Delete</button>
            `;
            container.appendChild(studentItem);
        });
        
        document.querySelectorAll('.delete-btn[data-index]').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                
                if (confirm('Delete this student?')) {
                    StorageManager.deleteStudent(index);
                    AdminPanel.renderStudentsList();
                    
                    if (document.getElementById('student-gallery')) {
                        AdminPanel.renderStudentGallery();
                    }
                    dispatchEvent(new Event('studentsUpdated'));
                }
            });
        });
    }

    static renderStudentGallery() {
        const gallery = document.getElementById('student-gallery');
        if (!gallery) return;
        
        const students = StorageManager.getStudents();
        gallery.innerHTML = '';
        
        students.forEach((student, index) => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.dataset.batch = student.batch || '24-25';
            card.innerHTML = `
                <div class="student-image-container">
                    <img src="${student.image}" alt="${student.name}">
                    ${student.company ? `<div class="company-badge">${student.company}</div>` : ''}
                </div>
                <div class="student-info">
                    <h3>${student.name}</h3>
                    <div class="student-meta">
                        ${student.batch ? `<span><i class="fas fa-graduation-cap"></i> ${student.batch}</span>` : ''}
                        ${student.department ? `<span><i class="fas fa-building"></i> ${student.department}</span>` : ''}
                    </div>
                    ${student.package ? `<div class="package-info"><i class="fas fa-rupee-sign"></i> ${student.package} LPA</div>` : ''}
                </div>
            `;
            gallery.appendChild(card);
        });
    }

    static updateAdminStats() {
        const events = StorageManager.getEvents();
        const students = StorageManager.getStudents();
        
        let totalEvents = 0;
        Object.keys(events).forEach(date => {
            totalEvents += events[date].length;
        });
        
        const totalEventsEl = document.getElementById('total-events');
        const totalStudentsEl = document.getElementById('total-students');
        
        if (totalEventsEl) totalEventsEl.textContent = totalEvents;
        if (totalStudentsEl) totalStudentsEl.textContent = students.length;
    }

    static updateActivityLog() {
        const log = document.getElementById('activity-log');
        if (!log) return;
        
        const activities = [
            { icon: 'fa-calendar-plus', text: 'Added new event "College Fest"' },
            { icon: 'fa-user-plus', text: 'Added new student "Rahul Sharma"' },
            { icon: 'fa-calendar-times', text: 'Deleted event "Sports Day"' },
            { icon: 'fa-user-edit', text: 'Updated student details' },
            { icon: 'fa-sign-in-alt', text: 'Logged in to admin panel' }
        ];
        
        log.innerHTML = '';
        activities.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `<i class="fas ${activity.icon}"></i> ${activity.text}`;
            log.appendChild(item);
        });
    }
}

// ======================
// EVENT HANDLERS
// ======================
document.addEventListener('DOMContentLoaded', () => {
    StorageManager.initialize();
    NotificationManager.init();
    NotificationManager.setupNotificationToggle();
    
    UIHelper.setupFormLoading('admin-login', 'Logging in');
    UIHelper.setupFormLoading('add-event-form', 'Adding Event');
    UIHelper.setupFormLoading('add-student-form', 'Adding Student');
    
    if (document.getElementById('calendar-grid')) {
        const calendar = new CalendarManager();
        calendar.renderCalendar();
        
        // Store calendar instance for notification checks
        window.calendar = calendar;
        
        // Check for upcoming events now and every minute
        NotificationManager.checkUpcomingEvents();
        setInterval(() => NotificationManager.checkUpcomingEvents(), 60000);
        
        document.getElementById('prev-month').addEventListener('click', () => calendar.navigateMonth('prev'));
        document.getElementById('next-month').addEventListener('click', () => calendar.navigateMonth('next'));
        
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('events-modal').style.display = 'none';
        });
    }
    
    if (document.getElementById('student-gallery')) {
        AdminPanel.renderStudentGallery();
        
        document.querySelectorAll('.batch-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.batch-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const batch = this.dataset.batch;
                const studentCards = document.querySelectorAll('.student-card');
                
                studentCards.forEach(card => {
                    if (batch === 'all' || card.dataset.batch === batch) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }
    
    if (document.getElementById('events-folder-view')) {
        AdminPanel.init();
    }
    
    if (document.getElementById('admin-login')) {
        document.getElementById('admin-login').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('login-error');
            
            if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
                sessionStorage.setItem('adminLoggedIn', 'true');
                window.location.href = 'admin-panel.html';
            } else {
                errorMsg.textContent = 'Invalid username or password';
                const button = e.target.querySelector('button[type="submit"]');
                button.innerHTML = `<i class="fas fa-sign-in-alt"></i> Login`;
                button.disabled = false;
            }
        });
    }
    
    if (document.getElementById('upcoming-events-list')) {
        AdminPanel.renderUpcomingEvents();
        document.addEventListener('eventsUpdated', AdminPanel.renderUpcomingEvents);
    }
    
    initializeIndianFestivals();
});

// ======================
// UPCOMING EVENTS
// ======================
AdminPanel.renderUpcomingEvents = function() {
    const upcomingEventsList = document.getElementById('upcoming-events-list');
    if (!upcomingEventsList) return;
    
    const events = StorageManager.getEvents();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingEvents = [];
    
    Object.keys(events).forEach(dateStr => {
        const eventDate = new Date(dateStr);
        eventDate.setHours(0, 0, 0, 0);
        
        if (eventDate >= today) {
            events[dateStr].forEach(event => {
                upcomingEvents.push({
                    date: dateStr,
                    dateObj: eventDate,
                    event: event
                });
            });
        }
    });
    
    upcomingEvents.sort((a, b) => a.dateObj - b.dateObj);
    
    upcomingEventsList.innerHTML = '';
    
    if (upcomingEvents.length === 0) {
        upcomingEventsList.innerHTML = `
            <div class="no-upcoming-events">
                <i class="fas fa-calendar-times"></i>
                No upcoming events found
            </div>
        `;
        return;
    }
    
    const eventsToShow = upcomingEvents.slice(0, 6);
    
    eventsToShow.forEach(item => {
        const eventElement = document.createElement('div');
        eventElement.className = 'upcoming-event-item';
        eventElement.innerHTML = `
            <div class="upcoming-event-date">${item.dateObj.toLocaleDateString()}</div>
            <div class="upcoming-event-name">${item.event.name}</div>
            <i class="fas fa-chevron-right"></i>
        `;
        
        eventElement.addEventListener('click', () => {
            if (document.getElementById('calendar-grid')) {
                const calendar = new CalendarManager();
                calendar.currentDate = item.dateObj;
                calendar.currentMonth = item.dateObj.getMonth();
                calendar.currentYear = item.dateObj.getFullYear();
                calendar.renderCalendar();
                calendar.showEventsModal(item.date);
            }
        });
        
        upcomingEventsList.appendChild(eventElement);
    });
};

// ======================
// INDIAN FESTIVALS
// ======================
function initializeIndianFestivals() {
    const events = StorageManager.getEvents();
    let hasNewFestivals = false;

    const festivalImages = {
        'Diwali': 'https://images.unsplash.com/photo-1603383928972-0b3c7b1e1b5a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'Holi': 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'Eid al-Fitr': 'https://images.unsplash.com/photo-1519817650390-64a93db51149?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'Raksha Bandhan': 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'Ganesh Chaturthi': 'https://images.unsplash.com/photo-1630588701018-5d5d1a4f9e1a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'Republic Day': 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'Independence Day': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'Gandhi Jayanti': 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'Makar Sankranti': 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'Baisakhi': 'https://images.unsplash.com/photo-1610296665328-d02e0f3f0a6c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
        'Christmas': 'https://images.unsplash.com/photo-1513151233558-d860c5398176?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'
    };

    // ... rest of the festival initialization code remains the same ...
}

// Update the time display function
function updateTime() {
    const indiaTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    document.querySelector('#time .info-text').textContent = indiaTime;
}

// Update the weather display function
async function fetchWeather() {
    const apiKey = "9812a2cd7527c37af7e50ac1e85c981d";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=Sangamner,IN&units=metric&appid=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        const temp = data.main.temp;
        const description = data.weather[0].description;
        document.querySelector('#weather .info-text').textContent = 
            `${temp}°C, ${description.charAt(0).toUpperCase() + description.slice(1)}`;
            
        const weatherIcon = document.querySelector('#weather i');
        if (description.includes('clear')) {
            weatherIcon.className = 'fas fa-sun';
        } else if (description.includes('cloud')) {
            weatherIcon.className = 'fas fa-cloud';
        } else if (description.includes('rain')) {
            weatherIcon.className = 'fas fa-cloud-rain';
        }
    } catch (error) {
        document.querySelector('#weather .info-text').textContent = "Unable to fetch data";
    }
}