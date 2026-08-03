ALTER TABLE "User"
  DROP COLUMN "role",
  DROP COLUMN "banned",
  DROP COLUMN "banReason",
  DROP COLUMN "banExpires";

ALTER TABLE "Session"
  DROP COLUMN "impersonatedBy";
