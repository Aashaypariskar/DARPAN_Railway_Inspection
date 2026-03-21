const { sequelize, Coach, Category, LtrSchedule, LtrItem, Question } = require('./models');

async function propagateDigitalTwin() {
    try {
        console.log('--- PROPAGATING LTR DIGITAL TWIN TO ALL COACHES ---');

        // 1. Find the MASTER Source (The one with schedules)
        // We look for a category that HAS schedules
        const masterCat = await Category.findOne({
            where: { name: 'Ltr to Railways' },
            include: [{
                model: LtrSchedule,
                required: true // Must have schedules
            }]
        });

        if (!masterCat) {
            console.error('CRITICAL: No Master Source found! Did seedLtrDigitalTwin run?');
            return;
        }

        // JS Sort
        masterCat.LtrSchedules.sort((a, b) => a.display_order - b.display_order);

        console.log(`Source Category ID: ${masterCat.id} (Coach ID: ${masterCat.coach_id})`);
        const masterSchedules = masterCat.LtrSchedules;
        console.log(`  - Schedules to Clone: ${masterSchedules.length}`);

        // 2. Find Targets (Categories WITHOUT Schedules)
        const targetCats = await Category.findAll({
            where: {
                name: 'Ltr to Railways',
                id: { [sequelize.Sequelize.Op.ne]: masterCat.id }
            },
            include: [{
                model: LtrSchedule
            }]
        });

        console.log(`Target Categories: ${targetCats.length}`);

        for (const target of targetCats) {
            if (target.LtrSchedules && target.LtrSchedules.length > 0) {
                console.log(`  - SKIP: Category ${target.id} already has ${target.LtrSchedules.length} schedules.`);
                continue;
            }

            console.log(`  > Cloning to Category ID: ${target.id} (Coach ID: ${target.coach_id})...`);

            // Transaction per category to ensure atomicity
            await sequelize.transaction(async (t) => {
                for (const srcSch of masterSchedules) {
                    // Clone Schedule
                    const newSch = await LtrSchedule.create({
                        name: srcSch.name,
                        display_order: srcSch.display_order,
                        category_id: target.id
                    }, { transaction: t });

                    // Fetch Source Items
                    const srcItems = await LtrItem.findAll({
                        where: { schedule_id: srcSch.id }
                    });
                    srcItems.sort((a, b) => a.display_order - b.display_order);

                    for (const srcItem of srcItems) {
                        // Clone Item
                        const newItem = await LtrItem.create({
                            name: srcItem.name,
                            schedule_id: newSch.id,
                            display_order: srcItem.display_order
                        }, { transaction: t });

                        // Fetch Source Questions
                        const srcQuestions = await Question.findAll({
                            where: { item_id: srcItem.id }
                        });
                        srcQuestions.sort((a, b) => a.display_order - b.display_order);

                        const qData = srcQuestions.map(q => ({
                            text: q.text,
                            answer_type: q.answer_type,
                            specified_value: q.specified_value,
                            unit: q.unit,
                            display_order: q.display_order,
                            schedule_id: newSch.id,
                            item_id: newItem.id,
                            category_id: target.id,
                            subcategory_id: null,
                            activity_id: null
                        }));

                        if (qData.length > 0) {
                            await Question.bulkCreate(qData, { transaction: t });
                        }
                    }
                }
            });
            console.log(`    + Success.`);
        }

        console.log('--- PROPAGATION COMPLETE ---');

    } catch (err) {
        console.error('Propagation Failed:', err);
    }
}

propagateDigitalTwin();
