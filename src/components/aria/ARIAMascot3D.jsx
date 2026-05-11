/**
 * ARIAMascot3D — mascotte ARIA con modello 3D GLB/GLTF via Three.js
 * Usa il file prova_aria_opt.gltf (che è in realtà un GLB) dalla cartella public
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function ARIAMascot3D({ size = 130, color = '#3B6EF8', onClick, newMessageCount = 0, panelOpen = false }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const w = size;
    const h = size;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.5, 3);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(color, 0.8);
    fillLight.position.set(-2, 0, 2);
    scene.add(fillLight);

    // Load GLB — try both paths
    const loader = new GLTFLoader();
    const paths = [
      '/prova_aria_opt.gltf',
      '/prova_aria_opt.glb',
      './prova_aria_opt.gltf',
      './prova_aria_opt.glb',
    ];

    let tried = 0;
    function tryLoad(pathIndex) {
      if (pathIndex >= paths.length) {
        setError(true);
        return;
      }
      loader.load(
        paths[pathIndex],
        (gltf) => {
          const model = gltf.scene;

          // Center & scale
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const sizeVec = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
          const scale = 2 / maxDim;
          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));

          scene.add(model);
          setLoaded(true);

          // Animate — gentle float rotation
          let t = 0;
          const animate = () => {
            animFrameRef.current = requestAnimationFrame(animate);
            t += 0.01;
            model.rotation.y = Math.sin(t * 0.5) * 0.3;
            model.position.y = Math.sin(t) * 0.05;
            renderer.render(scene, camera);
          };
          animate();
        },
        undefined,
        () => tryLoad(pathIndex + 1)
      );
    }

    tryLoad(0);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [size, color]);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size,
        cursor: 'pointer',
        filter: `drop-shadow(0 0 12px ${color}88)`,
      }}
    >
      <div ref={mountRef} style={{ width: size, height: size }} />

      {/* Unread badge */}
      {newMessageCount > 0 && !panelOpen && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          minWidth: 18, height: 18, borderRadius: 9,
          background: '#EF4444', color: '#fff',
          fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px', zIndex: 2,
          border: '2px solid #080A0F',
          boxShadow: '0 0 6px #EF444499',
        }}>
          {newMessageCount > 9 ? '9+' : newMessageCount}
        </div>
      )}

      {/* Fallback label if error */}
      {error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48,
        }}>
          🤖
        </div>
      )}
    </div>
  );
}