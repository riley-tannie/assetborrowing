-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 30, 2025 at 08:03 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Database: `  `

-- --------------------------------------------------------

-- Table structure for table `admins`

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `admins`

INSERT INTO `admins` (`id`, `username`, `password`) VALUES
(1, 'admin', '$2b$10$Mw1tbTTjo0txWK.UYzbpsevVvvlwPKVjKhTmhY4/maieBMBFNL5sG');

-- --------------------------------------------------------

-- Table structure for table `assets`

CREATE TABLE `assets` (
  `asset_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `status` enum('available','pending','borrowed','disabled') NOT NULL,
  `category_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `assets`

INSERT INTO `assets` (`asset_id`, `name`, `description`, `image_path`, `status`, `category_id`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'VR Headset', 'High-quality virtual reality headset', '/public/assets/assetImages/vr-headset.png', 'disabled', 1, 2, '2025-03-30 05:37:31', '2025-03-30 05:39:58');

-- another dump

INSERT INTO `assets` (`name`, `description`, `image_path`, `status`, `category_id`, `created_by`) VALUES
('Oculus Quest 2', '64GB VR headset with controllers', '/public/assets/assetImages/oculus-quest2.jpg', 'available', 1, 2),
('Epson Projector', 'HD 1080p projector with HDMI input', '/public/assets/assetImages/epson-projector.jpg', 'available', 2, 2),
('MacBook Pro M2', '2023 13-inch laptop, 16GB RAM', '/public/assets/assetImages/macbook-pro.jpg', 'borrowed', 3, 2),
('Digital Oscilloscope', '4-channel 100MHz oscilloscope', '/public/assets/assetImages/oscilloscope.jpg', 'available', 5, 2),
('Arduino Starter Kit', 'Complete kit with 25+ components', '/public/assets/assetImages/arduino-kit.jpg', 'available', 5, 2),
('Soldering Station', 'Adjustable 60W soldering iron set', '/public/assets/assetImages/soldering-station.jpg', 'available', 5, 2),
('Function Generator', '10MHz signal generator with sweep', '/public/assets/assetImages/function-gen.jpg', 'pending', 5, 2),
('Breadboard Kit', '10-piece breadboard set with jumper wires', '/public/assets/assetImages/breadboard-kit.jpg', 'available', 5, 2),
('Component Tester', 'LCR/transistor/diode tester', '/public/assets/assetImages/component-tester.jpg', 'available', 5, 2),
('FPGA Development Board', 'Xilinx Artix-7 with peripherals', '/public/assets/assetImages/fpga-board.jpg', 'disabled', 5, 2);

-- --------------------------------------------------------

-- Table structure for table `borrow_requests`

CREATE TABLE `borrow_requests` (
  `request_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `asset_id` int(11) NOT NULL,
  `borrow_date` date NOT NULL,
  `return_date` date NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `student_reason` text DEFAULT NULL,
  `lecturer_reason` text DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `borrow_requests`

INSERT INTO `borrow_requests` (`request_id`, `student_id`, `asset_id`, `borrow_date`, `return_date`, `status`, `approved_by`, `created_at`, `student_reason`, `lecturer_reason`, `updated_at`) VALUES
(1, 1, 3, '2025-04-01', '2025-04-10', 'approved', 3, '2025-03-30 05:46:27', 'Need this asset for a class project.', 'Approved for project completion', '2025-03-30 12:57:56');

-- --------------------------------------------------------

-- Table structure for table `categories`

CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `categories`

INSERT INTO `categories` (`category_id`, `category_name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'VR Headset', 'Updated VR category with new details', '2025-03-30 05:27:36', '2025-03-30 05:29:27');

-- another dump

INSERT INTO `categories` (`category_name`, `description`) VALUES
('VR Equipment', 'Virtual reality headsets and accessories'),
('Audio Visual', 'Projectors, speakers, and microphones'),
('Computer Equipment', 'Laptops, tablets, and peripherals'),
('Lab Equipment', 'Scientific instruments and devices'),
('Circuit Equipment', 'Electronics components and tools');

-- --------------------------------------------------------

-- Table structure for table `history`

CREATE TABLE `history` (
  `history_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `asset_id` int(11) NOT NULL,
  `borrow_date` date NOT NULL,
  `return_date` date DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_by_role` enum('staff','lecturer') DEFAULT NULL,
  `return_received_by` int(11) DEFAULT NULL,
  `return_received_by_role` enum('staff','lecturer') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

-- Table structure for table `users`

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('student','lecturer','staff') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `users`

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `created_at`) VALUES
(1, 'SWAN HTET', '6631502028@lamduan.mfu.ac.th', '$2b$10$FE2hMA876JzgZKSzzdT/N.1hKKnWX6/yepI7CbR4dUWJvCgfCfUWm', 'student', '2025-03-28 13:29:45'),
(2, 'Sunday', 'sunday@mfu.ac.th', '$2b$10$ioSD2esKQtYAbbu8.Z6Qm.Cy0.PSw4KiJyQxidObITwl50zXBbfVy', 'staff', '2025-03-28 14:26:47'),
(3, 'Dr. Surapong Uttama', 'surapong@mfu.ac.th', '$2b$10$vYu7GgKKbB6F5gxwaxb3f.aOt8w3RoEhXMv2pG/5Szztp4P.vRym2', 'lecturer', '2025-03-28 14:41:14');

-- Indexes

ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

ALTER TABLE assets
  MODIFY asset_id INT NOT NULL AUTO_INCREMENT,
  ADD PRIMARY KEY (asset_id);


ALTER TABLE `borrow_requests`
  ADD PRIMARY KEY (`request_id`);

ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `category_name` (`category_name`);

ALTER TABLE `history`
  ADD PRIMARY KEY (`history_id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

-- AUTO_INCREMENT

ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

ALTER TABLE `assets`
  MODIFY `asset_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

ALTER TABLE `borrow_requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

ALTER TABLE `categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

ALTER TABLE `history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

-- Foreign Keys

ALTER TABLE `assets`
  ADD CONSTRAINT `assets_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
