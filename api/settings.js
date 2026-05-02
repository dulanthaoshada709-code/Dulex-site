const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const userId = req.query.userId || req.body.userId;

    if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
    }

    try {
        // GET settings
        if (req.method === 'GET') {
            const { data: settings, error } = await supabase
                .from('settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return res.status(200).json({ 
                success: true, 
                settings: settings || null 
            });
        }

        // UPDATE settings
        if (req.method === 'PUT' || req.method === 'POST') {
            const { settings: newSettings } = req.body;

            // Check if settings exist
            const { data: existing } = await supabase
                .from('settings')
                .select('id')
                .eq('user_id', userId)
                .single();

            let result;

            if (existing) {
                // Update
                result = await supabase
                    .from('settings')
                    .update({
                        wallpaper_mode: newSettings.wallpaperMode,
                        wallpaper_type: newSettings.wallpaperType,
                        wallpaper_url: newSettings.wallpaperUrl,
                        sound_enabled: newSettings.soundEnabled,
                        custom_wallpapers: newSettings.customWallpapers || {},
                        updated_at: new Date()
                    })
                    .eq('user_id', userId);
            } else {
                // Insert
                result = await supabase
                    .from('settings')
                    .insert({
                        user_id: userId,
                        wallpaper_mode: newSettings.wallpaperMode,
                        wallpaper_type: newSettings.wallpaperType,
                        wallpaper_url: newSettings.wallpaperUrl,
                        sound_enabled: newSettings.soundEnabled,
                        custom_wallpapers: newSettings.customWallpapers || {}
                    });
            }

            if (result.error) throw result.error;

            return res.status(200).json({ 
                success: true, 
                message: 'Settings saved' 
            });
        }

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
};