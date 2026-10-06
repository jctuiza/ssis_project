/* back up langs since nalipat na sa migrations and seeders */


CREATE DATABASE IF NOT EXISTS `ssis` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ssis`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `activity_logs`, `notification_reads`, `notifications`, `announcements`, `transactions`,
  `document_requests`, `document_type_required_clearances`, `document_types`, `assessments`, `clearances`,
  `grades`, `enrollment_subjects`, `enrollments`, `subjects`, `system_settings`, `student_profiles`, `users`,
  `role_permissions`, `permissions`, `roles`, `departments`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `departments` (
  `department_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`          VARCHAR(20)  NOT NULL,
  `name`          VARCHAR(150) NOT NULL,
  `head_name`     VARCHAR(150) NULL,
  `created_at`    TIMESTAMP NULL DEFAULT NULL,
  `updated_at`    TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `departments_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `role_id`     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`         VARCHAR(50)  NOT NULL,                     
  `label`       VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `is_system`   TINYINT(1) NOT NULL DEFAULT 0,           
  `created_at`  TIMESTAMP NULL DEFAULT NULL,
  `updated_at`  TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `roles_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `permissions` (
  `permission_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`           VARCHAR(60)  NOT NULL,                   
  `label`         VARCHAR(200) NOT NULL,
  `group`         VARCHAR(60)  NOT NULL,                    
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `permissions_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
  `role_id`       BIGINT UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `role_permissions_role_fk`       FOREIGN KEY (`role_id`)       REFERENCES `roles` (`role_id`)             ON DELETE CASCADE,
  CONSTRAINT `role_permissions_permission_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `user_id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`             VARCHAR(50)  NOT NULL,             
  `email`                VARCHAR(255) NOT NULL,
  `password`             VARCHAR(255) NOT NULL,           
  `name`                 VARCHAR(150) NOT NULL,
  `role_id`              BIGINT UNSIGNED NOT NULL,
  `department_id`        BIGINT UNSIGNED NULL,            
  `contact`              VARCHAR(30)  NULL,
  `status`               ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,    
  `profile_photo`        MEDIUMTEXT NULL,                   
  `created_at`           TIMESTAMP NULL DEFAULT NULL,
  `updated_at`           TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `users_username_unique` (`username`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_role_id_index` (`role_id`),
  KEY `users_department_id_index` (`department_id`),
  CONSTRAINT `users_role_fk`       FOREIGN KEY (`role_id`)       REFERENCES `roles` (`role_id`),
  CONSTRAINT `users_department_fk` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `student_profiles` (
  `user_id`           BIGINT UNSIGNED NOT NULL,             
  `program`           VARCHAR(150) NOT NULL,
  `year_level`        ENUM('1st Year','2nd Year','3rd Year','4th Year','5th Year') NOT NULL,
  `birthdate`         DATE NULL,
  `address`           VARCHAR(255) NULL,
  `emergency_name`    VARCHAR(150) NULL,
  `emergency_contact` VARCHAR(30)  NULL,
  `signature`         VARCHAR(150) NULL,                  
  `created_at`        TIMESTAMP NULL DEFAULT NULL,
  `updated_at`        TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `student_profiles_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_settings` (
  `setting_id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, 
  `system_name`               VARCHAR(150) NOT NULL,
  `current_term`              VARCHAR(60)  NOT NULL,                    
  `enrollment_open`           TINYINT(1) NOT NULL DEFAULT 1,
  `document_requests_open`    TINYINT(1) NOT NULL DEFAULT 1,
  `email_notifications`       TINYINT(1) NOT NULL DEFAULT 1,
  `maintenance_mode`          TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`                TIMESTAMP NULL DEFAULT NULL,
  `updated_at`                TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`setting_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subjects` (
  `subject_code`  VARCHAR(20)  NOT NULL,
  `name`          VARCHAR(150) NOT NULL,
  `units`         TINYINT UNSIGNED NOT NULL,
  `schedule`      VARCHAR(60)  NULL,
  `department_id` BIGINT UNSIGNED NULL,                     
  `created_at`    TIMESTAMP NULL DEFAULT NULL,
  `updated_at`    TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`subject_code`),
  KEY `subjects_department_id_index` (`department_id`),
  CONSTRAINT `subjects_department_fk` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `enrollments` (
  `enrollment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`    BIGINT UNSIGNED NOT NULL,
  `term`          VARCHAR(60) NOT NULL,
  `status`        ENUM('Pending','Enrolled','Rejected','Not Enrolled') NOT NULL DEFAULT 'Pending',
  `submitted_at`  TIMESTAMP NULL DEFAULT NULL,
  `reviewed_by`   BIGINT UNSIGNED NULL,                    
  `reviewed_at`   TIMESTAMP NULL DEFAULT NULL,
  `remarks`       VARCHAR(500) NULL,
  `created_at`    TIMESTAMP NULL DEFAULT NULL,
  `updated_at`    TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`enrollment_id`),
  UNIQUE KEY `enrollments_student_term_unique` (`student_id`, `term`),
  KEY `enrollments_status_index` (`status`),
  KEY `enrollments_reviewed_by_index` (`reviewed_by`),
  CONSTRAINT `enrollments_student_fk`  FOREIGN KEY (`student_id`)  REFERENCES `users` (`user_id`),
  CONSTRAINT `enrollments_reviewer_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `enrollment_subjects` (
  `enrollment_subject_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `enrollment_id`         BIGINT UNSIGNED NOT NULL,
  `subject_code`          VARCHAR(20) NOT NULL,
  PRIMARY KEY (`enrollment_subject_id`),
  UNIQUE KEY `enrollment_subjects_unique` (`enrollment_id`, `subject_code`),
  KEY `enrollment_subjects_subject_code_index` (`subject_code`),
  CONSTRAINT `enrollment_subjects_enrollment_fk` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`enrollment_id`) ON DELETE CASCADE,
  CONSTRAINT `enrollment_subjects_subject_fk`    FOREIGN KEY (`subject_code`)  REFERENCES `subjects` (`subject_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- course_code is intentionally NOT a foreign key: grade history includes courses from earlier curricula
-- that are no longer in the current subjects list.
CREATE TABLE `grades` (
  `grade_id`      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`    BIGINT UNSIGNED NOT NULL,
  `course_code`   VARCHAR(20)  NOT NULL,
  `description`   VARCHAR(150) NOT NULL,
  `units`         TINYINT UNSIGNED NOT NULL,
  `academic_year` VARCHAR(9)   NOT NULL,                    -- 2025-2026
  `semester`      ENUM('First Semester','Second Semester') NOT NULL,
  `prelim`        DECIMAL(5,2) NULL,                        -- percentages; final grade and GWA are computed
  `midterm`       DECIMAL(5,2) NULL,
  `finals`        DECIMAL(5,2) NULL,
  `posted_by`     BIGINT UNSIGNED NULL,
  `created_at`    TIMESTAMP NULL DEFAULT NULL,
  `updated_at`    TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`grade_id`),
  UNIQUE KEY `grades_student_course_term_unique` (`student_id`, `course_code`, `academic_year`, `semester`),
  KEY `grades_posted_by_index` (`posted_by`),
  CONSTRAINT `grades_student_fk` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `grades_poster_fk`  FOREIGN KEY (`posted_by`)  REFERENCES `users` (`user_id`),
  CONSTRAINT `grades_range_check` CHECK (
    (`prelim`  IS NULL OR `prelim`  BETWEEN 0 AND 100) AND
    (`midterm` IS NULL OR `midterm` BETWEEN 0 AND 100) AND
    (`finals`  IS NULL OR `finals`  BETWEEN 0 AND 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `clearances` (
  `clearance_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`   BIGINT UNSIGNED NOT NULL,
  `office`       ENUM('Registrar','Cashier','Department') NOT NULL,
  `status`       ENUM('Cleared','Pending','On Hold') NOT NULL DEFAULT 'Pending',
  `remarks`      VARCHAR(500) NULL,
  `updated_by`   BIGINT UNSIGNED NULL,                 
  `created_at`   TIMESTAMP NULL DEFAULT NULL,
  `updated_at`   TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`clearance_id`),
  UNIQUE KEY `clearances_student_office_unique` (`student_id`, `office`),
  KEY `clearances_updated_by_index` (`updated_by`),
  CONSTRAINT `clearances_student_fk`    FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `clearances_updated_by_fk` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `assessments` (
  `assessment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id`    BIGINT UNSIGNED NOT NULL,
  `term`          VARCHAR(60) NOT NULL,
  `tuition`       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `misc_fees`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at`    TIMESTAMP NULL DEFAULT NULL,
  `updated_at`    TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`assessment_id`),
  UNIQUE KEY `assessments_student_term_unique` (`student_id`, `term`),
  CONSTRAINT `assessments_student_fk` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `assessments_amount_check` CHECK (`tuition` >= 0 AND `misc_fees` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_types` (
  `document_type_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(100) NOT NULL,
  `fee`              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `processing_time`  VARCHAR(60) NULL,
  `created_at`       TIMESTAMP NULL DEFAULT NULL,
  `updated_at`       TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`document_type_id`),
  UNIQUE KEY `document_types_name_unique` (`name`),
  CONSTRAINT `document_types_fee_check` CHECK (`fee` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Offices that must have cleared the student before this document can be requested.
CREATE TABLE `document_type_required_clearances` (
  `document_type_id` BIGINT UNSIGNED NOT NULL,
  `office`           ENUM('Registrar','Cashier','Department') NOT NULL,
  PRIMARY KEY (`document_type_id`, `office`),
  CONSTRAINT `dtrc_document_type_fk` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`document_type_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "Approved" is the Registrar's decision and moves the request straight to "Pending Payment";
-- only the Cashier can create "Payment Recorded".
CREATE TABLE `document_requests` (
  `document_request_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reference_no`        VARCHAR(20) NOT NULL,               -- REQ-1042
  `student_id`          BIGINT UNSIGNED NOT NULL,
  `document_type_id`    BIGINT UNSIGNED NOT NULL,
  `purpose`             VARCHAR(255) NOT NULL,
  `status`              ENUM('Submitted','Under Review','Approved','Pending Payment','Payment Recorded',
                             'Processing','Ready for Release','Completed','Rejected') NOT NULL DEFAULT 'Submitted',
  `remarks`             VARCHAR(500) NULL,
  `fee_amount`          DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- fee copied from the document type at request time
  `fee_status`          ENUM('Unpaid','Paid','Waived') NOT NULL DEFAULT 'Unpaid',
  `prepared`            TINYINT(1) NOT NULL DEFAULT 0,
  `processed_by`        BIGINT UNSIGNED NULL,
  `created_at`          TIMESTAMP NULL DEFAULT NULL,
  `updated_at`          TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`document_request_id`),
  UNIQUE KEY `document_requests_reference_no_unique` (`reference_no`),
  KEY `document_requests_student_status_index` (`student_id`, `status`),
  KEY `document_requests_document_type_id_index` (`document_type_id`),
  KEY `document_requests_processed_by_index` (`processed_by`),
  CONSTRAINT `document_requests_student_fk`   FOREIGN KEY (`student_id`)       REFERENCES `users` (`user_id`),
  CONSTRAINT `document_requests_type_fk`      FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`document_type_id`),
  CONSTRAINT `document_requests_processor_fk` FOREIGN KEY (`processed_by`)     REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A tuition transaction belongs to an assessment; a document_fee transaction belongs to a document request.
CREATE TABLE `transactions` (
  `transaction_id`      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reference_no`        VARCHAR(20) NOT NULL,      
  `student_id`          BIGINT UNSIGNED NOT NULL,
  `assessment_id`       BIGINT UNSIGNED NULL,
  `document_request_id` BIGINT UNSIGNED NULL,
  `type`                ENUM('tuition','document_fee') NOT NULL,
  `description`         VARCHAR(255) NOT NULL,
  `amount`              DECIMAL(10,2) NOT NULL,
  `method`              VARCHAR(30) NULL,               
  `status`              ENUM('Paid','Pending','Cancelled') NOT NULL DEFAULT 'Pending',
  `paid_at`             TIMESTAMP NULL DEFAULT NULL,
  `recorded_by`         BIGINT UNSIGNED NULL,           
  `created_at`          TIMESTAMP NULL DEFAULT NULL,
  `updated_at`          TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`transaction_id`),
  UNIQUE KEY `transactions_reference_no_unique` (`reference_no`),
  KEY `transactions_student_status_index` (`student_id`, `status`),
  KEY `transactions_assessment_id_index` (`assessment_id`),
  KEY `transactions_document_request_id_index` (`document_request_id`),
  KEY `transactions_recorded_by_index` (`recorded_by`),
  CONSTRAINT `transactions_student_fk`     FOREIGN KEY (`student_id`)          REFERENCES `users` (`user_id`),
  CONSTRAINT `transactions_assessment_fk`  FOREIGN KEY (`assessment_id`)       REFERENCES `assessments` (`assessment_id`),
  CONSTRAINT `transactions_request_fk`     FOREIGN KEY (`document_request_id`) REFERENCES `document_requests` (`document_request_id`),
  CONSTRAINT `transactions_recorder_fk`    FOREIGN KEY (`recorded_by`)         REFERENCES `users` (`user_id`),
  CONSTRAINT `transactions_amount_check`   CHECK (`amount` >= 0),
  CONSTRAINT `transactions_type_check`     CHECK (
    (`type` = 'tuition'      AND `document_request_id` IS NULL) OR
    (`type` = 'document_fee' AND `assessment_id` IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `announcements` (
  `announcement_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`           VARCHAR(200) NOT NULL,
  `body`            TEXT NOT NULL,
  `created_by`      BIGINT UNSIGNED NOT NULL,
  `created_at`      TIMESTAMP NULL DEFAULT NULL,
  `updated_at`      TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`announcement_id`),
  KEY `announcements_created_by_index` (`created_by`),
  CONSTRAINT `announcements_creator_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- recipient_id set  -> one user.   recipient_id NULL -> every user of recipient_role_id
-- (optionally limited to one department).
CREATE TABLE `notifications` (
  `notification_id`   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recipient_role_id` BIGINT UNSIGNED NULL,
  `recipient_id`      BIGINT UNSIGNED NULL,
  `department_id`     BIGINT UNSIGNED NULL,
  `message`           VARCHAR(500) NOT NULL,
  `page`              VARCHAR(50) NULL,              
  `created_at`        TIMESTAMP NULL DEFAULT NULL,
  `updated_at`        TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `notifications_recipient_index` (`recipient_role_id`, `recipient_id`),
  KEY `notifications_department_id_index` (`department_id`),
  KEY `notifications_recipient_id_index` (`recipient_id`),
  CONSTRAINT `notifications_role_fk`       FOREIGN KEY (`recipient_role_id`) REFERENCES `roles` (`role_id`),
  CONSTRAINT `notifications_recipient_fk`  FOREIGN KEY (`recipient_id`)      REFERENCES `users` (`user_id`),
  CONSTRAINT `notifications_department_fk` FOREIGN KEY (`department_id`)     REFERENCES `departments` (`department_id`),
  CONSTRAINT `notifications_target_check`  CHECK (`recipient_role_id` IS NOT NULL OR `recipient_id` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_reads` (
  `notification_id` BIGINT UNSIGNED NOT NULL,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `read_at`         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`, `user_id`),
  KEY `notification_reads_user_id_index` (`user_id`),
  CONSTRAINT `notification_reads_notification_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`notification_id`) ON DELETE CASCADE,
  CONSTRAINT `notification_reads_user_fk`         FOREIGN KEY (`user_id`)         REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `activity_logs` (
  `activity_log_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_id`        BIGINT UNSIGNED NULL,
  `action`          VARCHAR(255) NOT NULL,
  `entity_type`     VARCHAR(50)  NULL,                    
  `entity_id`       VARCHAR(64)  NULL,                   
  `created_at`      TIMESTAMP NULL DEFAULT NULL,
  `updated_at`      TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`activity_log_id`),
  KEY `activity_logs_actor_created_index` (`actor_id`, `created_at`),
  KEY `activity_logs_entity_index` (`entity_type`, `entity_id`),
  CONSTRAINT `activity_logs_actor_fk` FOREIGN KEY (`actor_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personal_access_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tokenable_type` VARCHAR(255) NOT NULL,
  `tokenable_id` BIGINT UNSIGNED NOT NULL,
  `name` TEXT NOT NULL,
  `token` VARCHAR(64) NOT NULL,
  `abilities` TEXT NULL,
  `last_used_at` TIMESTAMP NULL DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_index` (`tokenable_type`, `tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `departments` (`code`, `name`, `head_name`, `created_at`, `updated_at`) VALUES
  ('CCS', 'College of Computing Studies',          NULL, NOW(), NOW()),
  ('CBA', 'College of Business and Accountancy',   NULL, NOW(), NOW()),
  ('CAS', 'College of Arts and Sciences',          NULL, NOW(), NOW()),
  ('COE', 'College of Engineering',                NULL, NOW(), NOW());

INSERT INTO `roles` (`key`, `label`, `description`, `is_system`, `created_at`, `updated_at`) VALUES
  ('student',    'Student',    'Views own records and requests services online.', 1, NOW(), NOW()),
  ('admin',      'Admin',      'Manages users, roles, departments, announcements and system settings.', 1, NOW(), NOW()),
  ('registrar',  'Registrar',  'Maintains student records, registers new students and processes academic requests.', 1, NOW(), NOW()),
  ('cashier',    'Cashier',    'Handles assessments, installment payments, document fees and student accounts.', 1, NOW(), NOW()),
  ('department', 'Department', 'Clears and reviews students under its department.', 1, NOW(), NOW());

INSERT INTO `permissions` (`key`, `label`, `group`) VALUES
  ('students.view',        'View student records', 'Students'),
  ('students.manage',      'Register new students and edit student information', 'Students'),
  ('enrollment.manage',    'Review enrollment requests', 'Enrollment'),
  ('grades.manage',        'Encode and correct grades', 'Grades'),
  ('clearance.registrar',  'Update Registrar clearance', 'Clearance'),
  ('clearance.department', 'Update Department clearance', 'Clearance'),
  ('documents.process',    'Review, approve and release document requests', 'Document requests'),
  ('documents.review',     'Review document requests (start review or reject)', 'Document requests'),
  ('payments.manage',      'Manage student accounts, record payments and document fees', 'Cashier'),
  ('transactions.view',    'Monitor transactions (read-only)', 'Administration'),
  ('records.view',         'View academic records', 'Records and reports'),
  ('reports.view',         'View reports', 'Records and reports'),
  ('departments.view',     'View departments', 'Administration'),
  ('announcements.manage', 'Publish announcements', 'Administration'),
  ('logs.view',            'View activity logs', 'Administration'),
  ('settings.manage',      'Change system settings', 'Administration'),
  ('users.manage',         'Manage user accounts and reset passwords', 'Administration'),
  ('roles.manage',         'Create and configure roles', 'Administration');

-- The student role has no staff permissions.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `roles` r
JOIN `permissions` p ON (r.`key`, p.`key`) IN (
  ('admin','users.manage'), ('admin','roles.manage'), ('admin','departments.view'), ('admin','announcements.manage'),
  ('admin','transactions.view'), ('admin','reports.view'), ('admin','logs.view'), ('admin','settings.manage'),
  ('registrar','students.view'), ('registrar','students.manage'), ('registrar','enrollment.manage'),
  ('registrar','grades.manage'), ('registrar','clearance.registrar'), ('registrar','documents.process'),
  ('registrar','records.view'), ('registrar','reports.view'),
  ('cashier','payments.manage'), ('cashier','reports.view'),
  ('department','students.view'), ('department','clearance.department'), ('department','documents.review'),
  ('department','records.view'), ('department','reports.view')
);

INSERT INTO `system_settings`
  (`system_name`, `current_term`, `enrollment_open`, `document_requests_open`, `email_notifications`, `maintenance_mode`, `created_at`, `updated_at`)
VALUES
  ('Student Services Information System', '1st Semester, A.Y. 2026–2027', 1, 1, 1, 0, NOW(), NOW());

-- Starting fees and processing times; the Registrar/Admin can change them later.
INSERT INTO `document_types` (`name`, `fee`, `processing_time`, `created_at`, `updated_at`) VALUES
  ('Certificate of Enrollment', 50.00,  '1–2 working days', NOW(), NOW()),
  ('Transcript of Records',     150.00, '5–7 working days', NOW(), NOW()),
  ('Certificate of Grades',     50.00,  '1–2 working days', NOW(), NOW()),
  ('Good Moral Certificate',    50.00,  '2–3 working days', NOW(), NOW()),
  ('Honorable Dismissal',       100.00, '3–5 working days', NOW(), NOW());

INSERT INTO `document_type_required_clearances` (`document_type_id`, `office`)
SELECT d.`document_type_id`, x.`office`
FROM `document_types` d
JOIN (
  SELECT 'Good Moral Certificate' AS `name`, 'Cashier'    AS `office` UNION ALL
  SELECT 'Good Moral Certificate',           'Department'             UNION ALL
  SELECT 'Honorable Dismissal',              'Registrar'              UNION ALL
  SELECT 'Honorable Dismissal',              'Cashier'                UNION ALL
  SELECT 'Honorable Dismissal',              'Department'
) x ON x.`name` = d.`name`;
