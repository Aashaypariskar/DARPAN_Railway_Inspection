const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CaiAnswer = sequelize.define('CaiAnswer', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        session_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        coach_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        question_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        compartment_id: {
            type: DataTypes.STRING(50),
            defaultValue: 'NA'
        },
        subcategory_id: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        activity_type: {
            type: DataTypes.STRING(50),
            defaultValue: 'Major'
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        reason_ids: {
            type: DataTypes.JSON, // Use JSON for reason_ids
            allowNull: true
        },
        photo_url: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.getDataValue('before_photo_url');
            },
            set(val) {
                this.setDataValue('before_photo_url', val);
            }
        },
        // Phase 5: Media Normalization
        before_photo_url: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        defect_locked: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        resolved: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        after_photo_url: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        resolution_remark: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        resolved_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        question_text_snapshot: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'cai_answers',
        timestamps: true,
        indexes: [
            {
                name: 'idx_cai_ans_comp',
                unique: true,
                fields: ['session_id', 'question_id', 'coach_id', 'subcategory_id', 'compartment_id', 'activity_type']
            }
        ]
    });

    return CaiAnswer;
};
