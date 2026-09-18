import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  Space,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { BlockType, ItemWithBlocks, ResumeBlock } from "../types";
import { BLOCK_TYPE_LABELS } from "../types";
import {
  createBlock,
  deleteBlock,
  reorderBlocks,
  updateBlock,
  updateItemLabel,
} from "../db";
import { copyMarkdownAsHtml, copySingleBlock } from "../clipboard";
import { PlainBlockEditor } from "./blocks/PlainBlock";
import { MarkdownBlockEditor } from "./blocks/MarkdownBlock";
import { RichBlockEditor } from "./blocks/RichBlock";
import { ImageBlockEditor } from "./blocks/ImageBlock";

interface Props {
  items: ItemWithBlocks[];
  itemId: string;
  onReload: () => Promise<void>;
  onDone: () => void;
}

function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: T) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delay);
  };
}

export function EditView({ items, itemId, onReload, onDone }: Props) {
  const [draft, setDraft] = useState<ItemWithBlocks | null>(
    () => items.find((i) => i.id === itemId) ?? null,
  );

  useEffect(() => {
    setDraft(items.find((i) => i.id === itemId) ?? null);
  }, [items, itemId]);

  const blocks = useMemo(() => draft?.blocks ?? [], [draft]);

  const persistContent = useDebouncedCallback(
    async (id: string, content: string) => {
      await updateBlock(id, { content });
    },
    350,
  );

  async function changeLabel(label: string) {
    if (!draft) return;
    setDraft({ ...draft, label });
    await updateItemLabel(draft.id, label);
  }

  async function addBlock(type: BlockType) {
    if (!draft) return;
    await createBlock(draft.id, type);
    await onReload();
  }

  async function removeBlock(id: string) {
    await deleteBlock(id);
    await onReload();
  }

  async function moveBlock(block: ResumeBlock, dir: -1 | 1) {
    if (!draft) return;
    const ids = draft.blocks.map((b) => b.id);
    const idx = ids.indexOf(block.id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= ids.length) return;
    [ids[idx], ids[next]] = [ids[next], ids[idx]];
    await reorderBlocks(draft.id, ids);
    await onReload();
  }

  function patchBlockContentLocal(id: string, content: string) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            blocks: prev.blocks.map((b) =>
              b.id === id ? { ...b, content } : b,
            ),
          }
        : prev,
    );
    persistContent(id, content);
  }

  async function patchBlockAsset(id: string, assetPath: string) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            blocks: prev.blocks.map((b) =>
              b.id === id ? { ...b, asset_path: assetPath, content: "" } : b,
            ),
          }
        : prev,
    );
    await updateBlock(id, { asset_path: assetPath, content: "" });
  }

  const addBlockMenu = {
    items: (Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((type) => ({
      key: type,
      label: BLOCK_TYPE_LABELS[type],
      onClick: () => {
        void addBlock(type);
      },
    })),
  };

  if (!draft) {
    return (
      <div className="edit-view">
        <Empty description="条目不存在" />
        <Button type="primary" onClick={onDone} style={{ marginTop: 12 }}>
          返回
        </Button>
      </div>
    );
  }

  return (
    <div className="edit-view">
      <div className="edit-toolbar">
        <Button type="primary" onClick={onDone}>
          完成
        </Button>
        <Dropdown menu={addBlockMenu} trigger={["click"]}>
          <Button icon={<PlusOutlined />}>添加块</Button>
        </Dropdown>
      </div>

      <div className="edit-single">
        <div className="edit-label-row">
          <Typography.Text type="secondary" style={{ flexShrink: 0 }}>
            标签
          </Typography.Text>
          <Input
            value={draft.label}
            onChange={(e) => void changeLabel(e.target.value)}
            placeholder="条目名称"
          />
        </div>

        {blocks.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="添加纯文本 / Markdown / 富文本 / 图片块"
          />
        ) : (
          blocks.map((block) => (
            <Card
              key={block.id}
              size="small"
              className="block-card"
              title={BLOCK_TYPE_LABELS[block.type]}
              extra={
                <Space size={0}>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    title="复制"
                    onClick={async () => {
                      try {
                        await copySingleBlock(block);
                        message.success("已复制该块");
                      } catch (e) {
                        message.error(String(e));
                      }
                    }}
                  />
                  {block.type === "markdown" && (
                    <Button
                      type="text"
                      size="small"
                      title="复制为 HTML"
                      onClick={async () => {
                        try {
                          await copyMarkdownAsHtml(block.content);
                          message.success("已复制为 HTML");
                        } catch (e) {
                          message.error(String(e));
                        }
                      }}
                    >
                      HTML
                    </Button>
                  )}
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowUpOutlined />}
                    title="上移"
                    onClick={() => void moveBlock(block, -1)}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowDownOutlined />}
                    title="下移"
                    onClick={() => void moveBlock(block, 1)}
                  />
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    title="删除块"
                    onClick={() => void removeBlock(block.id)}
                  />
                </Space>
              }
            >
              {block.type === "plain" && (
                <PlainBlockEditor
                  value={block.content}
                  onChange={(v) => patchBlockContentLocal(block.id, v)}
                />
              )}
              {block.type === "markdown" && (
                <MarkdownBlockEditor
                  value={block.content}
                  onChange={(v) => patchBlockContentLocal(block.id, v)}
                />
              )}
              {block.type === "rich" && (
                <RichBlockEditor
                  value={block.content}
                  onChange={(v) => patchBlockContentLocal(block.id, v)}
                />
              )}
              {block.type === "image" && (
                <ImageBlockEditor
                  assetPath={block.asset_path}
                  onChange={(p) => void patchBlockAsset(block.id, p)}
                />
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
