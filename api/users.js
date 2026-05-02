const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId, username, currentPassword, newPassword } = req.body;

        // Change username
        if (username) {
            const { error } = await supabase
                .from('users')
                .update({ username })
                .eq('id', userId);

            if (error) throw error;

            return res.status(200).json({ 
                success: true, 
                message: 'Username updated' 
            });
        }

        // Change password
        if (currentPassword && newPassword) {
            // Verify current password
            const { data: user, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('id', userId)
                .eq('password', currentPassword)
                .single();

            if (!user) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Current password is incorrect' 
                });
            }

            // Update password
            const { error } = await supabase
                .from('users')
                .update({ password: newPassword })
                .eq('id', userId);

            if (error) throw error;

            return res.status(200).json({ 
                success: true, 
                message: 'Password updated' 
            });
        }

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};