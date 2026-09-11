/**
 * Lightweight assistant-connection preview for the landing page.
 *
 * Why: A public preview should explain the handoff without mounting the
 * authenticated MCP connection manager or making any network requests.
 */
import { Check, Link2 } from 'lucide-react';
import { DashboardFrame } from './dashboard-frame';

const assistants = ['Claude', 'ChatGPT', 'Gemini'];

export function DemoMcpConnector() {
  return (
    <DashboardFrame activePath="/settings/connections">
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Connect AI</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Bring a saved note to the assistant you already use.
          </p>
        </div>

        <div className="border-border/60 bg-card/60 rounded-2xl border p-4">
          <div className="text-muted-foreground mb-4 flex items-center gap-2 text-xs">
            <Link2 className="text-primary h-4 w-4" />
            <span>Available assistants</span>
          </div>
          <div className="space-y-2">
            {assistants.map((assistant, index) => (
              <div
                key={assistant}
                className="border-border/50 bg-background/50 flex items-center gap-3 rounded-xl border px-3 py-2.5"
              >
                <span className="bg-primary/15 text-primary flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold">
                  {assistant[0]}
                </span>
                <span className="text-sm font-medium">{assistant}</span>
                {index === 0 && (
                  <span className="text-success ml-auto flex items-center gap-1 text-xs">
                    <Check className="h-3.5 w-3.5" />
                    Ready to connect
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardFrame>
  );
}
