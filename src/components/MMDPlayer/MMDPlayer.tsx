import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import './MMDPlayer.css';

const loader = new MMDLoader();

export function MMDPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const animationRef = useRef<THREE.AnimationClip | null>(null);

  useEffect(() => {
    const observer = new ResizeObserver(([container]) => {
      const { width, height } = container.contentRect;
      if (rendererRef.current) {
        rendererRef.current.setSize(width, height);
        cameraRef.current!.aspect = width / height;
        cameraRef.current!.updateProjectionMatrix();
      }
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

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(container.clientWidth, container.clientHeight);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;

    // Ambient Light (주변광) - 조명 전반을 부드럽게 밝게 함
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // 주변광
    scene.add(ambientLight);

    // Directional Light (직사광) - 특정 방향에서 강하게 비추는 빛
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2); // 강도를 2로 설정
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    container.appendChild(renderer.domElement);

    camera.position.y = 10;
    camera.position.z = 20;

    loader.loadWithAnimation(
      '/models/miku/Miku_Hatsune_Ver2.pmd',
      '/motions/rabbit-hole/rabbit-hole.vmd',
      ({ mesh, animation }) => {
        modelRef.current = mesh;
        animationRef.current = animation;
        // mesh는 THREE.Object3D의 인스턴스이므로 scene에 추가 가능
        scene.add(mesh);

        // 애니메이션을 실행하기 위해 애니메이션 믹서 추가
        const mixer = new THREE.AnimationMixer(mesh);
        mixerRef.current = mixer;
      },
      undefined,
      console.error,
    );

    return () => {
      renderer.dispose();
      scene.clear();
      camera.clear();
      mixerRef.current = null;
      container.removeChild(renderer.domElement);
    };
  }, []);

  const handlePlay = () => {
    audioContextRef.current = new AudioContext();
    audioContextRef.current?.resume().then(() => {
      const listener = new THREE.AudioListener();
      const audio = new THREE.Audio(listener);
      new THREE.AudioLoader().load('/songs/rabbit-hole.mp3', function (buffer) {
        audio.setBuffer(buffer);

        listener.position.z = 1;

        sceneRef.current!.add(audio);
        sceneRef.current!.add(listener);

        audio.play();
      });
      // 애니메이션 업데이트는 렌더링 루프에서 처리
      function animate() {
        requestAnimationFrame(animate);
        mixerRef.current!.update(0.00833); // 적절한 시간 값을 전달
        rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      }

      animate(); // 애니메이션 시작
      setTimeout(() => {
        mixerRef.current!.clipAction(animationRef.current!).play();
      }, 550);
    });
  };

  return (
    <>
      <div style={{ display: 'flex' }}>
        <button onClick={handlePlay}>play</button>
      </div>

      <div className='container' ref={containerRef}></div>
    </>
  );
}
