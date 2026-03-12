"use client";

import { useState, useMemo } from "react";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-provider";
import { getReportData } from "@/lib/clientReportService";
import { buildClientReportPdf, getReportFilename } from "@/lib/clientReportPdf";

type DateRangePreset = "7" | "30" | "90" | "custom";

export interface ClientOption {
  id: string;
  name: string;
}

interface GenerateReportModalProps {
  open: boolean;
  onClose: () => void;
  coachId: string;
  /** When provided, report is for this client. When null, clientList must be provided and user selects. */
  clientId: string | null;
  clientName?: string;
  coachName?: string;
  /** Required when clientId is null (e.g. from aggregate Progress page). */
  clientList?: ClientOption[];
  onGenerated?: () => void;
}

function getDateRange(preset: DateRangePreset, customStart?: string, customEnd?: string): { start: string; end: string } {
  const end = new Date();
  const endStr = end.toISOString().split("T")[0];
  if (preset === "custom" && customStart && customEnd) {
    return { start: customStart.slice(0, 10), end: customEnd.slice(0, 10) };
  }
  let start = new Date();
  if (preset === "7") start.setDate(start.getDate() - 6);
  else if (preset === "30") start.setDate(start.getDate() - 29);
  else if (preset === "90") start.setDate(start.getDate() - 89);
  else start.setDate(start.getDate() - 29);
  const startStr = start.toISOString().split("T")[0];
  return { start: startStr, end: endStr };
}

export function GenerateReportModal({
  open,
  onClose,
  coachId,
  clientId: initialClientId,
  clientName: initialClientName,
  clientList = [],
  onGenerated,
}: GenerateReportModalProps) {
  const { addToast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId ?? null);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const effectiveClientId = initialClientId ?? selectedClientId;
  const showClientSelect = initialClientId == null && clientList.length > 0;

  const canGenerate = useMemo(() => {
    if (!effectiveClientId) return false;
    if (datePreset === "custom") {
      if (!customStart || !customEnd) return false;
      const s = new Date(customStart);
      const e = new Date(customEnd);
      return s <= e;
    }
    return true;
  }, [effectiveClientId, datePreset, customStart, customEnd]);

  const handleGenerate = async () => {
    if (!effectiveClientId || !canGenerate) return;
    const { start, end } = getDateRange(datePreset, customStart, customEnd);
    setLoading(true);
    try {
      const reportData = await getReportData(effectiveClientId, coachId, start, end);
      const blob = await buildClientReportPdf(reportData, coachNotes.trim() || undefined);
      const filename = getReportFilename(
        reportData.cover.clientFirstName,
        reportData.cover.clientLastName,
        start,
        end
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ title: "Report downloaded", variant: "default" });
      onClose();
      onGenerated?.();
    } catch (e) {
      console.error(e);
      addToast({ title: "Failed to generate report", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCoachNotes("");
      setDatePreset("30");
      setCustomStart("");
      setCustomEnd("");
      if (initialClientId == null) setSelectedClientId(null);
      onClose();
    }
  };

  return (
    <ResponsiveModal
      isOpen={open}
      onClose={handleClose}
      title="Generate Progress Report"
      subtitle="Choose date range and optional notes. The PDF will include body composition, training, wellness, and more."
      maxWidth="md"
    >
      <div className="space-y-4">
        {showClientSelect && (
          <div>
            <Label className="block text-sm font-medium fc-text-primary mb-2">Client</Label>
            <Select
              value={selectedClientId ?? ""}
              onValueChange={(v) => setSelectedClientId(v || null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clientList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="block text-sm font-medium fc-text-primary mb-2">Date range</Label>
          <Select
            value={datePreset}
            onValueChange={(v) => setDatePreset(v as DateRangePreset)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {datePreset === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="block text-sm font-medium fc-text-subtle mb-1">Start date</Label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium fc-text-subtle mb-1">End date</Label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <Label className="block text-sm font-medium fc-text-primary mb-2">Coach notes (optional)</Label>
          <Textarea
            placeholder="Add personalized notes or next steps for the client..."
            value={coachNotes}
            onChange={(e) => setCoachNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate || loading}>
            {loading ? "Generating…" : "Generate PDF"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
