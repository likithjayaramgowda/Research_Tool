/** The pages every visual and accessibility check walks through. */
export const PAGES = [{ name: "design", path: "/design" }];

export const THEMES = ["light", "dark"] as const;

export const VIEWPORTS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "390", width: 390, height: 844 },
] as const;
