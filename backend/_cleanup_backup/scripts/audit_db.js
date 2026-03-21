const {
    AmenitySubcategory, AmenityItem, Question, LtrSchedule, LtrItem, CategoryMaster, sequelize
} = require('./models');

async function audit() {
    console.log('--- STARTING DATABASE INTEGRITY AUDIT ---');

    // 1. Orphan Amenity Items
    const items = await AmenityItem.findAll();
    const subs = await AmenitySubcategory.findAll();
    const subIds = subs.map(s => s.id);
    const orphanItems = items.filter(it => !subIds.includes(it.subcategory_id));
    console.log(`[AUDIT] Orphan Amenity Items: ${orphanItems.length}`);
    orphanItems.forEach(it => console.log(` - ID: ${it.id}, Name: ${it.name}, SubID: ${it.subcategory_id}`));

    // 2. Orphan Questions
    const questions = await Question.findAll();
    const scheduleIds = (await LtrSchedule.findAll()).map(s => s.id);
    const ltrItemIds = (await LtrItem.findAll()).map(i => i.id);

    const orphanQs = questions.filter(q => {
        if (q.schedule_id && !scheduleIds.includes(q.schedule_id)) return true;
        // In this system, questions link to LtrItem via item_id or ltr_item_id
        // I'll check both based on my recent model change
        const linkId = q.ltr_item_id || q.item_id;
        if (q.schedule_id && linkId && !ltrItemIds.includes(linkId)) return true;
        return false;
    });
    console.log(`[AUDIT] Orphan Questions: ${orphanQs.length}`);

    const fs = require('fs');
    const results = {
        orphanAmenityItems: orphanItems,
        orphanQuestions: orphanQs,
        wspSchedules: [],
        undergearIssues: false,
        lavatoryDoorIsolation: true
    };

    // 3. WSP Schedules containing LtrItems
    const wspSchedules = await LtrSchedule.findAll({ where: { is_active: true } });
    for (const sch of wspSchedules) {
        const itemCount = await LtrItem.count({ where: { schedule_id: sch.id } });
        results.wspSchedules.push({ id: sch.id, name: sch.name, itemCount });
    }

    // 4. Activity Type NULL check
    const undergearSub = await AmenitySubcategory.findOne({ where: { name: 'Undergear' } });
    if (undergearSub) {
        const ugItems = await AmenityItem.findAll({ where: { subcategory_id: undergearSub.id } });
        const badItems = ugItems.filter(it => it.activity_type !== null);
        results.undergearIssues = badItems.map(it => ({ id: it.id, name: it.name, activity_type: it.activity_type }));
    }

    // 5. Lavatory (L1-L4) and Door (D1-D4) isolation
    const lavSub = await AmenitySubcategory.findOne({ where: { name: 'Lavatory' } });
    const doorSub = await AmenitySubcategory.findOne({ where: { name: 'Door' } });
    if (lavSub && doorSub) {
        results.lavatoryDoorIds = { lav: lavSub.id, door: doorSub.id };
        const lavItems = await AmenityItem.findAll({ where: { subcategory_id: lavSub.id } });
        const doorItems = await AmenityItem.findAll({ where: { subcategory_id: doorSub.id } });
        results.lavItems = lavItems.map(i => i.name);
        results.doorItems = doorItems.map(i => i.name);
    }

    fs.writeFileSync('audit_results.json', JSON.stringify(results, null, 2));
    console.log('--- AUDIT COMPLETE: audit_results.json WRITTEN ---');
    process.exit(0);
}

audit().catch(err => {
    console.error(err);
    process.exit(1);
});
