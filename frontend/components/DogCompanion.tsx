'use client';

import { useEffect, useRef, useState } from 'react';

// Chó giữ nhà biết cử động: đi qua lại; đứng yên ~1 phút thì ngồi xuống;
// rời nông trại >1 tiếng quay lại thấy nó đang ngủ rồi mới dậy đi tiếp.
const LS_KEY = 'farmDogLastSeen';

export default function DogCompanion({ active }: { active: boolean }) {
  const [mode, setMode] = useState<'walk' | 'sit' | 'sleep'>('sit');
  const [x, setX] = useState(8);
  const [dir, setDir] = useState(1);
  const dirRef = useRef(1);
  const xRef = useRef(8);
  const walkIv = useRef<any>(null);
  const sitTimer = useRef<any>(null);

  function stopWalk() { if (walkIv.current) clearInterval(walkIv.current); walkIv.current = null; }

  function startWalk() {
    setMode('walk');
    clearTimeout(sitTimer.current);
    // đứng yên đi lại ~1 phút rồi ngồi xuống
    sitTimer.current = setTimeout(() => { stopWalk(); setMode('sit'); }, 60_000);
    stopWalk();
    walkIv.current = setInterval(() => {
      let nx = xRef.current + dirRef.current * 1.1;
      if (nx > 86) { nx = 86; dirRef.current = -1; setDir(-1); }
      else if (nx < 2) { nx = 2; dirRef.current = 1; setDir(1); }
      xRef.current = nx; setX(nx);
    }, 60);
  }

  useEffect(() => {
    if (!active) return;
    const last = Number(localStorage.getItem(LS_KEY) || 0);
    const gap = Date.now() - last;
    let t1: any, t2: any;
    if (last && gap > 3_600_000) {
      // vắng >1 tiếng -> đang ngủ -> dậy -> đi
      setMode('sleep');
      t1 = setTimeout(() => setMode('sit'), 4000);
      t2 = setTimeout(() => startWalk(), 7000);
    } else {
      startWalk();
    }
    const save = setInterval(() => localStorage.setItem(LS_KEY, String(Date.now())), 10_000);
    return () => {
      localStorage.setItem(LS_KEY, String(Date.now()));
      clearTimeout(t1); clearTimeout(t2); clearTimeout(sitTimer.current); clearInterval(save); stopWalk();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <div className="pointer-events-auto absolute bottom-1 left-0 right-0 z-10 h-10 select-none" title="Chó giữ nhà — bấm để gọi nó đi">
      <div
        className="absolute bottom-0 cursor-pointer"
        style={{ left: `${x}%`, transform: dir < 0 ? 'scaleX(-1)' : 'none', transition: 'left .06s linear' }}
        onClick={startWalk}
      >
        <div className={`dogspr ${mode === 'sleep' ? 'dog-sleep' : mode === 'sit' ? 'dog-sit' : 'dog-walk'}`} />
      </div>
    </div>
  );
}
