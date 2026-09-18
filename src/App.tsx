import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  ConfigProvider,
  Dropdown,
  Modal,
  Space,
  Typography,
  message,
} from "antd";
import {
  CloseOutlined,
  MoreOutlined,
  MoonOutlined,
  PlusOutlined,
  PushpinFilled,
  PushpinOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
  buildTheme,
  loadThemeMode,
  saveThemeMode,
  type ThemeMode,
} from "./theme";
import { closeDb, createItem, deleteItem, listItemsWithBlocks } from "./db";
import type { ItemWithBlocks } from "./types";
import { CompactView } from "./components/CompactView";
import { EditView } from "./components/EditView";
import { useTitlebarDrag } from "./titlebarDrag";
import "./App.css";

type Mode = "compact" | "edit";

const ALWAYS_ON_TOP_KEY = "resumefloat-always-on-top";

function loadAlwaysOnTop(): boolean {
  const saved = localStorage.getItem(ALWAYS_ON_TOP_KEY);
  if (saved === null) return true;
  return saved === "1" || saved === "true";
}

function saveAlwaysOnTop(value: boolean): void {
  localStorage.setItem(ALWAYS_ON_TOP_KEY, value ? "1" : "0");
}

function App() {
  const [mode, setMode] = useState<Mode>("compact");
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemWithBlocks[]>([]);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [alwaysOnTop, setAlwaysOnTop] = useState(() => loadAlwaysOnTop());
  const titlebarDrag = useTitlebarDrag();

  const antdTheme = useMemo(() => buildTheme(themeMode), [themeMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    saveThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    saveAlwaysOnTop(alwaysOnTop);
    void invoke("set_pin_above", { enabled: alwaysOnTop }).catch(() => {
      void getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
    });
  }, [alwaysOnTop]);

  const reload = useCallback(async () => {
    const data = await listItemsWithBlocks();
    setItems(data);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await reload();
      } catch (e) {
        message.error(`加载失败: ${String(e)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [reload]);

  function openEdit(itemId: string) {
    setEditItemId(itemId);
    setMode("edit");
  }

  async function handleAdd() {
    try {
      const item = await createItem(`条目 ${items.length + 1}`);
      await reload();
      openEdit(item.id);
    } catch (e) {
      message.error(`新增失败: ${String(e)}`);
    }
  }

  async function handleDelete(itemId: string) {
    await deleteItem(itemId);
    await reload();
  }

  function closeEdit() {
    void reload().then(() => {
      setMode("compact");
      setEditItemId(null);
    });
  }

  function toggleTheme() {
    setThemeMode((m) => (m === "dark" ? "light" : "dark"));
  }

  function toggleAlwaysOnTop() {
    setAlwaysOnTop((v) => !v);
  }

  async function handleExport() {
    const dest = await open({
      directory: true,
      multiple: false,
      title: "选择导出目录",
    });
    if (!dest || Array.isArray(dest)) return;
    try {
      await invoke("export_bundle", { destDir: dest });
      message.success("导出完成（resume.db + assets）");
    } catch (e) {
      message.error(`导出失败: ${String(e)}`);
    }
  }

  async function handleImport() {
    Modal.confirm({
      title: "导入将覆盖本地数据",
      content: "当前库与图片资源会被替换，是否继续？",
      okText: "继续导入",
      cancelText: "取消",
      centered: true,
      onOk: async () => {
        const src = await open({
          directory: true,
          multiple: false,
          title: "选择含 resume.db 的目录",
        });
        if (!src || Array.isArray(src)) return;
        try {
          await closeDb();
          await invoke("import_bundle", { srcDir: src });
          await reload();
          message.success("导入完成");
        } catch (e) {
          message.error(`导入失败: ${String(e)}`);
          try {
            await reload();
          } catch {
            /* ignore */
          }
        }
      },
    });
  }

  const menu = {
    items: [
      {
        key: "pin",
        label: alwaysOnTop ? "取消置顶" : "窗口置顶",
        onClick: () => toggleAlwaysOnTop(),
      },
      {
        key: "theme",
        label: themeMode === "dark" ? "切换浅色主题" : "切换深色主题",
        onClick: () => toggleTheme(),
      },
      { type: "divider" as const },
      {
        key: "export",
        label: "导出…",
        onClick: () => void handleExport(),
      },
      {
        key: "import",
        label: "导入…",
        onClick: () => void handleImport(),
      },
    ],
  };

  return (
    <ConfigProvider theme={antdTheme}>
      <div className="app-shell" data-theme={themeMode}>
        <header
          className="titlebar"
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onMouseDown={titlebarDrag.onMouseDown}
          onDoubleClick={titlebarDrag.onDoubleClick}
        >
          <span className="brand">ResumeFloat</span>
          <Space size={4} className="titlebar-actions">
            {mode === "compact" ? (
              <Button
                size="small"
                type="text"
                icon={<PlusOutlined />}
                onClick={() => void handleAdd()}
              >
                新增
              </Button>
            ) : null}
            <Button
              size="small"
              type="text"
              className={alwaysOnTop ? "titlebar-pin-active" : undefined}
              icon={alwaysOnTop ? <PushpinFilled /> : <PushpinOutlined />}
              onClick={toggleAlwaysOnTop}
              title={alwaysOnTop ? "取消置顶" : "窗口置顶"}
            />
            <Button
              size="small"
              type="text"
              icon={themeMode === "dark" ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              title={themeMode === "dark" ? "浅色主题" : "深色主题"}
            />
            <Dropdown menu={menu} trigger={["click"]}>
              <Button size="small" type="text" icon={<MoreOutlined />} />
            </Dropdown>
            <Button
              size="small"
              type="text"
              icon={<CloseOutlined />}
              onClick={() => void getCurrentWindow().close()}
            />
          </Space>
        </header>

        <main className="app-main">
          {loading ? (
            <Typography.Text type="secondary">加载中…</Typography.Text>
          ) : mode === "compact" ? (
            <CompactView
              items={items}
              onEdit={openEdit}
              onAdd={() => void handleAdd()}
              onDelete={handleDelete}
            />
          ) : editItemId ? (
            <EditView
              items={items}
              itemId={editItemId}
              onReload={reload}
              onDone={closeEdit}
            />
          ) : null}
        </main>
      </div>
    </ConfigProvider>
  );
}

export default App;
