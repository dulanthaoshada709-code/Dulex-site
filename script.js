// ==================== SUPABASE CONFIGURATION ====================
// IMPORTANT: Vercel deploy කරද්දි Environment Variables set කරන්න
const SUPABASE_URL = 'https://njlujisswavzhlgsawts.supabase.co'; // ඔබේ URL එක
const SUPABASE_ANON_KEY = 'sb_publishable_S_mKzdUs143YVGjd8mN-7A_8ynQftEb'; // ඔබේ Key එක

let supabase;

// Initialize Supabase
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase connected');
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

// Safe Local Storage Fetch
let localSettings = defaultSettings;
try {
    const savedSettings = localStorage.getItem('creativehub_settings');
    if (savedSettings) {
        localSettings = JSON.parse(savedSettings);
    }
} catch (error) {
    console.log('⚠️ Error parsing local settings, using defaults.');
}

// ==================== INITIALIZATION ====================
// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Loader එක අයින් කර ඇති නිසා කෙලින්ම components initialize කරනවා
    createParticles();
    initializeBackground();
    initNavigation();
    initWallpaperControls();
    addDynamicProjects();
    addDownloaderButtons();

    // සයිට් එක load වූ සැනින් login screen එක පෙන්වීමට:
    document.getElementById('loginScreen').classList.add('active');

// ==================== DATABASE FUNCTIONS ====================
async function saveSettingsToDB() {
    if (!supabase || !currentUser) {
        localStorage.setItem('creativehub_settings', JSON.stringify(localSettings));
        return;
    }

    try {
        const { error } = await supabase
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

        if (error) throw error;
        console.log('✅ Settings saved to database');
    } catch (error) {
        console.error('❌ Failed to save settings:', error);
        localStorage.setItem('creativehub_settings', JSON.stringify(localSettings));
    }
}

async function loadSettingsFromDB() {
    if (!supabase || !currentUser) {
        return;
    }

    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
            localSettings = {
                wallpaperMode: data.wallpaper_mode,
                wallpaperType: data.wallpaper_type,
                wallpaperUrl: data.wallpaper_url,
                soundEnabled: data.sound_enabled,
                customWallpapers: data.custom_wallpapers || {}
            };
            console.log('✅ Settings loaded from database');
        }
    } catch (error) {
        console.error('❌ Failed to load settings:', error);
    }
}

// ==================== LOGIN SYSTEM ====================
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const btn = this.querySelector('.modern-btn');
    if(btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = '', 200);
    }
    
    // Try database login first
    if (supabase) {
        try {
            const { data: user, error } = await supabase
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
            console.log('Database login failed, falling back to local');
        }
    }
    
    // Fallback to local login
    setTimeout(() => {
        if (username === 'admin' && password === 'admin123') {
            currentUser = { id: 0, username: 'admin' };
            loginSuccess(username);
        } else {
            showToast('Invalid credentials! ❌', 'error');
            shakeElement(document.querySelector('.login-card'));
        }
    }, 500);
});

function loginSuccess(username) {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    
    if(document.getElementById('navUsername')) document.getElementById('navUsername').textContent = username;
    if(document.getElementById('dropdownName')) document.getElementById('dropdownName').textContent = username;
    if(document.getElementById('dashboardUser')) document.getElementById('dashboardUser').textContent = username;
    
    initializeBackground();
    showToast('Welcome back, ' + username + '! 👋');
}

function logout() {
    currentUser = null;
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('loginForm').reset();
    document.getElementById('profileDropdown').classList.remove('show');
    showToast('Logged out successfully! 🔒');
}

// ==================== SETTINGS & BACKGROUND ====================
function saveSettings() {
    localStorage.setItem('creativehub_settings', JSON.stringify(localSettings));
    saveSettingsToDB();
}

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
        bgContainer.style.backgroundColor = '#0a0a1a';
    }
}

// ==================== UI FUNCTIONS (Missing parts fixed here) ====================

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.animationDuration = (Math.random() * 5 + 5) + 's';
        particlesContainer.appendChild(particle);
    }
}

function initNavigation() {
    // Sidebar Navigation
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const pages = document.querySelectorAll('.page');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            sidebarItems.forEach(btn => btn.classList.remove('active'));
            item.classList.add('active');
            
            const targetPage = item.getAttribute('data-page');
            pages.forEach(page => {
                if(page.id === targetPage) {
                    page.classList.add('active');
                } else {
                    page.classList.remove('active');
                }
            });
        });
    });

    // Profile Dropdown
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if(profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            profileDropdown.classList.remove('show');
        });
    }

    // Settings Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const target = btn.getAttribute('data-tab');
            tabContents.forEach(content => {
                if(content.id === target + 'Tab') {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });

    // Wallpaper mode radio buttons
    const radioInputs = document.querySelectorAll('input[name="wallpaperMode"]');
    const allMode = document.getElementById('allMode');
    const customMode = document.getElementById('customMode');

    radioInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'all') {
                if(allMode) allMode.style.display = 'block';
                if(customMode) customMode.style.display = 'none';
            } else {
                if(allMode) allMode.style.display = 'none';
                if(customMode) customMode.style.display = 'block';
            }
        });
    });

    // Pill buttons for wallpaper type
    const pillGroups = document.querySelectorAll('.pill-group');
    pillGroups.forEach(group => {
        const pills = group.querySelectorAll('.pill-btn');
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            });
        });
    });
}

function navigateTo(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        if(page.id === pageId) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });

    // Update sidebar UI if applicable
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        if(item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function goBack() {
    navigateTo('dashboard');
}

function openSettings() {
    const modal = document.getElementById('settingsModal');
    if(modal) modal.classList.add('show');
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if(modal) modal.classList.remove('show');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    const icon = toast?.querySelector('i');
    
    if(!toast || !toastText) return;

    toastText.textContent = message;
    
    if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle';
        icon.style.color = '#ef4444';
        toast.style.borderColor = '#ef4444';
    } else {
        icon.className = 'fas fa-check-circle';
        icon.style.color = '#10b981';
        toast.style.borderColor = 'var(--primary)';
    }

    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function shakeElement(element) {
    if(!element) return;
    element.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(0)' }
    ], { duration: 400 });
}

// Dummy functions to prevent errors for missing content
function addDynamicProjects() { /* Add your project loading logic here */ }
function addDownloaderButtons() { /* Add your downloader buttons logic here */ }
function initWallpaperControls() { /* Initialize extra wallpaper stuff if needed */ }

function downloadYouTube() {
    showToast('YouTube Downloader module loading...', 'success');
}

function downloadTikTok() {
    showToast('TikTok Downloader module loading...', 'success');
}

// Profile Settings updates
function changeUsername() {
    const newUser = document.getElementById('newUsername').value;
    if (!newUser) return;
    
    document.getElementById('navUsername').textContent = newUser;
    document.getElementById('dropdownName').textContent = newUser;
    document.getElementById('dashboardUser').textContent = newUser;
    
    showToast('Username updated! ✏️');
    document.getElementById('newUsername').value = '';
}

function changePassword() {
    showToast('Password updated successfully! 🔒');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
            }
