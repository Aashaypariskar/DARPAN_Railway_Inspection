const { sequelize } = require('./models');

async function checkSpec() {
  try {
    const [items] = await sequelize.query(`
      SELECT id, name, subcategory_id FROM amenity_items
      WHERE name LIKE '%door undergear%' OR name LIKE '%door under gear%'
    `);
    console.log("Door Undergear ITEMS:", items);

    const [qs] = await sequelize.query(`
      SELECT id, text, subcategory_id FROM questions
      WHERE text LIKE '%door undergear%' OR text LIKE '%door under gear%'
    `);
    console.log("Door Undergear QUESTIONS:", qs);
  } catch (e) { }
  process.exit(0);
}
checkSpec();
