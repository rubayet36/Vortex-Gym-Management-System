-- Migration: Alter profiles.cardno from INT to BIGINT
-- Fixes BUG-09: Integer Overflow Risk on Device RFID Card Numbers
-- Run this in phpMyAdmin or execute via command line

ALTER TABLE `profiles`
  MODIFY COLUMN `cardno` BIGINT DEFAULT 0;
