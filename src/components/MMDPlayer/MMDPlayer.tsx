import { useCallback, useEffect, useRef } from 'react';
import { MMDManager } from './MMDManager';
import './MMDPlayer.css';

const models = {
  miku: '/models/miku/Miku_Hatsune_Ver2.pmd',
  firefly: '/models/firefly/firefly.pmx',
  tingyun: '/models/tingyun/tingyun.pmx',
} as Record<string, string>;

export function MMDPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mmdManagerRef = useRef<MMDManager>();

  useEffect(() => {
    const observer = new ResizeObserver(([container]) => {
      if (!mmdManagerRef.current) {
        return;
      }
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
    if (!mmdManagerRef.current) {
      mmdManagerRef.current = new MMDManager();
    }
    const container = containerRef.current;
    const mmdManager = mmdManagerRef.current;

    mmdManager.mount(container);
    mmdManager.setCamera({ position: [0, 10, 20] });

    // FIXME: callback hell
    mmdManager.loadModel(models.miku).then(() => {
      mmdManager.loadAnimation('/motions/rabbit-hole/rabbit-hole.vmd').then(() => {
        mmdManager.loadAudio('/songs/rabbit-hole.mp3').then(() => {
          console.log('loaded');
        });
      });
    });

    return () => {
      mmdManager.dispose();
      mmdManagerRef.current = undefined;
      container.removeChild(mmdManager.renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const mmdManager = mmdManagerRef.current;
    if (!container || !mmdManager) {
      return () => {};
    }
    const keyboardHandler = (event: KeyboardEvent) => {
      if (event.key === 'w') {
        mmdManager.camera.translateZ(-1);
      } else if (event.key === 's') {
        mmdManager.camera.translateZ(1);
      } else if (event.key === 'a') {
        mmdManager.camera.translateX(-1);
      } else if (event.key === 'd') {
        mmdManager.camera.translateX(1);
      }
    };
    window.addEventListener('keydown', keyboardHandler);

    let isMouseDown = false;

    const mouseDownHandler = () => {
      isMouseDown = true;
    };
    const mouseMoveHandler = (event: MouseEvent) => {
      if (isMouseDown) {
        mmdManager.camera.rotateX(-event.movementY * 0.005);
        mmdManager.camera.rotateY(-event.movementX * 0.005);
        mmdManager.camera.updateProjectionMatrix();
      }
    };
    const mouseUpHandler = () => {
      isMouseDown = false;
    };

    container.addEventListener('mousedown', mouseDownHandler);
    container.addEventListener('mousemove', mouseMoveHandler);
    container.addEventListener('mouseup', mouseUpHandler);
    return () => {
      window.removeEventListener('keydown', keyboardHandler);
    };
  }, []);

  const handlePlay = useCallback(async () => {
    const mmdManager = mmdManagerRef.current;
    if (!mmdManager || !mmdManager.mixer || !mmdManager.animation) {
      return;
    }
    await mmdManager.play();
  }, []);

  const handleStop = useCallback(() => {
    const mmdManager = mmdManagerRef.current;
    if (!mmdManager || !mmdManager.mixer || !mmdManager.animation) {
      return;
    }
    mmdManager.stopAnimation();
  }, []);

  const handleCameraReset = useCallback(() => {
    const mmdManager = mmdManagerRef.current;
    if (!mmdManager) {
      return;
    }
    mmdManager.setCamera({ position: [0, 10, 20] });
    mmdManager.camera.lookAt(0, 10, 0);
  }, []);

  const handleSelectModel = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const mmdManager = mmdManagerRef.current;
      if (!mmdManager) {
        return;
      }
      handleStop();
      const model = e.target.value;
      if (models[model]) {
        mmdManager.unloadModel();
        mmdManager.unloadAnimation();
        await mmdManager.loadModel(models[model]);
        await mmdManager.loadAnimation('/motions/rabbit-hole/rabbit-hole.vmd');
      }
    },
    [handleStop],
  );

  return (
    <div className='container'>
      <div className='controller'>
        <span>W,A,S,D - Move Camera</span>
        <span>Mouse Drag - Rotate Camera</span>
        <button onClick={handlePlay}>Play</button>
        <button onClick={handleStop}>Stop</button>
        <button onClick={handleCameraReset}>Reset Camera</button>
        <select onChange={handleSelectModel}>
          <option value='0'>Select Model</option>
          <option value='miku'>Miku</option>
          <option value='firefly'>Firefly</option>
          <option value='tingyun'>Tingyun</option>
        </select>
      </div>
      <div className='player' ref={containerRef}></div>
    </div>
  );
}
