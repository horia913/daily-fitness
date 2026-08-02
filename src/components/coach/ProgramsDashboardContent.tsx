"use client";

import React, { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Plus,
  X,
  Eye,
  UserPlus,
  Edit,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import WorkoutTemplateService from "@/lib/workoutTemplateService";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useToast } from "@/components/ui/toast-provider";
import {
  COACH_PROGRAMS_LIST_QUERY_KEY,
  fetchCoachProgramsList,
  type CoachProgramListRow,
} from "@/lib/coachProgramsList";
import {
  CollectionCard,
  CollectionCardAssignedStat,
  CollectionCardIconAction,
  CollectionCardMetaChip,
  CollectionCardMetaSep,
  CollectionCardMetaText,
  CollectionCardMetaValue,
  CollectionCardStack,
} from "@/components/ui/CollectionCard";
import { mapProgramBlocksToStructureSegments } from "@/lib/programs/mapProgramBlockPhaseSegments";
import {
  avatarHueByIndex,
  formatDifficultyLevel,
  formatPeriodizationListLabel,
  programCollectionHue,
} from "@/lib/programs/programListDisplayUtils";
import {
  normalizeClientTimezone,
  zonedCalendarDateString,
} from "@/lib/clientZonedCalendar";
import styles from "@/components/coach/programs/coachProgramsWorkspace.module.css";

/** YYYY-MM-DD "today" in an IANA zone (falls back to UTC). */
function todayYmdForTimezone(tz: string | null | undefined): string {
  return zonedCalendarDateString(new Date(), normalizeClientTimezone(tz));
}

type Program = CoachProgramListRow & {
  difficulty_level: "beginner" | "intermediate" | "advanced" | "athlete";
  totalWeeks: number;
  is_active: boolean;
};

function asDashboardProgram(row: CoachProgramListRow): Program {
  const level = row.difficulty_level;
  const difficulty_level =
    level === "beginner" ||
    level === "intermediate" ||
    level === "advanced" ||
    level === "athlete"
      ? level
      : "intermediate";
  return {
    ...row,
    difficulty_level,
    totalWeeks: row.totalWeeks ?? 0,
    is_active: row.is_active !== false,
  };
}

export default function ProgramsDashboardContent() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [programFilter, setProgramFilter] = useState<"active" | "all">("active");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [confirmImpact, setConfirmImpact] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignProgramId, setAssignProgramId] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [replaceConfirmList, setReplaceConfirmList] = useState<
    { client_id: string; program_name: string }[]
  >([]);
  const [assignStartDate, setAssignStartDate] = useState<string>(() =>
    todayYmdForTimezone(profile?.timezone),
  );
  const [assignNotes, setAssignNotes] = useState<string>("");
  const [assignProgressionMode, setAssignProgressionMode] = useState<
    "auto" | "coach_managed"
  >("coach_managed");
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");

  const coachId = user?.id || "";

  const programsQuery = useQuery({
    queryKey: COACH_PROGRAMS_LIST_QUERY_KEY,
    queryFn: ({ signal }) => fetchCoachProgramsList(signal),
    enabled: !!user,
  });

  const allPrograms = useMemo(
    () => (programsQuery.data?.programs ?? []).map(asDashboardProgram),
    [programsQuery.data?.programs],
  );
  const assignmentCountByProgram =
    programsQuery.data?.assignmentCountByProgram ?? {};
  const programs =
    programFilter === "active"
      ? allPrograms.filter((p) => p.is_active)
      : allPrograms;
  const loading = programsQuery.isLoading;
  const error = programsQuery.isError
    ? programsQuery.error instanceof Error
      ? programsQuery.error.message
      : "Unknown error loading programs"
    : null;

  const invalidateProgramsList = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: COACH_PROGRAMS_LIST_QUERY_KEY,
    });
  }, [queryClient]);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const query = clientSearchQuery.toLowerCase();
    return clients.filter((c) => {
      const firstName = c.profiles?.first_name?.toLowerCase() || "";
      const lastName = c.profiles?.last_name?.toLowerCase() || "";
      const email = c.profiles?.email?.toLowerCase() || "";
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        email.includes(query)
      );
    });
  }, [clients, clientSearchQuery]);

  const openAssignModal = useCallback(
    async (programId: string) => {
      setAssignProgramId(programId);
      setSelectedClients([]);
      setAssignNotes("");
      setAssignStartDate(todayYmdForTimezone(profile?.timezone));
      setClientSearchQuery("");
      setShowAssignModal(true);
      try {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .eq("coach_id", coachId)
          .eq("status", "active");

        if (clientsError) throw clientsError;

        if (clientsData && clientsData.length > 0) {
          const profileIds = clientsData
            .map((c) => c.client_id)
            .filter(Boolean);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, email, timezone")
            .in("id", profileIds);

          const merged = clientsData.map((client) => ({
            ...client,
            profiles:
              profilesData?.find((p) => p.id === client.client_id) || null,
          }));
          setClients(merged);
        } else {
          setClients([]);
        }
      } catch (error) {
        console.error("Error loading clients:", error);
        setClients([]);
      }
    },
    [coachId, profile?.timezone],
  );

  const clientLabel = useCallback(
    (clientId: string) => {
      const row = clients.find((c) => c.client_id === clientId);
      const p = row?.profiles;
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
      if (name) return name;
      if (p?.email) return String(p.email);
      return clientId.slice(0, 8) + "…";
    },
    [clients],
  );

  const doAssignAndClose = useCallback(async () => {
    if (!assignProgramId || selectedClients.length === 0) return;
    try {
      const { successful, failed } =
        await WorkoutTemplateService.assignProgramToClients(
          assignProgramId,
          selectedClients,
          coachId,
          assignStartDate,
          assignNotes,
          assignProgressionMode,
        );

      await invalidateProgramsList();
      // Assign changes client training + briefing signals for those clients.
      await Promise.all(
        selectedClients.flatMap((clientId) => [
          queryClient.invalidateQueries({
            queryKey: ["coach-client", clientId, "training"],
          }),
          queryClient.invalidateQueries({
            queryKey: ["coach-client", clientId, "summary"],
          }),
        ]),
      );
      await queryClient.invalidateQueries({
        queryKey: ["coach-clients", user?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["coach-home-triage", user?.id],
      });

      if (failed.length > 0) {
        const failLines = failed.map(
          (f) =>
            `${clientLabel(f.clientId)}: ${f.stage} — ${f.error}${
              f.orphanedAssignmentId
                ? ` (orphan id ${f.orphanedAssignmentId})`
                : ""
            }`,
        );
        if (successful.length > 0) {
          const okNames = successful
            .map((s) => clientLabel(s.clientId))
            .join(", ");
          addToast({
            title: `Assigned ${successful.length} client(s); ${failed.length} failed`,
            description: `Succeeded: ${okNames}.\nFailed:\n${failLines.join("\n")}`,
            variant: "destructive",
          });
        } else {
          addToast({
            title: `Assignment failed for ${failed.length} client(s)`,
            description: failLines.join("\n"),
            variant: "destructive",
          });
        }
        setShowReplaceConfirm(false);
        setReplaceConfirmList([]);
        return;
      }

      setShowAssignModal(false);
      setShowReplaceConfirm(false);
      setReplaceConfirmList([]);
      setClientSearchQuery("");
      setSelectedClients([]);
      addToast({
        title:
          successful.length === 1
            ? "Program assigned."
            : `Program assigned to ${successful.length} clients.`,
      });
    } catch (error) {
      console.error("Error assigning program:", error);
      addToast({
        title: "Error assigning program. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    assignProgramId,
    selectedClients,
    coachId,
    assignStartDate,
    assignNotes,
    assignProgressionMode,
    invalidateProgramsList,
    queryClient,
    user?.id,
    addToast,
    clientLabel,
  ]);

  const submitAssign = useCallback(async () => {
    if (!assignProgramId || selectedClients.length === 0) return;
    const withActive =
      await WorkoutTemplateService.getClientsWithActiveProgram(selectedClients);
    if (withActive.length > 0) {
      setReplaceConfirmList(withActive);
      setShowReplaceConfirm(true);
      return;
    }
    await doAssignAndClose();
  }, [assignProgramId, selectedClients, doAssignAndClose]);

  const handleDelete = useCallback(async () => {
    if (!programToDelete || !confirmImpact) return;
    try {
      await WorkoutTemplateService.deleteProgram(programToDelete.id);
      await invalidateProgramsList();
      // Deleted program can drop assignment signals on the clients list + briefing.
      await queryClient.invalidateQueries({
        queryKey: ["coach-clients", user?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["coach-home-triage", user?.id],
      });
      setShowDeleteModal(false);
      setProgramToDelete(null);
      setConfirmImpact(false);
    } catch (error) {
      console.error("Error deleting program:", error);
      addToast({
        title: "Couldn't delete program. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    programToDelete,
    confirmImpact,
    invalidateProgramsList,
    queryClient,
    user?.id,
    addToast,
  ]);

  const totalPrograms = programs.length;
  const activePrograms = programs.filter((p) => p.is_active).length;
  const totalAssignments = programs.reduce((sum, p) => {
    return (
      sum +
      (p.assignedPreview?.count ?? assignmentCountByProgram[p.id] ?? 0)
    );
  }, 0);

  if (!coachId) {
    return (
      <div className={styles.page}>
        <p className={styles.modalCopy}>Please sign in to view programs.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Link href="/coach" className={styles.back}>
          <ArrowLeft className="h-3 w-3 shrink-0" />
          Dashboard
        </Link>
        <div className={styles.stackGap}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={styles.cardSkeleton} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.page}>
        <Link href="/coach" className={styles.back}>
          <ArrowLeft className="h-3 w-3 shrink-0" />
          Dashboard
        </Link>

        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.h1}>Training Programs</h1>
            {programs.length > 0 && !error ? (
              <p className={styles.sub}>
                {totalPrograms} program{totalPrograms !== 1 ? "s" : ""} ·{" "}
                {activePrograms} active · {totalAssignments} assignment
                {totalAssignments !== 1 ? "s" : ""}
              </p>
            ) : null}
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => void programsQuery.refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link href="/coach/programs/create" className={styles.primaryCta}>
              <Plus className="h-4 w-4" />
              Create program
            </Link>
          </div>
        </div>

        {error ? (
          <ErrorBanner
            title="Couldn't load programs"
            message="Please check your connection and try again."
            onRetry={() => void programsQuery.refetch()}
          />
        ) : null}

        <div className={styles.filterRow}>
          <button
            type="button"
            className={`${styles.chip} ${
              programFilter === "active" ? styles.chipOn : styles.chipOff
            }`}
            onClick={() => setProgramFilter("active")}
          >
            Active
          </button>
          <button
            type="button"
            className={`${styles.chip} ${
              programFilter === "all" ? styles.chipOn : styles.chipOff
            }`}
            onClick={() => setProgramFilter("all")}
          >
            All
          </button>
        </div>

        {programs.length > 0 && !error ? (
          <CollectionCardStack>
            {programs.map((program) => {
              const blocks = program.blocks ?? [];
              const structure =
                blocks.length > 1
                  ? mapProgramBlocksToStructureSegments(blocks)
                  : undefined;
              const preview = program.assignedPreview;
              const assignCount =
                preview?.count ??
                assignmentCountByProgram[program.id] ??
                0;
              const periodizationLabel = formatPeriodizationListLabel(
                program.periodization_style,
              );
              const hue = programCollectionHue(program.id);

              return (
                <CollectionCard
                  key={program.id}
                  hue={hue}
                  name={program.name}
                  status={program.is_active ? "active" : "inactive"}
                  meta={
                    <>
                      <CollectionCardMetaChip>
                        {formatDifficultyLevel(program.difficulty_level)}
                      </CollectionCardMetaChip>
                      <CollectionCardMetaSep />
                      <CollectionCardMetaText>
                        <CollectionCardMetaValue>
                          {program.totalWeeks > 0 ? program.totalWeeks : "—"}
                        </CollectionCardMetaValue>{" "}
                        wks
                      </CollectionCardMetaText>
                      {periodizationLabel ? (
                        <>
                          <CollectionCardMetaSep />
                          <CollectionCardMetaText>
                            {periodizationLabel}
                          </CollectionCardMetaText>
                        </>
                      ) : null}
                    </>
                  }
                  structure={structure}
                  rightStat={
                    <CollectionCardAssignedStat
                      count={assignCount}
                      avatars={
                        assignCount > 0 && preview?.initials?.length
                          ? preview.initials.slice(0, 3).map((initials, i) => ({
                              initials,
                              background: avatarHueByIndex(i),
                            }))
                          : undefined
                      }
                    />
                  }
                  actions={
                    <>
                      <CollectionCardIconAction
                        icon={<Eye className="h-[15px] w-[15px]" />}
                        label="View program"
                        onClick={() =>
                          router.push(`/coach/programs/${program.id}`)
                        }
                      />
                      <CollectionCardIconAction
                        icon={<UserPlus className="h-[15px] w-[15px]" />}
                        label="Assign program"
                        onClick={() => openAssignModal(program.id)}
                      />
                      <CollectionCardIconAction
                        icon={<Edit className="h-[15px] w-[15px]" />}
                        label="Edit program"
                        onClick={() =>
                          router.push(`/coach/programs/${program.id}/edit`)
                        }
                      />
                      <CollectionCardIconAction
                        icon={<Trash2 className="h-[15px] w-[15px]" />}
                        label="Delete program"
                        variant="danger"
                        onClick={() => {
                          setProgramToDelete(program);
                          setConfirmImpact(false);
                          setShowDeleteModal(true);
                        }}
                      />
                    </>
                  }
                />
              );
            })}
          </CollectionCardStack>
        ) : null}

        {programs.length === 0 && !error && !loading ? (
          <>
            <p className={styles.emptyLine}>No programs yet.</p>
            <div className={styles.emptyActions}>
              <Link href="/coach/programs/create" className={styles.primaryCta}>
                <Plus className="h-4 w-4" />
                Create program
              </Link>
            </div>
          </>
        ) : null}
      </div>

      {showAssignModal ? (
        <div className={styles.modalScrim}>
          <div className={`${styles.modalPanel} ${styles.modalPanelWide}`}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>Assign Program</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => {
                  setShowAssignModal(false);
                  setClientSearchQuery("");
                  setSelectedClients([]);
                }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className={`${styles.modalBody} ${styles.modalBodyWide}`}>
              <label className={styles.fieldLabel} htmlFor="client-search">
                Search Clients
              </label>
              <input
                id="client-search"
                type="text"
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                placeholder="Search by name or email"
                className={styles.fieldInput}
              />

              <div style={{ marginTop: 16 }}>
                {filteredClients.map((client) => (
                  <label key={client.id} className={styles.clientRow}>
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.client_id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selectedClients, client.client_id]
                          : selectedClients.filter(
                              (id) => id !== client.client_id,
                            );
                        setSelectedClients(next);
                        // Default start date: single client → their TZ today; else coach TZ.
                        if (next.length === 1) {
                          const row = clients.find(
                            (c) => c.client_id === next[0],
                          );
                          const clientTz = (
                            row?.profiles as { timezone?: string | null } | null
                          )?.timezone;
                          setAssignStartDate(
                            todayYmdForTimezone(
                              clientTz || profile?.timezone,
                            ),
                          );
                        } else {
                          setAssignStartDate(
                            todayYmdForTimezone(profile?.timezone),
                          );
                        }
                      }}
                    />
                    <span className={styles.clientName}>
                      {client.profiles?.first_name} {client.profiles?.last_name}
                    </span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                <label className={styles.fieldLabel} htmlFor="assign-start">
                  Start Date
                </label>
                <input
                  id="assign-start"
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className={styles.fieldInput}
                />
              </div>

              <div style={{ marginTop: 20 }}>
                <label className={styles.fieldLabel} htmlFor="assign-notes">
                  Notes (Optional)
                </label>
                <textarea
                  id="assign-notes"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Add any notes for the client"
                  rows={3}
                  className={`${styles.fieldInput} ${styles.fieldTextarea}`}
                />
              </div>

              <div style={{ marginTop: 20 }}>
                <span className={styles.fieldLabel}>Progression Mode</span>
                <label
                  className={`${styles.progressionOption} ${
                    assignProgressionMode === "coach_managed"
                      ? styles.progressionOptionSelected
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="progressionMode"
                    checked={assignProgressionMode === "coach_managed"}
                    onChange={() => setAssignProgressionMode("coach_managed")}
                  />
                  <div>
                    <p className={styles.progressionTitle}>Coach-managed</p>
                    <p className={styles.progressionHint}>
                      You review and advance weekly
                    </p>
                  </div>
                </label>
                <label
                  className={`${styles.progressionOption} ${
                    assignProgressionMode === "auto"
                      ? styles.progressionOptionSelected
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="progressionMode"
                    checked={assignProgressionMode === "auto"}
                    onChange={() => setAssignProgressionMode("auto")}
                  />
                  <div>
                    <p className={styles.progressionTitle}>Automatic</p>
                    <p className={styles.progressionHint}>
                      Weeks unlock when completed
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className={styles.modalFoot}>
              <button
                type="button"
                className={styles.modalGhostBtn}
                onClick={() => {
                  setShowAssignModal(false);
                  setClientSearchQuery("");
                  setSelectedClients([]);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalPrimaryBtn}
                onClick={submitAssign}
                disabled={selectedClients.length === 0}
              >
                Assign to {selectedClients.length} client
                {selectedClients.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showReplaceConfirm && replaceConfirmList.length > 0 ? (
        <div className={`${styles.modalScrim} ${styles.modalScrimTop}`}>
          <div className={styles.modalPanel}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>Replace active program?</h2>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalCopy}>
                {replaceConfirmList.length === 1 && selectedClients.length === 1
                  ? `This client currently has an active program: "${replaceConfirmList[0].program_name}". Assigning a new program will deactivate it. Continue?`
                  : `${replaceConfirmList.length} of ${selectedClients.length} selected client(s) have an active program. Assigning will deactivate those programs. Continue?`}
              </p>
            </div>
            <div className={styles.modalFoot}>
              <button
                type="button"
                className={styles.modalGhostBtn}
                onClick={() => {
                  setShowReplaceConfirm(false);
                  setReplaceConfirmList([]);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalPrimaryBtn}
                onClick={() => doAssignAndClose()}
              >
                Replace Program
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteModal && programToDelete ? (
        <div className={styles.modalScrim}>
          <div className={styles.modalPanel}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>Delete Program?</h2>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalCopy}>
                Are you sure you want to delete &quot;{programToDelete.name}
                &quot;? This action cannot be undone.
              </p>
              <label className={styles.confirmCheck}>
                <input
                  type="checkbox"
                  checked={confirmImpact}
                  onChange={(e) => setConfirmImpact(e.target.checked)}
                />
                I understand this will affect assigned clients
              </label>
            </div>
            <div className={styles.modalFoot}>
              <button
                type="button"
                className={styles.modalGhostBtn}
                onClick={() => {
                  setShowDeleteModal(false);
                  setProgramToDelete(null);
                  setConfirmImpact(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.modalPrimaryBtn} ${styles.modalDangerBtn}`}
                onClick={handleDelete}
                disabled={!confirmImpact}
              >
                Delete Program
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
