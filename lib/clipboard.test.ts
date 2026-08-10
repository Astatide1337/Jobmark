import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard } from './clipboard';

describe('copyTextToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the async clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyTextToClipboard('draft prompt')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('draft prompt');
  });

  it('falls back to a selection-based copy when the async API is denied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'));
    const textArea = {
      value: '',
      style: {} as Record<string, string>,
      setAttribute: vi.fn(),
      focus: vi.fn(),
      select: vi.fn(),
      remove: vi.fn(),
    };
    const documentMock = {
      createElement: vi.fn(() => textArea),
      body: { appendChild: vi.fn() },
      execCommand: vi.fn(() => true),
    };
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('document', documentMock);

    await expect(copyTextToClipboard('draft prompt')).resolves.toBe(true);
    expect(textArea.value).toBe('draft prompt');
    expect(documentMock.execCommand).toHaveBeenCalledWith('copy');
    expect(textArea.remove).toHaveBeenCalled();
  });
});
