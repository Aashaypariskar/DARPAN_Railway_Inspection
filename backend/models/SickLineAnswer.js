const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SickLineAnswer = sequelize.define('SickLineAnswer', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        session_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        compartment_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        subcategory_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        activity_type: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        coach_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        question_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('OK', 'DEFICIENCY', 'NA'),
            allowNull: false
        },
        reasons: {
            type: DataTypes.JSON,
            allowNull: true
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        question_text_snapshot: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        photo_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Phase 5: Media Normalization Alias
        before_photo_url: {
            type: DataTypes.VIRTUAL,
            get() { return this.photo_url; },
            set(val) { this.photo_url = val; }
        },
        // Defect Tracking
        defect_locked: { type: DataTypes.INTEGER, defaultValue: 0 },
        resolved: { type: DataTypes.INTEGER, defaultValue: 0 },
        after_photo_url: { type: DataTypes.TEXT, allowNull: true },
        resolution_remark: { type: DataTypes.TEXT, allowNull: true },
        resolved_at: { type: DataTypes.DATE, allowNull: true }
    }, {
        tableName: 'sickline_answers',
        timestamps: true,
        indexes: [
            {
                name: 'idx_sick_ans_comp',
                unique: true,
                fields: ['session_id', 'question_id', 'coach_id', 'subcategory_id', 'compartment_id', 'activity_type']
            }
        ]
    });

    return SickLineAnswer;
};
