const { sequelize } = require('./models');

async function runAudit() {
    try {
        const [cats] = await sequelize.query(`
      SELECT c.id as category_id, c.name as category_name, c.coach_id, cm.name as master_name
      FROM categories c
      LEFT JOIN categories_master cm ON c.id = cm.id
      WHERE c.id IN (6, 41, 43, 45, 47, 49, 51, 53, 55, 57)
    `);
        console.log("=== PARENT CATEGORIES ===");
        console.log(cats);

    } catch (err) {
        console.error("Audit Error:", err);
    } finally {
        process.exit(0);
    }
}
runAudit();
