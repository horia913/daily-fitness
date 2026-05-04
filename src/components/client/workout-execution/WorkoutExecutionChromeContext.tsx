"use client";

import React, { createContext, useContext } from "react";

export type WorkoutExecutionChrome = {
  /** When true, hide the small chevron-only back in block layout (shell shows exec-top back row). */
  hideCompactBack: boolean;
};

const WorkoutExecutionChromeContext = createContext<WorkoutExecutionChrome | null>(
  null,
);

export function WorkoutExecutionChromeProvider({
  value,
  children,
}: {
  value: WorkoutExecutionChrome;
  children: React.ReactNode;
}) {
  return (
    <WorkoutExecutionChromeContext.Provider value={value}>
      {children}
    </WorkoutExecutionChromeContext.Provider>
  );
}

export function useWorkoutExecutionChrome(): WorkoutExecutionChrome | null {
  return useContext(WorkoutExecutionChromeContext);
}
