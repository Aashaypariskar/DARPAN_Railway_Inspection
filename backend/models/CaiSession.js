const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CaiSession = sequelize.define('CaiSession', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        coach_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        inspector_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        inspector_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'CLOSED'),
            defaultValue: 'DRAFT',
            allowNull: false
        },
        submitted_at: { type: DataTypes.DATE, allowNull: true },
        closed_at: { type: DataTypes.DATE, allowNull: true },
        last_saved_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'cai_sessions',
        timestamps: true
    });

    return CaiSession;
};
