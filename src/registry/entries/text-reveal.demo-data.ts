/**
 * Shared by the demo and the entry's codegen: the playground's text
 * control is a single-line input, so " / " stands in for a line break and
 * becomes a real "\n" both in the preview and in the generated snippet.
 */
export function demoText(value: string): string {
  return value.replace(/\s+\/\s+/g, "\n");
}

/** Preview-only paragraph for the "scroll" demo below the headline. */
export const DEMO_PARAGRAPH =
  "スクロールに合わせて、言葉がひとつずつ灯っていく。Each word lights up as the paragraph moves through the view — the highlight is tied to scroll position, not time.";
