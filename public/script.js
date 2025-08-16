document.addEventListener('DOMContentLoaded', () => {
    // ----- LeanCloud 初始化 -----
    AV.init({
        appId: "5femOCktvnOHNk8x7B5kVyim-gzGzoHsz",
        appKey: "I6UIDXRDue7wXJHpK1yaQqrY",
        serverURL: "https://5femockt.lc-cn-n1-shared.com"
    });

    // ----- UI Elements -----
    const screens = { start: document.getElementById('start-screen'), instructions: document.getElementById('instructions-screen'), game: document.getElementById('game-screen'), success: document.getElementById('level2-end-screen'), gameOver: document.getElementById('game-over-screen'), leaderboard: document.getElementById('leaderboard-screen') };
    const modals = { nameEntry: document.getElementById('name-entry-modal') };
    const buttons = { startGame: document.getElementById('start-game-btn'), instructions: document.getElementById('instructions-btn'), leaderboard: document.getElementById('leaderboard-btn'), confirmName: document.getElementById('confirm-name-btn'), backToMenu: document.querySelectorAll('.back-to-menu'), restartGame: document.getElementById('restart-game-btn'), continueToLeaderboard: document.getElementById('continue-to-leaderboard-btn') };
    const displays = { score: document.getElementById('score'), targetScore: document.getElementById('target-score'), timer: document.getElementById('timer'), remainingTime: document.getElementById('remaining-time'), feedbackText: document.getElementById('feedback-text'), endTitle: document.getElementById('end-title'), endDetails: document.getElementById('end-details'), finalScore: document.getElementById('final-score'), finalScoreTitle: document.getElementById('final-score-title'), leaderboardList: document.getElementById('leaderboard-list'), leaderboardListDisplay: document.getElementById('leaderboard-list-display'), instructionsContent: document.getElementById('instructions-content'), progressBar: document.getElementById('progress-bar'), progressPercentage: document.getElementById('progress-percentage') };
    const gameAreas = { level1: document.getElementById('game-area1'), level2: document.getElementById('game-area2') };
    const levels = { level1: document.getElementById('level1'), levelTransition: document.getElementById('level-transition'), level2: document.getElementById('level2') };
    const playerElements = { box: document.getElementById('player-box'), truck: document.getElementById('player-truck') };
    const playerNameInput = document.getElementById('player-name-input');
    const langSwitcherContainer = document.getElementById('lang-switcher-container');

    // ----- 游戏核心状态 -----
    let playerName = "玩家";
    let score = 0;
    let finalScore = 0;
    let level1Timer = 30;
    let level2TotalTime = 35;
    let hitCooldown = false;
    let cachedLeaderboard = [];
    let currentLanguage = 'zh';
    let gameIntervals = [];
    let currentLevel = 1;

    // ----- 游戏常量与数据 -----
    const TARGET_SCORE = 500;
    const PENALTY_PER_COLLISION = 3;
    const SAFE_DRIVING_INTERVAL = 8;
    const SAFE_DRIVING_BONUS = 2;
    const LEVEL_2_DURATION = 30;
    const itemTypes = {
        engine: { name: { zh: '发动机', en: 'Engine' }, score: 50, speed: 4, size: 100, img: 'images/engine.png' },
        battery: { name: { zh: '汽车电池', en: 'Battery' }, score: 40, speed: 4, size: 50, img: 'images/battery.png' },
        tire: { name: { zh: '轮胎', en: 'Tire' }, score: 10, speed: 3, size: 70, img: 'images/tire.png' },
        brake_disc: { name: { zh: '刹车盘', en: 'Brake Disc' }, score: 20, speed: 4, size: 65, img: 'images/brake_disc.png' },
        piston: { name: { zh: '活塞', en: 'Piston' }, score: 15, speed: 3, size: 60, img: 'images/piston.png' },
        star: { name: { zh: '奔驰星徽', en: 'Star' }, score: 30, speed: 5, size: 60, img: 'images/star.png' },
        oil: { name: { zh: '废油桶', en: 'Oil Barrel' }, score: -20, speed: 4, size: 65, img: 'images/oil_barrel.png' },
        screw: { name: { zh: '螺丝', en: 'Screw' }, score: 1, speed: 2, size: 30, img: 'images/screw.png' }
    };
    const level1WeightedItems = ['engine', 'battery', 'battery', 'tire', 'tire', 'tire', 'brake_disc', 'brake_disc', 'piston', 'piston', 'piston', 'star', 'star', 'screw', 'screw', 'screw', 'oil', 'oil'];
    const roadObjectTypes = { cone: { img: 'images/obstacle.png', size: 50 }, car_obstacle_red: { img: 'images/car_obstacle_red.png', size: 55 }, car_obstacle_blue: { img: 'images/car_obstacle_blue.png', size: 55 } };
    const translations = {
        zh: { title: "奔驰星辉之路", start_game: "开始游戏", instructions: "玩法说明", leaderboard: "查看排行榜", back_to_menu: "返回主菜单", enter_name_title: "输入你的名字", enter_name_placeholder: "最多10个字符", confirm: "确定", hud_score: "分数", hud_target: "目标", hud_time: "时间", transition_text: "恭喜过关！准备发车！", hud_remaining_time: "剩余时间", success_title: "恭喜！零件已成功送达！", success_details_win: "剩余时间奖励", fail_title: "运输失败！", fail_details_l1: "未达到目标分数！", fail_details_l2: "时间耗尽！", success_continue: "查看最终得分", final_score: "最终得分", online_leaderboard: "在线积分榜", leaderboard_empty: "还没有人上榜，快来争第一！" },
        en: { title: "Mercedes-Benz Star Road", start_game: "Start Game", instructions: "How to Play", leaderboard: "Leaderboard", back_to_menu: "Back to Menu", enter_name_title: "Enter Your Name", enter_name_placeholder: "Max 10 characters", confirm: "Confirm", hud_score: "Score", hud_target: "Target", hud_time: "Time", transition_text: "Level Clear! Get Ready!", hud_remaining_time: "Time Left", success_title: "Congratulations! Parts Delivered!", success_details_win: "Time Bonus", fail_title: "Delivery Failed!", fail_details_l1: "Target score not reached!", fail_details_l2: "Out of time!", success_continue: "View Final Score", final_score: "Final Score", online_leaderboard: "Online Leaderboard", leaderboard_empty: "No scores yet. Be the first!" }
    };
    
    // ----- 语言与UI -----
    function updateUIText() { const langPack = translations[currentLanguage]; document.documentElement.lang = currentLanguage; document.querySelectorAll('[data-lang-key]').forEach(el => { const key = el.getAttribute('data-lang-key'); if (langPack[key]) el.textContent = langPack[key]; }); document.querySelectorAll('[data-lang-key-placeholder]').forEach(el => { const key = el.getAttribute('data-lang-key-placeholder'); if(langPack[key]) el.placeholder = langPack[key]; }); generateInstructions(); }
    
    // ----- 初始化 -----
    function init() {
        document.getElementById('start-screen').prepend(langSwitcherContainer);
        updateUIText();
        listenForLeaderboardChanges();
        movePlayer(playerElements.box, window.innerWidth / 2);
        movePlayer(playerElements.truck, window.innerWidth / 2);
        buttons.startGame.addEventListener('click', () => { modals.nameEntry.style.display = 'flex'; });
        buttons.confirmName.addEventListener('click', () => { const name = playerNameInput.value.trim(); if (name) { playerName = name; modals.nameEntry.style.display = 'none'; startGame(); } else { alert(currentLanguage === 'zh' ? '请输入你的名字！' : 'Please enter your name!'); } });
        buttons.instructions.addEventListener('click', () => showScreen('instructions'));
        buttons.leaderboard.addEventListener('click', () => { showScreen('leaderboard'); displayLeaderboard(displays.leaderboardListDisplay); });
        buttons.backToMenu.forEach(btn => btn.addEventListener('click', () => showScreen('start')));
        buttons.restartGame.addEventListener('click', () => { showScreen('start'); });
        buttons.continueToLeaderboard.addEventListener('click', () => gameOver());
        document.getElementById('lang-switcher').addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { const lang = e.target.id.split('-')[1]; if (lang !== currentLanguage) { currentLanguage = lang; document.getElementById('lang-zh').classList.toggle('active'); document.getElementById('lang-en').classList.toggle('active'); updateUIText(); } } });
        gameAreas.level1.addEventListener('touchmove', (e) => { e.preventDefault(); movePlayer(playerElements.box, e.touches[0].clientX); }, { passive: false });
        gameAreas.level1.addEventListener('mousemove', (e) => { if (e.buttons === 1) movePlayer(playerElements.box, e.clientX); });
        gameAreas.level2.addEventListener('touchmove', (e) => { e.preventDefault(); movePlayer(playerElements.truck, e.touches[0].clientX); }, { passive: false });
        gameAreas.level2.addEventListener('mousemove', (e) => { if (e.buttons === 1) movePlayer(playerElements.truck, e.clientX); });
    }
    
    // ----- 游戏流程 -----
    function showScreen(screenName) { Object.values(screens).forEach(s => s.classList.remove('active')); screens[screenName].classList.add('active'); langSwitcherContainer.style.display = (screenName === 'start') ? 'block' : 'none'; }
    function startGame() { resetGame(); showScreen('game'); startLevel1(); }
    function resetGame() {
        gameIntervals.forEach(clearInterval);
        gameIntervals = [];
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

    // ----- 关卡一 -----
    function startLevel1() {
        currentLevel = 1;
        const countdown = setInterval(() => { level1Timer--; displays.timer.textContent = Math.max(0, level1Timer); if (level1Timer <= 0) endLevel1(); }, 1000); gameIntervals.push(countdown);
        const itemFall = setInterval(createItem_L1, 650); gameIntervals.push(itemFall);
        const gameLoop = setInterval(() => { moveItems_L1(); checkCollisions_L1(); }, 1000/60); gameIntervals.push(gameLoop);
    }
    function createItem_L1() { const key = level1WeightedItems[Math.floor(Math.random() * level1WeightedItems.length)]; const data = itemTypes[key]; const el = document.createElement('div'); el.className = 'item'; el.style.width = `${data.size}px`; el.style.height = `${data.size}px`; el.style.backgroundImage = `url(${data.img})`; el.style.left = `${Math.random() * (gameAreas.level1.offsetWidth - data.size)}px`; el.style.top = `-${data.size}px`; el.dataset.type = key; el.dataset.speed = data.speed; gameAreas.level1.appendChild(el); }
    function moveItems_L1() { gameAreas.level1.querySelectorAll('.item').forEach(item => { item.style.top = `${item.offsetTop + parseFloat(item.dataset.speed)}px`; if (item.offsetTop > gameAreas.level1.offsetHeight) item.remove(); }); }
    function checkCollisions_L1() { const boxRect = playerElements.box.getBoundingClientRect(); gameAreas.level1.querySelectorAll('.item').forEach(item => { const itemRect = item.getBoundingClientRect(); if (boxRect.left < itemRect.right && boxRect.right > itemRect.left && boxRect.top < itemRect.bottom && boxRect.bottom > itemRect.top) { handleCollision_L1(item); item.remove(); } }); }
    function handleCollision_L1(item) { const data = itemTypes[item.dataset.type]; score += data.score; displays.score.textContent = score; if(item.dataset.type === 'oil') { document.body.style.filter = 'blur(3px)'; setTimeout(() => { document.body.style.filter = 'none'; }, 500); } }
    function endLevel1() { gameIntervals.forEach(clearInterval); gameIntervals = []; if (score >= TARGET_SCORE) { levels.level1.classList.remove('active'); levels.levelTransition.style.display = 'flex'; setTimeout(() => { levels.levelTransition.style.display = 'none'; levels.level2.classList.add('active'); startLevel2(); }, 2000); } else { gameOver(true, 'l1'); } }

    // ----- 关卡二 -----
    function startLevel2() {
        currentLevel = 2;
        let safeDrivingTimer = 0;
        let elapsedTime = 0;

        const mainInterval = setInterval(() => {
            elapsedTime += 0.1;
            level2TotalTime -= 0.1;
            safeDrivingTimer += 0.1;
            displays.remainingTime.textContent = Math.max(0, level2TotalTime).toFixed(1);
            const progress = Math.min((elapsedTime / LEVEL_2_DURATION) * 100, 100);
            displays.progressBar.style.width = `${progress}%`;
            displays.progressPercentage.textContent = `${Math.floor(progress)}%`;

            if (safeDrivingTimer >= SAFE_DRIVING_INTERVAL) {
                safeDrivingTimer = 0;
                level2TotalTime += SAFE_DRIVING_BONUS;
                showFeedback(`+${SAFE_DRIVING_BONUS}s`, '#4CAF50');
            }
            if (level2TotalTime <= 0) { endLevel2(false); }
            if (elapsedTime >= LEVEL_2_DURATION) { endLevel2(true); }
        }, 100);
        gameIntervals.push(mainInterval);

        const roadObjectInterval = setInterval(createRoadObject_L2, 1200);
        gameIntervals.push(roadObjectInterval);
        const gameLoop2 = setInterval(checkTruckCollisions_L2, 1000 / 60);
        gameIntervals.push(gameLoop2);
    }
    
    function createRoadObject_L2() { const keys = Object.keys(roadObjectTypes); const key = keys[Math.floor(Math.random() * keys.length)]; const data = roadObjectTypes[key]; const el = document.createElement('div'); el.className = 'obstacle'; el.style.width = `${data.size}px`; el.style.height = `${data.size}px`; el.style.backgroundImage = `url(${data.img})`; el.style.left = `${Math.random() * (gameAreas.level2.offsetWidth - data.size)}px`; el.style.top = `-${data.size}px`; gameAreas.level2.appendChild(el); }
    function checkTruckCollisions_L2() { gameAreas.level2.querySelectorAll('.obstacle').forEach(obj => { obj.style.top = `${obj.offsetTop + 5}px`; if (obj.offsetTop > gameAreas.level2.offsetHeight) obj.remove(); }); if (hitCooldown) return; const truckRect = playerElements.truck.getBoundingClientRect(); gameAreas.level2.querySelectorAll('.obstacle').forEach(obj => { const objRect = obj.getBoundingClientRect(); if (truckRect.left < objRect.right && truckRect.right > objRect.left && truckRect.top < objRect.bottom && truckRect.bottom > objRect.top) { obj.remove(); triggerHitPenalty(); } }); }
    function triggerHitPenalty() { hitCooldown = true; level2SafeDrivingTimer = 0; level2TotalTime -= PENALTY_PER_COLLISION; showFeedback(`-${PENALTY_PER_COLLISION}s`, '#ff4d4d'); playerElements.truck.classList.add('hit'); setTimeout(() => { playerElements.truck.classList.remove('hit'); hitCooldown = false; }, 1000); }
    function showFeedback(text, color) { const el = displays.feedbackText; el.textContent = text; el.style.color = color; el.style.opacity = 1; setTimeout(() => { el.style.opacity = 0; }, 1000); }
    
    function endLevel2(isSuccess) {
        gameIntervals.forEach(clearInterval);
        gameIntervals = [];
        
        const lang = translations[currentLanguage];
        if (isSuccess) {
            const timeBonus = (level2TotalTime > 0) ? Math.floor(level2TotalTime * 100) : 0;
            finalScore = score + timeBonus;
            displays.endTitle.textContent = lang.success_title;
            displays.endDetails.innerHTML = `<p>${lang.success_details_win}: ${level2TotalTime.toFixed(1)}s × 100 = +${timeBonus}</p>`;
        } else {
            finalScore = score;
            displays.endTitle.textContent = lang.fail_title;
            displays.endDetails.innerHTML = `<p>${lang.fail_details_l2}</p>`;
        }
        if (finalScore > 0) {
            updateLeaderboard(playerName, finalScore);
        }
        showScreen('success');
    }
    
    function gameOver(isL1Fail = false) {
        const lang = translations[currentLanguage];
        displays.finalScoreTitle.style.display = 'block';
        if (isL1Fail) {
            displays.finalScoreTitle.textContent = lang.fail_details_l1;
            displays.finalScore.textContent = '';
        } else {
            displays.finalScoreTitle.innerHTML = `<span data-lang-key="final_score">${lang.final_score}</span>: <span>${finalScore}</span>`;
        }
        showScreen('gameOver');
        displayLeaderboard(displays.leaderboardList);
    }

    async function updateLeaderboard(name, newScore) { 
        const Leaderboard = AV.Object.extend('Leaderboard');
        const entry = new Leaderboard();
        entry.set('name', name);
        entry.set('score', Number(newScore));
        try {
            await entry.save();
            console.log("Score submitted to LeanCloud!");
            await listenForLeaderboardChanges();
        } catch (error) {
            console.error("Error submitting score to LeanCloud: ", error);
        }
    }
    
    async function listenForLeaderboardChanges() {
        try {
            const query = new AV.Query('Leaderboard');
            query.descending('score');
            query.limit(10);
            const results = await query.find();
            cachedLeaderboard = results.map(item => item.attributes);
            displayLeaderboard(displays.leaderboardListDisplay);
            displayLeaderboard(displays.leaderboardList);
        } catch (error) {
            console.error("Error fetching leaderboard: ", error);
        }
    }

    function displayLeaderboard(listElement) { const lang = translations[currentLanguage]; listElement.innerHTML = ''; if (cachedLeaderboard.length === 0) { listElement.innerHTML = `<li>${lang.leaderboard_empty}</li>`; return; } cachedLeaderboard.forEach((entry, index) => { const li = document.createElement('li'); const safeName = document.createTextNode(entry.name).textContent; li.innerHTML = `<span>${index + 1}. ${safeName}</span><span>${entry.score}</span>`; listElement.appendChild(li); }); }
    
    function movePlayer(element, x) { const parent = element.parentElement; const parentWidth = parent.offsetWidth; const playerWidth = element.offsetWidth; let newLeft = x - playerWidth / 2; if (newLeft < 0) newLeft = 0; if (newLeft > parentWidth - playerWidth) newLeft = parentWidth - playerWidth; element.style.left = `${newLeft}px`; }
    function generateInstructions() {
        const lang = currentLanguage;
        let partsList = '';
        Object.keys(itemTypes).forEach(key => {
            const item = itemTypes[key];
            const scoreText = (item.score > 0 ? '+' : '') + item.score;
            const style = item.score < 0 ? 'style="color: #ffdddd;"' : '';
            partsList += `<li ${style}>${item.name[lang]}: ${scoreText}</li>`;
        });
        const l1Title = lang === 'zh' ? '第一关：零件收集' : 'Level 1: Part Collector';
        const l1Goal = lang === 'zh' ? `在30秒内达到<strong>${TARGET_SCORE}分</strong>！` : `Score <strong>${TARGET_SCORE} points</strong> in 30s!`;
        const l2Title = lang === 'zh' ? '第二关：动态行程挑战' : 'Level 2: Dynamic Journey';
        const l2Goal = lang === 'zh' ? '在<strong>总时间耗尽前</strong>抵达终点！' : 'Reach the finish line <strong>before time runs out!</strong>';
        const l2Bonus = lang === 'zh' ? `每连续安全驾驶8秒，<strong>总时间+${SAFE_DRIVING_BONUS}秒</strong>！` : `For every 8s of safe driving, gain <strong>+${SAFE_DRIVING_BONUS}s</strong>!`;
        const l2Penalty = lang === 'zh' ? `每次碰撞，<strong>总时间-${PENALTY_PER_COLLISION}秒</strong>！` : `Each collision deducts <strong>${PENALTY_PER_COLLISION}s</strong>!`;
        const l2Score = lang === 'zh' ? `<code>第一关分数 + (剩余秒数 × 100)</code>` : `<code>Lvl 1 Score + (Time Left × 100)</code>`;
        displays.instructionsContent.innerHTML = `<h3>${l1Title}</h3><p><strong>${lang === 'zh' ? '目标' : 'Goal'}:</strong> ${l1Goal}</p><ul>${partsList}</ul><hr><h3>${l2Title}</h3><p><strong>${lang === 'zh' ? '目标' : 'Goal'}:</strong> ${l2Goal}</p><p><strong>${lang === 'zh' ? '奖励' : 'Bonus'}:</strong> ${l2Bonus}</p><p><strong>${lang === 'zh' ? '惩罚' : 'Penalty'}:</strong> ${l2Penalty}</p><p><strong>${lang === 'zh' ? '最终得分' : 'Final Score'} = </strong>${l2Score}</p>`;
    }

    init();
});
