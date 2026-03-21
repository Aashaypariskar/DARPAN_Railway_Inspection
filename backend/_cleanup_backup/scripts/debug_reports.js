const { InspectionAnswer } = require('./models');
const { Op } = require('sequelize');
const fs = require('fs');

async function debugReports() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const answers = await InspectionAnswer.findAll({
            where: {
                createdAt: { [Op.gte]: today }
            },
            attributes: ['submission_id', 'coach_number', 'subcategory_name', 'activity_type'],
            group: ['submission_id', 'coach_number', 'subcategory_name', 'activity_type']
        });

        let output = `TOTAL ENTRIES FOUND: ${answers.length}\n`;
        for (const a of answers) {
            output += JSON.stringify({
                id: a.submission_id.slice(-6),
                coach: a.coach_number,
                sub: a.subcategory_name,
                type: a.activity_type
            }) + '\n';
        }

        fs.writeFileSync('debug_output.txt', output);
        console.log('Results written to debug_output.txt');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugReports();
