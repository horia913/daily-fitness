"use client";

import React from "react";
import { Dumbbell } from "lucide-react";

export function NoProgramState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "var(--fc-surface-sunken)" }}>
        <Dumbbell className="w-10 h-10 fc-text-dim" />
      </div>
      <h2 className="text-xl font-bold fc-text-primary mb-2">No program assigned yet</h2>
      <p className="text-sm fc-text-dim max-w-sm">
        Your coach will assign your training program. In the meantime, check below for any assigned workouts.
      </p>
    </div>
  );
}
