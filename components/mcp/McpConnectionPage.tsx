'use client';

import { useState } from 'react';
import { Check, X, Copy, ExternalLink, Loader2, Shield, Code, Terminal, Globe, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface McpConnectionProps {
  user: { id: string; name?: string | null; email?: string | null } | null;
  connections: Array<{
    id: string;
    oauthClientId: string;
    clientName: string;
    scopes: string[];
    vaultUnlockedUntil: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
    oauthClient: {
      id: string;
      clientName: string;
    };
  }>;
}

const PRE_REGISTERED_CLIENTS = [
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Connect Jobmark to Claude via Custom Connectors',
    logo: '🤖',
    redirectUri: 'https://claude.ai/api/mcp/auth/callback',
    docsUrl: 'https://docs.anthropic.com/en/docs/agents-and-tools/mcp',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT (OpenAI)',
    description: 'Connect Jobmark to ChatGPT via Custom GPTs or Assistants API',
    logo: '💬',
    redirectUri: 'https://chat.openai.com/aip/gpt-plugin/callback',
    docsUrl: 'https://platform.openai.com/docs/assistants/overview',
  },
  {
    id: 'inspector',
    name: 'MCP Inspector',
    description: 'Official MCP debugging and testing tool',
    logo: '🔍',
    redirectUri: 'https://inspector.mcp.dev/callback',
    docsUrl: 'https://github.com/modelcontextprotocol/inspector',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'AI-first code editor with MCP support',
    logo: '🎯',
    redirectUri: 'https://cursor.com/mcp/callback',
    docsUrl: 'https://docs.cursor.com/mcp',
  },
  {
    id: 'vscode',
    name: 'VS Code (GitHub Copilot)',
    description: 'Use Jobmark with GitHub Copilot Chat in VS Code',
    logo: '📝',
    redirectUri: 'vscode://vscode.github-authentication/did-authenticate',
    docsUrl: 'https://code.visualstudio.com/api/extension-guides/language-model',
  },
];

export function McpConnectionPage({ user, connections }: McpConnectionProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };
  
  const handleRevoke = async (connectionId: string) => {
    if (!confirm('Revoke this MCP connection? This will invalidate all tokens and cannot be undone.')) return;
    
    setRevoking(connectionId);
    try {
      const res = await fetch(`/api/mcp/connections/${connectionId}/revoke`, { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Failed to revoke connection');
      }
    } catch {
      alert('Failed to revoke connection');
    } finally {
      setRevoking(null);
    }
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">🤖</div>
              <CardTitle className="text-3xl">Connect Jobmark to Your AI Assistant</CardTitle>
              <p className="text-muted-foreground mt-2">
                Jobmark exposes your professional history through MCP (Model Context Protocol).
                Connect your AI to access projects, activities, goals, contacts, and more.
              </p>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Get Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. <strong>Sign in</strong> to your Jobmark account</p>
                <p>2. Choose your AI assistant from the options below</p>
                <p>3. Follow the OAuth flow to authorize access</p>
                <p>4. Start asking your AI about your career!</p>
              </div>
              <Button className="w-full" size="lg" onClick={() => window.location.href = '/api/auth/signin?callbackUrl=/chat'}>
                Sign In to Connect
              </Button>
            </CardContent>
          </Card>
          
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PRE_REGISTERED_CLIENTS.map(client => (
              <Card key={client.id} className="border-dashed">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-2">{client.logo}</div>
                  <h3 className="font-semibold">{client.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{client.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  const mcpUrl = `${baseUrl}/mcp`;
  const authUrl = `${baseUrl}/api/auth/mcp/authorize`;
  const scopes = 'mcp:read mcp:write mcp:admin mcp:vault offline_access';
  
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Add Jobmark to Your AI Assistant</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Connect via MCP (Model Context Protocol) — the open standard for AI-tool integration
          </p>
        </div>
        
        {/* OAuth Discovery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              OAuth 2.1 Discovery Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="p-3 bg-muted/50 rounded-lg">
                <code className="text-sm font-mono">{baseUrl}/.well-known/oauth-authorization-server</code>
                <p className="text-xs text-muted-foreground mt-1">Authorization Server Metadata (RFC 8414)</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <code className="text-sm font-mono">{baseUrl}/.well-known/oauth-protected-resource</code>
                <p className="text-xs text-muted-foreground mt-1">Protected Resource Metadata (RFC 9728)</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <code className="text-sm font-mono">{baseUrl}/api/auth/mcp/jwks</code>
                <p className="text-xs text-muted-foreground mt-1">JWKS for RS256 token verification</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <code className="text-sm font-mono">{baseUrl}/mcp</code>
                <p className="text-xs text-muted-foreground mt-1">MCP Streamable HTTP Endpoint</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Pre-registered Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Connect (Pre-registered Clients)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PRE_REGISTERED_CLIENTS.map(client => (
                <Card key={client.id} className="border-muted/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{client.logo}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{client.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{client.description}</p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a
                              href={`${authUrl}?client_id=${client.id}&redirect_uri=${encodeURIComponent(client.redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${crypto.randomUUID()}&code_challenge=${btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/[+/=]/g, '').substring(0, 43)}&code_challenge_method=S256`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Connect
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={client.docsUrl} target="_blank" rel="noopener noreferrer">
                              <Code className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Manual Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Manual Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="block mb-2">MCP Server URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={mcpUrl}
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(mcpUrl, 'MCP URL')}
                >
                  {copied === 'MCP URL' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="block mb-2">Authorization URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${authUrl}?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=${encodeURIComponent(scopes)}&state=RANDOM_STATE&code_challenge=PKCE_CHALLENGE&code_challenge_method=S256`}
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(`${authUrl}?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=${encodeURIComponent(scopes)}&state=RANDOM_STATE&code_challenge=PKCE_CHALLENGE&code_challenge_method=S256`, 'Auth URL')}
                >
                  {copied === 'Auth URL' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="block mb-2">Scopes</Label>
              <div className="flex flex-wrap gap-2">
                {scopes.split(' ').map(scope => (
                  <span key={scope} className="px-2 py-1 bg-muted rounded text-sm font-mono">
                    {scope}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Claude Desktop Config (claude_desktop_config.json)</p>
              <pre className="text-xs overflow-x-auto bg-background p-3 rounded"><code>{JSON.stringify({
  mcpServers: {
    jobmark: {
      command: 'npx',
      args: ['mcp-remote', mcpUrl],
      env: {
        MCP_AUTH_SERVER: baseUrl + '/api/auth/mcp',
      },
    },
  },
}, null, 2)}</code></pre>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => handleCopy(JSON.stringify({
                  mcpServers: {
                    jobmark: {
                      command: 'npx',
                      args: ['mcp-remote', mcpUrl],
                      env: { MCP_AUTH_SERVER: baseUrl + '/api/auth/mcp' },
                    },
                  },
                }, null, 2), 'Claude Config')}
              >
                {copied === 'Claude Config' ? <Check className="h-4 w-4 text-green-500 mr-1" /> : <Copy className="h-4 w-4 mr-1" />} Copy Config
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Active Connections */}
        {connections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Active Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connections.map(conn => (
                <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg mb-3 last:mb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-lg">🔗</div>
                    <div>
                      <p className="font-medium">{conn.oauthClient.clientName || conn.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        Scopes: {conn.scopes.join(', ')} • {!conn.vaultUnlockedUntil || conn.vaultUnlockedUntil < new Date() ? (
                          <span className="text-amber-600 dark:text-amber-400">🔒 Vault Locked</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">🔓 Vault Unlocked</span>
                        )}
                        {conn.lastUsedAt && ` • Last used: ${new Date(conn.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={revoking === conn.id}
                    onClick={() => handleRevoke(conn.id)}
                  >
                    {revoking === conn.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />} Revoke
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Security & Privacy */}
        <Card className="border-amber-200/50 dark:border-amber-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>OAuth 2.1 with PKCE</strong> — Industry-standard authorization with code challenge</li>
              <li><strong>RS256 JWT tokens</strong> — Asymmetric signatures, rotating keys (24h rotation, 48h retention)</li>
              <li><strong>Per-connection vault locking</strong> — Sensitive data requires explicit unlock via secure browser flow</li>
              <li><strong>No passwords or API keys in MCP</strong> — Secrets managed via one-time secure action URLs only</li>
              <li><strong>Idempotency keys</strong> — Safe retries for mutating operations</li>
              <li><strong>Rate limited</strong> — 120 req/min per connection with burst protection</li>
              <li><strong>Audit logging</strong> — Connection ID, tool, duration, status (no secrets logged)</li>
            </ul>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground pt-4 border-t">
          <p>Jobmark stores and organizes your professional history and connects it to the AI assistant you choose through MCP.</p>
          <p className="mt-1">
            <a href="/settings/connections" className="underline hover:text-foreground">Manage connections in Settings</a> •
            <a href="/docs/mcp" className="underline hover:text-foreground ml-2">MCP Documentation</a>
          </p>
        </div>
      </div>
    </div>
  );
}