/**
 * Kinetic-text words shared by the preview's band row and the code
 * generator, so the copied snippet's children match what the card shows.
 *
 * Kept in a plain module (no "use client") because the entry's codegen
 * reads it from server-evaluated code, where a client module's exports
 * would be opaque references.
 */
export const KINETIC_WORDS = ["Design", "Animate", "Ship"] as const;

/** Separator glyph between words. Decorative: rendered aria-hidden. */
export const KINETIC_SEPARATOR = "✦";
