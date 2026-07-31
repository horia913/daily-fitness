"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

const MIN_NEW_PASSWORD_LENGTH = 6;

function isInvalidCredentialsError(error: unknown): boolean {
  const message = String(
    (error as { message?: string })?.message || "",
  ).toLowerCase();
  return (
    message.includes("invalid login credentials") ||
    message.includes("invalid_credentials") ||
    message.includes("invalid email or password")
  );
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const reset = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordError("");
    setPasswordSuccess(false);
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess(false);

    if (!passwordData.currentPassword) {
      setPasswordError("Current password is required");
      return;
    }

    if (passwordData.newPassword.length < MIN_NEW_PASSWORD_LENGTH) {
      setPasswordError(
        `Password must be at least ${MIN_NEW_PASSWORD_LENGTH} characters`,
      );
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      setChangingPassword(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      const email = user?.email?.trim().toLowerCase();
      if (userError || !email) {
        setPasswordError("Could not verify your account. Please try again.");
        return;
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: passwordData.currentPassword,
      });

      if (verifyError) {
        if (isInvalidCredentialsError(verifyError)) {
          setPasswordError("Current password is incorrect");
        } else {
          setPasswordError("Could not verify current password. Please try again.");
        }
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) {
        setPasswordError("Could not change password. Please try again.");
        return;
      }

      setPasswordSuccess(true);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        handleOpenChange(false);
      }, 2000);
    } catch {
      setPasswordError("Could not change password. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md border border-[color:var(--fc-glass-border)]">
        <DialogHeader>
          <DialogTitle className="fc-text-primary">Change password</DialogTitle>
        </DialogHeader>

        {passwordSuccess ? (
          <div className="text-center py-6">
            <CheckCircle
              className="w-14 h-14 mx-auto mb-3 fc-text-success"
              aria-hidden
            />
            <p className="text-base font-semibold fc-text-success">
              Password changed successfully!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="currentPassword" className="text-xs fc-text-dim">
                Current password
              </Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                className="mt-1 h-11 rounded-lg"
              />
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-xs fc-text-dim">
                New password
              </Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Enter new password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                className="mt-1 h-11 rounded-lg"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-xs fc-text-dim">
                Confirm new password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className="mt-1 h-11 rounded-lg"
              />
            </div>

            {passwordError ? (
              <div className="p-2.5 rounded-lg border border-[color-mix(in_srgb,var(--fc-status-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-error)_12%,transparent)] fc-text-error text-sm">
                {passwordError}
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-lg sm:flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 rounded-lg fc-btn fc-btn-primary sm:flex-1"
                onClick={() => void handlePasswordChange()}
                disabled={changingPassword}
              >
                {changingPassword ? "Changing…" : "Change password"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
