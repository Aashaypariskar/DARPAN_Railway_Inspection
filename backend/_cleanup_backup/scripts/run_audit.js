const { sequelize } = require('./models');

async function runAudit() {
    try {
        const [wildcardItems] = await sequelize.query(`
      SELECT id, name, subcategory_id
      FROM amenity_items
      WHERE name LIKE '%L1%' OR name LIKE '%L2%' OR name LIKE '%D1%' OR name LIKE '%D2%';
    `);

        console.log("Wildcard matches for L1, L2, D1, D2:");
        console.log(JSON.stringify(wildcardItems, null, 2));

    } catch (err) {
        console.error("Audit Error:", err);
    } finally {
        process.exit(0);
    }
}

runAudit();
