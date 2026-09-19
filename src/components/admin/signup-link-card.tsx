"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckIcon, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return `${window.location.origin}/signup`;
}

function getServerSnapshot() {
  return "";
}

export function SignupLinkCard() {
  const url = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Self-serve signup link</p>
          <p className="break-all text-xs text-muted-foreground">
            {url || "…"} — share this with anyone waiting to activate their account.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!url}
          className="self-start sm:self-auto"
        >
          {copied ? <CheckIcon /> : <LinkIcon />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </CardContent>
    </Card>
  );
}
