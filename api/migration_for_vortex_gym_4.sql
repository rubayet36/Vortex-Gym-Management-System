-- Migration script to run AFTER importing vortex_gym (4).sql
-- This brings the old database schema up to date with the latest project features.

-- 1. Update profiles table
ALTER TABLE `profiles` 
ADD COLUMN `member_id` VARCHAR(50) DEFAULT NULL AFTER `phone_number`,
ADD COLUMN `mobile` VARCHAR(50) DEFAULT NULL AFTER `member_id`,
ADD COLUMN `is_paused` TINYINT(1) NOT NULL DEFAULT 0 AFTER `blood_group`,
ADD COLUMN `pause_note` TEXT DEFAULT NULL AFTER `is_paused`;

-- 2. Update packages table
ALTER TABLE `packages`
ADD COLUMN `is_custom` TINYINT(1) NOT NULL DEFAULT 0 AFTER `duration_days`,
ADD COLUMN `created_for_user_id` VARCHAR(36) DEFAULT NULL AFTER `is_custom`;

-- 3. Update payments table
ALTER TABLE `payments`
ADD COLUMN `subscription_id` VARCHAR(36) DEFAULT NULL AFTER `user_id`;

-- 4. Update payments table structure to accommodate potential long text or default missing values later
-- (If any defaults are missing, but the core missing fields are addressed above)

-- Note: Ensure to run this once after the SQL import to prevent duplicate column errors.
