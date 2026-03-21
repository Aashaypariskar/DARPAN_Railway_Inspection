const { Question, AmenityItem } = require('./models');

async function testIt() {
    try {
        const qCountLavatory = await Question.count({ where: { subcategory_id: 123 } });
        const qCountDoor = await Question.count({ where: { subcategory_id: 121 } });
        console.log(`Questions mapped directly to 123 (Lavatory) = ${qCountLavatory}`);
        console.log(`Questions mapped directly to 121 (Door) = ${qCountDoor}`);

        const joinedLavatory = await Question.count({
            include: [{
                model: AmenityItem,
                required: true,
                where: { subcategory_id: 123 }
            }]
        });
        const joinedDoor = await Question.count({
            include: [{
                model: AmenityItem,
                required: true,
                where: { subcategory_id: 121 }
            }]
        });

        console.log(`Questions Joined via AmenityItem for 123 = ${joinedLavatory}`);
        console.log(`Questions Joined via AmenityItem for 121 = ${joinedDoor}`);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
testIt();
