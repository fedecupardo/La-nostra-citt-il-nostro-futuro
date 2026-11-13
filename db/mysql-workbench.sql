-- Milano Partecipa - MySQL schema for MySQL Workbench
-- Safe to run more than once: CREATE statements use IF NOT EXISTS.
-- This script creates the database and demo proposals only.

CREATE DATABASE IF NOT EXISTS `la_nostra_citta`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `la_nostra_citta`;

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `version` VARCHAR(100) NOT NULL,
  `applied_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(60) NOT NULL,
  `surname` VARCHAR(60) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `cf` CHAR(16) NOT NULL,
  `birth` DATE NULL,
  `address` VARCHAR(250) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'cittadino',
  `verification` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `created` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_verification` (`verification`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `settings` (
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `credentials` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `password_hash` CHAR(64) NOT NULL,
  `salt` CHAR(64) NOT NULL,
  `recovery_hash` CHAR(64) NOT NULL,
  `birth` DATE NOT NULL,
  `created` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_credentials_email` (`email`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `auth_limits` (
  `key` VARCHAR(320) NOT NULL,
  `count` INT UNSIGNED NOT NULL,
  `expires` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`key`)
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

CREATE TABLE IF NOT EXISTS `proposals` (
  `id` VARCHAR(36) NOT NULL,
  `author` VARCHAR(36) NULL,
  `title` VARCHAR(140) NOT NULL,
  `description` TEXT NOT NULL,
  `category` VARCHAR(60) NOT NULL,
  `district` VARCHAR(30) NOT NULL,
  `kind` VARCHAR(30) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Ricevuta',
  `created` DATETIME(3) NOT NULL,
  `sample` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_proposals_author` (`author`),
  KEY `idx_proposals_status` (`status`),
  CONSTRAINT `fk_proposals_author`
    FOREIGN KEY (`author`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `files` (
  `id` VARCHAR(36) NOT NULL,
  `owner` VARCHAR(36) NOT NULL,
  `proposal` VARCHAR(36) NULL,
  `scope` VARCHAR(20) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `mime` VARCHAR(100) NOT NULL,
  `size` INT UNSIGNED NOT NULL,
  `created` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_files_owner` (`owner`),
  KEY `idx_files_proposal` (`proposal`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `votes` (
  `user` VARCHAR(36) NOT NULL,
  `proposal` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`user`, `proposal`),
  CONSTRAINT `fk_votes_user`
    FOREIGN KEY (`user`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_votes_proposal`
    FOREIGN KEY (`proposal`) REFERENCES `proposals` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `comments` (
  `id` VARCHAR(36) NOT NULL,
  `user` VARCHAR(36) NOT NULL,
  `proposal` VARCHAR(36) NOT NULL,
  `body` TEXT NOT NULL,
  `created` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_comments_user` (`user`),
  KEY `idx_comments_proposal` (`proposal`),
  CONSTRAINT `fk_comments_user`
    FOREIGN KEY (`user`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_comments_proposal`
    FOREIGN KEY (`proposal`) REFERENCES `proposals` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `events` (
  `id` VARCHAR(36) NOT NULL,
  `actor` VARCHAR(36) NOT NULL,
  `target` VARCHAR(36) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `note` TEXT NOT NULL,
  `created` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_events_target_created` (`target`, `created`),
  KEY `idx_events_actor` (`actor`)
) ENGINE=InnoDB;

INSERT IGNORE INTO `proposals`
  (`id`, `author`, `title`, `description`, `category`, `district`, `kind`, `status`, `created`, `sample`)
VALUES
  ('esempio-1', NULL, 'Una ciclabile sicura tra Isola e Porta Garibaldi',
   'Proponiamo un collegamento ciclabile continuo e protetto tra il quartiere Isola e la stazione di Porta Garibaldi, con attraversamenti ben segnalati e spazi sicuri per chi si muove ogni giorno in bicicletta. Questo è un esempio illustrativo, non una segnalazione inviata da un cittadino.',
   'Mobilità', 'Municipio 9', 'Idea', 'Pubblicata', '2026-10-01 09:00:00.000', 1),
  ('esempio-2', NULL, 'Più alberi e ombra in piazza Dergano',
   'Una proposta per rendere la piazza più vivibile nei mesi estivi: nuove alberature, panchine e aree ombreggiate accessibili a tutte le età. Esempio illustrativo per esplorare la piattaforma.',
   'Ambiente', 'Municipio 9', 'Richiesta', 'Presa in carico', '2026-10-01 09:00:00.000', 1),
  ('esempio-3', NULL, 'Illuminazione dei percorsi lungo il Naviglio',
   'Chiediamo una ricognizione dei punti scarsamente illuminati lungo i percorsi pedonali del Naviglio Grande e un piano di miglioramento. Esempio illustrativo, privo di documentazione di un problema reale.',
   'Sicurezza', 'Municipio 6', 'Segnalazione', 'In revisione', '2026-10-01 09:00:00.000', 1),
  ('esempio-4', NULL, 'Una biblioteca di quartiere aperta anche la sera',
   'Estendere gli orari degli spazi studio permetterebbe a studenti e lavoratori di utilizzare la biblioteca anche dopo il lavoro. Proponiamo una sperimentazione settimanale. Esempio illustrativo.',
   'Cultura e giovani', 'Municipio 3', 'Idea', 'Pubblicata', '2026-10-01 09:00:00.000', 1),
  ('esempio-5', NULL, 'Marciapiedi accessibili per tutti a Porta Romana',
   'Un percorso senza barriere, con scivoli e attraversamenti accessibili, per facilitare gli spostamenti di persone con disabilità e famiglie con passeggini. Esempio illustrativo.',
   'Spazi pubblici', 'Municipio 4', 'Richiesta', 'Pubblicata', '2026-10-01 09:00:00.000', 1),
  ('esempio-6', NULL, 'Un giardino condiviso per il quartiere NoLo',
   'Trasformare uno spazio di quartiere in un piccolo giardino condiviso, con orti didattici e attività aperte ai residenti. Esempio illustrativo per mostrare il percorso di una proposta.',
   'Ambiente', 'Municipio 2', 'Idea', 'Inviata al Comune', '2026-10-01 09:00:00.000', 1);

SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;
