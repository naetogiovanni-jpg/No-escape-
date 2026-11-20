import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { GameplayScene, SceneLaunchData } from '@/src/game/scenes/GameplayScene';

interface PhaserGameHostProps {
  launchData: SceneLaunchData;
  paused: boolean;
  restartNonce: number;
}

export function PhaserGameHost({ launchData, paused, restartNonce }: PhaserGameHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth || 1280,
      height: containerRef.current.clientHeight || 720,
      backgroundColor: '#060a12',
      pixelArt: false,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [GameplayScene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;
    game.scene.start('GameplayScene', launchData);

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [launchData.levelId, launchData.mode, launchData.operativeId, launchData.newGamePlus, restartNonce]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const scene = game.scene.getScene('GameplayScene');
    if (!scene) return;
    if (paused) {
      game.scene.pause('GameplayScene');
    } else {
      game.scene.resume('GameplayScene');
    }
  }, [paused]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#060a12] overflow-hidden select-none"
      aria-label="Shadow Protocol Game Canvas"
    />
  );
}
