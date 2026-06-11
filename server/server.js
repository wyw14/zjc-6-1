const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 6030;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const DIFFICULTY_CONFIG = {
  easy: { pairs: 6, name: '简单' },
  medium: { pairs: 8, name: '中等' },
  hard: { pairs: 12, name: '困难' }
};

let leaderboard = [];
let playerHistory = {};

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

app.get('/api/shuffle', (req, res) => {
  const difficulty = req.query.difficulty || 'medium';
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  const pairs = config.pairs;

  const cardIds = [];
  for (let i = 1; i <= pairs; i++) {
    cardIds.push(i, i);
  }
  const shuffled = shuffle(cardIds);
  res.json({ cards: shuffled, pairs: pairs, difficulty: difficulty });
});

app.post('/api/score', (req, res) => {
  const { time, playerName, avatar, difficulty, moves } = req.body;

  if (typeof time !== 'number' || time <= 0) {
    return res.status(400).json({ error: '无效的成绩数据' });
  }

  const entry = {
    id: Date.now(),
    time: time,
    playerName: playerName || '匿名玩家',
    avatar: avatar || '😀',
    difficulty: difficulty || 'medium',
    difficultyName: (DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium).name,
    moves: moves || 0,
    date: new Date().toLocaleString('zh-CN')
  };

  leaderboard.push(entry);
  leaderboard.sort((a, b) => a.time - b.time);
  leaderboard = leaderboard.slice(0, 20);

  const rank = leaderboard.findIndex(e => e.id === entry.id) + 1;

  const playerKey = `${playerName}_${avatar}`;
  if (!playerHistory[playerKey]) {
    playerHistory[playerKey] = [];
  }
  playerHistory[playerKey].unshift(entry);
  playerHistory[playerKey] = playerHistory[playerKey].slice(0, 10);

  res.json({
    success: true,
    rank: rank,
    leaderboard: leaderboard
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json({ leaderboard: leaderboard });
});

app.get('/api/history', (req, res) => {
  const playerName = req.query.playerName;
  const avatar = req.query.avatar;

  if (!playerName || !avatar) {
    return res.status(400).json({ error: '缺少玩家信息' });
  }

  const playerKey = `${playerName}_${avatar}`;
  res.json({ history: playerHistory[playerKey] || [] });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
