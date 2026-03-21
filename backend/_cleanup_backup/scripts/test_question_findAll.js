const { Question, AmenityItem, Category, AmenitySubcategory } = require('./models');

async function testGetQuestions() {
    try {
        const subcategory_id = 123; // Lavatory

        const includeConfig = {
            model: AmenityItem,
            required: true,
            where: {
                subcategory_id: subcategory_id
            }
        };

        const questions = await Question.findAll({
            where: { subcategory_id: subcategory_id },
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
            groupedMap.get(key).questions.push(q);
        });

        const groupedResults = Array.from(groupedMap.values());
        console.log(`=== Mapped Items for ${subcategory_id} ===`);
        console.log(groupedResults.map(g => g.item_name));

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        process.exit(0);
    }
}

testGetQuestions();
