const ReportingProjectionService = require('./services/ReportingProjectionService');
const { InspectionAnswer, Question } = require('./models');

async function debug() {
    try {
        console.log('--- DEBUGGING SES-25 AMENITY PROJECTION ---');
        
        // 1. Check InspectionAnswer records directly
        const count = await InspectionAnswer.count({ where: { session_id: 25, module_type: 'AMENITY' } });
        console.log(`InspectionAnswer count: ${count}`);

        // 2. Check if questions exist
        const sampleAnswers = await InspectionAnswer.findAll({ 
            where: { session_id: 25, module_type: 'AMENITY' },
            limit: 5,
            raw: true
        });
        for (const ans of sampleAnswers) {
            const q = await Question.findByPk(ans.question_id);
            console.log(`Question ID ${ans.question_id}: ${q ? 'FOUND' : 'NOT FOUND'}`);
        }

        // 3. Run projection with logs
        console.log('Running projectSession(25, "AMENITY")...');
        await ReportingProjectionService.projectSession(25, 'AMENITY');
        
        console.log('--- DEBUG COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('Debug failed:', err);
        process.exit(1);
    }
}

debug();
