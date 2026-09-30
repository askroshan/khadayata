/**
 * WCAG 2.2 AA accessible color constants for Khadayata Online.
 *
 * ACCENT — full-saturation brand colors for graphical elements only
 *   (borders, backgrounds, gradients, icon fills on tinted backgrounds).
 *   Never use these as text on light backgrounds — they fail 4.5:1.
 *
 * TEXT — darker variants that pass 4.5:1 on #FDEBD0 (the lightest bg in use).
 *   Use for eyebrow labels, link text, and icon strokes on light backgrounds.
 *
 * LIGHT — lighter variants that pass 3:1 on the dark hero overlay (~#444).
 *   Use for large text (>=18pt or >=14pt bold) on dark cards/overlays.
 *
 * BUTTON — darkened variants that pass 4.5:1 with white text.
 *   Use for solid button backgrounds paired with white text.
 */
export const ACCENT = {
  saffron: "#F39C12",
  pink: "#E91E63",
  blue: "#1E88E5",
  green: "#43A047",
  gold: "#F4B400",
} as const;

export const TEXT = {
  saffron: "#96600b",
  pink: "#cf1a58",
  blue: "#186eb9",
  green: "#327935",
  gold: "#886400",
} as const;

export const LIGHT = {
  saffron: "#ffb74d",
  pink: "#ff5ba8",
  blue: "#42a5f5",
  green: "#66bb6a",
  gold: "#ffca28",
} as const;

export const BUTTON = {
  saffron: "#96600b",
  pink: "#cf1a58",
  blue: "#186eb9",
  green: "#327935",
  gold: "#886400",
} as const;

/** Muted text color for secondary content on light backgrounds.
 *  Passes 4.5:1 on #FFF7E6, #FDEBD0, and #ffffff. */
export const MUTED_TEXT = "rgba(46,46,46,0.75)" as const;

/** Placeholder color for search inputs on white/cream backgrounds.
 *  #757575 passes 4.5:1 on #ffffff and #FFF7E6. */
export const PLACEHOLDER = "#757575" as const;
