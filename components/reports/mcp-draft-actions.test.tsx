import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lobehub/icons', () => ({
  Claude: { Color: () => null },
  Gemini: { Color: () => null },
  OpenAI: () => null,
}));

import {
  getMcpProviderLaunchUrl,
  McpDraftActions,
  McpProviderMenu,
  providerSupportsPromptUrl,
} from './mcp-draft-actions';

describe('McpDraftActions', () => {
  it('encourages setup when no MCP provider is connected', () => {
    const markup = renderToStaticMarkup(
      <McpDraftActions connectedMcpProviders={[]} onDraftWithProvider={vi.fn()} />
    );

    expect(markup).toContain('Set up an MCP Connector');
    expect(markup).not.toContain('Draft with Claude');
    expect(markup).not.toContain('Draft with ChatGPT');
    expect(markup).not.toContain('Draft with Gemini');
  });

  it('renders only the connected providers', () => {
    const markup = renderToStaticMarkup(
      <McpDraftActions
        connectedMcpProviders={[
          { key: 'claude', name: 'Claude' },
          { key: 'gemini', name: 'Gemini' },
        ]}
        onDraftWithProvider={vi.fn()}
      />
    );

    expect(markup).toContain('Draft with Claude');
    expect(markup).toContain('Draft with Gemini');
    expect(markup).toContain('Gemini opens with the instructions copied.');
    expect(markup).not.toContain('Draft with ChatGPT');
    expect(markup).not.toContain('Set up an MCP Connector');
  });

  it('uses a direct open action for one provider and a chooser for multiple', () => {
    const singleMarkup = renderToStaticMarkup(
      <McpProviderMenu
        connectedMcpProviders={[{ key: 'gemini', name: 'Gemini' }]}
        onOpenProvider={vi.fn()}
      />
    );
    const multipleMarkup = renderToStaticMarkup(
      <McpProviderMenu
        connectedMcpProviders={[
          { key: 'claude', name: 'Claude' },
          { key: 'chatgpt', name: 'ChatGPT' },
        ]}
        onOpenProvider={vi.fn()}
      />
    );

    expect(singleMarkup).toContain('Open in Gemini');
    expect(singleMarkup).not.toContain('Open in...');
    expect(multipleMarkup).toContain('Choose where to continue');
    expect(getMcpProviderLaunchUrl('claude')).toBe('https://claude.ai/new');
    expect(getMcpProviderLaunchUrl('chatgpt')).toBe('https://chatgpt.com/');
    expect(getMcpProviderLaunchUrl('gemini')).toBe('https://gemini.google.com/app');
  });

  it('builds provider links with the prompt in the expected field', () => {
    const prompt = 'Draft my review for Q3';

    expect(getMcpProviderLaunchUrl('claude', prompt)).toBe(
      'https://claude.ai/new?q=Draft+my+review+for+Q3'
    );
    expect(getMcpProviderLaunchUrl('chatgpt', prompt)).toBe(
      'https://chatgpt.com/?q=Draft+my+review+for+Q3'
    );
    // Gemini's web app ignores prompt query parameters. Keep the prompt out
    // of the URL and rely on the clipboard fallback instead.
    expect(getMcpProviderLaunchUrl('gemini', prompt)).toBe('https://gemini.google.com/app');
    expect(providerSupportsPromptUrl('claude')).toBe(true);
    expect(providerSupportsPromptUrl('chatgpt')).toBe(true);
    expect(providerSupportsPromptUrl('gemini')).toBe(false);
  });

  it('uses a copy action for an unlisted MCP client', () => {
    const markup = renderToStaticMarkup(
      <McpProviderMenu
        connectedMcpProviders={[{ key: 'client:linear', name: 'Linear' }]}
        onOpenProvider={vi.fn()}
      />
    );

    expect(markup).toContain('Copy for Linear');
    expect(markup).not.toContain('Open in Linear');
  });
});
