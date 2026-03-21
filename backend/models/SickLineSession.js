const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SickLineSession = sequelize.define('SickLineSession', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        coach_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        coach_number: {
            type: DataTypes.STRING,
            allowNull: false
        },
        inspection_date: {
            type: DataTypes.DATEONLY,
            defaultValue: DataTypes.NOW,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CLOSED'),
            defaultValue: 'IN_PROGRESS',
            allowNull: false
        },
        submitted_at: { type: DataTypes.DATE, allowNull: true },
        closed_at: { type: DataTypes.DATE, allowNull: true },
        last_saved_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        inspector_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        }
    }, {
        tableName: 'sickline_sessions',
        timestamps: true
    });

    return SickLineSession;
};
