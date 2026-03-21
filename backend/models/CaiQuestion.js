const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CaiQuestion = sequelize.define('CaiQuestion', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        cai_code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        question_text: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'cai_questions',
        timestamps: true
    });

    return CaiQuestion;
};
