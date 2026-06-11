const API_BASE_URL = 'http://localhost:6030/api';

const CARD_EMOJIS = {
  1: '🍎',
  2: '🍐',
  3: '🍊',
  4: '🍋',
  5: '🍌',
  6: '🍉',
  7: '🍇',
  8: '🍓',
  9: '🫐',
  10: '🥝',
  11: '🍑',
  12: '🍒'
};

const DIFFICULTY_NAMES = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
};

const DEFAULT_AVATAR = '😀';
const DEFAULT_DIFFICULTY = 'medium';
const STORAGE_KEY = 'flip_card_player_profile';

const playerProfileScreen = document.getElementById('playerProfileScreen');
const gameScreen = document.getElementById('gameScreen');
const nicknameInput = document.getElementById('nicknameInput');
const avatarSelector = document.getElementById('avatarSelector');
const difficultySelector = document.getElementById('difficultySelector');
const startGameBtn = document.getElementById('startGameBtn');
const changeProfileBtn = document.getElementById('changeProfileBtn');

const currentPlayerAvatar = document.getElementById('currentPlayerAvatar');
const currentPlayerName = document.getElementById('currentPlayerName');
const currentPlayerDifficulty = document.getElementById('currentPlayerDifficulty');

const gameBoard = document.getElementById('gameBoard');
const timerEl = document.getElementById('timer');
const movesEl = document.getElementById('moves');
const matchedEl = document.getElementById('matched');
const restartBtn = document.getElementById('restartBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const historyBtn = document.getElementById('historyBtn');

const winModal = document.getElementById('winModal');
const leaderboardModal = document.getElementById('leaderboardModal');
const historyModal = document.getElementById('historyModal');

const finalTimeEl = document.getElementById('finalTime');
const finalMovesEl = document.getElementById('finalMoves');
const finalDifficultyEl = document.getElementById('finalDifficulty');
const winAvatar = document.getElementById('winAvatar');
const winName = document.getElementById('winName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const backToProfileBtn = document.getElementById('backToProfileBtn');

const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const leaderboardList = document.getElementById('leaderboardList');

const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('historyList');
const historyAvatar = document.getElementById('historyAvatar');
const historyName = document.getElementById('historyName');

let currentPlayer = {
  nickname: '',
  avatar: DEFAULT_AVATAR,
  difficulty: DEFAULT_DIFFICULTY
};

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let totalPairs = 8;
let moves = 0;
let timer = null;
let startTime = null;
let elapsedTime = 0;
let gameStarted = false;
let isProcessing = false;
let scoreSubmitted = false;

function loadPlayerProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const profile = JSON.parse(saved);
      currentPlayer = { ...currentPlayer, ...profile };
    }
  } catch (e) {
    console.error('加载玩家档案失败:', e);
  }
}

function savePlayerProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPlayer));
  } catch (e) {
    console.error('保存玩家档案失败:', e);
  }
}

function initProfileScreen() {
  loadPlayerProfile();

  if (currentPlayer.nickname) {
    nicknameInput.value = currentPlayer.nickname;
  }

  avatarSelector.querySelectorAll('.avatar-option').forEach(option => {
    if (option.dataset.avatar === currentPlayer.avatar) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });

  difficultySelector.querySelectorAll('.difficulty-option').forEach(option => {
    if (option.dataset.difficulty === currentPlayer.difficulty) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

avatarSelector?.addEventListener('click', (e) => {
  const option = e.target.closest('.avatar-option');
  if (!option) return;

  avatarSelector.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
  option.classList.add('selected');
  currentPlayer.avatar = option.dataset.avatar;
});

difficultySelector?.addEventListener('click', (e) => {
  const option = e.target.closest('.difficulty-option');
  if (!option) return;

  difficultySelector.querySelectorAll('.difficulty-option').forEach(o => o.classList.remove('selected'));
  option.classList.add('selected');
  currentPlayer.difficulty = option.dataset.difficulty;
});

nicknameInput?.addEventListener('input', (e) => {
  currentPlayer.nickname = e.target.value.trim();
});

startGameBtn?.addEventListener('click', () => {
  if (!currentPlayer.nickname) {
    currentPlayer.nickname = '匿名玩家';
  }
  savePlayerProfile();
  showGameScreen();
  initGame();
});

changeProfileBtn?.addEventListener('click', () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  showProfileScreen();
});

backToProfileBtn?.addEventListener('click', () => {
  winModal.classList.add('hidden');
  showProfileScreen();
});

function showProfileScreen() {
  gameScreen.classList.add('hidden');
  playerProfileScreen.classList.remove('hidden');
  initProfileScreen();
}

function showGameScreen() {
  playerProfileScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  updatePlayerBar();
}

function updatePlayerBar() {
  currentPlayerAvatar.textContent = currentPlayer.avatar;
  currentPlayerName.textContent = currentPlayer.nickname || '匿名玩家';
  currentPlayerDifficulty.textContent = DIFFICULTY_NAMES[currentPlayer.difficulty] || '中等';
}

async function initGame() {
  resetGameState();
  const shuffledData = await fetchShuffledCards();
  totalPairs = shuffledData.pairs || 8;
  matchedEl.textContent = `0/${totalPairs}`;
  renderCards(shuffledData.cards);
}

function resetGameState() {
  cards = [];
  flippedCards = [];
  matchedPairs = 0;
  moves = 0;
  elapsedTime = 0;
  gameStarted = false;
  isProcessing = false;
  scoreSubmitted = false;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  updateTimerDisplay();
  movesEl.textContent = '0';
  gameBoard.innerHTML = '';
}

async function fetchShuffledCards() {
  try {
    const response = await fetch(`${API_BASE_URL}/shuffle?difficulty=${currentPlayer.difficulty}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取洗牌数据失败:', error);
    const pairs = currentPlayer.difficulty === 'easy' ? 6 : currentPlayer.difficulty === 'hard' ? 12 : 8;
    const fallbackCards = [];
    for (let i = 1; i <= pairs; i++) {
      fallbackCards.push(i, i);
    }
    for (let i = fallbackCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fallbackCards[i], fallbackCards[j]] = [fallbackCards[j], fallbackCards[i]];
    }
    return { cards: fallbackCards, pairs: pairs };
  }
}

function renderCards(cardIds) {
  const pairs = cardIds.length / 2;
  let cols = 4;
  if (pairs === 6) cols = 4;
  if (pairs === 8) cols = 4;
  if (pairs === 12) cols = 6;

  gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  cardIds.forEach((cardId, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = cardId;
    card.dataset.index = index;

    const cardBack = document.createElement('div');
    cardBack.className = 'card-face card-back';

    const cardFront = document.createElement('div');
    cardFront.className = 'card-face card-front';
    cardFront.textContent = CARD_EMOJIS[cardId] || '❓';

    card.appendChild(cardBack);
    card.appendChild(cardFront);

    card.addEventListener('click', () => handleCardClick(card));

    gameBoard.appendChild(card);
    cards.push(card);
  });
}

function handleCardClick(card) {
  if (isProcessing) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  if (flippedCards.length >= 2) return;

  if (!gameStarted) {
    startTimer();
    gameStarted = true;
  }

  flipCard(card);
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    moves++;
    movesEl.textContent = moves;
    checkMatch();
  }
}

function flipCard(card) {
  card.classList.add('flipped');
}

function unflipCard(card) {
  card.classList.remove('flipped');
}

function checkMatch() {
  isProcessing = true;

  const [card1, card2] = flippedCards;
  const id1 = parseInt(card1.dataset.id);
  const id2 = parseInt(card2.dataset.id);

  if (id1 === id2) {
    setTimeout(() => {
      card1.classList.add('matched');
      card2.classList.add('matched');
      matchedPairs++;
      matchedEl.textContent = `${matchedPairs}/${totalPairs}`;
      flippedCards = [];
      isProcessing = false;

      if (matchedPairs === totalPairs) {
        endGame();
      }
    }, 500);
  } else {
    setTimeout(() => {
      unflipCard(card1);
      unflipCard(card2);
      flippedCards = [];
      isProcessing = false;
    }, 1000);
  }
}

function startTimer() {
  startTime = Date.now() - elapsedTime;
  timer = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    updateTimerDisplay();
  }, 100);
}

function updateTimerDisplay() {
  const totalSeconds = Math.floor(elapsedTime / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function endGame() {
  clearInterval(timer);
  timer = null;

  winAvatar.textContent = currentPlayer.avatar;
  winName.textContent = currentPlayer.nickname || '匿名玩家';
  finalDifficultyEl.textContent = DIFFICULTY_NAMES[currentPlayer.difficulty] || '中等';
  finalTimeEl.textContent = timerEl.textContent;
  finalMovesEl.textContent = moves;

  setTimeout(() => {
    winModal.classList.remove('hidden');
  }, 500);
}

async function submitScore() {
  if (scoreSubmitted) {
    alert('成绩已提交！');
    return;
  }

  const timeInSeconds = Math.floor(elapsedTime / 1000);

  try {
    const response = await fetch(`${API_BASE_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        time: timeInSeconds,
        playerName: currentPlayer.nickname || '匿名玩家',
        avatar: currentPlayer.avatar,
        difficulty: currentPlayer.difficulty,
        moves: moves
      })
    });

    const data = await response.json();

    if (data.success) {
      scoreSubmitted = true;
      alert(`恭喜！你排名第 ${data.rank} 名！`);
      winModal.classList.add('hidden');
      showLeaderboard();
    }
  } catch (error) {
    console.error('提交成绩失败:', error);
    alert('提交成绩失败，请稍后重试');
  }
}

async function showLeaderboard() {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard`);
    const data = await response.json();
    renderLeaderboard(data.leaderboard);
  } catch (error) {
    console.error('获取排行榜失败:', error);
    leaderboardList.innerHTML = '<li class="empty-message">加载排行榜失败</li>';
  }

  leaderboardModal.classList.remove('hidden');
}

function renderLeaderboard(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) {
    leaderboardList.innerHTML = '<li class="empty-message">暂无记录，快来挑战吧！</li>';
    return;
  }

  leaderboardList.innerHTML = '';

  leaderboard.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'rank-item';

    const minutes = Math.floor(entry.time / 60);
    const seconds = entry.time % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    li.innerHTML = `
      <span class="rank-name">
        <span class="rank">#${index + 1}</span>
        <span class="entry-avatar">${entry.avatar || '😀'}</span>
        <span class="name">${entry.playerName}</span>
        <span class="diff-tag">${entry.difficultyName || '中等'}</span>
      </span>
      <span class="time-moves">
        <span class="time">${timeStr}</span>
        <span class="moves-count">${entry.moves || 0}步</span>
      </span>
    `;

    leaderboardList.appendChild(li);
  });
}

async function showHistory() {
  historyAvatar.textContent = currentPlayer.avatar;
  historyName.textContent = currentPlayer.nickname || '匿名玩家';

  try {
    const response = await fetch(`${API_BASE_URL}/history?playerName=${encodeURIComponent(currentPlayer.nickname || '匿名玩家')}&avatar=${encodeURIComponent(currentPlayer.avatar)}`);
    const data = await response.json();
    renderHistory(data.history);
  } catch (error) {
    console.error('获取历史记录失败:', error);
    historyList.innerHTML = '<li class="empty-message">加载历史记录失败</li>';
  }

  historyModal.classList.remove('hidden');
}

function renderHistory(history) {
  if (!history || history.length === 0) {
    historyList.innerHTML = '<li class="empty-message">暂无游戏记录，快去玩一局吧！</li>';
    return;
  }

  historyList.innerHTML = '';

  history.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const minutes = Math.floor(entry.time / 60);
    const seconds = entry.time % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    li.innerHTML = `
      <span class="history-index">#${index + 1}</span>
      <span class="history-info">
        <span class="diff-tag">${entry.difficultyName || '中等'}</span>
        <span class="time">${timeStr}</span>
        <span class="moves-count">${entry.moves || 0}步</span>
      </span>
      <span class="history-date">${entry.date}</span>
    `;

    historyList.appendChild(li);
  });
}

restartBtn?.addEventListener('click', initGame);
playAgainBtn?.addEventListener('click', () => {
  winModal.classList.add('hidden');
  initGame();
});
leaderboardBtn?.addEventListener('click', showLeaderboard);
historyBtn?.addEventListener('click', showHistory);
closeLeaderboardBtn?.addEventListener('click', () => {
  leaderboardModal.classList.add('hidden');
});
closeHistoryBtn?.addEventListener('click', () => {
  historyModal.classList.add('hidden');
});
submitScoreBtn?.addEventListener('click', submitScore);

initProfileScreen();
