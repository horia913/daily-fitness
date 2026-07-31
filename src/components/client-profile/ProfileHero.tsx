import { Camera, Calendar } from 'lucide-react'
import styles from './clientProfileV1.module.css'
import {
  CoachingStatusPill,
  type CoachingPillState,
} from './CoachingStatusPill'

export type { CoachingPillState }

function initials(first: string, last: string, fallback: string): string {
  const a = first.trim().charAt(0)
  const b = last.trim().charAt(0)
  if (a && b) return (a + b).toUpperCase()
  if (a) return a.toUpperCase()
  if (b) return b.toUpperCase()
  const f = fallback.trim().charAt(0)
  return f ? f.toUpperCase() : '?'
}

export function ProfileHero({
  avatarUrl,
  avatarUrlKey,
  firstName,
  lastName,
  displayEmail,
  memberSinceLabel,
  coachingState,
  canEdit,
  uploadingImage,
  onPhotoChange,
}: {
  avatarUrl: string | null
  avatarUrlKey: number
  firstName: string
  lastName: string
  displayEmail: string
  memberSinceLabel: string | null
  coachingState?: CoachingPillState | null
  canEdit: boolean
  uploadingImage: boolean
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    displayEmail.split('@')[0] ||
    'Profile'

  const ini = initials(firstName, lastName, displayEmail)

  return (
    <div className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {avatarUrl ? (
              <img
                key={`${avatarUrl}-${avatarUrlKey}`}
                src={`${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${avatarUrlKey || 0}`}
                alt=""
              />
            ) : (
              <span className={styles.avatarInitials}>{ini}</span>
            )}
          </div>
          {canEdit && (
            <label className={styles.avatarEdit} title="Change photo">
              <Camera size={13} strokeWidth={2} aria-hidden />
              <input
                type="file"
                accept="image/*"
                onChange={onPhotoChange}
                disabled={uploadingImage}
              />
            </label>
          )}
        </div>
        <div className={styles.heroMeta}>
          <h2 className={styles.heroName}>{displayName}</h2>
          <p className={styles.heroEmail}>{displayEmail}</p>
          <div className={styles.pills}>
            {memberSinceLabel && (
              <span className={`${styles.pill} ${styles.pillCyan}`}>
                <Calendar size={9} strokeWidth={2} aria-hidden />
                Since {memberSinceLabel}
              </span>
            )}
            {coachingState ? <CoachingStatusPill state={coachingState} /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
