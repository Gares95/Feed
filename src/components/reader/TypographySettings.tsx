"use client";

import { useState, useEffect } from "react";
import { ALargeSmall, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TypographyConfig {
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
}

const DEFAULTS: TypographyConfig = {
  fontSize: 16,
  lineHeight: 1.7,
  maxWidth: 672,
};

const STORAGE_KEY = "feed-typography";

function loadConfig(): TypographyConfig {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return DEFAULTS;
}

function saveConfig(config: TypographyConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useTypography() {
  const [config, setConfig] = useState<TypographyConfig>(DEFAULTS);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  function update(partial: Partial<TypographyConfig>) {
    const next = { ...config, ...partial };
    setConfig(next);
    saveConfig(next);
  }

  return { config, update };
}

interface TypographySettingsProps {
  config: TypographyConfig;
  onUpdate: (partial: Partial<TypographyConfig>) => void;
}

export function TypographySettings({
  config,
  onUpdate,
}: TypographySettingsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setOpen(!open)}
        title="Typography settings"
      >
        <ALargeSmall className="h-4 w-4" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-3 shadow-md">
            <div className="space-y-3">
              <SettingRow
                label="Font size"
                value={`${config.fontSize}px`}
                onDecrease={() =>
                  onUpdate({
                    fontSize: Math.max(12, config.fontSize - 1),
                  })
                }
                onIncrease={() =>
                  onUpdate({
                    fontSize: Math.min(24, config.fontSize + 1),
                  })
                }
              />
              <SettingRow
                label="Line height"
                value={config.lineHeight.toFixed(1)}
                onDecrease={() =>
                  onUpdate({
                    lineHeight: Math.max(
                      1.2,
                      Math.round((config.lineHeight - 0.1) * 10) / 10,
                    ),
                  })
                }
                onIncrease={() =>
                  onUpdate({
                    lineHeight: Math.min(
                      2.4,
                      Math.round((config.lineHeight + 0.1) * 10) / 10,
                    ),
                  })
                }
              />
              <SettingRow
                label="Width"
                value={`${config.maxWidth}px`}
                onDecrease={() =>
                  onUpdate({
                    maxWidth: Math.max(480, config.maxWidth - 64),
                  })
                }
                onIncrease={() =>
                  onUpdate({
                    maxWidth: Math.min(960, config.maxWidth + 64),
                  })
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SettingRow({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDecrease}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums">{value}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onIncrease}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
