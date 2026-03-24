import Phaser from 'phaser';
import { phaserConfig } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { TownScene } from './scenes/TownScene';
import { FormationScene } from './scenes/FormationScene';
import { SortieScene } from './scenes/SortieScene';
import { BattleScene } from './scenes/BattleScene';
import { RewardScene } from './scenes/RewardScene';
import { RunResultScene } from './scenes/RunResultScene';

const config: Phaser.Types.Core.GameConfig = {
  ...phaserConfig,
  scene: [BootScene, MainMenuScene, TownScene, FormationScene, SortieScene, BattleScene, RewardScene, RunResultScene],
};

new Phaser.Game(config);
