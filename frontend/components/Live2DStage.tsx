'use client';

import { useEffect, useRef } from 'react';

// 5 bộ trang phục Live2D (model Cubism 3.0 của minori)
export const MINORI_MODELS: Record<string, { label: string; path: string }> = {
  normal: { label: 'Thường ngày', path: '/models/minori/normal/05minori_normal_3.0_f_t05.model3.json' },
  culture: { label: 'Đồng phục', path: '/models/minori/culture/05minori_culture_t01.model3.json' },
  sports02: { label: 'Thể thao', path: '/models/minori/sports02/05minori_sports02.model3.json' },
  parttime: { label: 'Làm thêm', path: '/models/minori/parttime/05minori_parttime_t03.model3.json' },
  cloth002: { label: 'Váy dạo phố', path: '/models/minori/cloth002/05minori_cloth002_3.0_f_t04.model3.json' },
  unit: { label: 'Đồng phục đặc biệt', path: '/models/minori/unit/05minori_unit_3.0_f_t02.model3.json' },
  swimsuit: { label: 'Đồ bơi', path: '/models/minori/swimsuit/05minori_swimsuit.model3.json' },
  priestess: { label: 'Miko', path: '/models/minori/priestess/05minori_priestess_t02.model3.json' },
};

// Cảm xúc (backend trả về) -> motion group khuôn mặt của model. Model không có Expressions,
// nên ta dùng các motion "face_*" có sẵn.
const EMOTION_FACE: Record<string, string> = {
  // tên cảm xúc do backend (EmotionService) phát ra
  neutral: 'face_normal_01', happy: 'face_smile_01', excited: 'face_sparkling_01',
  thinking: 'face_serious_01', surprised: 'face_surprise_01', shy: 'face_shy_01',
  sad: 'face_sad_01', wink: 'face_wink_01', angry: 'face_angry_01',
  // alias dự phòng
  joy: 'face_sparkling_01', surprise: 'face_surprise_01', think: 'face_serious_01',
  love: 'face_smile_03', cry: 'face_cry_01', sleepy: 'face_sleepy_01', shock: 'face_shock_01',
};

// Một vài motion thân người để idle ngẫu nhiên cho sống động hơn
const IDLE_BODY = ['w-normal-tilthead01', 'w-normal-nod01', 'w-happy-glad01', 'w-normal-pose01', 'w-cute-tilthead01'];

const CUBISM_CORE = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('load fail: ' + src));
    document.head.appendChild(s);
  });
}

interface Props {
  outfit?: string;       // key trong MINORI_MODELS
  modelPath?: string;    // đường dẫn model trực tiếp (ưu tiên hơn outfit)
  emotion?: string;      // cảm xúc hiện tại
  className?: string;
}

export default function Live2DStage({ outfit = 'normal', modelPath, emotion = 'neutral', className }: Props) {
  const resolvePath = () => modelPath || MINORI_MODELS[outfit]?.path || MINORI_MODELS.normal.path;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const Live2DModelRef = useRef<any>(null);
  const idleTimer = useRef<any>(null);

  // Khởi tạo PIXI + Cubism core 1 lần
  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        await loadScript(CUBISM_CORE);
        const PIXI = await import('pixi.js');
        (window as any).PIXI = PIXI; // pixi-live2d-display cần PIXI global
        const { Live2DModel } = await import('pixi-live2d-display/cubism4');
        if (disposed || !canvasRef.current) return;
        Live2DModelRef.current = Live2DModel;

        const app = new PIXI.Application({
          view: canvasRef.current,
          autoStart: true,
          backgroundAlpha: 0,
          resizeTo: canvasRef.current.parentElement || undefined,
          antialias: true,
        });
        appRef.current = app;
        await loadModel(resolvePath());

        // idle body motion ngẫu nhiên
        idleTimer.current = setInterval(() => {
          const m = modelRef.current;
          if (!m) return;
          const g = IDLE_BODY[Math.floor(Math.random() * IDLE_BODY.length)];
          try { m.motion(g); } catch {}
        }, 9000);
      } catch (e) {
        console.warn('Live2D init lỗi:', e);
      }
    })();
    return () => {
      disposed = true;
      if (idleTimer.current) clearInterval(idleTimer.current);
      try { modelRef.current?.destroy(); } catch {}
      try { appRef.current?.destroy(true); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadModel(path: string) {
    const app = appRef.current; const Live2DModel = Live2DModelRef.current;
    if (!app || !Live2DModel) return;
    try {
      const model = await Live2DModel.from(path, { autoInteract: false });
      if (modelRef.current) { app.stage.removeChild(modelRef.current); try { modelRef.current.destroy(); } catch {} }
      modelRef.current = model;
      app.stage.addChild(model);
      fit();
    } catch (e) { console.warn('Load model lỗi:', path, e); }
  }

  function fit() {
    const app = appRef.current; const model = modelRef.current;
    if (!app || !model) return;
    const w = app.renderer.width, h = app.renderer.height;
    const scale = Math.min(w / model.width, h / model.height) * 1.8;
    model.scale.set(scale);
    model.anchor?.set?.(0.5, 0.5);
    model.position.set(w / 2, h / 2 + model.height * scale * 0.18);
  }

  // Đổi trang phục
  useEffect(() => {
    if (Live2DModelRef.current && appRef.current) loadModel(resolvePath());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfit, modelPath]);

  // Đổi cảm xúc -> chơi motion khuôn mặt
  useEffect(() => {
    const m = modelRef.current;
    if (!m) return;
    const g = EMOTION_FACE[emotion] || EMOTION_FACE.neutral;
    try { m.motion(g); } catch {}
  }, [emotion]);

  return (
    <div className={className || 'relative h-72 w-full'}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
