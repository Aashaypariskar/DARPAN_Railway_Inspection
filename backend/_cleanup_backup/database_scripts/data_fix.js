const { AmenityItem, Question, sequelize } = require('./models');

async function fix() {
    console.log('--- STARTING DATA FIX ---');

    // Ensure DB matches model (allowNull: true for activity_type)
    await sequelize.sync({ alter: true });
    console.log('[FIX] Schema synced');

    // Fix 1: Undergear items should have activity_type = NULL
    const count = await AmenityItem.update(
        { activity_type: null },
        { where: { id: [1744, 1745] } }
    );
    console.log(`[FIX] Updated ${count[0]} Undergear items to NULL activity_type`);

    // Verify other Phase 1 constraints
    // (None found in specific audit results except this one)

    console.log('--- DATA FIX COMPLETE ---');
    process.exit(0);
}

fix().catch(err => {
    console.error(err);
    process.exit(1);
});
