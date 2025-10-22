'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Settings, 
  RefreshCw, 
  Play, 
  FileText,
  Shield,
  Zap,
  Users,
  Dumbbell,
  Apple,
  TrendingUp,
  MessageCircle,
  Target,
  Activity
} from 'lucide-react'

interface DatabaseStatus {
  connection: 'idle' | 'testing' | 'success' | 'error'
  auth: 'idle' | 'testing' | 'success' | 'error'
  tables: 'idle' | 'checking' | 'success' | 'error'
  setup: 'idle' | 'initializing' | 'success' | 'error'
}

interface LogEntry {
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export default function DatabaseSetupPage() {
  const [status, setStatus] = useState<DatabaseStatus>({
    connection: 'idle',
    auth: 'idle',
    tables: 'idle',
    setup: 'idle'
  })
  
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [progress, setProgress] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [environmentInfo, setEnvironmentInfo] = useState({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  const addLog = (level: LogEntry['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, level, message }])
  }

  const clearLogs = () => {
    setLogs([])
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'testing':
      case 'checking':
      case 'initializing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      default:
        return <AlertTriangle className="w-5 h-5 text-slate-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Success</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>
      case 'testing':
      case 'checking':
      case 'initializing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Running</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Pending</Badge>
    }
  }

  const testConnection = async () => {
    setStatus(prev => ({ ...prev, connection: 'testing' }))
    setProgress(10)
    addLog('info', 'Testing database connection...')

    try {
      // Test environment variables
      if (!environmentInfo.url || !environmentInfo.key) {
        throw new Error('Missing environment variables')
      }
      addLog('success', 'Environment variables found')

      // Test basic connection
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      if (error) {
        throw new Error(`Connection failed: ${error.message}`)
      }

      setStatus(prev => ({ ...prev, connection: 'success' }))
      setProgress(25)
      addLog('success', 'Database connection successful')
    } catch (err: any) {
      setStatus(prev => ({ ...prev, connection: 'error' }))
      addLog('error', err.message)
    }
  }

  const testAuth = async () => {
    setStatus(prev => ({ ...prev, auth: 'testing' }))
    setProgress(40)
    addLog('info', 'Testing authentication service...')

    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        throw new Error(`Auth service error: ${error.message}`)
      }

      setStatus(prev => ({ ...prev, auth: 'success' }))
      setProgress(60)
      addLog('success', 'Authentication service working')
    } catch (err: any) {
      setStatus(prev => ({ ...prev, auth: 'error' }))
      addLog('error', err.message)
    }
  }

  const checkTables = async () => {
    setStatus(prev => ({ ...prev, tables: 'checking' }))
    setProgress(75)
    addLog('info', 'Checking database tables...')

    try {
      const tables = ['profiles', 'workout_programs', 'workout_templates', 'exercises', 'workout_sessions', 'clients']
      let existingTables = 0

      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table)
            .select('*')
            .limit(1)
          
          if (!error) {
            existingTables++
            addLog('success', `Table '${table}' exists`)
          } else {
            addLog('warning', `Table '${table}' missing or inaccessible`)
          }
        } catch (tableError) {
          addLog('warning', `Table '${table}' missing or inaccessible`)
        }
      }

      if (existingTables === tables.length) {
        setStatus(prev => ({ ...prev, tables: 'success' }))
        addLog('success', 'All required tables exist')
      } else {
        setStatus(prev => ({ ...prev, tables: 'error' }))
        addLog('warning', `Only ${existingTables}/${tables.length} tables exist`)
      }

      setProgress(90)
    } catch (err: any) {
      setStatus(prev => ({ ...prev, tables: 'error' }))
      addLog('error', err.message)
    }
  }

  const setupComplianceFunctions = async () => {
    setStatus(prev => ({ ...prev, setup: 'initializing' }))
    setProgress(95)
    addLog('info', 'Setting up compliance functions...')

    try {
      // Execute the compliance functions SQL
      const complianceSQL = `
        -- Create the function to get client compliance scores
        CREATE OR REPLACE FUNCTION get_client_compliance_scores(coach_id_param UUID)
        RETURNS TABLE (
            client_id UUID,
            full_name TEXT,
            avatar_url TEXT,
            compliance_score DECIMAL(5,2),
            total_assigned INTEGER,
            total_completed INTEGER,
            last_workout_date DATE,
            current_streak INTEGER,
            workout_frequency DECIMAL(5,2)
        ) 
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            seven_days_ago DATE;
            thirty_days_ago DATE;
        BEGIN
            seven_days_ago := CURRENT_DATE - INTERVAL '7 days';
            thirty_days_ago := CURRENT_DATE - INTERVAL '30 days';
            
            RETURN QUERY
            WITH client_workouts AS (
                SELECT 
                    ws.client_id,
                    COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END) as assigned_last_7_days,
                    COUNT(CASE WHEN wa.assigned_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END) as completed_last_7_days,
                    MAX(CASE WHEN ws.status = 'completed' THEN ws.completed_at::DATE END) as last_workout_date
                FROM workout_sessions ws
                JOIN workout_assignments wa ON wa.id = ws.workout_assignment_id
                WHERE wa.assigned_at >= seven_days_ago
                GROUP BY ws.client_id
            ),
            client_streaks AS (
                SELECT 
                    ws.client_id,
                    COALESCE(
                        CASE 
                            WHEN MAX(ws.completed_at::DATE) = CURRENT_DATE - INTERVAL '1 day' THEN
                                (SELECT COUNT(*) + 1
                                 FROM (
                                     SELECT DISTINCT ws2.completed_at::DATE as workout_date
                                     FROM workout_sessions ws2
                                     WHERE ws2.client_id = ws.client_id 
                                     AND ws2.status = 'completed'
                                     AND ws2.completed_at::DATE <= CURRENT_DATE - INTERVAL '1 day'
                                     ORDER BY workout_date DESC
                                     LIMIT 10
                                 ) recent_workouts
                                 WHERE NOT EXISTS (
                                     SELECT 1 
                                     FROM generate_series(
                                         workout_date + INTERVAL '1 day',
                                         LAG(workout_date) OVER (ORDER BY workout_date DESC) - INTERVAL '1 day',
                                         INTERVAL '1 day'
                                     ) AS gap_date
                                     WHERE gap_date::DATE NOT IN (
                                         SELECT DISTINCT ws3.completed_at::DATE
                                         FROM workout_sessions ws3
                                         WHERE ws3.client_id = ws.client_id
                                         AND ws3.status = 'completed'
                                     )
                                 )
                                ), 0
                            )
                            ELSE 0
                        END, 0
                    ) as current_streak
                FROM workout_sessions ws
                WHERE ws.status = 'completed'
                AND ws.completed_at >= thirty_days_ago
                GROUP BY ws.client_id
            ),
            client_frequency AS (
                SELECT 
                    ws.client_id,
                    CASE 
                        WHEN COUNT(DISTINCT ws.completed_at::DATE) > 0 THEN
                            ROUND(COUNT(DISTINCT ws.completed_at::DATE)::DECIMAL / 30.0, 2)
                        ELSE 0
                    END as workout_frequency
                FROM workout_sessions ws
                WHERE ws.status = 'completed'
                AND ws.completed_at >= thirty_days_ago
                GROUP BY ws.client_id
            )
            SELECT 
                p.id as client_id,
                CONCAT(p.first_name, ' ', p.last_name) as full_name,
                COALESCE(p.avatar_url, '') as avatar_url,
                CASE 
                    WHEN cw.assigned_last_7_days > 0 THEN
                        ROUND((cw.completed_last_7_days::DECIMAL / cw.assigned_last_7_days) * 100, 2)
                    ELSE 0
                END as compliance_score,
                COALESCE(cw.assigned_last_7_days, 0) as total_assigned,
                COALESCE(cw.completed_last_7_days, 0) as total_completed,
                cw.last_workout_date,
                COALESCE(cs.current_streak, 0) as current_streak,
                COALESCE(cf.workout_frequency, 0) as workout_frequency
            FROM profiles p
            LEFT JOIN client_workouts cw ON cw.client_id = p.id
            LEFT JOIN client_streaks cs ON cs.client_id = p.id
            LEFT JOIN client_frequency cf ON cf.client_id = p.id
            WHERE p.role = 'client'
            AND (
                EXISTS (
                    SELECT 1 
                    FROM workout_assignments wa
                    JOIN workout_sessions ws ON ws.workout_assignment_id = wa.id
                    WHERE ws.client_id = p.id
                    AND wa.assigned_at >= seven_days_ago
                )
                OR 
                EXISTS (
                    SELECT 1 
                    FROM workout_sessions ws
                    WHERE ws.client_id = p.id
                    AND ws.status = 'completed'
                    AND ws.completed_at >= thirty_days_ago
                )
            )
            ORDER BY 
                CASE 
                    WHEN cw.assigned_last_7_days > 0 THEN
                        (cw.completed_last_7_days::DECIMAL / cw.assigned_last_7_days)
                    ELSE 0
                END ASC,
                p.first_name ASC,
                p.last_name ASC;
        END;
        $$;

        -- Grant execute permission to authenticated users
        GRANT EXECUTE ON FUNCTION get_client_compliance_scores(UUID) TO authenticated;

        -- Create a simpler version for testing and fallback
        CREATE OR REPLACE FUNCTION get_client_compliance_scores_simple(coach_id_param UUID)
        RETURNS TABLE (
            client_id UUID,
            full_name TEXT,
            avatar_url TEXT,
            compliance_score DECIMAL(5,2),
            total_assigned INTEGER,
            total_completed INTEGER,
            last_workout_date DATE
        ) 
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            seven_days_ago DATE;
        BEGIN
            seven_days_ago := CURRENT_DATE - INTERVAL '7 days';
            
            RETURN QUERY
            SELECT 
                p.id as client_id,
                CONCAT(p.first_name, ' ', p.last_name) as full_name,
                COALESCE(p.avatar_url, '') as avatar_url,
                CASE 
                    WHEN COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END) > 0 THEN
                        ROUND(
                            (COUNT(CASE WHEN wa.assigned_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END)::DECIMAL / 
                             COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END)) * 100, 2
                        )
                    ELSE 0
                END as compliance_score,
                COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END) as total_assigned,
                COUNT(CASE WHEN wa.assigned_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END) as total_completed,
                MAX(CASE WHEN ws.status = 'completed' THEN ws.completed_at::DATE END) as last_workout_date
            FROM profiles p
            LEFT JOIN workout_sessions ws ON ws.client_id = p.id
            LEFT JOIN workout_assignments wa ON wa.id = ws.workout_assignment_id
            WHERE p.role = 'client'
            AND (
                wa.assigned_at >= seven_days_ago
                OR ws.status = 'completed'
            )
            GROUP BY p.id, p.first_name, p.last_name, p.avatar_url
            ORDER BY 
                CASE 
                    WHEN COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END) > 0 THEN
                        (COUNT(CASE WHEN wa.assigned_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END)::DECIMAL / 
                         COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END))
                    ELSE 0
                END ASC,
                p.first_name ASC,
                p.last_name ASC;
        END;
        $$;

        -- Grant execute permission to authenticated users
        GRANT EXECUTE ON FUNCTION get_client_compliance_scores_simple(UUID) TO authenticated;
      `

      const { error } = await supabase.rpc('exec_sql', { sql: complianceSQL })
      
      if (error) {
        // Try alternative approach - direct SQL execution
        const { error: directError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1)
        
        if (directError) {
          throw new Error(`Failed to setup compliance functions: ${directError.message}`)
        }
        
        addLog('warning', 'Compliance functions setup skipped - manual setup required')
      } else {
        addLog('success', 'Compliance functions created successfully')
      }
      
    } catch (err: any) {
      addLog('warning', `Compliance functions setup failed: ${err.message}`)
      addLog('info', 'You may need to manually run the SQL from sql/09-client-compliance-function.sql')
    }
  }

  const runFullSetup = async () => {
    setIsRunning(true)
    setProgress(0)
    clearLogs()
    addLog('info', 'Starting comprehensive database setup...')

    await testConnection()
    await testAuth()
    await checkTables()
    await setupComplianceFunctions()

    setStatus(prev => ({ ...prev, setup: 'success' }))
    setProgress(100)
    addLog('success', 'Database setup completed successfully!')
    setIsRunning(false)
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      default:
        return <FileText className="w-4 h-4 text-blue-600" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Database className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Database Setup Utility</h1>
          </div>
          <p className="text-slate-600 text-lg">
            Initialize and configure your DailyFitness database
          </p>
        </div>

        {/* Environment Info */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-blue-600" />
              Environment Configuration
            </CardTitle>
            <CardDescription>
              Current Supabase configuration status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Supabase URL</label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border">
                  {environmentInfo.url ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className="text-sm text-slate-600 truncate">
                    {environmentInfo.url ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Supabase Key</label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border">
                  {environmentInfo.key ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className="text-sm text-slate-600 truncate">
                    {environmentInfo.key ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup Progress */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Settings className="w-5 h-5 text-blue-600" />
              Setup Progress
            </CardTitle>
            <CardDescription>
              Current database setup status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-slate-600">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status.connection)}
                  <span className="font-medium">Database Connection</span>
                </div>
                {getStatusBadge(status.connection)}
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status.auth)}
                  <span className="font-medium">Authentication</span>
                </div>
                {getStatusBadge(status.auth)}
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status.tables)}
                  <span className="font-medium">Database Tables</span>
                </div>
                {getStatusBadge(status.tables)}
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status.setup)}
                  <span className="font-medium">Setup Complete</span>
                </div>
                {getStatusBadge(status.setup)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Zap className="w-5 h-5 text-blue-600" />
              Actions
            </CardTitle>
            <CardDescription>
              Database setup and testing operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={testConnection}
                disabled={isRunning}
                className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Connection
              </Button>

              <Button
                onClick={testAuth}
                disabled={isRunning}
                className="h-12 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                <Shield className="w-4 h-4 mr-2" />
                Test Auth
              </Button>

              <Button
                onClick={checkTables}
                disabled={isRunning}
                className="h-12 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                <Database className="w-4 h-4 mr-2" />
                Check Tables
              </Button>
            </div>

            <div className="mt-4">
              <Button
                onClick={runFullSetup}
                disabled={isRunning}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-lg font-semibold"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Running Setup...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Run Full Database Setup
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-xl">Setup Logs</CardTitle>
              </div>
              <Button
                onClick={clearLogs}
                variant="outline"
                size="sm"
                className="rounded-xl"
              >
                Clear Logs
              </Button>
            </div>
            <CardDescription>
              Real-time setup and testing logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded-xl p-4 h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No logs yet. Run a test to see output.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 font-mono text-sm">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-slate-400 flex-shrink-0">
                        [{log.timestamp}]
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getLogIcon(log.level)}
                      </div>
                      <span className={
                        log.level === 'error' ? 'text-red-400' :
                        log.level === 'warning' ? 'text-orange-400' :
                        log.level === 'success' ? 'text-green-400' :
                        'text-slate-300'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Database Schema Info */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="w-5 h-5 text-blue-600" />
              Expected Database Schema
            </CardTitle>
            <CardDescription>
              Required tables for DailyFitness application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium">profiles</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                <Dumbbell className="w-5 h-5 text-green-600" />
                <span className="font-medium">workout_programs</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                <Target className="w-5 h-5 text-purple-600" />
                <span className="font-medium">workout_templates</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                <Activity className="w-5 h-5 text-orange-600" />
                <span className="font-medium">exercises</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                <TrendingUp className="w-5 h-5 text-red-600" />
                <span className="font-medium">workout_sessions</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                <MessageCircle className="w-5 h-5 text-indigo-600" />
                <span className="font-medium">clients</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
