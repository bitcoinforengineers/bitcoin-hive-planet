
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Points, PointMaterial, CameraControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';

const API_BASE_URL = 'https://mempool.space/api';
const MEMPOOL_WEBSOCKET_URL = 'wss://mempool.space/api/v1/ws';

const ProtocolCore = () => {
  const meshRef = useRef();
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.y += 0.001;
    if (meshRef.current.material.uniforms) {
      meshRef.current.material.uniforms.time.value = time;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 2, 0]}>
      <icosahedronGeometry args={[0.5, 6]} />
      <shaderMaterial
        uniforms={{ time: { value: 0 } }}
        vertexShader={`
          varying vec3 vNormal;
          void main() {
            vNormal = normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
            intensity += sin(time * 2.0 + vNormal.y * 10.0) * 0.1;
            gl_FragColor = vec4(vec3(1.0, 0.6, 0.1) * intensity, 1.0);
          }
        `}
        blending={THREE.AdditiveBlending}
        transparent
      />
    </mesh>
  );
};

const Miners = ({ hashrate }) => {
  const count = Math.min(Math.floor(hashrate / 25) + 50, 5000);
  const pointsRef = useRef();

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 10 + Math.random() * 10;
      temp.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        speed: 0.05 + Math.random() * 0.1
      });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      const time = state.clock.getElapsedTime();
      particles.forEach((p, i) => {
        const i3 = i * 3;
        pointsRef.current.geometry.attributes.position.array[i3] = p.x + Math.sin(time * p.speed) * 0.5;
        pointsRef.current.geometry.attributes.position.array[i3 + 1] = p.y + Math.cos(time * p.speed) * 0.5;
      });
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    particles.forEach((p, i) => {
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
    });
    return pos;
  }, [count, particles]);

  return (
    <Points positions={positions} ref={pointsRef}>
      <PointMaterial color="#FFA500" size={0.08} sizeAttenuation depthWrite={false} transparent blending={THREE.AdditiveBlending} />
    </Points>
  );
};

const HiveCity = ({ blocks }) => {
  const hexRadius = 0.5;
  const hexWidth = Math.sqrt(3) * hexRadius;
  const hexHeight = 2 * hexRadius;

  const getHexPosition = (index) => {
    let q = 0, r = 0;
    if (index > 0) {
      let layer = Math.floor((Math.sqrt(1 + 12 * (index - 1)) + 3) / 6);
      let sideIndex = Math.floor((index - (3 * layer * (layer - 1) + 1)) / layer);
      let sidePos = (index - (3 * layer * (layer - 1) + 1)) % layer;
      
      const directions = [[1, 0], [0, -1], [-1, -1], [-1, 0], [0, 1], [1, 1]];
      q = layer * directions[sideIndex][0];
      r = layer * directions[sideIndex][1];

      const moveDir = directions[(sideIndex + 2) % 6];
      q += moveDir[0] * sidePos;
      r += moveDir[1] * sidePos;
    }
    const x = hexWidth * (q + r / 2);
    const z = (hexHeight * 3 / 4) * r;
    return [x, 0, z];
  };

  return (
    <group>
      {blocks.map((block, i) => {
        const [x, z] = getHexPosition(i);
        const height = Math.max(0.1, (block.tx_count / 2500) * 5);
        return (
          <mesh key={block.id} position={[x, height / 2, z]}>
            <cylinderGeometry args={[hexRadius, hexRadius, height, 6]} />
            <meshStandardMaterial color="#f7931a" emissive="#f7931a" emissiveIntensity={0.1 + (i === 0 ? 0.4 : 0)} roughness={0.6} metalness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
};

const TransactionBeams = ({ transactions }) => {
  return (
    <group>
      {transactions.map(tx => (
        <TransactionBeam key={tx.id} />
      ))}
    </group>
  );
};

const TransactionBeam = () => {
  const ref = useRef();
  const [start, end, progress] = useMemo(() => {
    const startPos = new THREE.Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40);
    const endPos = new THREE.Vector3((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5);
    return [startPos, endPos, 0];
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.material.uniforms.progress.value += 0.02;
    if (ref.current.material.uniforms.progress.value > 1) {
      ref.current.material.uniforms.progress.value = 0;
    }
  });

  const curve = new THREE.CatmullRomCurve3([start, end]);

  return (
    <mesh ref={ref}>
      <tubeGeometry args={[curve, 20, 0.01, 8, false]} />
      <shaderMaterial
        uniforms={{ progress: { value: 0 }, color: { value: new THREE.Color("#ffffff") } }}
        vertexShader={THREE.ShaderLib.basic.vertexShader}
        fragmentShader={`
          uniform float progress;
          uniform vec3 color;
          varying vec3 vViewPosition;
          void main() {
            float p = clamp(progress * 2.0 - 1.0, 0.0, 1.0);
            float dist = length(vViewPosition);
            float intensity = smoothstep(p - 0.1, p, 1.0 - gl_FragCoord.z) - smoothstep(p, p + 0.1, 1.0 - gl_FragCoord.z);
            if (progress > 0.95) {
              discard;
            }
            gl_FragColor = vec4(color, intensity * 0.8);
          }
        `}
        transparent
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

const EncryptedWall = ({ difficulty }) => {
  const meshRef = useRef();
  const speed = useMemo(() => 0.1 + (difficulty % 1) * 0.5, [difficulty]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.time.value = state.clock.getElapsedTime() * speed;
    }
  });

  return (
    <mesh ref={meshRef} scale={[8, 8, 8]} position={[0, 2, 0]}>
      <icosahedronGeometry args={[1, 5]} />
      <shaderMaterial
        uniforms={{ time: { value: 0 } }}
        vertexShader={`
          varying vec3 vNormal;
          void main() {
            vNormal = normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          varying vec3 vNormal;
          
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }

          void main() {
            vec3 viewNormal = normalize(vNormal);
            float intensity = sin(viewNormal.y * 20.0 + time) * 0.5 + 0.5;
            intensity *= pow(1.0 - abs(dot(vec3(0,1,0), viewNormal)), 2.0);
            gl_FragColor = vec4(vec3(1.0, 0.6, 0.1) * intensity, intensity);
          }
        `}
        blending={THREE.AdditiveBlending}
        transparent
        side={THREE.BackSide}
        wireframe
      />
    </mesh>
  );
};

const CyberHornetsVisualization = () => {
  const [data, setData] = useState({ hashrate: 500, blocks: [], transactions: [], difficulty: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hashrateRes, blocksRes, difficultyRes, mempoolRes] = await Promise.all([
          fetch(`${API_BASE_URL}/v1/mining/hashrate/1d`),
          fetch(`${API_BASE_URL}/api/blocks`),
          fetch(`${API_BASE_URL}/v1/difficulty-adjustment`),
          fetch(`${API_BASE_URL}/api/mempool/recent`),
        ]);
        const hashrateData = await hashrateRes.json();
        const blocksData = await blocksRes.json();
        const difficultyData = await difficultyRes.json();
        const mempoolData = await mempoolRes.json();
        
        setData(prev => ({
            ...prev,
            hashrate: hashrateData.currentHashrate / 1e18,
            blocks: blocksData.slice(0, 37),
            difficulty: difficultyData.currentDifficulty,
            transactions: mempoolData.slice(0, 20).map(tx => ({...tx, id: Math.random()})),
        }));
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };
    fetchData();
    const intervalId = setInterval(fetchData, 30000);

    const ws = new WebSocket(MEMPOOL_WEBSOCKET_URL);
    ws.onopen = () => {
      ws.send(JSON.stringify({ "action": "want", "data": ["blocks", "mempool-blocks"] }));
    };
    ws.onmessage = (event) => {
        const res = JSON.parse(event.data);
        if (res.block) {
            setData(prev => ({...prev, blocks: [res.block, ...prev.blocks.slice(0, 36)] }));
        }
        if (res['mempool-blocks']) {
            setData(prev => ({...prev, transactions: res['mempool-blocks'].slice(0, 20).map(tx => ({...tx, id: Math.random()})) }));
        }
    };

    return () => {
      clearInterval(intervalId);
      ws.close();
    };
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-black">
      <Canvas camera={{ position: [0, 15, 25], fov: 75 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 20, 0]} intensity={1.5} color="#f7931a" />
        <ProtocolCore />
        <Miners hashrate={data.hashrate} />
        <HiveCity blocks={data.blocks} />
        <TransactionBeams transactions={data.transactions} />
        <EncryptedWall difficulty={data.difficulty} />
        <Stars radius={200} depth={50} count={5000} factor={5} saturation={0} fade speed={1} />
        <CameraControls minDistance={10} maxDistance={50} />
      </Canvas>
    </div>
  );
};

export default CyberHornetsVisualization;
