import { describe, expect, it } from 'vitest';
import { buildCardFaceSvg } from '../src/lib/nft/card-face-builder';
import { composeCardBufferServer } from '../src/lib/nft/compose-card-server';

describe('NFT themed card fallbacks', () => {
  it('renders visible legendary artwork while preserving rank and suit', () => {
    const svg = buildCardFaceSvg({
      rankRaw: '2',
      rankNormalized: '2',
      suit: 'clubs',
      themeLabel: 'Легендарная',
    });

    expect(svg).toContain('ЛЕГЕНДАРНАЯ');
    expect(svg).toContain('fill="#451a03"');
    expect(svg).toContain('fill="#fbbf24"');
    expect(svg).toContain('>2</text>');
    expect(svg).toContain('M12 2.5c-1.1');
  });

  it('keeps an unthemed card fallback neutral', () => {
    const svg = buildCardFaceSvg({
      rankRaw: 'A',
      rankNormalized: 'ace',
      suit: 'spades',
    });

    expect(svg).not.toContain('fill="#451a03"');
    expect(svg).toContain('>A</text>');
  });

  it('produces a server PNG when the external artwork is unavailable', async () => {
    const buffer = await composeCardBufferServer({
      rankRaw: '2',
      rankNormalized: '2',
      suit: 'clubs',
      themeLabel: 'Легендарная',
    });

    expect(buffer.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
    expect(buffer.length).toBeGreaterThan(1_000);
  });
});
