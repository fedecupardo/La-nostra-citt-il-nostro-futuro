CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `version` VARCHAR(100) NOT NULL,
  `applied_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `sessions` (
  `token_hash` CHAR(64) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `expires` BIGINT UNSIGNED NOT NULL,
  `created` DATETIME(3) NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `idx_sessions_user` (`user_id`),
  CONSTRAINT `fk_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `credentials` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('0002_sessions_and_staff', UTC_TIMESTAMP(3));
