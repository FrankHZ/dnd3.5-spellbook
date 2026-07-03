-- Carry legacy spell fields required for lossless current DTO parity.
ALTER TABLE "SpellContent" ADD COLUMN "corruptLevel" INTEGER;
ALTER TABLE "SpellListEntry" ADD COLUMN "ownerPrestige" BOOLEAN;
