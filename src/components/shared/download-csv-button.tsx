"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadCsvButton({ filename, csv }: { filename: string; csv: string }) {
  function handleClick() {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick}>
      <DownloadIcon />
      Download CSV
    </Button>
  );
}
