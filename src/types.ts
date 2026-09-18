export type BlockType = "plain" | "markdown" | "rich" | "image";

export interface ResumeItem {
  id: string;
  label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ResumeBlock {
  id: string;
  item_id: string;
  type: BlockType;
  content: string;
  asset_path: string | null;
  sort_order: number;
}

export interface ItemWithBlocks extends ResumeItem {
  blocks: ResumeBlock[];
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  plain: "纯文本",
  markdown: "Markdown",
  rich: "富文本",
  image: "图片",
};
