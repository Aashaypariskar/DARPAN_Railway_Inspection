const { sequelize, User, Role, AdminAuditLog } = require('../models');

async function migrate() {
    try {
        console.log('--- ENTERPRISE MIGRATION START ---');

        // 1. Create missing tables
        console.log('Creating missing tables...');
        await sequelize.sync({ force: false });
        console.log('Table creation complete.');

        // 2. Manually add columns for SQLite (since alter: true is buggy)
        const queryInterface = sequelize.getQueryInterface();
        const tablesToUpdate = [
            { table: 'commissionary_sessions', col: 'inspector_name' },
            { table: 'sickline_sessions', col: 'inspector_name' },
            { table: 'wsp_sessions', col: 'inspector_name' },
            { table: 'cai_sessions', col: 'inspector_name' },
            { table: 'pitline_sessions', col: 'inspector_name' }
        ];

        for (const item of tablesToUpdate) {
            try {
                await queryInterface.addColumn(item.table, item.col, {
                    type: require('sequelize').DataTypes.STRING(100),
                    allowNull: true
                });
                console.log(`Added ${item.col} to ${item.table}`);
            } catch (e) {
                // Already exists
            }
        }

        // 2. Ensure Roles exist
        console.log('Verifying roles...');
        const [superAdminRole] = await Role.findOrCreate({
            where: { role_name: 'SUPER_ADMIN' },
            defaults: { role_name: 'SUPER_ADMIN' }
        });
        const [adminRole] = await Role.findOrCreate({
            where: { role_name: 'Admin' },
            defaults: { role_name: 'Admin' }
        });
        const [auditorRole] = await Role.findOrCreate({
            where: { role_name: 'Auditor' },
            defaults: { role_name: 'Auditor' }
        });
        const [inspectorRole] = await Role.findOrCreate({
            where: { role_name: 'Inspector' },
            defaults: { role_name: 'Inspector' }
        });

        // 3. Promote the first Admin to SUPER_ADMIN if no Super Admin exists
        const superAdminCount = await User.count({ where: { role_id: superAdminRole.id } });
        if (superAdminCount === 0) {
            const firstAdmin = await User.findOne({ where: { role_id: adminRole.id } });
            if (firstAdmin) {
                console.log(`Promoting ${firstAdmin.email} to SUPER_ADMIN...`);
                firstAdmin.role_id = superAdminRole.id;
                await firstAdmin.save();
                console.log('Promotion complete.');
            } else {
                console.log('No Admin found to promote. Please create a user manually or use the UI.');
            }
        }

        console.log('--- ENTERPRISE MIGRATION SUCCESS ---');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
