const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CommissionarySession = sequelize.define('CommissionarySession', {
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
            defaultValue: 'DRAFT',
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
        },
        module_type: {
            type: DataTypes.ENUM('COMMISSIONARY', 'AMENITY'),
            defaultValue: 'COMMISSIONARY',
            allowNull: false
        }
    }, {
        tableName: 'commissionary_sessions',
        timestamps: true
    });

    return CommissionarySession;
};
