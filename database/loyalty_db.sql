
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `Customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Customer` (
  `CustomerID` int NOT NULL AUTO_INCREMENT,
  `FirstName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LastName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `PasswordHash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `PhoneNumber` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `BirthDate` date DEFAULT NULL,
  `DateRegistered` date NOT NULL DEFAULT (curdate()),
  PRIMARY KEY (`CustomerID`),
  UNIQUE KEY `IDX_36c6f77997f272076417d80de8` (`Email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `Customer` WRITE;
/*!40000 ALTER TABLE `Customer` DISABLE KEYS */;
INSERT INTO `Customer` VALUES (1,'Member','Demo','member-1795509358418@example.test','!LOGIN_DISABLED_EXPORT_ONLY','09123456789',NULL,'2026-11-24'),(2,'Other','Demo','other-1795509358418@example.test','!LOGIN_DISABLED_EXPORT_ONLY',NULL,NULL,'2026-11-24'),(5,'ConcurrentA','Demo','concurrenta-1795509358418@example.test','!LOGIN_DISABLED_EXPORT_ONLY',NULL,NULL,'2026-11-24'),(6,'ConcurrentB','Demo','concurrentb-1795509358418@example.test','!LOGIN_DISABLED_EXPORT_ONLY',NULL,NULL,'2026-11-24'),(7,'Demo','Member','customer-1795509363695@example.test','!LOGIN_DISABLED_EXPORT_ONLY','09123456789',NULL,'2026-11-24'),(9,'Other','Member','other-1795509363695@example.test','!LOGIN_DISABLED_EXPORT_ONLY',NULL,NULL,'2026-11-24');
/*!40000 ALTER TABLE `Customer` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `EmailNotification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmailNotification` (
  `NotificationID` int NOT NULL AUTO_INCREMENT,
  `CustomerID` int DEFAULT NULL,
  `EmployeeID` int DEFAULT NULL,
  `NotificationType` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Subject` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `DateSent` datetime DEFAULT NULL,
  `DeliveryStatus` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`NotificationID`),
  KEY `FK_1e41a120db573818d647c43ec6e` (`CustomerID`),
  KEY `FK_f791c857647c0ea76bd3f8e2c68` (`EmployeeID`),
  CONSTRAINT `FK_1e41a120db573818d647c43ec6e` FOREIGN KEY (`CustomerID`) REFERENCES `Customer` (`CustomerID`) ON DELETE RESTRICT,
  CONSTRAINT `FK_f791c857647c0ea76bd3f8e2c68` FOREIGN KEY (`EmployeeID`) REFERENCES `Employee` (`EmployeeID`) ON DELETE RESTRICT,
  CONSTRAINT `chk_date_sent` CHECK ((((`DeliveryStatus` = _utf8mb4'Sent') and (`DateSent` is not null)) or ((`DeliveryStatus` <> _utf8mb4'Sent') and (`DateSent` is null)))),
  CONSTRAINT `chk_delivery_status` CHECK ((`DeliveryStatus` in (_utf8mb4'Pending',_utf8mb4'Sent',_utf8mb4'Failed'))),
  CONSTRAINT `chk_notification_type` CHECK ((`NotificationType` in (_utf8mb4'PointsUpdate',_utf8mb4'RewardUpdate',_utf8mb4'AccountUpdate'))),
  CONSTRAINT `chk_recipient` CHECK ((((`CustomerID` is not null) and (`EmployeeID` is null)) or ((`CustomerID` is null) and (`EmployeeID` is not null))))
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `EmailNotification` WRITE;
/*!40000 ALTER TABLE `EmailNotification` DISABLE KEYS */;
INSERT INTO `EmailNotification` VALUES (1,1,NULL,'AccountUpdate','Welcome to the loyalty program','Your loyalty account is active.','2026-11-24 08:36:09','Sent'),(2,2,NULL,'AccountUpdate','Welcome to the loyalty program','Your loyalty account is active.','2026-11-24 08:36:09','Sent'),(3,1,NULL,'AccountUpdate','Customer profile updated','Your customer profile details were updated.','2026-11-24 08:36:09','Sent'),(4,1,NULL,'AccountUpdate','Loyalty account status updated','Your account is now Suspended.','2026-11-24 08:36:09','Sent'),(5,1,NULL,'AccountUpdate','Loyalty account status updated','Your account is now Active.','2026-11-24 08:36:09','Sent'),(6,1,NULL,'PointsUpdate','Loyalty points updated','Earn: 150 points. Current balance: 150.','2026-11-24 08:36:09','Sent'),(7,1,NULL,'RewardUpdate','Reward catalog updated','Voucher 1795509358418 now requires 100 points and is Available.','2026-11-24 08:36:09','Sent'),(8,2,NULL,'RewardUpdate','Reward catalog updated','Voucher 1795509358418 now requires 100 points and is Available.','2026-11-24 08:36:09','Sent'),(9,1,NULL,'RewardUpdate','Reward catalog updated','Voucher 1795509358418 now requires 100 points and is Available.','2026-11-24 08:36:09','Sent'),(10,2,NULL,'RewardUpdate','Reward catalog updated','Voucher 1795509358418 now requires 100 points and is Available.','2026-11-24 08:36:09','Sent'),(11,1,NULL,'RewardUpdate','Reward catalog updated','Voucher 1795509358418 now requires 100 points and is Available.','2026-11-24 08:36:09','Sent'),(12,2,NULL,'RewardUpdate','Reward catalog updated','Voucher 1795509358418 now requires 100 points and is Available.','2026-11-24 08:36:09','Sent'),(13,1,NULL,'PointsUpdate','Reward redemption reserved','Voucher 1795509358418: 100 points reserved. Balance: 50.','2026-11-24 08:36:09','Sent'),(14,NULL,1,'RewardUpdate','Low reward stock','Voucher 1795509358418: 1 units remain; reorder level 1.','2026-11-24 08:36:09','Sent'),(15,NULL,1,'RewardUpdate','Low reward stock','Voucher 1795509358418: 1 units remain; reorder level 1.','2026-11-24 08:36:09','Sent'),(16,1,NULL,'RewardUpdate','Reward catalog updated','Voucher 1795509358418 now requires 200 points and is Available.','2026-11-24 08:36:09','Sent'),(17,2,NULL,'RewardUpdate','Reward catalog updated','Voucher 1795509358418 now requires 200 points and is Available.','2026-11-24 08:36:09','Sent'),(18,1,NULL,'PointsUpdate','Redemption cancelled','100 points refunded for redemption 1. Balance: 150.','2026-11-24 08:36:10','Sent'),(19,1,NULL,'PointsUpdate','Loyalty points updated','Adjust: 50 points. Current balance: 200.','2026-11-24 08:36:10','Sent'),(20,1,NULL,'PointsUpdate','Reward redemption reserved','Voucher 1795509358418: 200 points reserved. Balance: 0.','2026-11-24 08:36:10','Sent'),(21,NULL,1,'RewardUpdate','Low reward stock','Voucher 1795509358418: 1 units remain; reorder level 1.','2026-11-24 08:36:10','Sent'),(22,1,NULL,'RewardUpdate','Redemption completed','Redemption 2 was completed.','2026-11-24 08:36:10','Sent'),(24,1,NULL,'RewardUpdate','Reward catalog updated','Temporary 1795509358418 now requires 100 points and is Available.','2026-11-24 08:36:10','Sent'),(25,2,NULL,'RewardUpdate','Reward catalog updated','Temporary 1795509358418 now requires 100 points and is Available.','2026-11-24 08:36:10','Sent'),(26,5,NULL,'AccountUpdate','Welcome to the loyalty program','Your loyalty account is active.','2026-11-24 08:36:10','Sent'),(27,6,NULL,'AccountUpdate','Welcome to the loyalty program','Your loyalty account is active.','2026-11-24 08:36:10','Sent'),(28,5,NULL,'PointsUpdate','Loyalty points updated','Earn: 1 points. Current balance: 1.','2026-11-24 08:36:10','Sent'),(29,6,NULL,'PointsUpdate','Loyalty points updated','Earn: 1 points. Current balance: 1.','2026-11-24 08:36:10','Sent'),(30,NULL,1,'RewardUpdate','Low reward stock','Limited 1795509358418: 1 units remain; reorder level 1.','2026-11-24 08:36:10','Sent'),(31,1,NULL,'RewardUpdate','Reward catalog updated','Limited 1795509358418 now requires 1 points and is Available.','2026-11-24 08:36:10','Sent'),(32,2,NULL,'RewardUpdate','Reward catalog updated','Limited 1795509358418 now requires 1 points and is Available.','2026-11-24 08:36:10','Sent'),(33,5,NULL,'RewardUpdate','Reward catalog updated','Limited 1795509358418 now requires 1 points and is Available.','2026-11-24 08:36:10','Sent'),(34,6,NULL,'RewardUpdate','Reward catalog updated','Limited 1795509358418 now requires 1 points and is Available.','2026-11-24 08:36:10','Sent'),(35,5,NULL,'PointsUpdate','Reward redemption reserved','Limited 1795509358418: 1 points reserved. Balance: 0.','2026-11-24 08:36:10','Sent'),(36,NULL,1,'RewardUpdate','Low reward stock','Limited 1795509358418: 0 units remain; reorder level 1.','2026-11-24 08:36:10','Sent'),(37,1,NULL,'RewardUpdate','Reward catalog updated','Limited 1795509358418 now requires 1 points and is Available.','2026-11-24 08:36:10','Sent'),(38,2,NULL,'RewardUpdate','Reward catalog updated','Limited 1795509358418 now requires 1 points and is Available.','2026-11-24 08:36:10','Sent'),(39,5,NULL,'RewardUpdate','Reward catalog updated','Limited 1795509358418 now requires 1 points and is Available.','2026-11-24 08:36:10','Sent'),(40,6,NULL,'RewardUpdate','Reward catalog updated','Limited 1795509358418 now requires 1 points and is Available.','2026-11-24 08:36:10','Sent'),(41,6,NULL,'PointsUpdate','Reward redemption reserved','Limited 1795509358418: 1 points reserved. Balance: 0.','2026-11-24 08:36:11','Sent'),(42,NULL,1,'RewardUpdate','Low reward stock','Limited 1795509358418: 1 units remain; reorder level 1.','2026-11-24 08:36:11','Sent'),(43,7,NULL,'AccountUpdate','Welcome to the loyalty program','Your loyalty account is active.','2026-11-24 08:36:11','Sent'),(44,7,NULL,'AccountUpdate','Customer profile updated','Your customer profile details were updated.','2026-11-24 08:36:11','Sent'),(45,7,NULL,'AccountUpdate','Loyalty account status updated','Your account is now Suspended.','2026-11-24 08:36:11','Sent'),(46,7,NULL,'AccountUpdate','Loyalty account status updated','Your account is now Active.','2026-11-24 08:36:11','Sent'),(47,7,NULL,'PointsUpdate','Loyalty points updated','Earn: 150 points. Current balance: 150.','2026-11-24 08:36:11','Sent'),(48,1,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(49,2,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(50,5,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(51,6,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(52,7,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(53,1,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(54,2,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(55,5,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(56,6,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(57,7,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(58,1,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(59,2,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(60,5,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(61,6,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(62,7,NULL,'RewardUpdate','Reward catalog updated','Voucher-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:11','Sent'),(63,7,NULL,'PointsUpdate','Reward redemption reserved','Voucher-1795509363695: 100 points reserved. Balance: 50.','2026-11-24 08:36:11','Sent'),(64,NULL,1,'RewardUpdate','Low reward stock','Voucher-1795509363695: 1 units remain; reorder level 1.','2026-11-24 08:36:12','Sent'),(65,7,NULL,'PointsUpdate','Redemption cancelled','100 points refunded for redemption 5. Balance: 150.','2026-11-24 08:36:12','Sent'),(67,1,NULL,'RewardUpdate','Reward catalog updated','Temporary-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:12','Sent'),(68,2,NULL,'RewardUpdate','Reward catalog updated','Temporary-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:12','Sent'),(69,5,NULL,'RewardUpdate','Reward catalog updated','Temporary-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:12','Sent'),(70,6,NULL,'RewardUpdate','Reward catalog updated','Temporary-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:12','Sent'),(71,7,NULL,'RewardUpdate','Reward catalog updated','Temporary-1795509363695 now requires 100 points and is Available.','2026-11-24 08:36:12','Sent'),(72,9,NULL,'AccountUpdate','Welcome to the loyalty program','Your loyalty account is active.','2026-11-24 08:36:12','Sent'),(73,NULL,4,'AccountUpdate','SMTP negative test','Synthetic test only',NULL,'Failed');
/*!40000 ALTER TABLE `EmailNotification` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `Employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Employee` (
  `EmployeeID` int NOT NULL AUTO_INCREMENT,
  `FirstName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LastName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `PasswordHash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Role` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `DateHired` date NOT NULL,
  PRIMARY KEY (`EmployeeID`),
  UNIQUE KEY `IDX_d5fdd84484b5a5d60a50a004a0` (`Email`),
  CONSTRAINT `chk_employee_role` CHECK ((`Role` in (_utf8mb4'Staff',_utf8mb4'Manager')))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `Employee` WRITE;
/*!40000 ALTER TABLE `Employee` DISABLE KEYS */;
INSERT INTO `Employee` VALUES (1,'System','Manager','audit-employee-1@example.test','!LOGIN_DISABLED_EXPORT_ONLY','Manager','2026-11-24'),(2,'Test','Cashier','audit-employee-2@example.test','!LOGIN_DISABLED_EXPORT_ONLY','Staff','2026-01-01'),(3,'Demo','Cashier','audit-employee-3@example.test','!LOGIN_DISABLED_EXPORT_ONLY','Staff','2026-01-01'),(4,'Rejected','SMTP','audit-employee-4@example.test','!LOGIN_DISABLED_EXPORT_ONLY','Staff','2026-11-24');
/*!40000 ALTER TABLE `Employee` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `LoyaltyAccount`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LoyaltyAccount` (
  `AccountID` int NOT NULL AUTO_INCREMENT,
  `CustomerID` int NOT NULL,
  `PointsBalance` int NOT NULL DEFAULT '0',
  `AccountStatus` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `DateOpened` date NOT NULL DEFAULT (curdate()),
  PRIMARY KEY (`AccountID`),
  UNIQUE KEY `IDX_5913be8b4a1ad11088b0e1ff4c` (`CustomerID`),
  UNIQUE KEY `REL_5913be8b4a1ad11088b0e1ff4c` (`CustomerID`),
  CONSTRAINT `FK_5913be8b4a1ad11088b0e1ff4c8` FOREIGN KEY (`CustomerID`) REFERENCES `Customer` (`CustomerID`) ON DELETE RESTRICT,
  CONSTRAINT `chk_account_status` CHECK ((`AccountStatus` in (_utf8mb4'Active',_utf8mb4'Inactive',_utf8mb4'Suspended'))),
  CONSTRAINT `chk_balance` CHECK ((`PointsBalance` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `LoyaltyAccount` WRITE;
/*!40000 ALTER TABLE `LoyaltyAccount` DISABLE KEYS */;
INSERT INTO `LoyaltyAccount` VALUES (1,1,0,'Active','2026-11-24'),(2,2,0,'Active','2026-11-24'),(4,5,0,'Active','2026-11-24'),(5,6,0,'Active','2026-11-24'),(6,7,150,'Active','2026-11-24'),(8,9,0,'Active','2026-11-24');
/*!40000 ALTER TABLE `LoyaltyAccount` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `PointsTransaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PointsTransaction` (
  `TransactionID` int NOT NULL AUTO_INCREMENT,
  `AccountID` int NOT NULL,
  `EmployeeID` int NOT NULL,
  `TransactionType` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Points` int NOT NULL,
  `PurchaseAmount` decimal(10,2) DEFAULT NULL,
  `TransactionDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`TransactionID`),
  KEY `FK_08d5b94d1fcb84a51012e452724` (`AccountID`),
  KEY `FK_0d40a877c761e99dfc1578c7220` (`EmployeeID`),
  CONSTRAINT `FK_08d5b94d1fcb84a51012e452724` FOREIGN KEY (`AccountID`) REFERENCES `LoyaltyAccount` (`AccountID`) ON DELETE RESTRICT,
  CONSTRAINT `FK_0d40a877c761e99dfc1578c7220` FOREIGN KEY (`EmployeeID`) REFERENCES `Employee` (`EmployeeID`) ON DELETE RESTRICT,
  CONSTRAINT `chk_points_nonzero` CHECK ((`Points` <> 0)),
  CONSTRAINT `chk_purchase_amount` CHECK (((`PurchaseAmount` is null) or (`PurchaseAmount` >= 0))),
  CONSTRAINT `chk_transaction_shape` CHECK ((((`TransactionType` = _utf8mb4'Earn') and (`Points` > 0) and (`PurchaseAmount` is not null)) or ((`TransactionType` = _utf8mb4'Redeem') and (`Points` < 0) and (`PurchaseAmount` is null)) or ((`TransactionType` = _utf8mb4'Adjust') and (`PurchaseAmount` is null)))),
  CONSTRAINT `chk_transaction_type` CHECK ((`TransactionType` in (_utf8mb4'Earn',_utf8mb4'Redeem',_utf8mb4'Adjust')))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `PointsTransaction` WRITE;
/*!40000 ALTER TABLE `PointsTransaction` DISABLE KEYS */;
INSERT INTO `PointsTransaction` VALUES (1,1,2,'Earn',150,1500.00,'2026-11-24 16:36:00'),(2,1,2,'Redeem',-100,NULL,'2026-11-24 16:36:00'),(3,1,2,'Adjust',100,NULL,'2026-11-24 16:36:01'),(4,1,2,'Adjust',50,NULL,'2026-11-24 16:36:01'),(5,1,2,'Redeem',-200,NULL,'2026-11-24 16:36:01'),(6,4,2,'Earn',1,10.00,'2026-11-24 16:36:01'),(7,5,2,'Earn',1,10.00,'2026-11-24 16:36:01'),(8,4,2,'Redeem',-1,NULL,'2026-11-24 16:36:02'),(9,5,2,'Redeem',-1,NULL,'2026-11-24 16:36:02'),(10,6,3,'Earn',150,1500.00,'2026-11-24 16:36:05'),(11,6,3,'Redeem',-100,NULL,'2026-11-24 16:36:05'),(12,6,3,'Adjust',100,NULL,'2026-11-24 16:36:05');
/*!40000 ALTER TABLE `PointsTransaction` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `Redemption`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Redemption` (
  `RedemptionID` int NOT NULL AUTO_INCREMENT,
  `TransactionID` int NOT NULL,
  `RewardID` int NOT NULL,
  `DateRedeemed` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `RedemptionStatus` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`RedemptionID`),
  UNIQUE KEY `IDX_5aaa568cce51dc9ad3b88c94bb` (`TransactionID`),
  UNIQUE KEY `REL_5aaa568cce51dc9ad3b88c94bb` (`TransactionID`),
  KEY `FK_09b71500d300f876a1dda83c214` (`RewardID`),
  CONSTRAINT `FK_09b71500d300f876a1dda83c214` FOREIGN KEY (`RewardID`) REFERENCES `Reward` (`RewardID`) ON DELETE RESTRICT,
  CONSTRAINT `FK_5aaa568cce51dc9ad3b88c94bbc` FOREIGN KEY (`TransactionID`) REFERENCES `PointsTransaction` (`TransactionID`) ON DELETE RESTRICT,
  CONSTRAINT `chk_redemption_status` CHECK ((`RedemptionStatus` in (_utf8mb4'Pending',_utf8mb4'Completed',_utf8mb4'Cancelled')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `Redemption` WRITE;
/*!40000 ALTER TABLE `Redemption` DISABLE KEYS */;
INSERT INTO `Redemption` VALUES (1,2,1,'2026-11-24 16:36:00','Cancelled'),(2,5,1,'2026-11-24 16:36:01','Completed'),(3,8,3,'2026-11-24 16:36:02','Pending'),(4,9,3,'2026-11-24 16:36:02','Pending'),(5,11,4,'2026-11-24 16:36:05','Cancelled');
/*!40000 ALTER TABLE `Redemption` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `Reward`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Reward` (
  `RewardID` int NOT NULL AUTO_INCREMENT,
  `RewardName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `PointsRequired` int NOT NULL,
  `StockQuantity` int NOT NULL DEFAULT '0',
  `ReorderLevel` int NOT NULL DEFAULT '5',
  `RewardStatus` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Available',
  PRIMARY KEY (`RewardID`),
  UNIQUE KEY `IDX_e65842a97d8af679b25d6028ca` (`RewardName`),
  CONSTRAINT `chk_reorder` CHECK ((`ReorderLevel` >= 0)),
  CONSTRAINT `chk_reward_points` CHECK ((`PointsRequired` > 0)),
  CONSTRAINT `chk_reward_status` CHECK ((`RewardStatus` in (_utf8mb4'Available',_utf8mb4'Unavailable'))),
  CONSTRAINT `chk_stock` CHECK ((`StockQuantity` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `Reward` WRITE;
/*!40000 ALTER TABLE `Reward` DISABLE KEYS */;
INSERT INTO `Reward` VALUES (1,'Voucher 1795509358418','Replaced',200,1,1,'Available'),(3,'Limited 1795509358418','Demo',1,1,1,'Available'),(4,'Voucher-1795509363695','Updated demo voucher',100,2,1,'Available');
/*!40000 ALTER TABLE `Reward` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

