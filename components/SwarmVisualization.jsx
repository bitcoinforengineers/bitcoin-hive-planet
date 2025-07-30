
import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Howler } from 'howler';
import * as THREE from 'three';

import { useBitcoinData } from '@/hooks/useBitcoinData.js';
import HivePlanet from '@/components/swarm/HivePlanet.jsx';
import MinerSwarm from '@/components/swarm/MinerSwarm.jsx';
import TransactionBeams from '@/components/swarm/TransactionBeams.jsx';
import SceneFX from '@/components/swarm/SceneFX.jsx';
import UI from '@/components/swarm/UI.jsx';

const SwarmVisualization = ({ initialBlockHeight }) => {
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const { 
    info, 
    currentBlockHeight, 
    activeMiners, 
    txs, 
    pendingBlockPosition,
    allBlockData,
    visibleBlocks,
    setTooltip,
    tooltip,
   } = useBitcoinData(initialBlockHeight);

  const toggleSound = () => {
    setSoundEnabled(s => {
      const newSoundState = !s;
      Howler.mute(!newSoundState);
      return newSoundState;
    });
  };
  
  if (initialBlockHeight === null) {
      return (
        <div className="w-full h-full flex items-center justify-center flex-col bg-[#00000a]">
            <p className="mt-4 text-[#00ff00] font-mono">Initializing connection to the blockchain...</p>
        </div>
      );
  }

  return (
    <div className="w-full h-full relative font-mono text-lime-400 bg-[#00000a]">
      <Canvas camera={{ position: [0, 0, 180], fov: 75 }} gl={{ antialias: false, powerPreference: 'low-power', toneMapping: THREE.ReinhardToneMapping }}>
        <Suspense fallback={null}>
          <SceneFX hashrate={info.hashrate} />
          <HivePlanet 
            blocks={visibleBlocks}
            onBlockClick={(data, event) => setTooltip({ visible: true, data, event })}
            allBlockData={allBlockData}
          />
          <MinerSwarm activeMiners={activeMiners} />
          <TransactionBeams txs={txs} pendingBlockPosition={pendingBlockPosition} />
        </Suspense>
      </Canvas>

      <UI 
        info={info} 
        tooltip={tooltip} 
        setTooltip={setTooltip}
        soundEnabled={soundEnabled} 
        toggleSound={toggleSound}
      />
    </div>
  );
};

const PageWrapper = () => {
    const [initialBlockHeight, setInitialBlockHeight] = useState(null);
    const API_BASE_URL = 'https://mempool.space/api';

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/blocks/tip/height`);
                const height = await res.json();
                setInitialBlockHeight(height);
            } catch (e) {
                console.error("Failed to fetch initial block height:", e);
                setInitialBlockHeight(850000); 
            }
        };
        fetchInitialData();
    }, []);

    return <SwarmVisualization initialBlockHeight={initialBlockHeight} />;
};


export default PageWrapper;
