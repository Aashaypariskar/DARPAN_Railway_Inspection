module.exports = (sequelize, DataTypes) => {
    const Reason = sequelize.define('Reason', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        question_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'questions',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        text: {
            type: DataTypes.STRING(255),
            allowNull: false
        }
    }, {
        tableName: 'Reasons',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    return Reason;
};
