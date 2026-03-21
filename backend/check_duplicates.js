const { sequelize } = require('./models');

(async () => {
  try {
    const [results] = await sequelize.query(`
      SELECT session_id, question_id, COUNT(*) as count
      FROM inspection_answers
      WHERE module_type = 'PITLINE'
      GROUP BY session_id, question_id
      HAVING COUNT(*) > 1
    `);
    console.log('Duplicates found:', results.length);
    if (results.length > 0) {
      console.log(results.slice(0, 5));
    } else {
      console.log('No duplicates found.');
    }
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
})();