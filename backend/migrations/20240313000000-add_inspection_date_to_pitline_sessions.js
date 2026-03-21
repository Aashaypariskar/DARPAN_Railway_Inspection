'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add column if not exists
    const tableInfo = await queryInterface.describeTable('pitline_sessions');
    if (!tableInfo.inspection_date) {
      await queryInterface.addColumn('pitline_sessions', 'inspection_date', {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('(CURRENT_DATE)')
      });
    }

    // 2. Add unique index
    // Note: We use unique: true to enforce one session per train/coach/day
    await queryInterface.addIndex('pitline_sessions', ['train_id', 'coach_id', 'inspection_date'], {
      unique: true,
      name: 'pitline_session_uniqueness'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('pitline_sessions', 'pitline_session_uniqueness');
    await queryInterface.removeColumn('pitline_sessions', 'inspection_date');
  }
};
