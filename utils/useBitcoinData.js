
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as THREE from 'three';

const API_BASE_URL = 'https://mempool.space/api';
const BLOCKS_PER_HALVING = 210000;
const TOTAL_HALVINGS = 33;
const TOTAL_BLOCKS = BLOCKS_PER_HALVING * TOTAL_HALVINGS;
const BLOCKS_TO_VISUALIZE = 20000;
const SPHERE_RADIUS = 60;
const GENESIS_TIME = new Date('2009-01-03T18:15:05Z').getTime();

const halvingRewards = Array.from({ length: TOTAL_HALVINGS }, (_, i) => 50 / Math.pow(2, i));
const visualWeight = reward => Math.log10(reward + 1);
const totalWeight = halvingRewards.reduce((sum, r) => sum + visualWeight(r), 0);
const visualBlockCounts = halvingRewards.map(r => Math.ceil((visualWeight(r) / totalWeight) * BLOCKS_TO_VISUALIZE));

export const useBitcoinData = (initialBlockHeight) => {
  const [info, setInfo] = useState({ hashrate: '...', miners: '...', block: initialBlockHeight, mempool: '...' });
  const [currentBlockHeight, setCurrentBlockHeight] = useState(initialBlockHeight);
  const [activeMiners, setActiveMiners] = useState(0);
  const [txs, setTxs] = useState([]);
  const processedTxs = useRef(new Set());
  const pendingBlockPosition = useRef(new THREE.Vector3());
  const [tooltip, setTooltip] = useState({ visible: false, data: null, event: null });
  
  const allBlockData = useMemo(() => {
    if (initialBlockHeight === null) return [];
    const data = [];
    const phi = Math.PI * (3.0 - Math.sqrt(5.0)); 
    let blockIndex = 0;
    
    for (let halving = 0; halving < TOTAL_HALVINGS; halving++) {
        const numBlocksInEpoch = visualBlockCounts[halving];
        const reward = halvingRewards[halving];

        for (let i = 0; i < numBlocksInEpoch; i++, blockIndex++) {
            const y = 1 - (blockIndex / (BLOCKS_TO_VISUALIZE - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * blockIndex;
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            
            const realBlockHeight = Math.floor((blockIndex / BLOCKS_TO_VISUALIZE) * TOTAL_BLOCKS);
            const scale = Math.max(0.15, Math.log2(reward + 1) * 0.25);
            const estDate = new Date(GENESIS_TIME + realBlockHeight * 600000).toLocaleString();

            data.push({
                key: `block-${realBlockHeight}`,
                position: new THREE.Vector3(x, y, z).multiplyScalar(SPHERE_RADIUS),
                scale: [scale, scale, scale],
                userData: {
                    realHeight: realBlockHeight,
                    reward: reward.toFixed(4),
                    estDate: estDate,
                    status: 'Future',
                    halving,
                }
            });
        }
    }
    return data;
  }, [initialBlockHeight]);

  const [visibleBlocks, setVisibleBlocks] = useState({ future: [], mined: [], pending: null });

  const updatePlanetState = useCallback((newHeight) => {
    if (!newHeight || (currentBlockHeight && newHeight <= currentBlockHeight)) return;

    let mined = [];
    let future = [];
    allBlockData.forEach(block => {
        if (block.userData.realHeight <= newHeight) {
            mined.push({ ...block, userData: { ...block.userData, status: 'Mined' }});
        } else {
            future.push(block);
        }
    });

    future.sort((a,b) => a.userData.realHeight - b.userData.realHeight);
    
    let pending = null;
    if (future.length > 0) {
        pending = future.shift();
        pending.userData.status = 'Pending';
        pendingBlockPosition.current.copy(pending.position);
    }
    
    setVisibleBlocks({ future, mined, pending });
    setCurrentBlockHeight(newHeight);
  }, [allBlockData, currentBlockHeight]);

  useEffect(() => {
    if (initialBlockHeight !== null) {
      updatePlanetState(initialBlockHeight);
    }
  }, [initialBlockHeight, updatePlanetState]);

  const createTxBeam = useCallback((newTxs) => {
    const freshTxs = newTxs.filter(tx => !processedTxs.current.has(tx.txid));
    freshTxs.forEach(tx => processedTxs.current.add(tx.txid));
    if (processedTxs.current.size > 500) {
        const oldest = processedTxs.current.values().next().value;
        processedTxs.current.delete(oldest);
    }
    setTxs(freshTxs);
  }, []);

  useEffect(() => {
    if (initialBlockHeight === null) return;
    
    const fetchWithIdleCallback = (fetcher, interval) => {
      let handle;
      const loop = () => {
        requestIdleCallback(async () => {
          await fetcher();
          handle = setTimeout(loop, interval);
        });
      };
      loop();
      return () => clearTimeout(handle);
    };
    
    const fetchHashrate = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/v1/mining/hashrate/1d`);
        const data = await res.json();
        const hashrateInEH = (data.hashrates[data.hashrates.length - 1].hashrate / 1e18);
        const newActiveMiners = Math.min(4000, Math.floor(hashrateInEH * 8));
        setActiveMiners(newActiveMiners);
        setInfo(prev => ({ ...prev, hashrate: `${hashrateInEH.toFixed(2)} EH/s`, miners: newActiveMiners }));
      } catch (e) { console.error("Failed to fetch hashrate:", e); }
    };

    const fetchBlockHeight = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/blocks/tip/height`);
        const newHeight = await res.json();
        if (newHeight > currentBlockHeight) {
           setInfo(prev => ({ ...prev, block: newHeight }));
           updatePlanetState(newHeight);
        }
      } catch (e) { console.error("Failed to fetch block height:", e); }
    };

    const fetchRecentTxs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/mempool/recent`);
        const recentTxs = await res.json();
        setInfo(prev => ({ ...prev, mempool: `${recentTxs.length} new txs` }));
        createTxBeam(recentTxs.slice(0, 5));
      } catch (e) { console.error("Failed to fetch recent transactions:", e); }
    };

    fetchHashrate();
    fetchRecentTxs();
    
    const clearHashrateInterval = fetchWithIdleCallback(fetchHashrate, 60000);
    const clearBlockInterval = fetchWithIdleCallback(fetchBlockHeight, 10000);
    const clearTxInterval = fetchWithIdleCallback(fetchRecentTxs, 5000);

    return () => {
      clearHashrateInterval();
      clearBlockInterval();
      clearTxInterval();
    };
  }, [initialBlockHeight, currentBlockHeight, createTxBeam, updatePlanetState]);

  return { info, currentBlockHeight, activeMiners, txs, pendingBlockPosition, allBlockData, visibleBlocks, setTooltip, tooltip };
};
