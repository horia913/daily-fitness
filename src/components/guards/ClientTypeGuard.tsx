"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

interface ClientTypeGuardProps {
  children: React.ReactNode;
  requiredType: 'in_gym' | 'online';
  fallbackPath?: string;
  showMessage?: boolean;
}

/**
 * ClientTypeGuard Component
 * Gates features based on client_type (in_gym vs online)
 * Used to hide gym-specific features from online clients
 */
export function ClientTypeGuard({ 
  children, 
  requiredType, 
  fallbackPath = '/client',
  showMessage = true 
}: ClientTypeGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      router.push('/');
      return;
    }

    // Check if client has required type
    const clientType = profile.client_type || 'online'; // default to online if not set
    const hasAccess = clientType === requiredType;

    if (!hasAccess) {
      if (!showMessage) {
        router.push(fallbackPath);
        return;
      }
      setIsAuthorized(false);
    } else {
      setIsAuthorized(true);
    }
  }, [profile, loading, requiredType, fallbackPath, showMessage, router]);

  // Show loading state
  if (loading || isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied message if not authorized
  if (!isAuthorized && showMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Feature Not Available
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            {requiredType === 'in_gym' 
              ? 'This feature is only available for in-gym clients. Contact your coach if you need access to gym sessions.'
              : 'This feature is only available for online clients.'}
          </p>
          <button
            onClick={() => router.push(fallbackPath)}
            className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render children if authorized
  return isAuthorized ? <>{children}</> : null;
}

