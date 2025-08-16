document.addEventListener('DOMContentLoaded', () => {
    // ----- UI Elements -----
    const screens = { start: document.getElementById('start-screen'), instructions: document.getElementById('instructions-screen'), game: document.getElementById('game-screen'), success: document.getElementById('level2-end-screen'), gameOver: document.getElementById('game-over-screen') };
    const modals = { nameEntry: document.getElementById('name-entry-modal') };
    const buttons = { startGame: document.getElementById('start-game-btn'), instructions: document.getElementById('instructions-btn'), confirmName: document.getElementById('confirm-name-btn'), backToMenu: document.querySelectorAll('.back-to-menu'), restartGame: document.getElementById('restart-game-btn'), continueToLeaderboard: document.getElementById('continue-to-leaderboard-btn') };
    const displays = { score: document.getElementById('score'), timer: document.getElementById('timer'), remainingTime: document.getElementById('remaining-time'), feedbackText: document.getElementById('feedback-text'), endTitle: document.getElementById('end-title'), endDetails: document.getElementById('end-details'), finalScore: document.getElementById('final-score'), leaderboardList: document.getElementById('leaderboard-list'), instructionsContent: document.getElementById('instructions-content'), progressBar: document.getElementById('progress-bar'), progressPercentage: document.getElementById('progress-percentage') };
    const gameAreas = { level1: document.getElementById('game-area1'), level2: document.getElementById('game-area2') };
    const levels = { level1: document.getElementById('level1'), levelTransition: document.getElementById('level-transition'), level2: document.getElementById('level2') };
    const playerElements = { box: document.getElementById('player-box'), truck: document.getElementById('player-truck') };
    const playerNameInput = document.getElementById('player-name-input');

    // ----- Game State Variables -----
    let gameState = 'menu'; // menu, playing, paused, ended
    let currentLevel = 1;
    let playerName = "玩家";
    let score = 0;
    let finalScore = 0;
    let level1Timer = 30;
    let level2TotalTime = 35;
    let hitCooldown = false;
    let animationFrameId = null;

    // ----- Game Constants & Data -----
    const TARGET_SCORE = 500;
    const PENALTY_PER_COLLISION = 3;
    const SAFE_DRIVING_INTERVAL = 8;
    const SAFE_DRIVING_BONUS = 2;
    const LEVEL_2_DURATION = 30;
    const itemTypes = {
        engine: { name: '发动机', score: 50, speed: 4, size: 100, img: 'images/engine.png' },
        battery: { name: '汽车电池', score: 40, speed: 4, size: 50, img: 'images/battery.png' },
        tire: { name: '轮胎', score: 10, speed: 3, size: 70, img: 'images/tire.png' },
        brake_disc: { name: '刹车盘', score: 20, speed: 4, size: 65, img: 'images/brake_disc.png' },
        piston: { name: '活塞', score: 15, speed: 3, size: 60, img: 'images/piston.png' },
        star: { name: '奔驰星徽', score: 30, speed: 5, size: 60, img: 'images/star.png' },
        oil: { name: '废油桶', score: -20, speed: 4, size: 65, img: 'images/oil_barrel.png' },
        screw: { name: '螺丝', score: 1, speed: 2, size: 30, img: 'images/screw.png' }
    };
    const level1WeightedItems = ['engine', 'battery', 'battery', 'tire', 'tire', 'tire', 'brake_disc', 'brake_disc', 'piston', 'piston', 'piston', 'star', 'star', 'screw', 'screw', 'screw', 'oil', 'oil', 'oil', 'oil'];
    const roadObjectTypes = { cone: { img: 'images/obstacle.png', size: 50 }, car_obstacle_red: { img: 'images/car_obstacle_red.png', size: 55 }, car_obstacle_blue: { img: 'images/car_obstacle_blue.png', size: 55 } };

    // ----- Initialization -----
    function init() {
        generateInstructions();
        movePlayer(playerElements.box, window.innerWidth / 2);
        movePlayer(playerElements.truck, window.innerWidth / 2);

        buttons.startGame.addEventListener('click', () => { modals.nameEntry.style.display = 'flex'; });
        buttons.confirmName.addEventListener('click', () => { const name = playerNameInput.value.trim(); if (name) { playerName = name; modals.nameEntry.style.display = 'none'; startGame(); } else { alert('请输入你的名字！'); } });
        buttons.instructions.addEventListener('click', () => showScreen('instructions'));
        buttons.backToMenu.forEach(btn => btn.addEventListener('click', () => showScreen('start')));
        buttons.restartGame.addEventListener('click', () => { showScreen('start'); });
        buttons.continueToLeaderboard.addEventListener('click', () => showScreen('gameOver'));
        
        gameAreas.level1.addEventListener('touchmove', (e) => { e.preventDefault(); if(gameState === 'playing' && currentLevel === 1) movePlayer(playerElements.box, e.touches[0].clientX); }, { passive: false });
        gameAreas.level1.addEventListener('mousemove', (e) => { if (e.buttons === 1 && gameState === 'playing' && currentLevel === 1) movePlayer(playerElements.box, e.clientX); });
        gameAreas.level2.addEventListener('touchmove', (e) => { e.preventDefault(); if(gameState === 'playing' && currentLevel === 2) movePlayer(playerElements.truck, e.touches[0].clientX); }, { passive: false });
        gameAreas.level2.addEventListener('mousemove', (e) => { if (e.buttons === 1 && gameState === 'playing' && currentLevel === 2) movePlayer(playerElements.truck, e.clientX); });
    }
    
    // ----- Game Flow -----
    function showScreen(screenName) { Object.values(screens).forEach(s => s.classList.remove('active')); screens[screenName].classList.add('active'); }
    function startGame() { resetGame(); showScreen('game'); startLevel1(); }
    function resetGame() {
        cancelAnimationFrame(animationFrameId);
        gameState = 'menu';
        score = 0;
        finalScore = 0;
        level1Timer = 30;
        level2TotalTime = 35;
        hitCooldown = false;
        displays.score.textContent = score;
        displays.timer.textContent = level1Timer;
        displays.remainingTime.textContent = level2TotalTime.toFixed(1);
        gameAreas.level1.innerHTML = ''; gameAreas.level1.appendChild(playerElements.box);
        gameAreas.level2.innerHTML = ''; gameAreas.level2.appendChild(playerElements.truck); gameAreas.level2.appendChild(displays.feedbackText);
        levels.level1.classList.add('active');
        levels.levelTransition.style.display = 'none';
        levels.level2.classList.remove('active');
    }

    // ----- Game Loop Engine -----
    let lastTime = 0, level1ItemTimer = 0, level2ObjectTimer = 0, level1SecondCounter = 0, level2ElapsedTime = 0, level2SafeDrivingTimer = 0;
    function gameLoop(timestamp) {
        if (gameState !== 'playing') return;
        if (!lastTime) lastTime = timestamp;
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        if (currentLevel === 1) {
            level1SecondCounter += deltaTime;
            if (level1SecondCounter >= 1) { level1SecondCounter -= 1; level1Timer--; displays.timer.textContent = Math.max(0, Math.ceil(level1Timer)); if (level1Timer <= 0) { endLevel1(); return; } }
            level1ItemTimer += deltaTime;
            if (level1ItemTimer >= 0.65) { level1ItemTimer = 0; createItem_L1(); }
            moveItems_L1(deltaTime);
            checkCollisions_L1();
        } else if (currentLevel === 2) {
            level2ElapsedTime += deltaTime;
            level2TotalTime -= deltaTime;
            level2SafeDrivingTimer += deltaTime;
            displays.remainingTime.textContent = Math.max(0, level2TotalTime).toFixed(1);
            const progress = Math.min((level2ElapsedTime / LEVEL_2_DURATION) * 100, 100);
            displays.progressBar.style.width = `${progress}%`;
            displays.progressPercentage.textContent = `${Math.floor(progress)}%`;

            if (level2SafeDrivingTimer >= SAFE_DRIVING_INTERVAL) {
                level2SafeDrivingTimer = 0;
                level2TotalTime += SAFE_DRIVING_BONUS;
                showFeedback(`+${SAFE_DRIVING_BONUS}s`, '#4CAF50');
            }
            level2ObjectTimer += deltaTime;
            if (level2ObjectTimer >= 1.2) { level2ObjectTimer = 0; createRoadObject_L2(); }
            moveRoadObjects_L2(deltaTime);
            checkTruckCollisions_L2();
            if (level2TotalTime <= 0) { endLevel2(false); return; }
            if (level2ElapsedTime >= LEVEL_2_DURATION) { endLevel2(true); return; }
        }
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // ----- Level 1 -----
    function startLevel1() { currentLevel = 1; gameState = 'playing'; lastTime = 0; level1ItemTimer = 0; level1SecondCounter = 0; animationFrameId = requestAnimationFrame(gameLoop); }
    function createItem_L1() { const key = level1WeightedItems[Math.floor(Math.random() * level1WeightedItems.length)]; const data = itemTypes[key]; const el = document.createElement('div'); el.className = 'item'; el.style.width = `${data.size}px`; el.style.height = `${data.size}px`; el.style.backgroundImage = `url(${data.img})`; el.style.left = `${Math.random() * (gameAreas.level1.offsetWidth - data.size)}px`; el.style.top = `-${data.size}px`; el.dataset.speed = data.speed * 60; el.dataset.type = key; gameAreas.level1.appendChild(el); }
    function moveItems_L1(deltaTime) { gameAreas.level1.querySelectorAll('.item').forEach(item => { item.style.top = `${item.offsetTop + parseFloat(item.dataset.speed) * deltaTime}px`; if (item.offsetTop > gameAreas.level1.offsetHeight) item.remove(); }); }
    function checkCollisions_L1() { if (gameState !== 'playing') return; const boxRect = playerElements.box.getBoundingClientRect(); gameAreas.level1.querySelectorAll('.item').forEach(item => { const itemRect = item.getBoundingClientRect(); if (boxRect.left < itemRect.right && boxRect.right > itemRect.left && boxRect.top < itemRect.bottom && boxRect.bottom > itemRect.top) { handleCollision_L1(item); item.remove(); } }); }
    function handleCollision_L1(item) { const data = itemTypes[item.dataset.type]; score += data.score; displays.score.textContent = score; if(item.dataset.type === 'oil') { document.body.style.filter = 'blur(3px)'; setTimeout(() => { document.body.style.filter = 'none'; }, 500); } }
    function endLevel1() { if (gameState !== 'playing') return; gameState = 'ended'; cancelAnimationFrame(animationFrameId); if (score >= TARGET_SCORE) { levels.level1.classList.remove('active'); levels.levelTransition.style.display = 'flex'; setTimeout(() => { levels.levelTransition.style.display = 'none'; levels.level2.classList.add('active'); startLevel2(); }, 2000); } else { gameOver(true, 'l1'); } }

    // ----- Level 2 -----
    function startLevel2() { currentLevel = 2; gameState = 'playing'; lastTime = 0; level2ObjectTimer = 0; level2ElapsedTime = 0; level2SafeDrivingTimer = 0; animationFrameId = requestAnimationFrame(gameLoop); }
    function createRoadObject_L2() { const keys = Object.keys(roadObjectTypes); const key = keys[Math.floor(Math.random() * keys.length)]; const data = roadObjectTypes[key]; const el = document.createElement('div'); el.className = 'obstacle'; el.style.width = `${data.size}px`; el.style.height = `${data.size}px`; el.style.backgroundImage = `url(${data.img})`; el.style.left = `${Math.random() * (gameAreas.level2.offsetWidth - data.size)}px`; el.style.top = `-${data.size}px`; gameAreas.level2.appendChild(el); }
    function moveRoadObjects_L2(deltaTime) { gameAreas.level2.querySelectorAll('.obstacle').forEach(obj => { obj.style.top = `${obj.offsetTop + 300 * deltaTime}px`; if (obj.offsetTop > gameAreas.level2.offsetHeight) obj.remove(); }); }
    function checkTruckCollisions_L2() { if (hitCooldown || gameState !== 'playing') return; const truckRect = playerElements.truck.getBoundingClientRect(); gameAreas.level2.querySelectorAll('.obstacle').forEach(obj => { const objRect = obj.getBoundingClientRect(); if (truckRect.left < objRect.right && truckRect.right > objRect.left && truckRect.top < objRect.bottom && truckRect.bottom > objRect.top) { obj.remove(); triggerHitPenalty(); } }); }
    function triggerHitPenalty() { hitCooldown = true; level2SafeDrivingTimer = 0; level2TotalTime -= PENALTY_PER_COLLISION; showFeedback(`-${PENALTY_PER_COLLISION}s`, '#ff4d4d'); playerElements.truck.classList.add('hit'); setTimeout(() => { playerElements.truck.classList.remove('hit'); hitCooldown = false; }, 1000); }
    function showFeedback(text, color) { const el = displays.feedbackText; el.textContent = text; el.style.color = color; el.style.opacity = 1; setTimeout(() => { el.style.opacity = 0; }, 1000); }
    
    function endLevel2(isSuccess) {
        if (gameState !== 'playing') return;
        gameState = 'ended';
        cancelAnimationFrame(animationFrameId);
        
        if (isSuccess) {
            const timeBonus = (level2TotalTime > 0) ? Math.floor(level2TotalTime * 100) : 0;
            finalScore = score + timeBonus;
            displays.endTitle.textContent = "恭喜！零件已成功送达！";
            displays.endDetails.innerHTML = `<p>剩余时间奖励: ${level2TotalTime.toFixed(1)}s × 100 = +${timeBonus}</p>`;
        } else {
            finalScore = score;
            displays.endTitle.textContent = "运输失败！";
            displays.endDetails.innerHTML = `<p>时间耗尽！</p>`;
        }
        showScreen('success');
    }
    
    // ----- Game Over & Score -----
    function gameOver(isL1Fail = false) {
        if (isL1Fail) {
            displays.finalScore.textContent = "未达到目标分数！";
        } else {
            displays.finalScore.textContent = finalScore;
        }
        showScreen('gameOver');
        // We can add a simple local leaderboard here later if needed
    }
    
    function movePlayer(element, x) { const parent = element.parentElement; const parentWidth = parent.offsetWidth; const playerWidth = element.offsetWidth; let newLeft = x - playerWidth / 2; if (newLeft < 0) newLeft = 0; if (newLeft > parentWidth - playerWidth) newLeft = parentWidth - playerWidth; element.style.left = `${newLeft}px`; }
    function generateInstructions() {
        let partsList = '';
        Object.keys(itemTypes).forEach(key => {
            const item = itemTypes[key];
            const scoreText = (item.score > 0 ? '+' : '') + item.score;
            const style = item.score < 0 ? 'style="color: #ffdddd;"' : '';
            partsList += `<li ${style}>${item.name}: ${scoreText}</li>`;
        });
        displays.instructionsContent.innerHTML = `<h3>第一关：零件收集</h3><p><strong>目标：</strong>在30秒内达到<strong>${TARGET_SCORE}分</strong>！</p><ul>${partsList}</ul><hr><h3>第二关：动态行程挑战</h3><p><strong>目标：</strong>在<strong>总时间耗尽前</strong>抵达终点！</p><p><strong>奖励：</strong>每连续安全驾驶8秒，<strong>总时间+${SAFE_DRIVING_BONUS}秒</strong>！</p><p><strong>惩罚：</strong>每次碰撞，<strong>总时间-${PENALTY_PER_COLLISION}秒</strong>！</p><p><strong>最终得分 = </strong><code>第一关分数 + (剩余秒数 × 100)</code></p>`;
    }

    init();
});
