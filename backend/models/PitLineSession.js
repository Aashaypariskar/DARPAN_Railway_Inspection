const { DataTypes, Sequelize } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('PitLineSession', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        train_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'pitline_trains', key: 'id' }
        },
        coach_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'pitline_coaches', key: 'id' }
        },
        inspection_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_DATE')
        },
        inspector_id: { type: DataTypes.INTEGER },
        inspector_name: { type: DataTypes.STRING(100), allowNull: true },
        status: {
            type: DataTypes.ENUM('IN_PROGRESS', 'SUBMITTED', 'CLOSED'),
            defaultValue: 'IN_PROGRESS'
        },
        submitted_at: { type: DataTypes.DATE, allowNull: true },
        closed_at: { type: DataTypes.DATE, allowNull: true },
        last_saved_at: { type: DataTypes.DATE }
    }, { 
        tableName: 'pitline_sessions',
        indexes: [
            {
                unique: true,
                fields: ['train_id', 'coach_id', 'inspection_date']
            }
        ]
    });
};
