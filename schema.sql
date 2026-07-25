-- Study Hall Register — MySQL schema
-- Run this once against your database before starting the server.

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  hall_name VARCHAR(255),
  owner_name VARCHAR(255),
  owner_phone VARCHAR(20),
  address VARCHAR(500),
  default_fee INT,
  cabin_count INT,
  next_roll INT
);

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(64) PRIMARY KEY,
  roll_no INT,
  name VARCHAR(255),
  phone VARCHAR(20),
  join_date DATE,
  fee INT,
  cabin INT NULL,
  next_due DATE
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(64),
  date DATE,
  amount INT,
  mode VARCHAR(10),
  proof LONGTEXT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
