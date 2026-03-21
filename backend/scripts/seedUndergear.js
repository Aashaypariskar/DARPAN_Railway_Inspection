const { sequelize, CategoryMaster, AmenitySubcategory, AmenityItem, Activity, Question } = require('../models');

async function seed() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- STARTING UNDERGEAR SEEDING ---');

        // 1. Find Amenity Category Master
        const amenityCat = await CategoryMaster.findOne({ where: { name: 'Amenity' } });
        if (!amenityCat) throw new Error('Amenity Category Master not found');

        // 2. Create Undergear Subcategory
        const [undergearSub] = await AmenitySubcategory.findOrCreate({
            where: { name: 'Undergear', category_id: amenityCat.id },
            transaction
        });

        // 3. Create Major and Minor Activities for this subcategory
        const [majorAct] = await Activity.findOrCreate({
            where: { type: 'Major', subcategory_id: undergearSub.id },
            transaction
        });
        const [minorAct] = await Activity.findOrCreate({
            where: { type: 'Minor', subcategory_id: undergearSub.id },
            transaction
        });

        // 4. Create Amenity Items for Undergear
        const [majorItem] = await AmenityItem.findOrCreate({
            where: { name: 'Undergear Inspection', subcategory_id: undergearSub.id, activity_type: 'Major' },
            transaction
        });
        const [minorItem] = await AmenityItem.findOrCreate({
            where: { name: 'Undergear Inspection', subcategory_id: undergearSub.id, activity_type: 'Minor' },
            transaction
        });

        // 5. Define Undergear Questions
        const qTexts = [
            'CBC height BB End',
            'CBC height KYN End',
            'Axle 1',
            'Axle 2',
            'Axle 3',
            'Axle 4',
            'Bellow 1',
            'Bellow 2',
            'Bellow 3',
            'Bellow 4',
            'Earthing BB End',
            'Earthing KYN End'
        ];

        let order = 1;
        for (const text of qTexts) {
            // Add to Major
            await Question.findOrCreate({
                where: {
                    text,
                    subcategory_id: undergearSub.id,
                    activity_id: majorAct.id,
                    item_id: majorItem.id
                },
                defaults: {
                    answer_type: 'BOOLEAN',
                    display_order: order
                },
                transaction
            });

            // Add to Minor
            await Question.findOrCreate({
                where: {
                    text,
                    subcategory_id: undergearSub.id,
                    activity_id: minorAct.id,
                    item_id: minorItem.id
                },
                defaults: {
                    answer_type: 'BOOLEAN',
                    display_order: order
                },
                transaction
            });
            order++;
        }

        await transaction.commit();
        console.log('--- UNDERGEAR SEEDING COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('SEED ERROR:', err);
        if (transaction) await transaction.rollback();
        process.exit(1);
    }
}

seed();
