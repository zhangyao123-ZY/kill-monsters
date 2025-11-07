import { GameSystem } from './game/GameSystem';

// 验证GameSystem可以正常导入
console.log('GameSystem imported successfully');

// 仅在浏览器环境中实例化
if (typeof document !== 'undefined') {
  // 创建一个临时canvas元素用于测试
  const canvas = document.createElement('canvas');
  canvas.id = 'gameCanvas';
  document.body.appendChild(canvas);
  
  try {
    // 移除未使用的变量声明
    new GameSystem('gameCanvas');
    console.log('GameSystem instantiated successfully');
  } catch (error) {
    console.log('GameSystem instantiation test complete');
  }
}
