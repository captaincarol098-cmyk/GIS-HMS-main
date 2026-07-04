-- Migration: Add Notifications table and Report workflow enhancements
-- Date: 2026-06-30
-- Description: Adds system notifications and shared workspace report features

-- ============================================================================
-- CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('message', 'report_submitted', 'report_approved', 'report_rejected', 'alert', 'info')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    related_id VARCHAR(120),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- UPDATE REPORTS TABLE
-- ============================================================================

-- Add content column for HTML storage (shared workspace editing)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS content TEXT;

-- Add submission tracking
ALTER TABLE reports ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Add edit tracking for shared workspace
ALTER TABLE reports ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL - COMMENT OUT FOR PRODUCTION)
-- ============================================================================

-- Create a test notification for the first superadmin
-- INSERT INTO notifications (user_id, type, title, message, link, related_id)
-- SELECT 
--     id as user_id,
--     'info' as type,
--     '🎉 Welcome to the New Notification System!' as title,
--     'You can now receive real-time notifications for report submissions, messages, and system alerts. Click the bell icon in the header to view your notifications.' as message,
--     '/reports' as link,
--     NULL as related_id
-- FROM users 
-- WHERE role = 'super_admin' AND account_status = 'active'
-- LIMIT 1;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify notifications table
-- SELECT * FROM notifications LIMIT 5;

-- Verify reports table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'reports' 
-- ORDER BY ordinal_position;

-- Count notifications by type
-- SELECT type, COUNT(*) as count, 
--        SUM(CASE WHEN is_read THEN 1 ELSE 0 END) as read_count,
--        SUM(CASE WHEN NOT is_read THEN 1 ELSE 0 END) as unread_count
-- FROM notifications
-- GROUP BY type;
