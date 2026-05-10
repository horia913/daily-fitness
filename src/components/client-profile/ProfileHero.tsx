import { Camera, Calendar } from 'lucide-react'
import styles from './clientProfileV1.module.css'

function initials(first: string, last: string, fallback: string): string {
  const a = first.trim().charAt(0)
  const b = last.trim().charAt(0)
  if (a && b) return (a + b).toUpperCase()
  if (a) return a.toUpperCase()
  if (b) return b.toUpperCase()
  const f = fallback.trim().charAt(0)
  return f ? f.toUpperCase() : '?'
}

export type CoachingPillState = 'active' | 'paused' | 'ended'

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
        <h1 className={styles.heroName}>{displayName}</h1>
        <p className={styles.heroEmail}>{displayEmail}</p>
        <div className={styles.pills}>
          {memberSinceLabel && (
            <span className={`${styles.pill} ${styles.pillCyan}`}>
              <Calendar size={9} strokeWidth={2} aria-hidden />
              Member since {memberSinceLabel}
            </span>
          )}
          {coachingState === 'active' && (
            <span className={`${styles.pill} ${styles.pillGood}`}>
              <span className={styles.pillDot} aria-hidden />
              Active
            </span>
          )}
          {coachingState === 'paused' && (
            <span className={`${styles.pill} ${styles.pillWarn}`}>
              <span className={styles.pillDot} aria-hidden />
              Paused
            </span>
          )}
          {coachingState === 'ended' && (
            <span className={`${styles.pill} ${styles.pillMuted}`}>
              <span className={styles.pillDot} aria-hidden />
              Ended
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
