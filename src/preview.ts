import type { ResumeBlock } from "./types";

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
}

/** Compact list preview: flatten blocks into one short plain line. */
export function buildItemPreview(blocks: ResumeBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "plain":
      case "markdown": {
        const t = (block.content ?? "").replace(/\s+/g, " ").trim();
        if (t) parts.push(t);
        break;
      }
      case "rich": {
        const t = stripHtml(block.content ?? "");
        if (t) parts.push(t);
        break;
      }
      case "image":
        parts.push(block.asset_path ? "[图片]" : "[图片·未选择]");
        break;
    }
  }
  return parts.join(" · ");
}
