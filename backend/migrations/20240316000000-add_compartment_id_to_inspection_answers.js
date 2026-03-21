'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists to prevent migration failure
    const tableInfo = await queryInterface.describeTable('inspection_answers');
    if (!tableInfo.compartment_id) {
      await queryInterface.addColumn('inspection_answers', 'compartment_id', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'NA'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('inspection_answers', 'compartment_id');
  }
};
