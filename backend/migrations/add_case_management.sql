-- Migration: Add Case Management System
-- Created: 2026-07-12
-- Purpose: Add tables for structured case management before measurements/referrals

-- Create malnutrition_cases table
CREATE TABLE IF NOT EXISTS malnutrition_cases (
    id CHAR(36) PRIMARY KEY,
    child_id CHAR(36) NOT NULL,
    barangay_id CHAR(36) NOT NULL,
    case_status VARCHAR(40) NOT NULL DEFAULT 'active',
    case_type VARCHAR(40) NOT NULL,
    enrollment_date DATE NOT NULL,
    first_measurement_id CHAR(36),
    current_status_measurement_id CHAR(36),
    resolution_date DATE,
    assigned_bns_id CHAR(36),
    responsible_facility VARCHAR(255),
    initial_notes LONGTEXT,
    resolution_notes LONGTEXT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (barangay_id) REFERENCES barangays(id),
    FOREIGN KEY (first_measurement_id) REFERENCES measurements(id) ON DELETE SET NULL,
    FOREIGN KEY (current_status_measurement_id) REFERENCES measurements(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_bns_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_child_id (child_id),
    INDEX idx_barangay_id (barangay_id),
    INDEX idx_case_status (case_status),
    INDEX idx_case_type (case_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create case_status_history table
CREATE TABLE IF NOT EXISTS case_status_history (
    id CHAR(36) PRIMARY KEY,
    case_id CHAR(36) NOT NULL,
    previous_status VARCHAR(40),
    new_status VARCHAR(40) NOT NULL,
    changed_by CHAR(36),
    reason LONGTEXT,
    notes LONGTEXT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY (case_id) REFERENCES malnutrition_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_case_id (case_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create case_action_plans table
CREATE TABLE IF NOT EXISTS case_action_plans (
    id CHAR(36) PRIMARY KEY,
    case_id CHAR(36) NOT NULL,
    title VARCHAR(220) NOT NULL,
    description LONGTEXT,
    planned_interventions JSON,
    start_date DATE NOT NULL,
    expected_end_date DATE NOT NULL,
    expected_outcomes LONGTEXT,
    created_by CHAR(36),
    reviewed_by CHAR(36),
    reviewed_at TIMESTAMP(6),
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    FOREIGN KEY (case_id) REFERENCES malnutrition_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_case_id (case_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
