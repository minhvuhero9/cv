import { useEffect, useState } from 'react';
import type { RoundState } from '../game/session';

/**
 * First-time guide: a small bubble that walks through one haircut and never blocks the game.
 * Steps advance from what the player actually does; "Bỏ qua" ends it for good.
 */
const KEY = 'tctbo-coach';
type Step = 0 | 1 | 2 | 3 | 4;

const TEXT: Record<Exclude<Step, 4>, string> = {
  0: '① Chọn Kéo hoặc Tông đơ ở thanh dụng cụ bên dưới.',
  1: '② Rê chuột / kéo ngón tay qua tóc để cắt. Cẩn thận: giữ tông đơ một chỗ quá lâu là trọc!',
  2: '③ Nhìn Phiếu yêu cầu: dòng nào xanh ✓ là đạt. Cắt theo đường viền xanh trên đầu khách.',
  3: '④ Xong rồi thì bấm “Xong! Soi gương” để khách phán xét.',
};

function load(): Step {
  try {
    const v = Number(localStorage.getItem(KEY) ?? '0');
    return (v >= 0 && v <= 4 ? v : 4) as Step;
  } catch {
    return 4;
  }
}

export function Coach({ s }: { s: RoundState }) {
  const [step, setStep] = useState<Step>(load);
  const save = (v: Step) => {
    setStep(v);
    try {
      localStorage.setItem(KEY, String(v));
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    if (step === 4 || s.phase !== 'cutting') {
      if (step === 3 && (s.phase === 'mirror' || s.phase === 'result')) save(4);
      return;
    }
    if (step === 0 && s.tool !== 'scissors' && s.tool !== 'clipper') return;
    if (step === 0) save(1);
    else if (step === 1 && s.hasCut) save(2);
    else if (step === 2 && s.zoneStrokes.left + s.zoneStrokes.right + s.zoneStrokes.top + s.zoneStrokes.fringe >= 3) save(3);
  });
  // Step 0 waits for a deliberate tool pick: scissors are already in hand, so any cut moves on.
  useEffect(() => {
    if (step === 0 && s.phase === 'cutting' && s.hasCut) save(2);
  });
  if (step === 4 || s.phase !== 'cutting') return null;
  return (
    <div className={`coach coach-${step}`} data-testid="coach" role="status">
      <span>{TEXT[step]}</span>
      <button onClick={() => save(4)} data-testid="coach-skip">
        Bỏ qua
      </button>
    </div>
  );
}
