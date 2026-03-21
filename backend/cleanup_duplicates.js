const { sequelize, InspectionAnswer } = require('./models');

(async () => {
  try {
    // For PITLINE, delete duplicates keeping the one with max id (latest)
    const [duplicates] = await sequelize.query(`
      SELECT session_id, question_id, coach_id, subcategory_id, compartment_id, activity_type,
             GROUP_CONCAT(id ORDER BY id DESC) as ids
      FROM inspection_answers
      WHERE module_type = 'PITLINE'
      GROUP BY session_id, question_id, coach_id, subcategory_id, compartment_id, activity_type
      HAVING COUNT(*) > 1
    `);

    console.log(`Found ${duplicates.length} duplicate groups`);

    for (const dup of duplicates) {
      const ids = dup.ids.split(',');
      const keepId = ids[0]; // latest
      const deleteIds = ids.slice(1);
      if (deleteIds.length > 0) {
        await InspectionAnswer.destroy({ where: { id: deleteIds } });
        console.log(`Deleted ${deleteIds.length} duplicates for session ${dup.session_id}, q ${dup.question_id}`);
      }
    }

    console.log('Duplicate cleanup completed');
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
})();