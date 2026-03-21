const sequelize = require('./config/db');

async function checkCategories() {
    try {
        const [cats] = await sequelize.query("SELECT * FROM categories_master");
        console.log('--- categories_master ---');
        console.log(cats);

        const [subs] = await sequelize.query("SELECT category_id, COUNT(*) FROM amenity_subcategories GROUP BY category_id");
        console.log('\n--- amenity_subcategories counts by category_id ---');
        console.log(subs);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCategories();
