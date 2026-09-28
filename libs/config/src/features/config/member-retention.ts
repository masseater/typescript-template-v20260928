const memberRetentionDays = 30;

/** @canonical-values config.photo-purge */
const photoPurges = ["purged", "deferred"] as const;
type PhotoPurge = (typeof photoPurges)[number];
const PHOTO_PURGE = {
  deferred: photoPurges[1],
  purged: photoPurges[0],
} as const satisfies Record<string, PhotoPurge>;

export { PHOTO_PURGE, memberRetentionDays, photoPurges };
export type { PhotoPurge };
