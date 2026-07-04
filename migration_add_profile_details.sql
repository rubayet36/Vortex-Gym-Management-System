-- Run these SQL statements in phpMyAdmin under the SQL tab for the 'vortex_gym' database:

ALTER TABLE `profiles` ADD COLUMN `address` TEXT DEFAULT NULL;
ALTER TABLE `profiles` ADD COLUMN `dob` DATE DEFAULT NULL;
ALTER TABLE `profiles` ADD COLUMN `occupation` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `profiles` ADD COLUMN `height` VARCHAR(50) DEFAULT NULL;
ALTER TABLE `profiles` ADD COLUMN `weight` VARCHAR(50) DEFAULT NULL;
