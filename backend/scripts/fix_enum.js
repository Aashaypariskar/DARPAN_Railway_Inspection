const sequelize = require('../config/db');

async function fixEnum() {
    try {
        console.log("Updating users status ENUM...");
        await sequelize.query("ALTER TABLE users MODIFY COLUMN status ENUM('Active', 'Inactive', 'Deleted') DEFAULT 'Active'");
        console.log("Success: Added 'Deleted' to status ENUM");

        const [results] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'status'");
        console.log("Verified new schema:", results[0].Type);
    } catch (e) {
        console.error("Failed to update schema:", e);
    }
    process.exit();
}
fixEnum();
