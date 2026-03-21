-- Database Schema for Inspection App

CREATE DATABASE IF NOT EXISTS inspection_db;
USE inspection_db;

-- Trains table
CREATE TABLE trains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    train_number VARCHAR(50) NOT NULL UNIQUE
);

-- Coaches table
CREATE TABLE coaches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    train_id INT NOT NULL,
    coach_number VARCHAR(50) NOT NULL,
    FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE
);

-- Categories table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Activities table
CREATE TABLE activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    type ENUM('Minor', 'Major') NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Questions table
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Inspection Answers table
CREATE TABLE inspection_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    train_id INT NOT NULL,
    coach_id INT NOT NULL,
    activity_id INT NOT NULL,
    question_id INT NOT NULL,
    answer ENUM('YES', 'NO', 'NA') NOT NULL,
    reasons JSON, -- Storing as JSON for flexibility
    remarks TEXT,
    image_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (train_id) REFERENCES trains(id),
    FOREIGN KEY (coach_id) REFERENCES coaches(id),
    FOREIGN KEY (activity_id) REFERENCES activities(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Seed Data
INSERT INTO trains (name, train_number) VALUES ('Rajdhani Express', '12301'), ('Shatabdi Express', '12002');
INSERT INTO coaches (train_id, coach_number) VALUES (1, 'B1'), (1, 'B2'), (2, 'C1'), (2, 'C2');
INSERT INTO categories (name) VALUES ('Exterior');
INSERT INTO activities (category_id, type) VALUES (1, 'Minor'), (1, 'Major');
INSERT INTO questions (activity_id, text) VALUES (1, 'Is the coach exterior clean?'), (1, 'Are the window glasses intact?'), (2, 'Is there any major dent on the body?'), (2, 'Are the steps and handles secure?');
