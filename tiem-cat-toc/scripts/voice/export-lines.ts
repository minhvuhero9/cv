/**
 * Step 1 of the voice pipeline: write every voiceable line (from the game's own data) to
 * voice/lines.json. Run: npm run voice:export
 */
import { writeFileSync } from 'node:fs';
import { allVoiceLines, speakable } from '../../src/game/voiceLines';

const lines = allVoiceLines().map((l) => ({ ...l, say: speakable(l.text) }));
writeFileSync(new URL('../../voice/lines.json', import.meta.url), JSON.stringify(lines, null, 1) + '\n');
const bySpeaker = lines.reduce<Record<string, number>>((a, l) => ((a[l.speaker] = (a[l.speaker] ?? 0) + 1), a), {});
console.log(`voice/lines.json: ${lines.length} lines`, bySpeaker);
