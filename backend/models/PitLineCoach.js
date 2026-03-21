const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('PitLineCoach', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        train_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'pitline_trains',
                key: 'id'
            }
        },
        coach_number: { type: DataTypes.STRING(10), allowNull: false },
        coach_name: { type: DataTypes.STRING(50), allowNull: true },
        position: { type: DataTypes.INTEGER, defaultValue: 0 }
    }, { tableName: 'pitline_coaches' });
};
