const bcrypt = require('bcryptjs');
const { User, Role, sequelize } = require('./models');

async function resetAdmin() {
    try {
        await sequelize.authenticate();
        console.log('--- DATABASE CONNECTED ---');

        // 1. Ensure Role exists
        let [role] = await Role.findOrCreate({
            where: { role_name: 'SUPER_ADMIN' },
            defaults: { role_name: 'SUPER_ADMIN' }
        });

        // 2. Forced Reset Payload
        const adminEmail = 'admin@example.com';
        const adminPassword = 'AdminPassword123!';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // 3. Upsert User
        const [user, created] = await User.findOrCreate({
            where: { email: adminEmail },
            defaults: {
                name: 'System Admin',
                email: adminEmail,
                password: hashedPassword,
                role_id: role.id,
                status: 'Active'
            }
        });

        if (!created) {
            console.log(`User ${adminEmail} found. Force resetting password and role...`);
            await user.update({
                password: hashedPassword,
                role_id: role.id,
                status: 'Active'
            });
        }

        console.log('==========================================');
        console.log('SUPER_ADMIN ACCOUNT READY');
        console.log('Email:    ' + adminEmail);
        console.log('Password: ' + adminPassword);
        console.log('Status:   Active');
        console.log('Role:     SUPER_ADMIN');
        console.log('==========================================');

        process.exit(0);
    } catch (err) {
        console.error('Reset Failed:', err);
        process.exit(1);
    }
}

resetAdmin();
