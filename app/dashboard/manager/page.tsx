import McpServersManager from '../manager';
import { Toaster } from '@/components/ui/sonner';

export default function McpConfigPage() {
  return (
    <>
      <McpServersManager />
      <Toaster />
    </>
  );
}
