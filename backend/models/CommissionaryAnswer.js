const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CommissionaryAnswer = sequelize.define('CommissionaryAnswer', {
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
            type: DataTypes.STRING, // L1, L2, D1, D2 etc.
            allowNull: false
        },
        subcategory_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        coach_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        activity_type: {
            type: DataTypes.STRING(50),
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
            allowNull: true // Allow null for legacy but logic will populate it
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
        resolved_at: { type: DataTypes.DATE, allowNull: true },
        module_type: {
            type: DataTypes.ENUM('COMMISSIONARY', 'AMENITY'),
            defaultValue: 'COMMISSIONARY',
            allowNull: false
        }
    }, {
        tableName: 'commissionary_answers',
        timestamps: true,
        indexes: [
            {
                name: 'idx_comm_ans_comp',
                unique: true,
                fields: ['session_id', 'question_id', 'coach_id', 'compartment_id', 'subcategory_id', 'activity_type', 'module_type']
            }
        ]
    });

    return CommissionaryAnswer;
};
