"use client";

import { RotateCw } from "lucide-react";

export function ReloadButton() {
  return (
    <button
      type="button"
      className="pill-btn pill-gradient mt-2"
      onClick={() => window.location.reload()}
    >
      <RotateCw className="size-4" />
      再読み込み
    </button>
  );
}
