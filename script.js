// ==================== SUPABASE CONFIGURATION ====================
// IMPORTANT: Vercel deploy කරද්දි Environment Variables set කරන්න
const SUPABASE_URL = 'https://your-project.supabase.co'; // ඔබේ URL එක
const SUPABASE_ANON_KEY = 'your-anon-key-here'; // ඔබේ Key එක

let supabase;

// Initialize Supabase
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase connected');
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
    setTimeout(() => {
        document.getElementById('splashLoader')?.classList.add('hidden');
    }, 2500);

    createParticles();
    initializeBackground();
    addDynamicProjects();
    addDownloaderButtons();
    initWallpaperControls();
});

// ==================== DATABASE FUNCTIONS ====================

// Save settings to database
async function saveSettingsToDB() {
    if (!supabase || !currentUser) {
        // Fallback to localStorage
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
        // Fallback to localStorage
        localStorage.setItem('creativehub_settings', JSON.stringify(localSettings));
    }
}

// Load settings from database
async function loadSettingsFromDB() {
    if (!supabase || !currentUser) {
        localSettings = JSON.parse(localStorage.getItem('creativehub_settings')) || defaultSettings;
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
        } else {
            // Create default settings for user
            await saveSettingsToDB();
        }
    } catch (error) {
        console.error('❌ Failed to load settings:', error);
    }
}

// ==================== LOGIN SYSTEM (UPDATED) ====================
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const btn = this.querySelector('.modern-btn');
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => btn.style.transform = '', 200);
    
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
            console.error('Database login failed:', error);
        }
    }
    
    // Fallback to local login
    setTimeout(() => {
        const localUser = JSON.parse(localStorage.getItem('creativehub_user'));
        if (username === 'admin' && password === 'admin123') {
            currentUser = { id: 0, username: 'admin' };
            loginSuccess(username);
        } else if (localUser && username === localUser.username && password === localUser.password) {
            currentUser = { id: 0, username: username };
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
    
    document.getElementById('navUsername').textContent = username;
    document.getElementById('dropdownName').textContent = username;
    document.getElementById('dashboardUser').textContent = username;
    
    initializeBackground();
    showToast('Welcome back, ' + username + '! 👋');
}

// ==================== SETTINGS (UPDATED) ====================
function saveSettings() {
    // Save to database and localStorage as backup
    localStorage.setItem('creativehub_settings', JSON.stringify(localSettings));
    saveSettingsToDB();
}

// Update applyWallpaper
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

// Update applyCustomWallpaper
function applyCustomWallpaper() {
    const section = document.getElementById('sectionSelect').value;
    const type = document.querySelector('#customPills .pill-btn.active')?.dataset.type || 'normal';
    const url = document.getElementById('customWallpaperUrl').value;
    
    localSettings.customWallpapers[section] = { type, url };
    saveSettings();
    showToast(`Wallpaper applied to ${section}! 🎨`);
}

// Update toggleSound
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

// Update initializeBackground
function initializeBackground() {
    const bgContainer = document.getElementById('siteBackground');
    if (!bgContainer) return;
    
    const settings = localSettings; // Use localSettings
    
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

// Update changeUsername
async function changeUsername() {
    const newUser = document.getElementById('newUsername').value;
    if (!newUser) return;
    
    // Update in database if available
    if (supabase && currentUser?.id) {
        try {
            const { error } = await supabase
                .from('users')
                .update({ username: newUser })
                .eq('id', currentUser.id);
            
            if (!error) {
                currentUser.username = newUser;
                console.log('✅ Username updated in database');
            }
        } catch (error) {
            console.error('Failed to update username:', error);
        }
    }
    
    // Update UI
    document.getElementById('navUsername').textContent = newUser;
    document.getElementById('dropdownName').textContent = newUser;
    document.getElementById('dashboardUser').textContent = newUser;
    
    showToast('Username updated! ✏️');
    document.getElementById('newUsername').value = '';
}

// Update changePassword
async function changePassword() {
    const current = document.getElementById('currentPassword').value;
    const newPw = document.getElementById('newPassword').value;
    
    if (!current || !newPw || newPw.length < 6) {
        showToast('Invalid password!', 'error');
        return;
    }
    
    // Update in database if available
    if (supabase && currentUser?.id) {
        try {
            // Verify current password first
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('id', currentUser.id)
                .eq('password', current)
                .single();
            
            if (!user) {
                showToast('Current password is incorrect!', 'error');
                return;
            }
            
            // Update password
            const { error } = await supabase
                .from('users')
                .update({ password: newPw })
                .eq('id', currentUser.id);
            
            if (!error) {
                console.log('✅ Password updated in database');
            }
        } catch (error) {
            console.error('Failed to update password:', error);
        }
    }
    
    showToast('Password updated! 🔒');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
}

// ... (Rest of the code stays the same: particles, navigation, downloaders, etc.)
// Keep all the remaining functions from the original script.js