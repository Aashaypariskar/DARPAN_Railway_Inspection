const { AmenitySubcategory, AmenityItem, Question } = require('./models');
const fs = require('fs');

let output = '';
function log(msg) {
    console.log(msg);
    output += msg + '\n';
}

async function runAudit() {
    try {
        console.log('--- STARTING DIAGNOSTIC AUDIT ---');

        // 1. Get all subcategories
        const subcategories = await AmenitySubcategory.findAll();

        log('\n[SUBCATEGORIES]');
        subcategories.forEach(s => {
            log(`ID: ${s.id} | Name: ${s.name} | CatID: ${s.category_id}`);
        });

        // 2. Identify Lavatory and Door subcategories
        const lavatorySub = subcategories.find(s => s.name.toLowerCase().includes('lavatory'));
        const doorSub = subcategories.find(s => s.name.toLowerCase().includes('door'));

        if (!lavatorySub || !doorSub) {
            log('CRITICAL: Could not find Lavatory/Door subcategories');
            return;
        }

        // 3. Audit Lavatory Items
        log(`\n[LAVATORY AUDIT - ID: ${lavatorySub.id}]`);
        const lavItems = await AmenityItem.findAll({ where: { subcategory_id: lavatorySub.id } });
        lavItems.forEach(item => {
            log(`- Item ID: ${item.id} | Name: ${item.name}`);
        });

        // 4. Audit Door Items
        log(`\n[DOOR AUDIT - ID: ${doorSub.id}]`);
        const doorItems = await AmenityItem.findAll({ where: { subcategory_id: doorSub.id } });
        doorItems.forEach(item => {
            log(`- Item ID: ${item.id} | Name: ${item.name}`);
        });

        // 5. Check for orphans
        const allItems = await AmenityItem.findAll();
        const itemsWithNoSub = allItems.filter(i => !i.subcategory_id);
        log(`\n[ORPHANS] AmenityItems with no subcategory_id: ${itemsWithNoSub.length}`);

        const allQuestions = await Question.findAll();
        const questWithNoItem = allQuestions.filter(q => !q.amenity_item_id && !q.ltr_item_id);
        log(`[ORPHANS] Questions with no parent item: ${questWithNoItem.length}`);

        log('\n--- DIAGNOSTIC AUDIT COMPLETE ---');
        fs.writeFileSync('audit_diagnostic_report.txt', output);
    } catch (error) {
        log('Audit Error: ' + error.message);
    } finally {
        process.exit(0);
    }
}

runAudit();
