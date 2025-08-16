// 全局变量
let currentScore = 0;
let playerName = "";
const leaderboardRef = db.ref('leaderboard'); // 数据库引用

// DOM元素
const startGameBtn = document.getElementById('start-game-btn');
const nameEntryModal = document.getElementById('name-entry-modal');
const playerNameInput = document.getElementById('player-name-input');
const confirmNameBtn = document.getElementById('confirm-name-btn');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const leaderboardList = document.getElementById('leaderboard-list');
const continueToLeaderboardBtn = document.getElementById('continue-to-leaderboard-btn');

// 初始化游戏
function initGame() {
    // 绑定按钮事件
    startGameBtn.addEventListener('click', () => {
        nameEntryModal.style.display = 'flex'; // 显示名字输入框
    });

    confirmNameBtn.addEventListener('click', () => {
        playerName = playerNameInput.value.trim() || '匿名玩家';
        nameEntryModal.style.display = 'none';
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        startLevel1(); // 开始第一关
    });

    continueToLeaderboardBtn.addEventListener('click', () => {
        document.getElementById('level2-end-screen').classList.remove('active');
        document.getElementById('game-over-screen').classList.add('active');
        finalScoreElement.textContent = currentScore;
        saveScore(playerName, currentScore); // 保存分数到云端
    });

    // 加载排行榜
    loadLeaderboard();
}

// 第一关逻辑（示例，根据你的实际逻辑修改）
function startLevel1() {
    currentScore = 0;
    scoreElement.textContent = currentScore;
    // 你的关卡1逻辑（如生成物品、碰撞检测等）
    // 示例：每2秒增加100分（实际应替换为你的游戏逻辑）
    const level1Timer = setInterval(() => {
        currentScore += 100;
        scoreElement.textContent = currentScore;
        if (currentScore >= 500) { // 达到目标分进入第二关
            clearInterval(level1Timer);
            document.getElementById('level1').classList.remove('active');
            document.getElementById('level-transition').classList.add('active');
            setTimeout(() => {
                document.getElementById('level-transition').classList.remove('active');
                document.getElementById('level2').classList.add('active');
                startLevel2();
            }, 2000);
        }
    }, 2000);
}

// 第二关逻辑（示例，根据你的实际逻辑修改）
function startLevel2() {
    let remainingTime = 35;
    const timeElement = document.getElementById('remaining-time');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    
    const level2Timer = setInterval(() => {
        remainingTime -= 0.1;
        timeElement.textContent = remainingTime.toFixed(1);
        const progress = Math.min(100, (35 - remainingTime) / 35 * 100);
        progressBar.style.width = `${progress}%`;
        progressPercentage.textContent = `${Math.round(progress)}%`;

        if (remainingTime <= 0) {
            clearInterval(level2Timer);
            endGame(true); // 游戏结束
        }
    }, 100);
}

// 游戏结束处理
function endGame(isSuccess) {
    document.getElementById('game-screen').classList.remove('active');
    const endScreen = document.getElementById('level2-end-screen');
    endScreen.classList.add('active');
    document.getElementById('end-title').textContent = isSuccess ? '挑战成功！' : '挑战失败';
    document.getElementById('end-details').innerHTML = `<p>最终得分: ${currentScore}</p>`;
}

// 保存分数到云端
function saveScore(name, score) {
    leaderboardRef.push({
        name: name,
        score: score,
        timestamp: new Date().getTime() // 用于排序
    });
}

// 从云端加载排行榜
function loadLeaderboard() {
    leaderboardRef
        .orderByChild('score')
        .limitToLast(10) // 取前10名
        .on('value', (snapshot) => {
            const scores = snapshot.val() || {};
            const scoreList = Object.values(scores).sort((a, b) => b.score - a.score); // 降序排序
            leaderboardList.innerHTML = ''; // 清空列表
            
            scoreList.forEach((item, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${index + 1}. ${item.name}</span><span>${item.score}</span>`;
                leaderboardList.appendChild(li);
            });
        });
}

// 页面加载完成后初始化
window.onload = initGame;
