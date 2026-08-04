"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateQuickSettings,
  updateNotificationPreferences,
} from "@/actions/profile";
import { TONE_LABELS, type FinancialTone } from "@/lib/tone";
import type { CautionLevel } from "@/domain/models";

export function ProfileQuickSettings({
  displayName,
  financialTone,
  cautionLevel,
}: {
  displayName: string;
  financialTone: FinancialTone;
  cautionLevel: CautionLevel;
}) {
  const [name, setName] = useState(displayName);
  const [tone, setTone] = useState(financialTone);
  const [caution, setCaution] = useState(cautionLevel);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      setMessage(null);
      const result = await updateQuickSettings({
        displayName: name.trim() || "User",
        financialTone: tone,
        cautionLevel: caution,
      });
      setMessage(result.error ? result.error : "Saved");
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="settings-name">Display name</Label>
        <Input
          id="settings-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Financial tone</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["direct", "blunt", "roast"] as FinancialTone[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={`rounded-xl border px-3 py-2 text-sm capitalize ${
                tone === t
                  ? "border-[#ffb84d] bg-[#ffb84d]/10 text-[#ffb84d]"
                  : "border-white/10 text-[#9a9186]"
              }`}
            >
              {TONE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Caution level</Label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["relaxed", "Relaxed"],
              ["balanced", "Balanced"],
              ["conservative", "Cautious"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCaution(value)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                caution === value
                  ? "border-[#ffb84d] bg-[#ffb84d]/10 text-[#ffb84d]"
                  : "border-white/10 text-[#9a9186]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#6f675e]">
          Affects how protective Safe-to-Spend feels.
        </p>
      </div>

      <Button type="button" onClick={save} disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save preferences"}
      </Button>
      {message && (
        <p
          className={`text-center text-sm ${
            message === "Saved" ? "text-[#7dcea0]" : "text-[#f0a59a]"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export type NotificationPrefs = {
  notifySalary: boolean;
  notifyBills: boolean;
  notifySafeToSpend: boolean;
  notifyGoals: boolean;
  notifyWishlist: boolean;
  notifyWeeklySummary: boolean;
  notifyUnusualTransactions: boolean;
};

const NOTIFY_FIELDS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: "notifySalary", label: "Payday & income" },
  { key: "notifyBills", label: "Upcoming bills" },
  { key: "notifySafeToSpend", label: "Safe-to-Spend changes" },
  { key: "notifyGoals", label: "Goals progress" },
  { key: "notifyWishlist", label: "Wishlist updates" },
  { key: "notifyWeeklySummary", label: "Weekly summary" },
  { key: "notifyUnusualTransactions", label: "Unusual spending" },
];

export function NotificationSettingsForm({
  initial,
}: {
  initial: NotificationPrefs;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function save() {
    startTransition(async () => {
      setMessage(null);
      const result = await updateNotificationPreferences(prefs);
      setMessage(result.error ? result.error : "Saved");
    });
  }

  return (
    <div className="space-y-3">
      {NOTIFY_FIELDS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => toggle(key)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-left"
        >
          <span className="text-sm text-[#f7f1e8]">{label}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              prefs[key]
                ? "bg-[#7dcea0]/20 text-[#7dcea0]"
                : "bg-white/10 text-[#9a9186]"
            }`}
          >
            {prefs[key] ? "On" : "Off"}
          </span>
        </button>
      ))}
      <Button type="button" onClick={save} disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save notifications"}
      </Button>
      {message && (
        <p
          className={`text-center text-sm ${
            message === "Saved" ? "text-[#7dcea0]" : "text-[#f0a59a]"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
