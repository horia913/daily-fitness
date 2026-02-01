import { redirect } from 'next/navigation';

/**
 * Admin Root Page
 * Redirects to goal-templates as the default admin page
 */
export default function AdminPage() {
  redirect('/admin/goal-templates');
}
