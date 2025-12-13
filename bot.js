// Telegram WebApp initialization
let tg = window.Telegram.WebApp;

// Expand the app to full screen
tg.expand();
tg.enableClosingConfirmation();

// URL parametrlarini o'qish funksiyasi
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        user_id: params.get('user_id'),
        name: decodeURIComponent(params.get('name') || 'Foydalanuvchi'),
        phone: params.get('phone') || '',
        hours: params.get('hours') || '2',
        goal: decodeURIComponent(params.get('goal') || 'kasbiy'),
        premium: params.get('premium') === '1',
        trial_days: params.get('trial_days') || '3',
        total_minutes: parseInt(params.get('total_minutes') || '0'),
        streak_days: parseInt(params.get('streak_days') || '0')
    };
}

// LocalStorage ga saqlash
function saveUserToLocalStorage(params) {
    localStorage.setItem('user_id', params.user_id);
    localStorage.setItem('user_name', params.name);
    localStorage.setItem('user_phone', params.phone);
    localStorage.setItem('daily_hours', params.hours);
    localStorage.setItem('user_goal', params.goal);
    localStorage.setItem('is_premium', params.premium);
    localStorage.setItem('trial_days', params.trial_days);
    localStorage.setItem('total_minutes', params.total_minutes);
    localStorage.setItem('streak_days', params.streak_days);
    localStorage.setItem('last_update', new Date().toISOString());
}

// UI ni yangilash
function updateUserUI(params) {
    // User badge
    document.getElementById('userName').textContent = `👤 ${params.name}`;
    document.getElementById('userGoal').textContent = `🎯 Maqsad: ${params.goal}`;
    document.getElementById('userHours').textContent = `⏰ Kunlik: ${params.hours} soat`;
    
    // Status badge
    const statusElement = document.getElementById('userStatus');
    if (params.premium) {
        statusElement.innerHTML = `<span class="premium-badge">💎 PREMIUM</span>`;
    } else {
        statusElement.innerHTML = `<span class="trial-badge">🎁 TRIAL: ${params.trial_days} kun qoldi</span>`;
    }
    
    // Progress ni yangilash
    updateProgressUI(params.total_minutes, params.streak_days);
}

// Progress UI yangilash
function updateProgressUI(totalMinutes, streakDays) {
    const totalHours = (totalMinutes / 60).toFixed(1);
    const percentage = ((totalMinutes / 120000) * 100).toFixed(1);
    
    document.getElementById('currentHours').textContent = `${totalHours} soat / 2000 soat`;
    document.getElementById('progressPercent').textContent = `${percentage}%`;
    document.getElementById('progressFill').style.width = `${Math.min(percentage, 100)}%`;
    document.getElementById('streakDays').textContent = `🔥 ${streakDays} kun`;
}

// Timer boshlash - Botga xabar yuborish
function startTimer(type) {
    const params = getUrlParams();
    const startTime = new Date();
    
    // Botga xabar yuborish
    tg.sendData(JSON.stringify({
        action: 'start_timer',
        user_id: params.user_id,
        content_type: type,
        start_time: startTime.toISOString()
    }));
    
    // Local timer
    const timerId = `${type}_timer`;
    localStorage.setItem(timerId, startTime.toISOString());
    
    // UI yangilash
    document.querySelectorAll('.timer-btn.start').forEach(btn => btn.disabled = true);
    const stopBtn = document.getElementById(`${type}Timer`).parentElement.querySelector('.timer-btn.stop');
    stopBtn.disabled = false;
    
    // Timer display
    const timerDisplay = document.getElementById(`${type}Timer`);
    let seconds = 0;
    
    const intervalId = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        // Saqlash
        localStorage.setItem(`${type}_elapsed`, seconds);
    }, 1000);
    
    localStorage.setItem(`${type}_interval`, intervalId.toString());
}

// Timer to'xtatish
function stopTimer(type) {
    const params = getUrlParams();
    const endTime = new Date();
    const startTimeStr = localStorage.getItem(`${type}_timer`);
    
    if (!startTimeStr) return;
    
    const startTime = new Date(startTimeStr);
    const duration = Math.floor((endTime - startTime) / 1000); // sekundlar
    
    // Botga xabar yuborish
    tg.sendData(JSON.stringify({
        action: 'stop_timer',
        user_id: params.user_id,
        content_type: type,
        duration: duration,
        end_time: endTime.toISOString()
    }));
    
    // Local timerlarni tozalash
    const intervalId = parseInt(localStorage.getItem(`${type}_interval`));
    if (intervalId) clearInterval(intervalId);
    
    localStorage.removeItem(`${type}_timer`);
    localStorage.removeItem(`${type}_interval`);
    localStorage.removeItem(`${type}_elapsed`);
    
    // UI yangilash
    document.querySelectorAll('.timer-btn.start').forEach(btn => btn.disabled = false);
    document.querySelectorAll('.timer-btn.stop').forEach(btn => btn.disabled = true);
    
    // Progress yangilash
    const minutes = duration / 60;
    updateUserProgress(minutes);
}

// Progress yangilash
function updateUserProgress(minutes) {
    const params = getUrlParams();
    let totalMinutes = params.total_minutes + minutes;
    let streakDays = params.streak_days;
    
    // Har kungi streak ni tekshirish
    const lastActive = localStorage.getItem('last_active_date');
    const today = new Date().toDateString();
    
    if (lastActive !== today) {
        streakDays++;
        localStorage.setItem('last_active_date', today);
        localStorage.setItem('user_streak', streakDays);
    }
    
    // Yangi ma'lumotlarni saqlash
    localStorage.setItem('total_minutes', totalMinutes);
    localStorage.setItem('streak_days', streakDays);
    
    // UI yangilash
    updateProgressUI(totalMinutes, streakDays);
    
    // URL ni yangilash (ishonchli emas, lekin foydali)
    updateUrlWithNewProgress(totalMinutes, streakDays);
}

// URL ni yangilash (faqat ma'lumotlar ko'rinishi uchun)
function updateUrlWithNewProgress(totalMinutes, streakDays) {
    const params = getUrlParams();
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('total_minutes', totalMinutes);
    newUrl.searchParams.set('streak_days', streakDays);
    window.history.replaceState({}, '', newUrl);
}

// Dasturni ishga tushirish
function initApp() {
    // URL parametrlarini o'qish
    const params = getUrlParams();
    
    // Agar user_id bo'lmasa, xato
    if (!params.user_id) {
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; color: white;">
                <h1>❌ Xato</h1>
                <p>User ma'lumotlari topilmadi!</p>
                <p>Iltimos, bot orqali Mini App'ni oching.</p>
                <a href="https://t.me/soat2000_bot" style="color: #4CAF50; text-decoration: underline;">
                    Botga o'tish
                </a>
            </div>
        `;
        return;
    }
    
    // Ma'lumotlarni saqlash
    saveUserToLocalStorage(params);
    
    // UI ni yangilash
    updateUserUI(params);
    
    // Kontent yuklash
    loadDailyContent(params.goal, params.hours);
}

// Kontent yuklash
function loadDailyContent(goal, hours) {
    const dailyMinutes = hours * 60;
    
    // Vaqt taqsimoti
    const distribution = {
        podcast: Math.floor(dailyMinutes * 0.25),
        book: Math.floor(dailyMinutes * 0.25),
        article: Math.floor(dailyMinutes * 0.15),
        task: Math.floor(dailyMinutes * 0.20),
        test: Math.floor(dailyMinutes * 0.10),
        advice: Math.floor(dailyMinutes * 0.05)
    };
    
    // Maqsadga bog'liq kontent
    const content = getContentByGoal(goal, distribution);
    
    // Kontent kartalarini yaratish
    renderContentCards(content);
}

// Maqsadga bog'liq kontent
function getContentByGoal(goal, distribution) {
    // Bu joyda haqiqiy kontentlar bo'lishi kerak
    // Hozircha demo kontent
    
    const contentTemplates = {
        ielts: {
            podcast: {
                title: "IELTS Listening Masterclass",
                description: "Advanced listening practice for band 7+",
                link: "https://youtube.com/watch?v=demo_ielts",
                duration: distribution.podcast
            },
            book: {
                title: "Cambridge IELTS 16",
                description: "Authentic practice tests",
                link: "https://example.com/cambridge-ielts.pdf",
                duration: distribution.book
            }
        },
        kasbiy: {
            podcast: {
                title: "Kasbiy ko'nikmalar",
                description: "Zamonaviy ish o'rinlari talablari",
                link: "https://youtube.com/watch?v=demo_kasbiy",
                duration: distribution.podcast
            },
            book: {
                title: "Atomiy Odatlar",
                description: "James Clear - Kichik o'zgarishlar, katta natijalar",
                link: "https://example.com/atomic-habits.pdf",
                duration: distribution.book
            }
        }
    };
    
    return contentTemplates[goal] || contentTemplates['kasbiy'];
}

// Kontent kartalarini yaratish
function renderContentCards(content) {
    const grid = document.getElementById('contentGrid');
    if (!grid) return;
    
    // Demo kartalar
    grid.innerHTML = `
        <div class="content-card">
            <div class="card-header">
                <div class="card-icon">🎧</div>
                <div class="card-title">Podcast</div>
                <div class="card-duration">${content.podcast.duration} min</div>
            </div>
            <div class="card-desc">${content.podcast.description}</div>
            <a href="${content.podcast.link}" target="_blank" class="link-btn">🎬 Videoni ko'rish</a>
            <div class="timer-controls">
                <button class="timer-btn start" onclick="startTimer('podcast')">▶️ START</button>
                <button class="timer-btn stop" onclick="stopTimer('podcast')" disabled>⏹️ STOP</button>
                <div class="timer-display" id="podcastTimer">00:00</div>
            </div>
        </div>
        
        <div class="content-card">
            <div class="card-header">
                <div class="card-icon">📚</div>
                <div class="card-title">Kitob</div>
                <div class="card-duration">${content.book.duration} min</div>
            </div>
            <div class="card-desc">${content.book.description}</div>
            <a href="${content.book.link}" target="_blank" class="link-btn">📖 Kitobni o'qish</a>
            <div class="timer-controls">
                <button class="timer-btn start" onclick="startTimer('book')">▶️ START</button>
                <button class="timer-btn stop" onclick="stopTimer('book')" disabled>⏹️ STOP</button>
                <div class="timer-display" id="bookTimer">00:00</div>
            </div>
        </div>
        
        <div class="content-card">
            <div class="card-header">
                <div class="card-icon">✅</div>
                <div class="card-title">Kunlik Task</div>
                <div class="card-duration">Bugun</div>
            </div>
            <div class="task-item">
                <input type="checkbox" class="task-checkbox" id="dailyTask" onchange="completeTask(this)">
                <label class="task-text" for="dailyTask">15 daqiqa telefon ishlatma - diqqatni oshirish</label>
            </div>
        </div>
        
        <div class="content-card">
            <div class="card-header">
                <div class="card-icon">💡</div>
                <div class="card-title">Kunlik Maslahat</div>
                <div class="card-duration">1 min</div>
            </div>
            <div class="card-desc">Har kuni bir yangi narsa o'rganing. Kichik qadamlar katta natijalar keltiradi.</div>
        </div>
    `;
}

// Task bajarish
function completeTask(checkbox) {
    const params = getUrlParams();
    
    if (checkbox.checked) {
        // Botga xabar
        tg.sendData(JSON.stringify({
            action: 'task_completed',
            user_id: params.user_id,
            task: '15 daqiqa telefon ishlatma'
        }));
        
        // Progress
        updateUserProgress(10); // 10 minut qo'shish
    }
}

// Dasturni ishga tushirish
document.addEventListener('DOMContentLoaded', initApp);