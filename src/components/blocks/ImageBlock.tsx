import { useEffect, useState } from "react";
import { Button, Space, Image as AntImage } from "antd";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";

interface Props {
  assetPath: string | null;
  onChange: (assetPath: string) => void;
}

export function ImageBlockEditor({ assetPath, onChange }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!assetPath) {
        setSrc(null);
        return;
      }
      try {
        const abs = await invoke<string>("resolve_asset_path", {
          relative: assetPath,
        });
        if (!cancelled) setSrc(convertFileSrc(abs));
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetPath]);

  async function pickImage() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] }],
    });
    if (!selected || Array.isArray(selected)) return;
    const bytes = await readFile(selected);
    const ext = selected.split(".").pop() || "png";
    const relative = await invoke<string>("save_asset", {
      bytes,
      ext,
    });
    onChange(relative);
  }

  return (
    <div className="image-block">
      <Space direction="vertical" style={{ width: "100%" }}>
        <Button size="small" onClick={pickImage}>
          {assetPath ? "更换图片" : "选择图片"}
        </Button>
        {src ? (
          <AntImage
            src={src}
            alt="block"
            style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain" }}
            preview={{ mask: "预览" }}
          />
        ) : (
          <span className="muted">尚未选择图片</span>
        )}
      </Space>
    </div>
  );
}
