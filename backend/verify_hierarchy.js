
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.development') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { sequelize } = require('./models');
const SessionReportServiceClass = require('./services/SessionReportService');
const sessionReportService = new SessionReportServiceClass();

async function verifyHierarchy() {
    try {
        console.log('--- STARTING HIERARCHY VERIFICATION ---');
        
        // Find a recent session to test
        const [recentSessions] = await sequelize.query(
            'SELECT id, asset_id, module_type FROM reporting_sessions ORDER BY id DESC LIMIT 5'
        );

        if (!recentSessions || recentSessions.length === 0) {
            console.log('No reporting sessions found in database.');
            return;
        }

        console.log(`Found ${recentSessions.length} recent sessions to test.`);

        for (const session of recentSessions) {
            console.log(`\nTesting Session ID: ${session.id} (${session.module_type} for ${session.asset_id})`);
            
            try {
                // Call getSessionDetail on the instance
                const result = await sessionReportService.getSessionDetail(session.id);
                
                if (!result || !result.sections) {
                    console.log('  FAILED: No data returned from getSessionDetail');
                    continue;
                }

                console.log(`  Total Areas: ${result.sections.length}`);
                
                let totalQuestions = 0;
                const seenQuestions = new Set();
                let hasDuplicates = false;

                result.sections.forEach(area => {
                    // console.log(`  Area: ${area.title} (${area.activities.length} activities)`);
                    area.activities.forEach(activity => {
                        // console.log(`    Activity: ${activity.title} (${activity.questions.length} questions)`);
                        activity.questions.forEach(q => {
                            totalQuestions++;
                            const qId = q.id || q.question_id || q.source_question_id;
                            if (seenQuestions.has(qId)) {
                                console.log(`      !!! DUPLICATE QUESTION DETECTED: ${qId} in Area "${area.title}" / Activity "${activity.title}"`);
                                hasDuplicates = true;
                            }
                            seenQuestions.add(qId);
                        });
                    });
                });

                console.log(`  Total Unique Questions: ${seenQuestions.size}`);
                console.log(`  Total Questions in hierarchy: ${totalQuestions}`);
                if (hasDuplicates) {
                    console.log('  RESULT: FAILED (Duplicates found)');
                } else if (totalQuestions > 0) {
                    console.log('  RESULT: PASSED (Hierarchy looks good)');
                } else {
                    console.log('  RESULT: WARNING (No questions found in this session hierarchy)');
                }
            } catch (innerErr) {
                console.error(`  ERROR testing session ${session.id}:`, innerErr.message);
                console.error(innerErr.stack);
            }
        }

        console.log('\n--- VERIFICATION COMPLETE ---');

    } catch (err) {
        console.error('Verification Fatal Error:', err);
    } finally {
        if (sequelize) await sequelize.close();
        process.exit(0);
    }
}

verifyHierarchy();
