"use client";

import React, { useEffect, useState } from "react";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import { BodyMeasurementForm } from "@/components/coach/BodyMeasurementForm";

interface AddClientCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  coachId: string;
}

export function AddClientCheckInModal({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  coachId,
}: AddClientCheckInModalProps) {
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (isOpen) setFormKey((k) => k + 1);
  }, [isOpen]);

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add check-in for client"
      subtitle="Enter weight and optional metrics from in-person session."
    >
      <BodyMeasurementForm
        key={formKey}
        clientId={clientId}
        coachId={coachId}
        submitLabel="Save check-in"
        onCancel={onClose}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
      />
    </ResponsiveModal>
  );
}
