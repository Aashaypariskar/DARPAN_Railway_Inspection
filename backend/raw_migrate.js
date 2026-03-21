const { sequelize } = require('./models');

async function rawMigrate() {
    try {
        const sql = `
            INSERT IGNORE INTO commissionary_answers (
                session_id, question_id, coach_id, compartment_id, 
                subcategory_id, activity_type, module_type, status, 
                remarks, reasons, question_text_snapshot, defect_locked, 
                resolved, createdAt, updatedAt
            ) 
            SELECT 
                session_id, question_id, coach_id, compartment_id, 
                IFNULL(subcategory_id, 0), IFNULL(activity_type, 'Major'), 'AMENITY', status, 
                remarks, reasons, question_text_snapshot, defect_locked, 
                resolved, NOW(), NOW() 
            FROM inspection_answers 
            WHERE module_type = 'AMENITY';
        `;
        
        console.log('Running raw migration via SQL...');
        const [results, metadata] = await sequelize.query(sql);
        console.log('Migration results:', results);
        console.log('Metadata (affected rows etc):', metadata);
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

rawMigrate();
