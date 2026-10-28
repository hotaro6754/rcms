-- Lesson materials are view-only unless the course team allows downloading (additive).
ALTER TABLE "Resource" ADD COLUMN "downloadable" BOOLEAN NOT NULL DEFAULT false;
