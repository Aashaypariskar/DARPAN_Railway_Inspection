-- Refine Schema for Inspection App
USE inspection_db;

-- 1. Modify Categories table to link with Coaches
ALTER TABLE categories ADD COLUMN coach_id INT AFTER id;
ALTER TABLE categories ADD CONSTRAINT fk_categories_coach FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE;

-- 2. Add Database Indexing for Performance
CREATE INDEX idx_coaches_train_id ON coaches(train_id);
CREATE INDEX idx_categories_coach_id ON categories(coach_id);
CREATE INDEX idx_activities_category_id ON activities(category_id);
CREATE INDEX idx_questions_activity_id ON questions(activity_id);
CREATE INDEX idx_answers_train_id ON inspection_answers(train_id);
CREATE INDEX idx_answers_coach_id ON inspection_answers(coach_id);
CREATE INDEX idx_answers_activity_id ON inspection_answers(activity_id);
CREATE INDEX idx_answers_question_id ON inspection_answers(question_id);

-- 3. Update Seed Data to reflect new Category-Coach relationship
-- Cleaning existing categories to restart seeding with coach_id
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE categories;
SET FOREIGN_KEY_CHECKS = 1;

-- Inserting categories per coach
-- Train 1 (Rajdhani) - Coach B1 (ID 1), B2 (ID 2)
-- Train 2 (Shatabdi) - Coach C1 (ID 3), C2 (ID 4)
INSERT INTO categories (coach_id, name) VALUES 
(1, 'Exterior'), (1, 'Lavatory'),
(2, 'Exterior'), (2, 'Lavatory'),
(3, 'Exterior'), (3, 'Lavatory'),
(4, 'Exterior'), (4, 'Lavatory');

-- Re-seeding Activities and Questions is not strictly needed if IDs remain consistent, 
-- but in a production refinement, you'd map these carefully.
-- For this assignment, we assume the existing activity/question link to CAT1-CAT8.
