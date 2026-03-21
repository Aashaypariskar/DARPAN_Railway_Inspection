const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * RBAC System Models
 */
const Role = sequelize.define('Role', {
    role_name: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { tableName: 'roles', timestamps: false });

const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    phone_number: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM('Active', 'Inactive', 'Deleted'), defaultValue: 'Active' },
    last_login: { type: DataTypes.DATE }
}, { tableName: 'users' });

const AdminAuditLog = sequelize.define('AdminAuditLog', {
    admin_id: { type: DataTypes.INTEGER, allowNull: false },
    admin_name_snapshot: { type: DataTypes.STRING, allowNull: false },
    target_user_id: { type: DataTypes.INTEGER, allowNull: true },
    target_user_name_snapshot: { type: DataTypes.STRING, allowNull: true },
    action_type: {
        type: DataTypes.ENUM('USER_CREATED', 'USER_UPDATED', 'PASSWORD_RESET', 'ROLE_CHANGED', 'CATEGORY_UPDATED', 'USER_DELETED'),
        allowNull: false
    },
    details: { type: DataTypes.JSON },
}, {
    tableName: 'admin_audit_logs',
    updatedAt: false,
    indexes: [
        { fields: ['admin_id', 'createdAt'] },
        { fields: ['target_user_id', 'createdAt'] }
    ]
});

const CategoryMaster = sequelize.define('CategoryMaster', {
    name: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { tableName: 'categories_master', timestamps: false });

const UserCategory = sequelize.define('UserCategory', {
    // Junction table for Many-to-Many between User and CategoryMaster
}, { tableName: 'user_categories', timestamps: false });

/**
 * Inspection Domain Models
 */
const Train = sequelize.define('Train', {
    name: { type: DataTypes.STRING, allowNull: false },
    train_number: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { tableName: 'trains', timestamps: false });

const Coach = sequelize.define('Coach', {
    coach_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    coach_type: { type: DataTypes.STRING, allowNull: true },
    module_type: {
        type: DataTypes.ENUM('PITLINE', 'COMMISSIONARY', 'SICKLINE', 'WSP', 'CAI', 'AMENITY'),
        allowNull: true
    },
    created_by: { type: DataTypes.INTEGER, allowNull: true } // Who created the coach (null for system coaches)
}, { tableName: 'coaches', timestamps: true });

const Category = sequelize.define('Category', {
    coach_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'categories', timestamps: false });

const Activity = sequelize.define('Activity', {
    type: { type: DataTypes.ENUM('Minor', 'Major'), allowNull: false },
    subcategory_id: { type: DataTypes.INTEGER, allowNull: true } // New: for Amenity subcategories
}, { tableName: 'activities', timestamps: false });

const LtrSchedule = require('./LtrSchedule')(sequelize);
const LtrItem = require('./LtrItem')(sequelize); // New: LTR Hierarchy
const AmenitySubcategory = require('./AmenitySubcategory')(sequelize);
const CommissionarySession = require('./CommissionarySession')(sequelize);
const CommissionaryAnswer = require('./CommissionaryAnswer')(sequelize);
const SickLineSession = require('./SickLineSession')(sequelize);
const SickLineAnswer = require('./SickLineAnswer')(sequelize);
const WspSession = require('./WspSession')(sequelize);
const CaiQuestion = require('./CaiQuestion')(sequelize);
const CaiSession = require('./CaiSession')(sequelize);
const CaiAnswer = require('./CaiAnswer')(sequelize);
const PitLineTrain = require('./PitLineTrain')(sequelize);
const PitLineCoach = require('./PitLineCoach')(sequelize);
const PitLineSession = require('./PitLineSession')(sequelize);

const AmenityItem = sequelize.define('AmenityItem', {
    name: { type: DataTypes.STRING, allowNull: false },
    subcategory_id: { type: DataTypes.INTEGER, allowNull: false },
    activity_type: { type: DataTypes.ENUM('Minor', 'Major'), allowNull: true }
}, { tableName: 'amenity_items', timestamps: false });

const Question = sequelize.define('Question', {
    text: { type: DataTypes.TEXT, allowNull: false },
    activity_id: { type: DataTypes.INTEGER, allowNull: true },
    schedule_id: { type: DataTypes.INTEGER, allowNull: true },
    subcategory_id: { type: DataTypes.INTEGER, allowNull: true },
    category_id: { type: DataTypes.INTEGER, allowNull: true },
    ltr_item_id: { type: DataTypes.INTEGER, allowNull: true },
    amenity_item_id: { type: DataTypes.INTEGER, allowNull: true },
    item_id: { type: DataTypes.INTEGER, allowNull: true }, // Keep legacy for safety
    item_name: { type: DataTypes.STRING, allowNull: true }, // New: For Sick Line grouping
    section_code: { type: DataTypes.STRING, allowNull: true }, // New: For Sick Line etc.
    ss1_flag: { type: DataTypes.STRING, allowNull: true }, // New: For SS-I filter (C or -)
    section_order: { type: DataTypes.INTEGER, defaultValue: 0 }, // New: For manual order
    specified_value: { type: DataTypes.STRING, allowNull: true },
    answer_type: { type: DataTypes.ENUM('BOOLEAN', 'VALUE'), defaultValue: 'BOOLEAN' },
    unit: { type: DataTypes.STRING(50) },
    display_order: { type: DataTypes.INTEGER, defaultValue: 0 }, // New: Strict Ordering
    category: { type: DataTypes.STRING(255), allowNull: true },
    is_active: { type: DataTypes.INTEGER, defaultValue: 1 }
}, { tableName: 'questions', timestamps: false });

const Reason = require('./Reason')(sequelize, DataTypes);

const InspectionAnswer = sequelize.define('InspectionAnswer', {
    status: {
        type: DataTypes.ENUM('OK', 'DEFICIENCY', 'NA'),
        allowNull: false
    },
    answer_type: { type: DataTypes.ENUM('BOOLEAN', 'VALUE'), defaultValue: 'BOOLEAN' },
    observed_value: { type: DataTypes.TEXT },
    reasons: { type: DataTypes.JSON },
    remarks: { type: DataTypes.TEXT },
    image_path: { type: DataTypes.STRING }, // Legacy
    photo_url: { type: DataTypes.STRING },  // New standard for BEFORE image
    before_photo_url: {
        type: DataTypes.VIRTUAL,
        get() { return this.photo_url; },
        set(val) { this.photo_url = val; }
    },
    session_id: { type: DataTypes.INTEGER, allowNull: true },
    submission_id: { type: DataTypes.STRING(100), allowNull: true },
    train_number: { type: DataTypes.STRING(50) },
    coach_number: { type: DataTypes.STRING(50) },
    category_name: { type: DataTypes.STRING(100) },
    subcategory_name: { type: DataTypes.STRING(100) },
    schedule_name: { type: DataTypes.STRING(100) },
    item_name: { type: DataTypes.STRING(255) }, // Snapshot
    question_text_snapshot: { type: DataTypes.TEXT },
    activity_type: { type: DataTypes.STRING(50) },
    inspection_status: { type: DataTypes.STRING(50), defaultValue: 'Completed' },
    role_snapshot: { type: DataTypes.STRING(100) },
    user_name: { type: DataTypes.STRING(100) },
    user_id: { type: DataTypes.INTEGER },
    // Defect Tracking Columns
    defect_locked: { type: DataTypes.INTEGER, defaultValue: 0 },
    resolved: { type: DataTypes.INTEGER, defaultValue: 0 },
    after_photo_url: { type: DataTypes.TEXT },
    resolution_remark: { type: DataTypes.TEXT },
    resolved_at: { type: DataTypes.DATE },
    // Pit Line Metadata (Isolated)
    train_id: { type: DataTypes.INTEGER, allowNull: true },
    coach_id: { type: DataTypes.INTEGER, allowNull: true },
    compartment_id: { type: DataTypes.STRING(50), defaultValue: 'NA' },
    module_type: { type: DataTypes.STRING(50), allowNull: true },
    schedule_id: { type: DataTypes.INTEGER, allowNull: true },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { 
    tableName: 'inspection_answers', 
    updatedAt: true,
    indexes: [
        {
            name: 'idx_insp_ans_comp',
            unique: true,
            fields: ['module_type', 'session_id', 'question_id', 'coach_id', 'subcategory_id', 'activity_type', 'compartment_id', 'schedule_id']
        }
    ]
});

// Associations - RBAC
Role.hasMany(User, { foreignKey: 'role_id' });
User.belongsTo(Role, { foreignKey: 'role_id' });

User.belongsToMany(CategoryMaster, { through: UserCategory, foreignKey: 'user_id' });
CategoryMaster.belongsToMany(User, { through: UserCategory, foreignKey: 'category_id' });

// Associations - Domain
Train.hasMany(Coach, { foreignKey: 'train_id' });
Coach.belongsTo(Train, { foreignKey: 'train_id' });

Coach.hasMany(Category, { foreignKey: 'coach_id' });
Category.belongsTo(Coach, { foreignKey: 'coach_id' });

Category.hasMany(Activity, { foreignKey: 'category_id' });
Activity.belongsTo(Category, { foreignKey: 'category_id' });

Activity.hasMany(Question, { foreignKey: 'activity_id' });
Question.belongsTo(Activity, { foreignKey: 'activity_id' });

// New Framework Associations
LtrSchedule.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(LtrSchedule, { foreignKey: 'category_id' });

// LTR Item Hierarchy
LtrSchedule.hasMany(LtrItem, { foreignKey: 'schedule_id' });
LtrItem.belongsTo(LtrSchedule, { foreignKey: 'schedule_id' });

LtrItem.hasMany(Question, { foreignKey: 'ltr_item_id' });
Question.belongsTo(LtrItem, { foreignKey: 'ltr_item_id' });

// Amenity Associations
AmenitySubcategory.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(AmenitySubcategory, { foreignKey: 'category_id' });

Activity.belongsTo(AmenitySubcategory, { foreignKey: 'subcategory_id' });
AmenitySubcategory.hasMany(Activity, { foreignKey: 'subcategory_id' });

Question.belongsTo(LtrSchedule, { foreignKey: 'schedule_id' });
LtrSchedule.hasMany(Question, { foreignKey: 'schedule_id' });

Question.belongsTo(AmenitySubcategory, { foreignKey: 'subcategory_id' });
AmenitySubcategory.hasMany(Question, { foreignKey: 'subcategory_id' });

Question.hasMany(Reason, { foreignKey: 'question_id' });
Reason.belongsTo(Question, { foreignKey: 'question_id' });

// Amenity Item Associations
AmenitySubcategory.hasMany(AmenityItem, { foreignKey: 'subcategory_id' });
AmenityItem.belongsTo(AmenitySubcategory, { foreignKey: 'subcategory_id' });

AmenityItem.hasMany(Question, { foreignKey: 'amenity_item_id' });
Question.belongsTo(AmenityItem, { foreignKey: 'amenity_item_id' });

// Inspection Answer links
InspectionAnswer.belongsTo(Train, { foreignKey: 'train_id', constraints: false });
InspectionAnswer.belongsTo(Coach, { foreignKey: 'coach_id', constraints: false });
InspectionAnswer.belongsTo(Activity, { foreignKey: 'activity_id' });
InspectionAnswer.belongsTo(Question, { foreignKey: 'question_id' });
InspectionAnswer.belongsTo(User, { foreignKey: 'user_id' });
InspectionAnswer.belongsTo(LtrSchedule, { foreignKey: 'schedule_id' });
InspectionAnswer.belongsTo(AmenitySubcategory, { foreignKey: 'subcategory_id', constraints: false });
InspectionAnswer.belongsTo(WspSession, { foreignKey: 'session_id', constraints: false });

// Commissionary Associations
User.hasMany(CommissionarySession, { foreignKey: 'created_by' });
CommissionarySession.belongsTo(User, { foreignKey: 'created_by' });

Coach.hasMany(CommissionarySession, { foreignKey: 'coach_id' });
CommissionarySession.belongsTo(Coach, { foreignKey: 'coach_id' });

Coach.hasMany(WspSession, { foreignKey: 'coach_id' });
WspSession.belongsTo(Coach, { foreignKey: 'coach_id' });
WspSession.belongsTo(User, { foreignKey: 'created_by' });
User.hasMany(WspSession, { foreignKey: 'created_by' });

CommissionarySession.hasMany(CommissionaryAnswer, { foreignKey: 'session_id' });
CommissionaryAnswer.belongsTo(CommissionarySession, { foreignKey: 'session_id' });

CommissionaryAnswer.belongsTo(AmenitySubcategory, { foreignKey: 'subcategory_id' });
AmenitySubcategory.hasMany(CommissionaryAnswer, { foreignKey: 'subcategory_id' });

CommissionaryAnswer.belongsTo(Question, { foreignKey: 'question_id' });
Question.hasMany(CommissionaryAnswer, { foreignKey: 'question_id' });

// Sick Line Associations (Isolated Clone)
User.hasMany(SickLineSession, { foreignKey: 'created_by' });
SickLineSession.belongsTo(User, { foreignKey: 'created_by' });

Coach.hasMany(SickLineSession, { foreignKey: 'coach_id' });
SickLineSession.belongsTo(Coach, { foreignKey: 'coach_id' });

SickLineSession.hasMany(SickLineAnswer, { foreignKey: 'session_id' });
SickLineAnswer.belongsTo(SickLineSession, { foreignKey: 'session_id' });

SickLineAnswer.belongsTo(AmenitySubcategory, { foreignKey: 'subcategory_id' });
AmenitySubcategory.hasMany(SickLineAnswer, { foreignKey: 'subcategory_id' });

SickLineAnswer.belongsTo(Question, { foreignKey: 'question_id' });
Question.hasMany(SickLineAnswer, { foreignKey: 'question_id' });

// CAI Associations (Isolated Module)
User.hasMany(CaiSession, { foreignKey: 'inspector_id' });
CaiSession.belongsTo(User, { foreignKey: 'inspector_id' });

Coach.hasMany(CaiSession, { foreignKey: 'coach_id' });
CaiSession.belongsTo(Coach, { foreignKey: 'coach_id' });

CaiSession.hasMany(CaiAnswer, { foreignKey: 'session_id' });
CaiAnswer.belongsTo(CaiSession, { foreignKey: 'session_id' });

CaiAnswer.belongsTo(CaiQuestion, { foreignKey: 'question_id' });
CaiQuestion.hasMany(CaiAnswer, { foreignKey: 'question_id' });

CaiAnswer.belongsTo(Coach, { foreignKey: 'coach_id' });
Coach.hasMany(CaiAnswer, { foreignKey: 'coach_id' });

// Pit Line Associations
PitLineTrain.hasMany(PitLineCoach, { foreignKey: 'train_id', onDelete: 'CASCADE' });
PitLineCoach.belongsTo(PitLineTrain, { foreignKey: 'train_id' });

PitLineTrain.hasMany(PitLineSession, { foreignKey: 'train_id', onDelete: 'CASCADE' });
PitLineCoach.hasMany(PitLineSession, { foreignKey: 'coach_id', onDelete: 'CASCADE' });
PitLineSession.belongsTo(PitLineCoach, { foreignKey: 'coach_id' });
PitLineSession.belongsTo(PitLineTrain, { foreignKey: 'train_id' });
PitLineSession.belongsTo(User, { foreignKey: 'inspector_id' });
User.hasMany(PitLineSession, { foreignKey: 'inspector_id' });

// Link InspectionAnswer to PitLine entities
InspectionAnswer.belongsTo(PitLineTrain, { foreignKey: 'train_id', constraints: false });
InspectionAnswer.belongsTo(PitLineCoach, { foreignKey: 'coach_id', constraints: false });
InspectionAnswer.belongsTo(PitLineSession, { foreignKey: 'session_id', constraints: false });
PitLineSession.hasMany(InspectionAnswer, { foreignKey: 'session_id' });

module.exports = {
    Train, Coach, Category, Activity, Question, Reason, InspectionAnswer,
    LtrSchedule, LtrItem, AmenitySubcategory, AmenityItem,
    User, Role, CategoryMaster, UserCategory, AdminAuditLog,
    CommissionarySession, CommissionaryAnswer,
    SickLineSession, SickLineAnswer,
    WspSession,
    CaiQuestion, CaiSession, CaiAnswer,
    PitLineTrain, PitLineCoach, PitLineSession,
    sequelize
};
