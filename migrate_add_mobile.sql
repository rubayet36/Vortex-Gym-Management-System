-- Migration: Add `mobile` column to profiles table
-- Run this in phpMyAdmin if your database already exists (do NOT re-import mysql_schema.sql)
-- The `phone_number` column = ZKTeco Device PIN (kept as-is, bridge uses this)
-- The `mobile` column = member's actual phone/mobile for contact/SMS

ALTER TABLE `profiles`
  ADD COLUMN `mobile` VARCHAR(50) DEFAULT NULL COMMENT 'Actual member phone number (for contact/SMS)'
  AFTER `phone_number`;
