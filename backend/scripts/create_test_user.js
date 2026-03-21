const bcrypt = require('bcryptjs');
const { Role, User, sequelize } = require('../models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    // Ensure roles
    let role = await Role.findOne({ where: { role_name: 'Inspector' } });
    if (!role) role = await Role.create({ role_name: 'Inspector' });

    // Create test user
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'Password123!';
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      console.log('User already exists:', email);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: 'Test User',
      email,
      password: hashed,
      role_id: role.id
    });

    console.log('Created user:', user.email);
    console.log('Password (plain):', password);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();