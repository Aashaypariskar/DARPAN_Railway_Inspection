const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('WspSession', {
        coach_id: { type: DataTypes.INTEGER, allowNull: false },
        coach_number: { type: DataTypes.STRING, allowNull: false },
        inspection_date: { type: DataTypes.DATEONLY, allowNull: false },
        created_by: { type: DataTypes.INTEGER, allowNull: false },
        inspector_name: { type: DataTypes.STRING(100), allowNull: true },
        status: { type: DataTypes.ENUM('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CLOSED'), defaultValue: 'DRAFT' },
        submitted_at: { type: DataTypes.DATE, allowNull: true },
        closed_at: { type: DataTypes.DATE, allowNull: true },
        last_saved_at: { type: DataTypes.DATE, allowNull: true }
    }, { tableName: 'wsp_sessions', timestamps: true });
};
