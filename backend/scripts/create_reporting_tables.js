const sequelize = require('../config/db');

async function createTables() {
    try {
        console.log('--- CREATING REPORTING PROJECTION TABLES ---');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS reporting_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                source_session_id INT NOT NULL,
                module_type VARCHAR(20) NOT NULL,
                coach_id INT NULL,
                train_id INT NULL,
                asset_id VARCHAR(100) NULL,
                user_id INT NOT NULL,
                inspection_datetime DATETIME NOT NULL,
                status VARCHAR(50) NOT NULL,
                total_questions INT DEFAULT 0,
                total_deficiencies INT DEFAULT 0,
                total_resolved INT DEFAULT 0,
                compliance_score DECIMAL(5,2) DEFAULT 0,
                projected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uk_source_module (source_session_id, module_type),
                INDEX idx_reporting_datetime (inspection_datetime),
                INDEX idx_reporting_module (module_type),
                INDEX idx_reporting_user (user_id),
                INDEX idx_reporting_status (status),
                INDEX idx_reporting_source_session (source_session_id)
            ) ENGINE=InnoDB;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS reporting_answers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reporting_session_id INT NOT NULL,
                source_question_id INT NULL,
                question_text TEXT,
                section_title VARCHAR(255),
                answer_status VARCHAR(50),
                reasons_json JSON,
                remark TEXT,
                before_photo_url TEXT,
                after_photo_url TEXT,
                resolved TINYINT DEFAULT 0,
                INDEX idx_reporting_answers_session (reporting_session_id),
                INDEX idx_reporting_answers_status (answer_status),
                INDEX idx_reporting_answers_resolved (resolved),
                FOREIGN KEY (reporting_session_id) REFERENCES reporting_sessions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        console.log('--- TABLES CREATED SUCCESSFULLY ---');
        process.exit(0);
    } catch (err) {
        console.error('--- ERROR CREATING TABLES ---', err);
        process.exit(1);
    }
}

createTables();
