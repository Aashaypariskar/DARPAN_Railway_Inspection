const { sequelize, Role, User, CategoryMaster, UserCategory } = require('./backend/models');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log('--- STARTING MASTER SEEDING ---');
    const transaction = await sequelize.transaction();
    try {
        // 1. Create Roles
        const [adminRole] = await Role.findOrCreate({ where: { role_name: 'Admin' }, transaction });
        await Role.findOrCreate({ where: { role_name: 'Engineer' }, transaction });
        await Role.findOrCreate({ where: { role_name: 'Field User' }, transaction });
        await Role.findOrCreate({ where: { role_name: 'Auditor' }, transaction });

        // 2. Create Admin User
        const email = 'admin@example.com';
        const password = 'AdminPassword123!';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [adminUser] = await User.findOrCreate({
            where: { email },
            defaults: {
                name: 'System Admin',
                password: hashedPassword,
                role_id: adminRole.id,
                status: 'Active'
            },
            transaction
        });

        // 3. Create Categories
        const categories = [
            'Amenity',
            'WSP Examination',
            'Pit Line Examination',
            'Sick Line Examination',
            'CAI / Modifications',
            'Coach Commissioning'
        ];

        for (const catName of categories) {
            const [cat] = await CategoryMaster.findOrCreate({
                where: { name: catName },
                transaction
            });

            // 4. Associate with Admin User
            await UserCategory.findOrCreate({
                where: { user_id: adminUser.id, category_id: cat.id },
                transaction
            });
        }

        await transaction.commit();
        console.log('--- MASTER SEEDING COMPLETE ---');
        console.log('Admin Email: admin@example.com');
        console.log('Admin Password: AdminPassword123!');
    } catch (err) {
        console.error('--- SEEDING FAILED ---', err);
        if (transaction) await transaction.rollback();
    } finally {
        process.exit();
    }
}

seed();
