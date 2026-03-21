const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Role, CategoryMaster } = require('../models');

const JWT_SECRET = 'your_super_secret_key_change_in_production';

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({
            where: { email, status: 'Active' },
            include: [
                { model: Role },
                { model: CategoryMaster, through: { attributes: [] } }
            ]
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials or inactive account' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, role: user.Role.role_name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Update last login
        await user.update({ last_login: new Date() });

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.Role.role_name,
                assigned_categories: user.CategoryMasters.map(c => c.name)
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal server failure during authentication' });
    }
};
