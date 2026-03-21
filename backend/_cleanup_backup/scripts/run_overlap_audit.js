const { sequelize } = require('./models');

async function runAudit() {
    try {
        const [overlap] = await sequelize.query(`
      SELECT q1.id as q1_id, q1.subcategory_id as q1_sub, 
             q2.id as q2_id, q2.subcategory_id as q2_sub, 
             q1.amenity_item_id
      FROM questions q1
      JOIN questions q2 ON q1.amenity_item_id = q2.amenity_item_id
      WHERE q1.subcategory_id = 123 AND q2.subcategory_id = 121
    `);
        console.log("=== OVERLAPPING AMENITY ITEM IDs IN QUESTIONS ===");
        console.log(`Found ${overlap.length} overlap links`);

        if (overlap.length > 0) {
            const distinctAmenityIds = [...new Set(overlap.map(o => o.amenity_item_id))];
            console.log("Distinct Amenity IDs shared:", distinctAmenityIds);

            const [items] = await sequelize.query(`
        SELECT id, name, subcategory_id FROM amenity_items
        WHERE id IN (${distinctAmenityIds.join(',')})
      `);
            console.log("=== AMENITY ITEMS THAT ARE CAUSING OVERLAPS ===");
            console.log(items);
        }

    } catch (err) {
        console.error("Audit Error:", err);
    } finally {
        process.exit(0);
    }
}
runAudit();
