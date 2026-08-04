'use client'

import React, { useRef, useState } from 'react'
import type { CanvasExercise, CanvasGroup } from '@/lib/groupModel/canvasTypes'
import type { Measurement, SlotProperty } from '@/lib/groupModel/types'
import { CANVAS } from './canvasTokens'
import { CanvasFloatingMenu, CanvasMenuItem, CanvasMenuSection } from './CanvasFloatingMenu'
import {
  PRESCRIPTION_PROPERTIES,
  TECHNIQUE_PROPERTIES,
  propertyLabel,
} from './propertyLabels'
import { ChevronDown, X } from 'lucide-react'

interface PrescriptionTableProps {
  slot: CanvasExercise
  group: CanvasGroup
  onUpdatePrescription: (setNumber: number, patch: Record<string, unknown>) => void
  onAddSet: () => void
  onRemoveSet: (setNumber: number) => void
  onSetMeasurement: (measurement: Measurement, confirmed?: boolean) => void
  onToggleProperty: (property: SlotProperty, confirmed?: boolean) => void
  onUpdateSlot: (patch: Partial<CanvasExercise>) => void
}

const MEASUREMENT_OPTIONS: { value: Measurement; label: string }[] = [
  { value: 'reps', label: 'Reps' },
  { value: 'time', label: 'Time' },
  { value: 'distance', label: 'Distance' },
]

function PrescriptionTable({
  slot,
  group,
  onUpdatePrescription,
  onAddSet,
  onRemoveSet,
  onSetMeasurement,
  onToggleProperty,
  onUpdateSlot,
}: PrescriptionTableProps) {
  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false)
  const [measurementMenuOpen, setMeasurementMenuOpen] = useState(false)
  const propertyAnchorRef = useRef<HTMLButtonElement>(null)
  const measurementAnchorRef = useRef<HTMLButtonElement>(null)
  const canAddSet = group.rounds_driver === 'fixed' || group.rounds_driver === 'for_time'

  const handlePropertyClick = (property: SlotProperty) => {
    const active = slot.enabledProperties.includes(property)
    if (active) {
      onToggleProperty(property)
    } else {
      onToggleProperty(property)
    }
    setPropertyMenuOpen(false)
  }

  return (
    <div className="mt-3 max-w-[600px]">
      <table className="text-sm tabular-nums w-auto" style={{ color: CANVAS.text }}>
        <thead>
          <tr style={{ color: CANVAS.muted }}>
            <th className="text-left py-1 pr-2 font-normal w-[34px]">Set</th>
            <th className="text-left py-1 pr-3 font-normal w-[120px]">
              <button
                ref={measurementAnchorRef}
                type="button"
                className="inline-flex items-center gap-1"
                style={{ color: CANVAS.cyan }}
                onClick={() => setMeasurementMenuOpen((v) => !v)}
              >
                {MEASUREMENT_OPTIONS.find((m) => m.value === slot.measurement)?.label ?? 'Reps'}
                <ChevronDown className="w-3 h-3" />
              </button>
              <CanvasFloatingMenu
                open={measurementMenuOpen}
                anchorRef={measurementAnchorRef}
                onClose={() => setMeasurementMenuOpen(false)}
                minWidth={160}
              >
                {MEASUREMENT_OPTIONS.map((option) => (
                  <CanvasMenuItem
                    key={option.value}
                    active={slot.measurement === option.value}
                    onClick={() => {
                      if (option.value !== slot.measurement) onSetMeasurement(option.value)
                      setMeasurementMenuOpen(false)
                    }}
                  >
                    {option.label}
                  </CanvasMenuItem>
                ))}
              </CanvasFloatingMenu>
            </th>
            {slot.enabledProperties.includes('load') && (
              <th className="text-left py-1 pr-3 font-normal w-[140px]">Load</th>
            )}
            {slot.enabledProperties.includes('rir') && (
              <th className="text-left py-1 pr-3 font-normal w-[80px]">RIR</th>
            )}
            {slot.enabledProperties.includes('tempo') && (
              <th className="text-left py-1 pr-3 font-normal w-[100px]">Tempo</th>
            )}
            {slot.enabledProperties.includes('rest_after_exercise') && (
              <th className="text-left py-1 pr-3 font-normal w-[80px]">Rest (s)</th>
            )}
            {slot.technique === 'drop_set' && (
              <th className="text-left py-1 pr-3 font-normal w-[80px]">Drop %</th>
            )}
            {slot.technique === 'cluster' && (
              <>
                <th className="text-left py-1 pr-3 font-normal w-[100px]">Reps/cluster</th>
                <th className="text-left py-1 pr-3 font-normal w-[80px]">Clusters</th>
              </>
            )}
            {slot.technique === 'rest_pause' && (
              <>
                <th className="text-left py-1 pr-3 font-normal w-[80px]">Pause s</th>
                <th className="text-left py-1 pr-3 font-normal w-[90px]">Max pauses</th>
              </>
            )}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {[...slot.prescriptions]
            .sort((a, b) => a.set_number - b.set_number)
            .map((row, rowIndex) => (
              <tr key={row.id ?? row.set_number} style={{ borderTop: `1px solid ${CANVAS.hairline}` }}>
                <td className="py-2 pr-2 font-mono w-[34px]">{row.set_number}</td>
                <td className="py-2 pr-3 w-[120px]">
                  {slot.measurement === 'reps' && (
                    <input
                      className="w-full max-w-[120px] bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: CANVAS.hairline }}
                      value={row.reps ?? ''}
                      onChange={(e) => onUpdatePrescription(row.set_number, { reps: e.target.value || null })}
                    />
                  )}
                  {slot.measurement === 'time' && (
                    <input
                      type="number"
                      className="w-full max-w-[120px] bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: CANVAS.hairline }}
                      value={row.work_seconds ?? ''}
                      onChange={(e) =>
                        onUpdatePrescription(row.set_number, {
                          work_seconds: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  )}
                  {slot.measurement === 'distance' && (
                    <input
                      type="number"
                      className="w-full max-w-[120px] bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: CANVAS.hairline }}
                      value={row.distance_meters ?? ''}
                      onChange={(e) =>
                        onUpdatePrescription(row.set_number, {
                          distance_meters: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  )}
                </td>
                {slot.enabledProperties.includes('load') && (
                  <td className="py-2 pr-3 w-[140px]">
                    <div className="flex gap-1 max-w-[140px]">
                      <input
                        type="number"
                        placeholder="%"
                        className="w-14 bg-transparent border-b outline-none font-mono"
                        style={{ borderColor: CANVAS.hairline }}
                        value={row.load_percentage ?? ''}
                        onChange={(e) =>
                          onUpdatePrescription(row.set_number, {
                            load_percentage: e.target.value ? Number(e.target.value) : null,
                            weight_kg: null,
                          })
                        }
                      />
                      <input
                        type="number"
                        placeholder="kg"
                        className="w-14 bg-transparent border-b outline-none font-mono"
                        style={{ borderColor: CANVAS.hairline }}
                        value={row.weight_kg ?? ''}
                        onChange={(e) =>
                          onUpdatePrescription(row.set_number, {
                            weight_kg: e.target.value ? Number(e.target.value) : null,
                            load_percentage: null,
                          })
                        }
                      />
                    </div>
                  </td>
                )}
                {slot.enabledProperties.includes('rir') && (
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      className="w-12 bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: CANVAS.hairline }}
                      value={row.rpe ?? ''}
                      onChange={(e) =>
                        onUpdatePrescription(row.set_number, {
                          rpe: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </td>
                )}
                {slot.enabledProperties.includes('tempo') && (
                  <td className="py-2 pr-3">
                    <input
                      className="w-20 bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: CANVAS.hairline }}
                      value={row.tempo ?? ''}
                      onChange={(e) =>
                        onUpdatePrescription(row.set_number, { tempo: e.target.value || null })
                      }
                    />
                  </td>
                )}
                {slot.enabledProperties.includes('rest_after_exercise') && rowIndex === 0 && (
                  <td className="py-2 pr-3 align-top" rowSpan={slot.prescriptions.length}>
                    <input
                      type="number"
                      min={0}
                      className="w-14 bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: CANVAS.hairline }}
                      value={slot.rest_seconds ?? ''}
                      onChange={(e) =>
                        onUpdateSlot({
                          rest_seconds: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </td>
                )}
                {slot.technique === 'cluster' && (
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className="w-14 bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: CANVAS.hairline }}
                      value={slot.reps_per_cluster ?? ''}
                      onChange={(e) =>
                        onUpdateSlot({
                          reps_per_cluster: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </td>
                )}
                {slot.technique === 'cluster' && (
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className="w-14 bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: CANVAS.hairline }}
                      value={slot.clusters_per_set ?? ''}
                      onChange={(e) =>
                        onUpdateSlot({
                          clusters_per_set: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </td>
                )}
                {slot.technique === 'rest_pause' && (
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className="w-14 bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: CANVAS.hairline }}
                      value={slot.rest_pause_seconds ?? ''}
                      onChange={(e) =>
                        onUpdateSlot({
                          rest_pause_seconds: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </td>
                )}
                {slot.technique === 'rest_pause' && (
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className="w-14 bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: CANVAS.hairline }}
                      value={slot.max_rest_pauses ?? ''}
                      onChange={(e) =>
                        onUpdateSlot({
                          max_rest_pauses: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </td>
                )}
                {slot.technique === 'drop_set' && (
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className="w-14 bg-transparent border-b outline-none font-mono"
                      style={{ borderColor: CANVAS.hairline }}
                      value={slot.drop_percentage ?? ''}
                      onChange={(e) =>
                        onUpdateSlot({
                          drop_percentage: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </td>
                )}
                {canAddSet && slot.prescriptions.length > 1 && (
                  <td className="py-2">
                    <button
                      type="button"
                      aria-label="Remove set"
                      onClick={() => onRemoveSet(row.set_number)}
                      style={{ color: CANVAS.muted }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        {canAddSet && (
          <button type="button" onClick={onAddSet} className="text-xs" style={{ color: CANVAS.cyan }}>
            + Add set
          </button>
        )}
        <button
          ref={propertyAnchorRef}
          type="button"
          onClick={() => setPropertyMenuOpen((v) => !v)}
          className="text-xs inline-flex items-center gap-1"
          style={{ color: CANVAS.cyan }}
        >
          + Add property <ChevronDown className="w-3 h-3" />
        </button>
        <CanvasFloatingMenu
          open={propertyMenuOpen}
          anchorRef={propertyAnchorRef}
          onClose={() => setPropertyMenuOpen(false)}
          minWidth={220}
        >
          <CanvasMenuSection label="Prescription" />
          {PRESCRIPTION_PROPERTIES.map((property) => (
            <CanvasMenuItem
              key={property}
              active={slot.enabledProperties.includes(property)}
              onClick={() => handlePropertyClick(property)}
            >
              {propertyLabel(property)}
            </CanvasMenuItem>
          ))}
          <CanvasMenuSection label="Technique" />
          {TECHNIQUE_PROPERTIES.map((property) => (
            <CanvasMenuItem
              key={property}
              active={slot.enabledProperties.includes(property)}
              onClick={() => handlePropertyClick(property)}
            >
              {propertyLabel(property)}
            </CanvasMenuItem>
          ))}
        </CanvasFloatingMenu>
      </div>
    </div>
  )
}

export { PrescriptionTable }
