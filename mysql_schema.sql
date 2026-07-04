-- MySQL Schema for Vortex Gym Management
-- Safe to import directly into phpMyAdmin

-- Disable foreign key checks temporarily to avoid import errors with out-of-order tables
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Table `profiles` (Replaces auth.users + public.profiles)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `profiles`;
CREATE TABLE `profiles` (
  `id` VARCHAR(36) PRIMARY KEY,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL, -- Added to replace Supabase Auth
  `first_name` VARCHAR(255),
  `last_name` VARCHAR(255),
  `phone_number` VARCHAR(50),
  `pin` VARCHAR(20) DEFAULT NULL,
  `cardno` BIGINT DEFAULT 0,
  `gender` ENUM('male', 'female', 'other') DEFAULT NULL,
  `blood_group` VARCHAR(5) DEFAULT NULL,
  `role` ENUM('owner', 'manager', 'trainer', 'member', 'staff') DEFAULT 'member',
  `avatar_url` TEXT,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `packages`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `packages`;
CREATE TABLE `packages` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(10,2) NOT NULL,
  `duration_days` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `user_subscriptions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `user_subscriptions`;
CREATE TABLE `user_subscriptions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `package_id` VARCHAR(36) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `attendance`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `attendance`;
CREATE TABLE `attendance` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `check_in_time` DATETIME NOT NULL,
  `check_out_time` DATETIME DEFAULT NULL,
  `date` DATE NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `exercises`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `exercises`;
CREATE TABLE `exercises` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `muscle_group` VARCHAR(255),
  `equipment` VARCHAR(255),
  `image_url` TEXT,
  `video_url` TEXT,
  `created_by` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `workout_routines`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `workout_routines`;
CREATE TABLE `workout_routines` (
  `id` VARCHAR(36) PRIMARY KEY,
  `trainer_id` VARCHAR(36) NOT NULL,
  `member_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`trainer_id`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`member_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `routine_exercises`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `routine_exercises`;
CREATE TABLE `routine_exercises` (
  `id` VARCHAR(36) PRIMARY KEY,
  `routine_id` VARCHAR(36) NOT NULL,
  `exercise_id` VARCHAR(36) NOT NULL,
  `sets` INT NOT NULL DEFAULT 3,
  `reps` VARCHAR(50) NOT NULL DEFAULT '10-12',
  `rest_time_seconds` INT DEFAULT 60,
  `order_index` INT NOT NULL,
  `notes` TEXT,
  FOREIGN KEY (`routine_id`) REFERENCES `workout_routines`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `diet_plans`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `diet_plans`;
CREATE TABLE `diet_plans` (
  `id` VARCHAR(36) PRIMARY KEY,
  `trainer_id` VARCHAR(36) NOT NULL,
  `member_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `daily_calories` INT,
  `protein_g` INT,
  `carbs_g` INT,
  `fats_g` INT,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`trainer_id`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`member_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `diet_meals`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `diet_meals`;
CREATE TABLE `diet_meals` (
  `id` VARCHAR(36) PRIMARY KEY,
  `diet_plan_id` VARCHAR(36) NOT NULL,
  `meal_time` VARCHAR(100),
  `food_items` TEXT NOT NULL,
  `calories` INT,
  `order_index` INT NOT NULL,
  FOREIGN KEY (`diet_plan_id`) REFERENCES `diet_plans`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `products`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `price` DECIMAL(10,2) NOT NULL,
  `stock_quantity` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `sales`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sales`;
CREATE TABLE `sales` (
  `id` VARCHAR(36) PRIMARY KEY,
  `sold_by` VARCHAR(36) NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'cash',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sold_by`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `sale_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sale_items`;
CREATE TABLE `sale_items` (
  `id` VARCHAR(36) PRIMARY KEY,
  `sale_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `expenses`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` VARCHAR(36) PRIMARY KEY,
  `logged_by` VARCHAR(36) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `description` TEXT,
  `date` DATE NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`logged_by`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table `transformation_logs`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `transformation_logs`;
CREATE TABLE `transformation_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `member_id` VARCHAR(36) NOT NULL,
  `date` DATE NOT NULL,
  `weight_kg` DECIMAL(5,2),
  `body_fat_percentage` DECIMAL(5,2),
  `photo_url_front` TEXT,
  `photo_url_side` TEXT,
  `photo_url_back` TEXT,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`member_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
