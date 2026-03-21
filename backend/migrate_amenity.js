const { CommissionaryAnswer, InspectionAnswer, sequelize } = require('./models');
const { Op } = require('sequelize');

async function migrateAmenity() {
    const t = await sequelize.transaction();
    try {
        console.log('Searching for AMENITY answers in InspectionAnswer table...');
        const answers = await InspectionAnswer.findAll({
            where: { module_type: 'AMENITY' },
            transaction: t
        });

        console.log(`Found ${answers.length} records to migrate.`);

        for (const ans of answers) {
            try {
                // Lenient existence check
                const exists = await CommissionaryAnswer.findOne({
                    where: {
                        session_id: ans.session_id,
                        question_id: ans.question_id,
                        compartment_id: ans.compartment_id || 'NA',
                        module_type: 'AMENITY'
                    },
                    transaction: t
                });

                if (!exists) {
                    await CommissionaryAnswer.create({
                        session_id: ans.session_id,
                        question_id: ans.question_id,
                        coach_id: ans.coach_id,
                        compartment_id: ans.compartment_id || 'NA',
                        subcategory_id: ans.subcategory_id || 0,
                        activity_type: ans.activity_type || 'Major',
                        module_type: 'AMENITY',
                        status: ans.status,
                        remarks: ans.remarks,
                        reasons: ans.reasons,
                        photo_url: ans.photo_url,
                        image_path: ans.image_path,
                        question_text_snapshot: ans.question_text_snapshot,
                        defect_locked: ans.defect_locked,
                        resolved: ans.resolved,
                        resolution_remark: ans.resolution_remark,
                        resolved_at: ans.resolved_at,
                        after_photo_url: ans.after_photo_url,
                        observed_value: ans.observed_value
                    }, { transaction: t });
                }
            } catch (innerErr) {
                console.error(`Failed to migrate answer index ${ans.id}:`, innerErr);
                // Continue to next record
            }
        }

        // Optional: Remove from source after verified migration
        // await InspectionAnswer.destroy({ where: { module_type: 'AMENITY' }, transaction: t });

        await t.commit();
        console.log('Migration completed successfully.');
    } catch (err) {
        await t.rollback();
        console.error('Migration failed:', err);
    }
}

migrateAmenity();
