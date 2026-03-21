const { Question, AmenityItem } = require('./models');
const fs = require('fs');

async function dumpApi() {
    let output = "";
    try {
        const runForSubcat = async (sub_id, name) => {
            const includeConfig = {
                model: AmenityItem,
                required: true,
                where: { subcategory_id: sub_id }
            };

            const questions = await Question.findAll({
                where: { subcategory_id: sub_id },
                include: [includeConfig],
                order: [['display_order', 'ASC'], ['id', 'ASC']]
            });

            const groupedMap = new Map();

            questions.forEach(q => {
                const item = q.AmenityItem;
                const key = item ? item.name : 'Unknown';
                if (!groupedMap.has(key)) {
                    groupedMap.set(key, { item_name: key, questions: [] });
                }
                groupedMap.get(key).questions.push(q.text);
            });

            output += `\n=== EXACT DB OUTPUT FOR ${name} (ID: ${sub_id}) ===\n`;
            Array.from(groupedMap.values()).forEach(g => {
                output += `\n>> ITEM: ${g.item_name}\n`;
                g.questions.forEach(q => {
                    output += ` - ${q}\n`;
                });
            });
        };

        await runForSubcat(123, 'LAVATORY AREA');
        await runForSubcat(121, 'DOOR AREA');

        fs.writeFileSync('isolation_proof_clean.txt', output, 'utf8');

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        process.exit(0);
    }
}
dumpApi();
