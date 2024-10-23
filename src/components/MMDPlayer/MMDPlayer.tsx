import { useCallback, useEffect, useRef } from 'react';
import { MMDManager } from './MMDManager';
import './MMDPlayer.css';

export function MMDPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mmdManagerRef = useRef(new MMDManager());

  useEffect(() => {
    const observer = new ResizeObserver(([container]) => {
      const { width, height } = container.contentRect;
      mmdManagerRef.current.renderer.setSize(width, height);
      mmdManagerRef.current.setCamera({ aspect: width / height });
    });
    observer.observe(containerRef.current!);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const container = containerRef.current;
    const mmdManager = mmdManagerRef.current;

    mmdManager.mount(container);
    mmdManager.setCamera({ position: [0, 10, 20] });

    // FIXME: callback hell
    mmdManager.loadModel('/models/miku/Miku_Hatsune_Ver2.pmd').then(() => {
      mmdManager.loadAnimation('/motions/rabbit-hole/rabbit-hole.vmd').then(() => {
        mmdManager.loadAudio('/songs/rabbit-hole.mp3').then(() => {});
      });
    });

    return () => {
      mmdManager.renderer.dispose();
      container.removeChild(mmdManager.renderer.domElement);
    };
  }, []);

  const handlePlay = useCallback(async () => {
    const mmdManager = mmdManagerRef.current;
    if (!mmdManager.mixer || !mmdManager.animation) {
      return;
    }
    await mmdManager.play();
  }, []);

  return (
    <>
      <div style={{ display: 'flex' }}>
        <button onClick={handlePlay}>play</button>
      </div>
      <div className='container' ref={containerRef}></div>
    </>
  );
}
