const { createClient } = require('@supabase/supabase-js');

// Supabase Config - මේවා Vercel Environment Variables වලින් load වෙනවා
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username, password } = req.body;

        // Database එකෙන් user හොයන්න
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Userගේ settings load කරන්න
        const { data: settings } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                username: user.username
            },
            settings: settings || null
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};
