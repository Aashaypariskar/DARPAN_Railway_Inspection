const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('PitLineTrain', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        train_number: { type: DataTypes.STRING(50), allowNull: false, unique: true }
    }, { tableName: 'pitline_trains' });
};
