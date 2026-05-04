"use client";

import React from "react";
import { Camera } from "lucide-react";
import styles from "./ProfilePhotoCard.module.css";

type AvatarVariant = "cyan" | "lime" | "purple";

type Props = {
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string | null;
  avatarVariant?: AvatarVariant;
  onEditPhoto?: () => void;
};

export default function ProfilePhotoCard({
  name,
  email,
  initials,
  avatarUrl,
  avatarVariant = "cyan",
  onEditPhoto,
}: Props) {
  const avClass =
    avatarVariant === "lime"
      ? styles.avatarLime
      : avatarVariant === "purple"
        ? styles.avatarPurple
        : styles.avatarCyan;

  return (
    <div className={styles.card}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className={styles.imgRound} />
      ) : (
        <div className={`${styles.avatar} ${avClass}`.trim()} aria-hidden>
          {initials}
        </div>
      )}
      <div className={styles.meta}>
        <p className={styles.name}>{name}</p>
        <p className={styles.email}>{email || "No email on file"}</p>
      </div>
      {onEditPhoto ? (
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Edit photo or profile"
          onClick={onEditPhoto}
        >
          <Camera className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
