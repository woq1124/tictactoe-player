import * as THREE from 'three';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';

export class MMDManager {
  private mmdLoader = new MMDLoader();
  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  lights: THREE.Light[];

  model: THREE.SkinnedMesh | null = null;
  mixer: THREE.AnimationMixer | null = null;
  animation: THREE.AnimationClip | null = null;
  animationFrameId: number | null = null;
  audioListener = new THREE.AudioListener();
  audio = new THREE.Audio(this.audioListener);

  constructor() {
    this.camera.add(this.audioListener);

    this.lights = [new THREE.AmbientLight(0xffffff, 0.8), new THREE.DirectionalLight(0xffffff, 2)];
    this.lights.forEach((light) => this.scene.add(light));
  }

  setCamera(params: {
    position?: [x: number, y: number, z: number];
    lookAt?: [x: number, y: number, z: number];
    aspect?: number;
  }) {
    if (params.position) {
      this.camera.position.set(...params.position);
    }
    if (params.aspect) {
      this.camera.aspect = params.aspect;
      this.camera.updateProjectionMatrix();
    }
    if (params.lookAt) {
      this.camera.lookAt(...params.lookAt);
    }
  }

  mount(container: HTMLElement) {
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
    this.render();
  }

  render() {
    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
      this.mixer?.update(1 / 120);
    });
  }

  async loadModel(url: string, onProgress?: (progress: ProgressEvent) => void) {
    this.model = await this.mmdLoader.loadAsync(url, onProgress);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.scene.add(this.model);
    this.renderer.render(this.scene, this.camera);
  }

  unloadModel() {
    if (!this.model) {
      return;
    }
    this.scene.remove(this.model);
    this.model.geometry.dispose();
    if (Array.isArray(this.model.material)) {
      this.model.material.forEach((material) => material.dispose());
    } else {
      this.model.material.dispose();
    }
    this.model = null;
    this.mixer = null;
  }

  async loadAnimation(url: string, onProgress?: (progress: ProgressEvent) => void) {
    if (!this.model || !this.mixer) {
      console.warn('Model or mixer is not loaded');
      return;
    }
    this.animation = await new Promise((resolve, reject) => {
      this.mmdLoader.loadAnimation(
        url,
        this.model!,
        (obj) => {
          if (obj instanceof THREE.AnimationClip) {
            resolve(obj);
          } else {
            reject(new Error('Failed to load animation'));
          }
        },
        onProgress,
        reject,
      );
    });
  }

  unloadAnimation() {
    this.animation && this.mixer?.uncacheAction(this.animation);
    this.animation = null;
  }

  async loadAudio(
    url: string,
    params?: { loop?: boolean; volume?: number },
    onProgress?: (progress: ProgressEvent) => void,
  ) {
    const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
      new THREE.AudioLoader().load(
        url,
        (buffer) => {
          resolve(buffer);
          this.audio.setLoop(params?.loop ?? true);
          this.audio.setVolume(params?.volume ?? 0.5);
        },
        onProgress,
        reject,
      );
    });

    this.audio.setBuffer(buffer);
  }

  async play() {
    if (!this.model || !this.mixer || !this.animation) {
      console.warn('Model, mixer or animation is not loaded');
      return;
    }

    this.mixer.clipAction(this.animation).play();
    const audioContext = new AudioContext();
    audioContext.resume().then(() => {
      this.audio.play();
    });
  }

  async stopAnimation() {
    if (!this.model || !this.mixer || !this.animation) {
      return;
    }
    this.mixer.existingAction(this.animation)?.stop();
    this.audio.stop();
    cancelAnimationFrame(this.animationFrameId!);
  }

  async dispose() {
    this.stopAnimation();
    this.unloadAnimation();
    this.unloadModel();
    this.renderer.dispose();
  }
}
