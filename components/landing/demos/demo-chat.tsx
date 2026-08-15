/**
 * MCP Connector demo
 *
 * Why: The landing tour should show the same connection choices users see in
 * the product. The connector is a handoff to an AI app, not an in-product
 * chat, so the demo uses the real connector page instead of a mock transcript.
 */
import { McpConnectionPage } from '@/components/mcp/McpConnectionPage';
import { DashboardFrame } from './dashboard-frame';

export function DemoMcpConnector() {
  return (
    <div aria-hidden="true" className="h-full">
      <DashboardFrame activePath="/chat">
        <DemoMcpConnectorContent />
      </DashboardFrame>
    </div>
  );
}

export function DemoMcpConnectorContent() {
  const baseUrl =
    typeof window === 'undefined' ? 'https://jobmark.astatide.com' : window.location.origin;

  return (
    <McpConnectionPage
      baseUrl={baseUrl}
      user={{ id: 'landing-demo', name: 'Demo User', email: 'demo@jobmark.local' }}
      connections={[]}
    />
  );
}
