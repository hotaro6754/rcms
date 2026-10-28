-- Website content editor (additive).

CREATE TABLE "SitePage" (
    "key" TEXT NOT NULL,
    "custom" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT,
    "title" TEXT,
    "draft" JSONB,
    "draftUpdatedAt" TIMESTAMP(3),
    "draftById" TEXT,
    "published" JSONB,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SitePage_pkey" PRIMARY KEY ("key"),
    -- A custom page always has an address; built-in pages never do.
    CONSTRAINT "SitePage_custom_slug" CHECK (("custom" AND "slug" IS NOT NULL) OR (NOT "custom" AND "slug" IS NULL)),
    CONSTRAINT "SitePage_slug_format" CHECK ("slug" IS NULL OR "slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT "SitePage_version_nonneg" CHECK ("version" >= 0)
);

CREATE UNIQUE INDEX "SitePage_slug_key" ON "SitePage"("slug");
CREATE INDEX "SitePage_custom_archivedAt_idx" ON "SitePage"("custom", "archivedAt");

CREATE TABLE "SitePageVersion" (
    "id" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB,
    "publishedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SitePageVersion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SitePageVersion_version_positive" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "SitePageVersion_pageKey_version_key" ON "SitePageVersion"("pageKey", "version");

ALTER TABLE "SitePageVersion" ADD CONSTRAINT "SitePageVersion_pageKey_fkey" FOREIGN KEY ("pageKey") REFERENCES "SitePage"("key") ON DELETE CASCADE ON UPDATE CASCADE;
