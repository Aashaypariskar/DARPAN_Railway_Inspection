const { Role, User } = require('./models');

async function checkRoles() {
    try {
        console.log('--- Roles in DB ---');
        const roles = await Role.findAll();
        roles.forEach(r => console.log(`ID: ${r.id}, Name: ${r.role_name}`));

        console.log('\n--- Users and their Roles ---');
        const users = await User.findAll({
            include: [{ model: Role }]
        });
        users.forEach(u => console.log(`User: ${u.email}, Role: [${u.Role ? u.Role.role_name : 'No Role'}]`));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkRoles();
