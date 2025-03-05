import { redirect } from 'next/navigation';

/**
 * Redirect from old /mcp/log-viewer to new /mcp/logs path
 */
export default function LogViewerRedirectPage() {
  redirect('/mcp/logs');
}
