import { Button, Empty, List, Modal, Space, Typography, message } from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import type { ItemWithBlocks } from "../types";
import { copyBlocks } from "../clipboard";
import { buildItemPreview } from "../preview";

interface Props {
  items: ItemWithBlocks[];
  onEdit: (itemId: string) => void;
  onAdd: () => void;
  onDelete: (itemId: string) => Promise<void>;
}

export function CompactView({ items, onEdit, onAdd, onDelete }: Props) {
  async function handleCopy(item: ItemWithBlocks) {
    try {
      if (!item.blocks.length) {
        message.warning("该条目没有内容块");
        return;
      }
      await copyBlocks(item.blocks);
      message.success(`已复制「${item.label || "未命名"}」`);
    } catch (e) {
      message.error(`复制失败: ${String(e)}`);
    }
  }

  function confirmDelete(item: ItemWithBlocks) {
    Modal.confirm({
      title: "删除条目",
      content: `确定删除「${item.label || "未命名"}」？此操作不可恢复。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      centered: true,
      onOk: async () => {
        await onDelete(item.id);
        message.success("已删除");
      },
    });
  }

  return (
    <div className="compact-view">
      {items.length === 0 ? (
        <Empty
          description="暂无条目"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={onAdd}>
            新增条目
          </Button>
        </Empty>
      ) : (
        <List
          size="small"
          dataSource={items}
          split
          renderItem={(item) => {
            const preview = buildItemPreview(item.blocks);
            return (
              <List.Item
                className="compact-row"
                actions={[
                  <Space key="actions" size={0}>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      title="编辑"
                      onClick={() => onEdit(item.id)}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      title="复制"
                      onClick={() => void handleCopy(item)}
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      title="删除"
                      onClick={() => confirmDelete(item)}
                    />
                  </Space>,
                ]}
              >
                <div className="compact-item-body">
                  <Typography.Text
                    strong
                    ellipsis
                    className="compact-item-label"
                  >
                    {item.label || "未命名"}
                  </Typography.Text>
                  <Typography.Paragraph
                    type="secondary"
                    className="compact-item-preview"
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 0 }}
                  >
                    {preview || "暂无内容"}
                  </Typography.Paragraph>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
}
