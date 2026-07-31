'use client'

/**
 * /create-user — thin client wrapper around the canonical signup API.
 * Invite validation, consumption, and coach linking live only in POST /api/auth/signup.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  UserPlus,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface Coach {
  id: string
  first_name?: string
  last_name?: string
}

export default function CreateUserPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [assignedCoachId, setAssignedCoachId] = useState('')
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error: fetchErr } = await supabase
        .from('coaches_public')
        .select('coach_id, first_name, last_name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('last_name', { ascending: true })
      if (cancelled || fetchErr) return
      setCoaches(
        (data || []).map((c) => ({
          id: c.coach_id,
          first_name: c.first_name,
          last_name: c.last_name,
        })),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const createUser = async () => {
    setError('')
    setSuccess('')
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required')
      return
    }
    if (!email.trim() || !password) {
      setError('Email and password are required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!inviteCode.trim()) {
      setError('Invite code is required')
      return
    }
    if (!assignedCoachId) {
      setError('Please select a coach')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          inviteCode: inviteCode.trim(),
          selectedCoachId: assignedCoachId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof payload?.error === 'string'
            ? payload.error
            : 'Signup failed. Please try again.',
        )
      }
      setSuccess('Account created. Check email to confirm if required, then sign in.')
      setFirstName('')
      setLastName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setInviteCode('')
      setAssignedCoachId('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--fc-bg-deep)] px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--fc-text-dim)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>

        <Card variant="fc">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" aria-hidden />
              Create client account
            </CardTitle>
            <CardDescription>
              Uses the same invite validation and coach linking as the main signup flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? <ErrorBanner message={error} /> : null}
            {success ? (
              <div className="flex items-start gap-2 rounded-lg border border-[color:var(--fc-status-success)]/30 bg-[color:color-mix(in_srgb,var(--fc-status-success)_12%,transparent)] p-3 text-sm text-[color:var(--fc-status-success)]">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {success}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-60"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inviteCode">Invite code</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Coach</Label>
              <Select value={assignedCoachId} onValueChange={setAssignedCoachId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Coach'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={loading}
              onClick={() => void createUser()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" aria-hidden />
                  Create client
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
