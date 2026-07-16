-- Keep existing rows on raw fallback until normalized content is regenerated.
ALTER TABLE "SpellMechanicFacet" ADD COLUMN "normalizedText" TEXT;
ALTER TABLE "SpellMechanicFacet" ADD COLUMN "displayCoverage" TEXT NOT NULL DEFAULT 'review';

CREATE INDEX "SpellMechanicFacet_mechanicType_displayCoverage_idx"
ON "SpellMechanicFacet"("mechanicType", "displayCoverage");
