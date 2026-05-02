// ==================== SUPABASE CONFIGURATION ====================
// IMPORTANT: Vercel deploy කරද්දි Environment Variables set කරන්න
const SUPABASE_URL = 'https://njlujisswavzhlgsawts.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbHVqaXNzd2F2emhsZ3NzYXd0cyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE0Njg5NDAwLCJleHAiOjIwMzAyNjU0MDB9.A8qH8X7L0z0J4Z3K8x0Y5k6Z3K8x0Y5k6Z3K8x0Y5k6'; // ඔබේ Publishable Key

let supabase = null;

// Initialize Supabase - SAFE MODE
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase connected');
    } else {
        console.log('⚠️ Supabase library not loaded');
    }
} catch (error) {
    console.log('⚠️ Supabase not available, using local storage');
}

// Current user
let currentUser = null;

// ==================== DATA STORAGE ====================
const defaultSettings = {
    wallpaperMode: 'all',
    wallpaperType: 'video',
    wallpaperUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-background-with-blue-light-effects-12578-large.mp4',
    customWallpapers: {},
    soundEnabled: true
};

// Local settings fallback
let localSettings = JSON.parse(localStorage.getItem('creativehub_settings')) || defaultSettings;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Remove loader after 2.5 seconds
    setTimeout(() => {
        const loader = document.getElementById('splashLoader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }, 2500);

    createParticles();
    initializeBackground();
    addDynamicProjects();
    addDownloaderButtons();
    initWallpaperControls();
});

// ==================== PARTICLES ====================
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (Math.random() * 6 + 4) + 's';
        particle.style.width = (Math.random() * 4 + 2) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// ==================== BACKGROUND MANAGEMENT ====================
function initializeBackground() {
    const bgContainer = document.getElementById('siteBackground');
    if (!bgContainer) return;
    
    const settings = localSettings;
    
    if (settings.wallpaperType === 'video' && settings.wallpaperUrl) {
        bgContainer.innerHTML = `
            <video autoplay muted loop playsinline id="bgVideo">
                <source src="${settings.wallpaperUrl}" type="video/mp4">
            </video>
            <div class="bg-gradient"></div>
        `;
    } else if (settings.wallpaperType === 'image' && settings.wallpaperUrl) {
        bgContainer.innerHTML = '<div class="bg-gradient"></div>';
        bgContainer.style.backgroundImage = `url(${settings.wallpaperUrl})`;
        bgContainer.style.backgroundSize = 'cover';
        bgContainer.style.backgroundPosition = 'center';
    } else {
        bgContainer.innerHTML = '<div class="bg-gradient"></div>';
        bgContainer.style.backgroundImage = 'none';
    }
}

// ==================== WALLPAPER CONTROLS ====================
function initWallpaperControls() {
    document.querySelectorAll('input[name="wallpaperMode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            localSettings.wallpaperMode = this.value;
            saveSettings();
            
            document.getElementById('allMode').style.display = 
                this.value === 'all' ? 'block' : 'none';
            document.getElementById('customMode').style.display = 
                this.value === 'custom' ? 'block' : 'none';
        });
    });
    
    document.querySelectorAll('.pill-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const parent = this.closest('.pill-group, #customPills');
            if (parent) {
                parent.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
            }
            this.classList.add('active');
        });
    });
}

// ==================== DATABASE FUNCTIONS ====================
async function saveSettingsToDB() {
    localStorage.setItem('creativehub_settings', JSON.stringify(localSettings));
    
    if (!supabase || !currentUser || currentUser.id === 0) {
        return;
    }

    try {
        await supabase
            .from('settings')
            .upsert({
                user_id: currentUser.id,
                wallpaper_mode: localSettings.wallpaperMode,
                wallpaper_type: localSettings.wallpaperType,
                wallpaper_url: localSettings.wallpaperUrl,
                sound_enabled: localSettings.soundEnabled,
                custom_wallpapers: localSettings.customWallpapers || {},
                updated_at: new Date()
            });
    } catch (error) {
        console.log('Save to localStorage only');
    }
}

async function loadSettingsFromDB() {
    if (!supabase || !currentUser || currentUser.id === 0) {
        localSettings = JSON.parse(localStorage.getItem('creativehub_settings')) || defaultSettings;
        return;
    }

    try {
        const { data } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (data) {
            localSettings = {
                wallpaperMode: data.wallpaper_mode,
                wallpaperType: data.wallpaper_type,
                wallpaperUrl: data.wallpaper_url,
                soundEnabled: data.sound_enabled,
                customWallpapers: data.custom_wallpapers || {}
            };
        }
    } catch (error) {
        console.log('Using local settings');
    }
}

// ==================== LOGIN SYSTEM ====================
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const btn = this.querySelector('.modern-btn');
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => btn.style.transform = '', 200);
    
    // Try database login
    if (supabase) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (user) {
                currentUser = { id: user.id, username: user.username };
                await loadSettingsFromDB();
                loginSuccess(username);
                return;
            }
        } catch (error) {
            console.log('DB login failed, trying local');
        }
    }
    
    // Local login
    if (username === 'admin' && password === 'admin123') {
        currentUser = { id: 0, username: 'admin' };
        loginSuccess(username);
    } else {
        showToast('Invalid credentials! ❌', 'error');
        shakeElement(document.querySelector('.login-card'));
    }
});

function loginSuccess(username) {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    
    document.getElementById('navUsername').textContent = username;
    document.getElementById('dropdownName').textContent = username;
    document.getElementById('dashboardUser').textContent = username;
    
    initializeBackground();
    showToast('Welcome back, ' + username + '! 👋');
}

function logout() {
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('loginForm').reset();
    closeDropdown();
    showToast('Logged out successfully 👋');
}

// ==================== NAVIGATION ====================
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) item.classList.add('active');
    });
}

document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', function() {
        navigateTo(this.dataset.page);
    });
});

function goBack() {
    navigateTo('downloads');
}

// ==================== DYNAMIC CONTENT ====================
function addDynamicProjects() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    
    const projects = [
        { name: 'YouTube Downloader', icon: 'fab fa-youtube', color: '#ef4444', page: 'youtubeDownloader' },
        { name: 'TikTok Downloader', icon: 'fab fa-tiktok', color: '#fff', page: 'tiktokDownloader' },
        { name: 'Instagram Tools', icon: 'fab fa-instagram', color: '#ec4899', page: 'youtubeDownloader' },
        { name: 'Facebook Tools', icon: 'fab fa-facebook', color: '#3b82f6', page: 'youtubeDownloader' },
    ];
    
    grid.innerHTML = projects.map(p => `
        <div class="project-card" onclick="navigateTo('${p.page}')">
            <div style="font-size: 2rem; color: ${p.color}; margin-bottom: 12px;">
                <i class="${p.icon}"></i>
            </div>
            <h3 style="font-size: 1.1rem;">${p.name}</h3>
        </div>
    `).join('');
}

function addDownloaderButtons() {
    const container = document.getElementById('downloaderButtons');
    if (!container) return;
    
    const buttons = [
        { name: 'YouTube DL', icon: 'fab fa-youtube', color: '#ef4444', page: 'youtubeDownloader' },
        { name: 'TikTok DL', icon: 'fab fa-tiktok', color: '#fff', page: 'tiktokDownloader' },
    ];
    
    container.innerHTML = buttons.map(b => `
        <div class="project-card" onclick="navigateTo('${b.page}')">
            <div style="font-size: 2rem; color: ${b.color}; margin-bottom: 12px;">
                <i class="${b.icon}"></i>
            </div>
            <h3 style="font-size: 1.1rem;">${b.name}</h3>
        </div>
    `).join('');
}

// ==================== VIDEO DOWNLOADERS ====================
async function downloadYouTube() {
    const url = document.getElementById('ytUrl').value;
    if (!url) {
        showToast('Please paste a YouTube URL', 'error');
        return;
    }
    
    const videoId = extractYouTubeID(url);
    const preview = document.getElementById('ytPreview');
    
    if (videoId) {
        preview.innerHTML = `
            <div style="margin-top: 20px;">
                <img src="https://img.youtube.com/vi/${videoId}/maxresdefault.jpg" 
                     style="width: 100%; border-radius: 12px;" alt="Thumbnail">
            </div>
        `;
    }
    
    const progress = document.getElementById('ytProgress');
    progress.style.display = 'block';
    const fill = document.getElementById('ytProgressFill');
    const text = document.getElementById('ytProgressText');
    
    for (let i = 0; i <= 100; i += 10) {
        await sleep(300);
        fill.style.width = i + '%';
        text.textContent = i + '%';
    }
    
    window.open(`https://api.vevioz.com/api/button/mp4/${videoId}`, '_blank');
    showToast('YouTube download started! 📥');
}

async function downloadTikTok() {
    const url = document.getElementById('ttUrl').value;
    if (!url) {
        showToast('Please paste a TikTok URL', 'error');
        return;
    }
    
    const progress = document.getElementById('ttProgress');
    progress.style.display = 'block';
    const fill = document.getElementById('ttProgressFill');
    const text = document.getElementById('ttProgressText');
    
    for (let i = 0; i <= 100; i += 10) {
        await sleep(300);
        fill.style.width = i + '%';
        text.textContent = i + '%';
    }
    
    window.open(`https://api.vevioz.com/api/button/tiktok?url=${encodeURIComponent(url)}`, '_blank');
    showToast('TikTok download started! 📥');
}

function extractYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// ==================== SETTINGS ====================
function saveSettings() {
    localStorage.setItem('creativehub_settings', JSON.stringify(localSettings));
    saveSettingsToDB();
}

function applyWallpaper() {
    const type = document.querySelector('.pill-btn.active')?.dataset.type || 'normal';
    const url = document.getElementById('wallpaperUrl').value;
    
    if (type !== 'normal' && !url) {
        showToast('Please enter a URL', 'error');
        return;
    }
    
    localSettings.wallpaperType = type;
    localSettings.wallpaperUrl = url;
    saveSettings();
    initializeBackground();
    showToast('Wallpaper applied successfully! 🎨');
}

function applyCustomWallpaper() {
    const section = document.getElementById('sectionSelect').value;
    const type = document.querySelector('#customPills .pill-btn.active')?.dataset.type || 'normal';
    const url = document.getElementById('customWallpaperUrl').value;
    
    localSettings.customWallpapers[section] = { type, url };
    saveSettings();
    showToast(`Wallpaper applied to ${section}! 🎨`);
}

function toggleSound() {
    const bgMusic = document.getElementById('bgMusic');
    const btn = document.getElementById('soundToggle');
    
    localSettings.soundEnabled = !localSettings.soundEnabled;
    
    if (localSettings.soundEnabled) {
        if (bgMusic) {
            bgMusic.volume = 0.3;
            bgMusic.play().catch(() => {});
        }
        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
    } else {
        if (bgMusic) bgMusic.pause();
        btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    }
    
    saveSettings();
}

function openSettings() {
    document.getElementById('settingsModal').classList.add('show');
    closeDropdown();
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');
}

async function changeUsername() {
    const newUser = document.getElementById('newUsername').value;
    if (!newUser) return;
    
    document.getElementById('navUsername').textContent = newUser;
    document.getElementById('dropdownName').textContent = newUser;
    document.getElementById('dashboardUser').textContent = newUser;
    
    showToast('Username updated! ✏️');
    document.getElementById('newUsername').value = '';
}

async function changePassword() {
    const current = document.getElementById('currentPassword').value;
    const newPw = document.getElementById('newPassword').value;
    
    if (!current || !newPw || newPw.length < 6) {
        showToast('Invalid password!', 'error');
        return;
    }
    
    showToast('Password updated! 🔒');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
}

// ==================== PROFILE DROPDOWN ====================
document.getElementById('profileBtn')?.addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('profileDropdown').classList.toggle('show');
});

document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('profileDropdown');
    const profileBtn = document.getElementById('profileBtn');
    if (!profileBtn?.contains(event.target) && !dropdown?.contains(event.target)) {
        dropdown?.classList.remove('show');
    }
});

function closeDropdown() {
    document.getElementById('profileDropdown')?.classList.remove('show');
}

// ==================== SETTINGS TABS ====================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const tabId = this.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(tabId + 'Tab').classList.add('active');
    });
});

// ==================== PASSWORD TOGGLE ====================
document.querySelector('.toggle-password')?.addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
});

// ==================== SOUND TOGGLE ====================
document.getElementById('soundToggle')?.addEventListener('click', toggleSound);

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSettings();
        closeDropdown();
    }
});

// ==================== UTILITIES ====================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    const icon = toast.querySelector('i');
    
    toastText.textContent = message;
    icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    toast.style.borderColor = type === 'error' ? '#ef4444' : '#10b981';
    
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function shakeElement(el) {
    el.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => el.style.animation = '', 500);
}

// Add shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-8px); }
        40%, 80% { transform: translateX(8px); }
    }
`;
document.head.appendChild(shakeStyle);
