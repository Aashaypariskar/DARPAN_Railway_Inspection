const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('LtrSchedule', {
        name: { type: DataTypes.STRING, allowNull: false },
        category_id: { type: DataTypes.INTEGER, allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, { tableName: 'ltr_schedules', timestamps: false });
};
