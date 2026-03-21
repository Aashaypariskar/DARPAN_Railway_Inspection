const bcrypt = require('bcryptjs');
const { Role, User, sequelize } = require('../models');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('DB connected');

        // Ensure Admin role exists
        let role = await Role.findOne({ where: { role_name: 'Admin' } });
        if (!role) {
            role = await Role.create({ role_name: 'Admin' });
            console.log('Created Admin role');
        }

        // Create Admin user
        const email = 'admin@example.com';
        const password = 'AdminPassword123!';

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            console.log('Admin user already exists:', email);
            // Update role just in case
            await existing.update({ role_id: role.id });
            console.log('Updated existing user to Admin role');
            process.exit(0);
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: 'System Admin',
            email,
            password: hashed,
            role_id: role.id,
            status: 'Active'
        });

        console.log('==========================================');
        console.log('ADMIN USER CREATED SUCCESSFULLY');
        console.log('Email:   ' + email);
        console.log('Password: ' + password);
        console.log('==========================================');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
