import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lobehub/icons', () => ({
  Claude: { Color: () => null },
  Gemini: { Color: () => null },
  OpenAI: () => null,
}));

import { getMcpProviderLaunchUrl, McpDraftActions, McpProviderMenu } from './mcp-draft-actions';

describe('McpDraftActions', () => {
  it('encourages setup when no MCP provider is connected', () => {
    const markup = renderToStaticMarkup(
      <McpDraftActions connectedMcpProviders={[]} buildInstructions={vi.fn()} />
    );

    expect(markup).toContain('Connect an assistant');
    expect(markup).not.toContain('Edit with Claude');
    expect(markup).not.toContain('Edit with ChatGPT');
    expect(markup).not.toContain('Edit with Gemini');
  });

  it('renders only the connected providers', () => {
    const markup = renderToStaticMarkup(
      <McpDraftActions
        connectedMcpProviders={[
          { key: 'claude', name: 'Claude' },
          { key: 'gemini', name: 'Gemini' },
        ]}
        buildInstructions={vi.fn()}
      />
    );

    expect(markup).toContain('Edit with Claude');
    expect(markup).toContain('Edit with Gemini');
    expect(markup).not.toContain('Edit with ChatGPT');
    expect(markup).not.toContain('Connect an MCP');
  });

  it('offers a local button for one provider and a chooser for multiple', () => {
    const buildInstructions = vi.fn();
    const singleMarkup = renderToStaticMarkup(
      <McpProviderMenu
        connectedMcpProviders={[{ key: 'gemini', name: 'Gemini' }]}
        buildInstructions={buildInstructions}
      />
    );
    const multipleMarkup = renderToStaticMarkup(
      <McpProviderMenu
        connectedMcpProviders={[
          { key: 'claude', name: 'Claude' },
          { key: 'chatgpt', name: 'ChatGPT' },
        ]}
        buildInstructions={buildInstructions}
      />
    );

    expect(singleMarkup).toContain('Edit with Gemini');
    expect(multipleMarkup).toContain('Continue with');
    expect(singleMarkup).not.toContain('href=');
    expect(multipleMarkup).not.toContain('href=');
    expect(buildInstructions).not.toHaveBeenCalled();
  });

  it.each([
    ['claude', 'https://claude.ai/new'],
    ['chatgpt', 'https://chatgpt.com/'],
    ['gemini', 'https://gemini.google.com/app'],
  ])('uses the static provider URL for %s', (key, url) => {
    expect(getMcpProviderLaunchUrl(key)).toBe(url);
  });

  it.each(['client:linear', 'https://unknown.example/', 'constructor', '__proto__', 'toString'])(
    'offers no external URL for %s',
    key => {
      expect(getMcpProviderLaunchUrl(key)).toBeUndefined();
    }
  );

  it('offers local instructions for an unlisted MCP client', () => {
    const markup = renderToStaticMarkup(
      <McpProviderMenu
        connectedMcpProviders={[{ key: 'client:linear', name: 'Linear' }]}
        buildInstructions={vi.fn()}
      />
    );

    expect(markup).toContain('Edit with Linear');
    expect(markup).not.toContain('href=');
  });
});
