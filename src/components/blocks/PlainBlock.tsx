import { Input } from "antd";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function PlainBlockEditor({ value, onChange }: Props) {
  return (
    <Input.TextArea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoSize={{ minRows: 3, maxRows: 10 }}
      placeholder="输入纯文本…"
    />
  );
}
