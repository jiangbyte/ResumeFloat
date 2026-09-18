import { marked } from "marked";
import {
  writeHtml,
  writeImage,
  writeText,
} from "@tauri-apps/plugin-clipboard-manager";
import { Image } from "@tauri-apps/api/image";
import { invoke } from "@tauri-apps/api/core";
import type { ResumeBlock } from "./types";

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}

async function markdownToHtml(src: string): Promise<string> {
  return marked.parse(src, { async: false }) as string;
}

export async function copyBlocks(blocks: ResumeBlock[]): Promise<void> {
  const plainParts: string[] = [];
  const htmlParts: string[] = [];
  let firstImageRel: string | null = null;

  for (const block of blocks) {
    switch (block.type) {
      case "plain": {
        const t = block.content ?? "";
        if (t) {
          plainParts.push(t);
          htmlParts.push(
            `<p>${t
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/\n/g, "<br/>")}</p>`,
          );
        }
        break;
      }
      case "markdown": {
        const src = block.content ?? "";
        if (src) {
          plainParts.push(src);
          htmlParts.push(await markdownToHtml(src));
        }
        break;
      }
      case "rich": {
        const html = block.content ?? "";
        if (html) {
          plainParts.push(stripHtml(html));
          htmlParts.push(html);
        }
        break;
      }
      case "image": {
        if (block.asset_path && !firstImageRel) {
          firstImageRel = block.asset_path;
        } else if (block.asset_path) {
          plainParts.push(`[图片: ${block.asset_path}]`);
        }
        break;
      }
    }
  }

  const plain = plainParts.filter(Boolean).join("\n\n");
  const html = htmlParts.filter(Boolean).join("\n");

  if (plain || html) {
    if (html) {
      await writeHtml(html, plain || stripHtml(html));
    } else {
      await writeText(plain);
    }
  } else if (firstImageRel) {
    const abs = await invoke<string>("resolve_asset_path", {
      relative: firstImageRel,
    });
    const image = await Image.fromPath(abs);
    await writeImage(image);
  }
}

export async function copySingleBlock(block: ResumeBlock): Promise<void> {
  await copyBlocks([block]);
}

export async function copyMarkdownAsHtml(src: string): Promise<void> {
  const html = await markdownToHtml(src);
  await writeHtml(html, src);
}
