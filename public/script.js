document.addEventListener('DOMContentLoaded', () => {
    // ----- Firebase & UI Elements -----
    const firebaseConfig = { apiKey: "AIzaSyDQ_sNfeyHbZAJU1cIJ-Vt9b5E1FlE8a60", authDomain: "benz-parts-road.firebaseapp.com", projectId: "benz-parts-road", storageBucket: "benz-parts-road.firebasestorage.app", messagingSenderId: "423603206033", appId: "1:423603206033:web:1c280e79a1ee618b260c30" };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const screens = { start: document.getElementById('start-screen'), instructions: document.getElementById('instructions-screen'), game: document.getElementById('game-screen'), success: document.getElementById('level2-end-screen'), gameOver: document.getElementById('game-over-screen'), leaderboard: document.getElementById('leaderboard-screen') };
    const modals = { nameEntry: document.getElementById('name-entry-modal') };
    const buttons = { startGame: document.getElementById('start-game-btn'), instructions: document.getElementById('instructions-btn'), leaderboard: document.getElementById('leaderboard-btn'), confirmName: document.getElementById('confirm-name-btn'), backToMenu: document.querySelectorAll('.back-to-menu'), restartGame: document.getElementById('restart-game-btn'), continueToLeaderboard: document.getElementById('continue-to-leaderboard-btn') };
    const displays = { score: document.getElementById('score'), targetScore: document.getElementById('target-score'), timer: document.getElementById('timer'), remainingTime: document.getElementById('remaining-time'), feedbackText: document.getElementById('feedback-text'), endTitle: document.getElementById('end-title'), endDetails: document.getElementById('end-details'), finalScore: document.getElementById('final-score'), leaderboardList: document.getElementById('leaderboard-list'), leaderboardListDisplay: document.getElementById('leaderboard-list-display'), instructionsContent: document.getElementById('instructions-content'), progressBar: document.getElementById('progress-bar') };
    const gameAreas = { level1: document.getElementById('game-area1'), level2: document.getElementById('game-area2') };
    const levels = { level1: document.getElementById('level1'), levelTransition: document.getElementById('level-transition'), level2: document.getElementById('level2') };
    const playerElements = { box: document.getElementById('player-box'), truck: document.getElementById('player-truck') };
    const playerNameInput = document.getElementById('player-name-input');
    const langSwitcherContainer = document.getElementById('lang-switcher-container');

    // ----- 游戏状态变量 -----
    let playerName = "玩家";
    let score = 0;
    let level1Timer = 30;
    let level2TotalTime = 35;
    const targetScore = 500;
    const penaltyPerCollision = 3;
    const safeDrivingInterval = 8;
    const safeDrivingBonus = 2; // <<<--- 难度调整：奖励从+5s削减为+2s
    const level2Duration = 30;
    let gameIntervals = [];
    let hitCooldown = false;
    let cachedLeaderboard = [];
    let currentLanguage = 'zh';
    let level2Ended = false;

    // ----- 游戏数据 -----
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

    // <<<--- 难度调整：创建第一关物品掉落的权重列表
    const level1WeightedItems = [
        'engine', // 发动机 x1
        'battery', 'battery', // 电池 x2
        'tire', 'tire', 'tire', // 轮胎 x3
        'brake_disc', 'brake_disc', // 刹车盘 x2
        'piston', 'piston', 'piston', // 活塞 x3
        'star', 'star', // 星徽 x2
        'screw', 'screw', 'screw', // 螺丝 x3
        'oil', 'oil', 'oil', 'oil' // 废油桶 x4 (更高频率)
    ];

    const roadObjectTypes = {
        cone: { img: 'images/obstacle.png', size: 50 },
        car_obstacle_red: { img: 'images/car_obstacle_red.png', size: 55 },
        car_obstacle_blue: { img: 'images/car_obstacle_blue.png', size: 55 },
    };
    const translations = {
        zh: { title: "奔驰星辉之路", start_game: "开始游戏", instructions: "玩法说明", leaderboard: "查看排行榜", back_to_menu: "返回主菜单", enter_name_title: "输入你的名字", enter_name_placeholder: "最多10个字符", confirm: "确定", hud_score: "分数", hud_target: "目标", hud_time: "时间", transition_text: "恭喜过关！准备发车！", hud_remaining_time: "剩余时间", success_title: "恭喜！零件已成功送达！", success_details_win: "剩余时间奖励", fail_title: "运输失败！时间耗尽！", fail_details: "请再接再厉！", success_continue: "查看最终得分", final_score: "最终得分", online_leaderboard: "在线积分榜", leaderboard_empty: "还没有人上榜，快来争第一！" },
        en: { title: "Starlight Road", start_game: "Start Game", instructions: "How to Play", leaderboard: "Leaderboard", back_to_menu: "Back to Menu", enter_name_title: "Enter Your Name", enter_name_placeholder: "Max 10 characters", confirm: "Confirm", hud_score: "Score", hud_target: "Target", hud_time: "Time", transition_text: "Level Clear! Get Ready!", hud_remaining_time: "Time Left", success_title: "Congratulations! Parts Delivered!", success_details_win: "Time Bonus", fail_title: "Delivery Failed! Out of Time!", fail_details: "Better luck next time!", success_continue: "View Final Score", final_score: "Final Score", online_leaderboard: "Online Leaderboard", leaderboard_empty: "No scores yet. Be the first!" }
    };
    
    // ----- 语言与UI -----
    function updateUIText() { const langPack = translations[currentLanguage]; document.querySelectorAll('[data-lang-key]').forEach(el => { const key = el.getAttribute('data-lang-key'); if (langPack[key]) el.textContent = langPack[key]; }); document.querySelectorAll('[data-lang-key-placeholder]').forEach(el => { const key = el.getAttribute('data-lang-key-placeholder'); if(langPack[key]) el.placeholder = langPack[key]; }); generateInstructions(); }
    
    // ----- 初始化 -----
    function init() { document.getElementById('start-screen').prepend(langSwitcherContainer); updateUIText(); listenForLeaderboardChanges(); movePlayer(playerElements.box, window.innerWidth / 2); movePlayer(playerElements.truck, window.innerWidth / 2); document.getElementById('lang-switcher').addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { const lang = e.target.id.split('-')[1]; if (lang !== currentLanguage) { currentLanguage = lang; document.getElementById('lang-zh').classList.toggle('active'); document.getElementById('lang-en').classList.toggle('active'); updateUIText(); } } }); }
    
    // ----- 游戏流程 -----
    function showScreen(screenName) { Object.values(screens).forEach(s => s.classList.remove('active')); screens[screenName].classList.add('active'); langSwitcherContainer.style.display = (screenName === 'start') ? 'block' : 'none'; }
    buttons.startGame.addEventListener('click', () => { modals.nameEntry.style.display = 'flex'; });
    buttons.confirmName.addEventListener('click', () => { const name = playerNameInput.value.trim(); if (name) { playerName = name; modals.nameEntry.style.display = 'none'; startGame(); } else { alert(currentLanguage === 'zh' ? '请输入你的名字！' : 'Please enter your name!'); } });
    buttons.instructions.addEventListener('click', () => showScreen('instructions'));
    buttons.leaderboard.addEventListener('click', () => { showScreen('leaderboard'); displayLeaderboard(displays.leaderboardListDisplay); });
    buttons.backToMenu.forEach(btn => btn.addEventListener('click', () => showScreen('start')));
    buttons.restartGame.addEventListener('click', () => { showScreen('start'); });
    buttons.continueToLeaderboard.addEventListener('click', () => calculateFinalScore());

    function startGame() { resetGame(); showScreen('game'); startLevel1(); }
    function resetGame() { gameIntervals.forEach(clearInterval); gameIntervals = []; score = 0; level1Timer = 30; level2TotalTime = 35; hitCooldown = false; level2Ended = false; displays.score.textContent = score; displays.timer.textContent = level1Timer; displays.remainingTime.textContent = level2TotalTime.toFixed(1); gameAreas.level1.innerHTML = ''; gameAreas.level1.appendChild(playerElements.box); gameAreas.level2.innerHTML = ''; gameAreas.level2.appendChild(playerElements.truck); gameAreas.level2.appendChild(displays.feedbackText); levels.level1.classList.add('active'); levels.levelTransition.style.display = 'none'; levels.level2.classList.remove('active'); }

    // ----- 关卡一 -----
    function startLevel1() { const countdown = setInterval(() => { level1Timer--; displays.timer.textContent = level1Timer; if (level1Timer <= 0) endLevel1(); }, 1000); gameIntervals.push(countdown); const itemFall = setInterval(createItem_L1, 650); gameIntervals.push(itemFall); const gameLoop = setInterval(() => { moveItems_L1(); checkCollisions_L1(); }, 1000/60); gameIntervals.push(gameLoop); }
    function createItem_L1() {
        const key = level1WeightedItems[Math.floor(Math.random() * level1WeightedItems.length)]; // <<<--- 难度调整：从权重列表里随机
        const data = itemTypes[key];
        const el = document.createElement('div');
        el.className = 'item';
        el.style.width = `${data.size}px`;
        el.style.height = `${data.size}px`;
        el.style.backgroundImage = `url(${data.img})`;
        el.style.left = `${Math.random() * (gameAreas.level1.offsetWidth - data.size)}px`;
        el.style.top = `-${data.size}px`;
        el.dataset.type = key;
        el.dataset.speed = data.speed;
        gameAreas.level1.appendChild(el);
    }
    function moveItems_L1() { gameAreas.level1.querySelectorAll('.item').forEach(item => { item.style.top = `${item.offsetTop + parseFloat(item.dataset.speed)}px`; if (item.offsetTop > gameAreas.level1.offsetHeight) item.remove(); }); }
    function checkCollisions_L1() { const boxRect = playerElements.box.getBoundingClientRect(); gameAreas.level1.querySelectorAll('.item').forEach(item => { const itemRect = item.getBoundingClientRect(); if (boxRect.left < itemRect.right && boxRect.right > itemRect.left && boxRect.top < itemRect.bottom && boxRect.bottom > itemRect.top) { handleCollision_L1(item); item.remove(); } }); }
    function handleCollision_L1(item) { const data = itemTypes[item.dataset.type]; score += data.score; displays.score.textContent = score; if (item.dataset.type === 'oil') { document.body.style.filter = 'blur(3px)'; setTimeout(() => { document.body.style.filter = 'none'; }, 500); } }
    function endLevel1() { gameIntervals.forEach(clearInterval); gameIntervals = []; if (score >= targetScore) { levels.level1.classList.remove('active'); levels.levelTransition.style.display = 'flex'; setTimeout(() => { levels.levelTransition.style.display = 'none'; levels.level2.classList.add('active'); startLevel2(); }, 2000); } else { gameOver(false); } }

    // ----- 关卡二 -----
    function startLevel2() {
        let safeDrivingTimer = 0;
        let elapsedTime = 0;
        level2Ended = false;

        const mainInterval = setInterval(() => {
            if (level2Ended) return;
            elapsedTime += 0.1;
            level2TotalTime -= 0.1;
            safeDrivingTimer += 0.1;
            displays.remainingTime.textContent = Math.max(0, level2TotalTime).toFixed(1);
            displays.progressBar.style.width = `${(elapsedTime / level2Duration) * 100}%`;

            if (safeDrivingTimer >= safeDrivingInterval) {
                safeDrivingTimer = 0;
                level2TotalTime += safeDrivingBonus;
                showFeedback(`+${safeDrivingBonus}s`, '#4CAF50');
            }
            if (level2TotalTime <= 0) {
                endLevel2(false);
            }
            if (elapsedTime >= level2Duration) {
                endLevel2(true);
            }
        }, 100);
        gameIntervals.push(mainInterval);

        const roadObjectInterval = setInterval(createRoadObject_L2, 1000); // <<<--- 难度调整：障碍物更密集
        gameIntervals.push(roadObjectInterval);
        const gameLoop2 = setInterval(checkTruckCollisions_L2, 1000 / 60);
        gameIntervals.push(gameLoop2);
        
        function checkTruckCollisions_L2() {
            gameAreas.level2.querySelectorAll('.obstacle').forEach(obj => {
                let speed = obj.dataset.fast === 'true' ? 15 : 5; // <<<--- 难度调整：高速障碍物
                obj.style.top = `${obj.offsetTop + speed}px`;
                if (obj.offsetTop > gameAreas.level2.offsetHeight) obj.remove();
            });
            if (hitCooldown || level2Ended) return;
            const truckRect = playerElements.truck.getBoundingClientRect();
            gameAreas.level2.querySelectorAll('.obstacle').forEach(obj => {
                const objRect = obj.getBoundingClientRect();
                if (truckRect.left < objRect.right && truckRect.right > objRect.left && truckRect.top < objRect.bottom && truckRect.bottom > objRect.top) {
                    obj.remove();
                    triggerHitPenalty();
                }
            });
        }
        function triggerHitPenalty() { hitCooldown = true; safeDrivingTimer = 0; level2TotalTime -= penaltyPerCollision; showFeedback(`-${penaltyPerCollision}s`, '#ff4d4d'); playerElements.truck.classList.add('hit'); setTimeout(() => { playerElements.truck.classList.remove('hit'); hitCooldown = false; }, 1000); }
    }
    
    function createRoadObject_L2() {
        const keys = Object.keys(roadObjectTypes);
        const key = keys[Math.floor(Math.random() * keys.length)];
        const data = roadObjectTypes[key];
        const el = document.createElement('div');
        el.className = 'obstacle';
        el.style.width = `${data.size}px`;
        el.style.height = `${data.size}px`;
        el.style.backgroundImage = `url(${data.img})`;
        el.style.left = `${Math.random() * (gameAreas.level2.offsetWidth - data.size)}px`;
        el.style.top = `-${data.size}px`;
        if (Math.random() < 0.2) { // <<<--- 难度调整：20%几率是高速障碍物
            el.dataset.fast = 'true';
            el.style.filter = 'brightness(1.5)'; // 高速障碍物更亮一点以作区分
        }
        gameAreas.level2.appendChild(el);
    }
    function showFeedback(text, color) { const el = displays.feedbackText; el.textContent = text; el.style.color = color; el.style.opacity = 1; setTimeout(() => { el.style.opacity = 0; }, 1000); }
    
    function endLevel2(isSuccess) {
        if (level2Ended) return;
        level2Ended = true;
        gameIntervals.forEach(clearInterval);
        gameIntervals = [];

        const lang = translations[currentLanguage];
        if (isSuccess) {
            displays.endTitle.textContent = lang.success_title;
            const bonus = Math.floor(level2TotalTime * 100);
            displays.endDetails.innerHTML = `<p>${lang.success_details_win}: ${level2TotalTime.toFixed(1)}s × 100 = +${bonus}</p>`;
        } else {
            displays.endTitle.textContent = lang.fail_title;
            displays.endDetails.innerHTML = `<p>${lang.fail_details}</p>`;
        }
        showScreen('success');
    }

    function calculateFinalScore() { const timeBonus = (level2TotalTime > 0) ? Math.floor(level2TotalTime * 100) : 0; const finalScoreValue = score + timeBonus; displays.finalScore.textContent = finalScoreValue; if (finalScoreValue > 0) { updateLeaderboard(playerName, finalScoreValue); } gameOver(true); }
    function gameOver(isSuccess) { const lang = translations[currentLanguage]; if (!isSuccess) { displays.finalScore.textContent = lang.fail_title; } showScreen('gameOver'); displayLeaderboard(displays.leaderboardList); }
    async function updateLeaderboard(name, newScore) { try { await db.collection("leaderboard").add({ name: name, score: newScore, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); } catch (error) { console.error("Error adding document: ", error); } }
    function listenForLeaderboardChanges() { db.collection("leaderboard").orderBy("score", "desc").limit(10).onSnapshot((snapshot) => { cachedLeaderboard = snapshot.docs.map(doc => doc.data()); if (screens.leaderboard.classList.contains('active')) displayLeaderboard(displays.leaderboardListDisplay); if (screens.gameOver.classList.contains('active')) displayLeaderboard(displays.leaderboardList); }, (error) => console.error(error)); }
    function displayLeaderboard(listElement) { const lang = translations[currentLanguage]; listElement.innerHTML = ''; if (cachedLeaderboard.length === 0) { listElement.innerHTML = `<li>${lang.leaderboard_empty}</li>`; return; } cachedLeaderboard.forEach((entry, index) => { const li = document.createElement('li'); const safeName = document.createTextNode(entry.name).textContent; li.innerHTML = `<span>${index + 1}. ${safeName}</span><span>${entry.score}</span>`; listElement.appendChild(li); }); }
    
    function movePlayer(element, x) { const parent = element.parentElement; const parentWidth = parent.offsetWidth; const playerWidth = element.offsetWidth; let newLeft = x - playerWidth / 2; if (newLeft < 0) newLeft = 0; if (newLeft > parentWidth - playerWidth) newLeft = parentWidth - playerWidth; element.style.left = `${newLeft}px`; }
    function generateInstructions() {
        const lang = currentLanguage;
        const langPack = translations[lang];
        let partsList = '';
        Object.keys(itemTypes).forEach(key => {
            const item = itemTypes[key];
            const scoreText = (item.score > 0 ? '+' : '') + item.score;
            const style = item.score < 0 ? 'style="color: #ffdddd;"' : '';
            partsList += `<li ${style}>${item.name[lang]}: ${scoreText}</li>`;
        });
        const l1Title = lang === 'zh' ? '第一关：零件收集' : 'Level 1: Part Collector';
        const l1Goal = lang === 'zh' ? `在30秒内达到<strong>${targetScore}分</strong>！` : `Score <strong>${targetScore} points</strong> in 30s!`;
        const l2Title = lang === 'zh' ? '第二关：动态行程挑战' : 'Level 2: Dynamic Journey';
        const l2Goal = lang === 'zh' ? '在<strong>总时间耗尽前</strong>抵达终点！' : 'Reach the finish line <strong>before time runs out!</strong>';
        const l2Bonus = lang === 'zh' ? `每连续安全驾驶8秒，<strong>总时间+${safeDrivingBonus}秒</strong>！` : `For every 8s of safe driving, gain <strong>+${safeDrivingBonus}s</strong>!`;
        const l2Penalty = lang === 'zh' ? `每次碰撞，<strong>总时间-${penaltyPerCollision}秒</strong>！` : `Each collision deducts <strong>${penaltyPerCollision}s</strong>!`;
        const l2Score = lang === 'zh' ? `<code>第一关分数 + (剩余秒数 × 100)</code>` : `<code>Lvl 1 Score + (Time Left × 100)</code>`;

        displays.instructionsContent.innerHTML = `<h3>${l1Title}</h3><p><strong>${lang === 'zh' ? '目标' : 'Goal'}:</strong> ${l1Goal}</p><ul>${partsList}</ul><hr><h3>${l2Title}</h3><p><strong>${lang === 'zh' ? '目标' : 'Goal'}:</strong> ${l2Goal}</p><p><strong>${lang === 'zh' ? '奖励' : 'Bonus'}:</strong> ${l2Bonus}</p><p><strong>${lang === 'zh' ? '惩罚' : 'Penalty'}:</strong> ${l2Penalty}</p><p><strong>${lang === 'zh' ? '最终得分' : 'Final Score'} = </strong>${l2Score}</p>`;
    }

    gameAreas.level1.addEventListener('touchmove', (e) => { e.preventDefault(); movePlayer(playerElements.box, e.touches[0].clientX); }, { passive: false });
    gameAreas.level1.addEventListener('mousemove', (e) => { if (e.buttons === 1) movePlayer(playerElements.box, e.clientX); });
    gameAreas.level2.addEventListener('touchmove', (e) => { e.preventDefault(); movePlayer(playerElements.truck, e.touches[0].clientX); }, { passive: false });
    gameAreas.level2.addEventListener('mousemove', (e) => { if (e.buttons === 1) movePlayer(playerElements.truck, e.clientX); });

    init();
});
