-- Lesson formats: every lesson can offer a video, a slide deck and a reading (study material).
ALTER TABLE `Resource`
    ADD COLUMN `format` ENUM('SLIDES', 'READING', 'OTHER') NOT NULL DEFAULT 'OTHER',
    ADD COLUMN `sourceKey` MEDIUMTEXT NULL,
    ADD COLUMN `sourceMime` MEDIUMTEXT NULL;

-- Existing PDFs were already read in the lesson, page by page.
UPDATE `Resource` SET `format` = 'READING' WHERE `mimeType` = 'application/pdf';

-- Learner downloads are disabled platform-wide: everything is view-only.
UPDATE `Resource` SET `downloadable` = false;
