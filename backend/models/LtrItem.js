const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('LtrItem', {
        name: { type: DataTypes.STRING, allowNull: false },
        schedule_id: { type: DataTypes.INTEGER, allowNull: false },
        display_order: { type: DataTypes.INTEGER, defaultValue: 0 }
    }, { tableName: 'ltr_items', timestamps: false });
};
