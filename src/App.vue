<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { GameSystem } from './game/GameSystem';

let gameSystem: GameSystem | null = null;

onMounted(() => {
  // 初始化游戏系统
  gameSystem = new GameSystem('gameCanvas');
  
  // 处理异步启动
  gameSystem.start().catch(error => {
    console.error('Game start failed:', error);
  });
});

onUnmounted(() => {
  // 清理游戏资源
  if (gameSystem) {
    gameSystem.stop();
  }
});
</script>

<template>
  <div class="game-container">
    <canvas id="gameCanvas" class="game-canvas"></canvas>
  </div>
</template>

<style scoped>
.game-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #1a1a1a;
}

.game-canvas {
  display: block;
  cursor: crosshair;
}
</style>
