import { useState } from "react";
import { Input, Segmented } from "antd";
import ReactMarkdown from "react-markdown";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownBlockEditor({ value, onChange }: Props) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <div className="md-block">
      <Segmented
        size="small"
        value={mode}
        onChange={(v) => setMode(v as "edit" | "preview")}
        options={[
          { label: "编辑", value: "edit" },
          { label: "预览", value: "preview" },
        ]}
        style={{ marginBottom: 8 }}
      />
      {mode === "edit" ? (
        <Input.TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoSize={{ minRows: 4, maxRows: 14 }}
          placeholder="输入 Markdown…"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        />
      ) : (
        <div className="md-preview">
          {value.trim() ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <span className="muted">暂无内容</span>
          )}
        </div>
      )}
    </div>
  );
}
