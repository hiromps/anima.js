"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { FilesControl as FilesControlDef } from "@/registry/schema";
import {
  parseUploads,
  revokeUploads,
  serializeUploads,
  type UploadedMedia,
} from "@/lib/uploads";

type Props = {
  def: FilesControlDef;
  value: string;
  onChange: (value: string) => void;
};

// pointer-coarse widens the hit area to 44px on touch without bloating the
// dense desktop list.
const ROW_BUTTON =
  "flex shrink-0 items-center justify-center rounded-sm p-0.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-20 pointer-coarse:size-11";

export function FilesControl({ def, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploads = parseUploads(value);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const added: UploadedMedia[] = Array.from(files).map((file) => ({
      src: URL.createObjectURL(file),
      name: file.name,
      kind: file.type.startsWith("video/") ? "video" : "image",
    }));
    onChange(serializeUploads([...uploads, ...added]));
  };

  const clear = () => {
    revokeUploads(value);
    onChange("");
  };

  /** Reorders a file; list order is the card order and the `items` order. */
  const move = (from: number, to: number) => {
    if (to < 0 || to >= uploads.length) return;
    const next = [...uploads];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(serializeUploads(next));
  };

  /**
   * Bundles the uploads under the same file names the generated code points
   * at, so unzipping into public/media/ makes the copied snippet resolve.
   */
  const downloadAll = async () => {
    try {
      const { downloadZip } = await import("client-zip");
      const files = await Promise.all(
        uploads.map(async (upload) => ({
          name: upload.name,
          input: await fetch(upload.src).then((res) => res.blob()),
        })),
      );
      const url = URL.createObjectURL(await downloadZip(files).blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "media.zip";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("media.zip をダウンロードしました");
    } catch {
      toast.error("ZIP の作成に失敗しました");
    }
  };

  const removeAt = (index: number) => {
    const removed = uploads[index];
    if (!removed) return;
    URL.revokeObjectURL(removed.src);
    const next = uploads.filter((_, i) => i !== index);
    // Empty string is the schema default, so the control reads as unchanged
    // again once the last file is gone.
    onChange(next.length ? serializeUploads(next) : "");
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={def.accept}
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          // Allow re-selecting the same files after a Clear.
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1 gap-1.5 text-xs pointer-coarse:h-11"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3" />
          {uploads.length ? "さらに追加" : "ファイルを選択"}
        </Button>
        {uploads.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground pointer-coarse:h-11"
            onClick={clear}
          >
            <X className="size-3" />
            クリア
          </Button>
        )}
      </div>
      {uploads.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-full gap-1.5 text-xs pointer-coarse:h-11"
          onClick={() => void downloadAll()}
        >
          <Download className="size-3" />
          public/media/ 用に ZIP でダウンロード
        </Button>
      )}
      {uploads.length > 0 && (
        <ul className="space-y-1">
          {uploads.map((upload, i) => (
            <li
              key={upload.src}
              className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
            >
              {/* Thumbnails make the ordering buttons usable — file names
                  alone say nothing about which card is which. */}
              {upload.kind === "video" ? (
                <video
                  src={upload.src}
                  className="pointer-events-none size-5 shrink-0 rounded-sm border border-border/60 object-cover"
                  preload="metadata"
                  muted
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={upload.src}
                  alt=""
                  className="pointer-events-none size-5 shrink-0 rounded-sm border border-border/60 object-cover"
                  draggable={false}
                />
              )}
              <span className="flex-1 truncate">{upload.name}</span>
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                aria-label={`${upload.name} を上へ移動`}
                title="上へ移動"
                className={ROW_BUTTON}
              >
                <ChevronUp className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === uploads.length - 1}
                aria-label={`${upload.name} を下へ移動`}
                title="下へ移動"
                className={ROW_BUTTON}
              >
                <ChevronDown className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`${upload.name} を削除`}
                title="削除"
                className={`${ROW_BUTTON} hover:text-destructive`}
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
