-- Add gender and blood_group columns to profiles table
-- Run this in phpMyAdmin or via MySQL CLI

ALTER TABLE `profiles`
  ADD COLUMN `gender` ENUM('male', 'female', 'other') DEFAULT NULL AFTER `cardno`,
  ADD COLUMN `blood_group` VARCHAR(5) DEFAULT NULL AFTER `gender`;
