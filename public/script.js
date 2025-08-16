document.addEventListener('DOMContentLoaded', () => {
    // ----- Firebase 初始化增强 -----
    const firebaseConfig = { apiKey: "AIzaSyDQ_sNfeyHbZAJU1cIJ-Vt9b5E1FlE8a60", authDomain: "benz-parts-road.firebaseapp.com", projectId: "benz-parts-road", storageBucket: "benz-parts-road.firebasestorage.app", messagingSenderId: "423603206033", appId: "1:423603206033:web:1c280e79a1ee618b260c30" };
    
    // 确保Firebase初始化兼容各种环境（尤其是手机端）
    let firebaseApp;
    try {
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            console.log("Firebase初始化成功（新实例）");
        } else {
            firebaseApp = firebase.app();
            console.log("Firebase初始化成功（复用实例）");
        }
    } catch (error) {
        console.error("Firebase初始化失败：", error);
        alert("初始化失败，请刷新页面重试"); // 给用户明确提示
    }
    const db = firebaseApp ? firebaseApp.firestore() : null;

    // ----- 设备检测（新增） -----
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log(`设备类型：${isMobile ? '手机端' : '网页端'}`);

    // ----- 其他变量定义保持不变 -----
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
    let currentLevel;
    let isLeaderboardLoaded = false;
    let scoreSubmitted = false; // 新增：跟踪分数是否已提交

    // ----- 游戏常量与数据（保持不变） -----
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
        zh: { title: "奔驰星辉之路", start_game: "开始游戏", instructions: "玩法说明", leaderboard: "查看排行榜", back_to_menu: "返回主菜单", enter_name_title: "输入你的名字", enter_name_placeholder: "最多10个字符", confirm: "确定", hud_score: "分数", hud_target: "目标", hud_time: "时间", transition_text: "恭喜过关！准备发车！", hud_remaining_time: "剩余时间", success_title: "恭喜！零件已成功送达！", success_details_win: "剩余时间奖励", fail_title: "运输失败！", fail_details_l1: "未达到目标分数！", fail_details_l2: "时间耗尽！", success_continue: "查看最终得分", final_score: "最终得分", online_leaderboard: "在线积分榜", leaderboard_empty: "还没有人上榜，快来争第一！", loading_leaderboard: "正在加载排行榜...", submit_failed: "分数提交失败，请点击重试", submit_retry: "重试提交" }
        en: { title: "Mercedes-Benz Star Road", start_game: "Start Game", instructions: "How to Play", leaderboard: "Leaderboard", back_to_menu: "Back to Menu", enter_name_title: "Enter Your Name", enter_name_placeholder: "Max 10 characters", confirm: "Confirm", hud_score: "Score", hud_target: "Target", hud_time: "Time", transition_text: "Level Clear! Get Ready!", hud_remaining_time: "Time Left", success_title: "Congratulations! Parts Delivered!", success_details_win: "Time Bonus", fail_title: "Delivery Failed!", fail_details_l1: "Target score not reached!", fail_details_l2: "Out of time!", success_continue: "View Final Score", final_score: "Final Score", online_leaderboard: "Online Leaderboard", leaderboard_empty: "No scores yet. Be the first!", loading_leaderboard: "Loading leaderboard...", submit_failed: "Score submission failed. Click to retry", submit_retry: "Retry Submission" }
    };
    
    // ----- 语言与UI（保持不变） -----
    function updateUIText() { const langPack = translations[currentLanguage]; document.documentElement.lang = currentLanguage; document.querySelectorAll('[data-lang-key]').forEach(el => { const key = el.getAttribute('data-lang-key'); if (langPack[key]) el.textContent = langPack[key]; }); document.querySelectorAll('[data-lang-key-placeholder]').forEach(el => { const key = el.getAttribute('data-lang-key-placeholder'); if(langPack[key]) el.placeholder = langPack[key]; }); generateInstructions(); }
    
    // ----- 初始化（增强手机端兼容性） -----
    function init() { 
        document.getElementById('start-screen').prepend(langSwitcherContainer); 
        updateUIText(); 
        
        // 先显示加载状态
        if (displays.leaderboardList) displays.leaderboardList.innerHTML = `<li>${translations[currentLanguage].loading_leaderboard}</li>`;
        if (displays.leaderboardListDisplay) displays.leaderboardListDisplay.innerHTML = `<li>${translations[currentLanguage].loading_leaderboard}</li>`;
        
        // 检查Firebase是否初始化成功
        if (!db) {
            console.error("Firebase未初始化，无法加载排行榜");
            if (displays.leaderboardList) displays.leaderboardList.innerHTML = `<li>${currentLanguage === 'zh' ? '连接失败，请刷新' : 'Connection failed, refresh'}</li>`;
            if (displays.leaderboardListDisplay) displays.leaderboardListDisplay.innerHTML = `<li>${currentLanguage === 'zh' ? '连接失败，请刷新' : 'Connection failed, refresh'}</li>`;
        } else {
            // 初始化排行榜数据
            loadLeaderboardData();
            listenForLeaderboardChanges();
        }
        
        // 手机端触摸事件优化（避免事件冲突）
        if (isMobile) {
            gameAreas.level1.style.touchAction = "none"; // 禁用默认触摸行为
            gameAreas.level2.style.touchAction = "none";
        }
            
        movePlayer(playerElements.box, window.innerWidth / 2); 
        movePlayer(playerElements.truck, window.innerWidth / 2); 
        buttons.startGame.addEventListener('click', () => { modals.nameEntry.style.display = 'flex'; }); 
        buttons.confirmName.addEventListener('click', () => { const name = playerNameInput.value.trim(); if (name) { playerName = name; modals.nameEntry.style.display = 'none'; startGame(); } else { alert(currentLanguage === 'zh' ? '请输入你的名字！' : 'Please enter your name!'); } }); 
        buttons.instructions.addEventListener('click', () => showScreen('instructions')); 
        buttons.leaderboard.addEventListener('click', () => { 
            showScreen('leaderboard'); 
            if (isLeaderboardLoaded) {
                displayLeaderboard(displays.leaderboardListDisplay);
            } else {
                displays.leaderboardListDisplay.innerHTML = `<li>${translations[currentLanguage].loading_leaderboard}</li>`;
            }
        }); 
        buttons.backToMenu.forEach(btn => btn.addEventListener('click', () => showScreen('start'))); 
        buttons.restartGame.addEventListener('click', () => { showScreen('start'); }); 
        buttons.continueToLeaderboard.addEventListener('click', () => {
            // 确保分数提交后再进入游戏结束页面（针对手机端）
            if (!scoreSubmitted && finalScore > 0) {
                alert(currentLanguage === 'zh' ? '分数正在提交中，请稍候...' : 'Score is being submitted, please wait...');
                return;
            }
            gameOver(); 
        }); 
        
        // 语言切换（保持不变）
        document.getElementById('lang-switcher').addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { const lang = e.target.id.split('-')[1]; if (lang !== currentLanguage) { currentLanguage = lang; document.getElementById('lang-zh').classList.add('active'); document.getElementById('lang-en').classList.remove('active'); updateUIText(); } } }); 
        
        // 玩家移动控制（保持不变）
        gameAreas.level1.addEventListener('touchmove', (e) => { e.preventDefault(); movePlayer(playerElements.box, e.touches[0].clientX); }, { passive: false }); 
        gameAreas.level1.addEventListener('mousemove', (e) => { if (e.buttons === 1) movePlayer(playerElements.box, e.clientX); }); 
        gameAreas.level2.addEventListener('touchmove', (e) => { e.preventDefault(); movePlayer(playerElements.truck, e.touches[0].clientX); }, { passive: false }); 
        gameAreas.level2.addEventListener('mousemove', (e) => { if (e.buttons === 1) movePlayer(playerElements.truck, e.clientX); }); 
    }
    
    // 加载排行榜数据（保持不变）
    async function loadLeaderboardData() {
        if (!db) return; // 若Firebase未初始化，直接返回
        
        try {
            console.log("尝试加载排行榜数据...");
            const snapshot = await db.collection("leaderboard")
                .orderBy("score", "desc")
                .limit(10)
                .get();
                
            cachedLeaderboard = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || 'Anonymous',
                    score: Number(data.score),
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                };
            });
            
            isLeaderboardLoaded = true;
            console.log(`成功加载${cachedLeaderboard.length}条记录`);
            
            if (screens.leaderboard.classList.contains('active')) {
                displayLeaderboard(displays.leaderboardListDisplay);
            }
            if (screens.gameOver.classList.contains('active')) {
                displayLeaderboard(displays.leaderboardList);
            }
            
            return cachedLeaderboard;
        } catch (error) {
            console.error("加载排行榜失败:", error);
            if (displays.leaderboardList) displays.leaderboardList.innerHTML = `<li>${currentLanguage === 'zh' ? '加载失败，请重试' : 'Failed to load, please retry'}</li>`;
            if (displays.leaderboardListDisplay) displays.leaderboardListDisplay.innerHTML = `<li>${currentLanguage === 'zh' ? '加载失败，请重试' : 'Failed to load, please retry'}</li>`;
            
            setTimeout(loadLeaderboardData, 3000);
            return [];
        }
    }
    
    // ----- 游戏流程（保持不变） -----
    function showScreen(screenName) { 
        Object.values(screens).forEach(s => s.classList.remove('active')); 
        screens[screenName].classList.add('active'); 
        langSwitcherContainer.style.display = (screenName === 'start') ? 'block' : 'none';
        
        if ((screenName === 'leaderboard' || screenName === 'gameOver') && !isLeaderboardLoaded) {
            const listElement = screenName === 'leaderboard' ? displays.leaderboardListDisplay : displays.leaderboardList;
            listElement.innerHTML = `<li>${translations[currentLanguage].loading_leaderboard}</li>`;
            if (!isLeaderboardLoaded && db) {
                loadLeaderboardData().then(() => {
                    displayLeaderboard(listElement);
                });
            }
        }
    }
    
    function startGame() { resetGame(); showScreen('game'); startLevel1(); }
    function resetGame() {
        gameIntervals.forEach(clearInterval);
        gameIntervals = [];
        score = 0;
        finalScore = 0;
        scoreSubmitted = false; // 重置提交状态
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

    // ----- 关卡一、二逻辑（保持不变） -----
    function startLevel1() { /* 不变 */ }
    function createItem_L1() { /* 不变 */ }
    function moveItems_L1() { /* 不变 */ }
    function checkCollisions_L1() { /* 不变 */ }
    function handleCollision_L1(item) { /* 不变 */ }
    function endLevel1() { /* 不变 */ }
    function startLevel2() { /* 不变 */ }
    function createRoadObject_L2() { /* 不变 */ }
    function checkTruckCollisions_L2() { /* 不变 */ }
    function triggerHitPenalty() { /* 不变 */ }
    function showFeedback(text, color) { /* 不变 */ }
    
    // 关卡二结束（增强提交可靠性）
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
        
        // 强制提交分数（无论是否成功，确保执行）
        if (db) {
            updateLeaderboard(playerName, finalScore)
                .then(() => {
                    // 提交成功后显示提示（手机端用户可能需要确认）
                    displays.endDetails.innerHTML += `<p style="color: green;">${currentLanguage === 'zh' ? '分数已提交' : 'Score submitted'}</p>`;
                })
                .catch(() => {
                    // 提交失败时显示重试按钮（关键优化）
                    displays.endDetails.innerHTML += `<p style="color: red;">${lang.submit_failed} <button id="retry-submit" style="margin-left: 8px; padding: 4px 8px; background: #ff4d4d; color: white; border: none; border-radius: 4px;">${lang.submit_retry}</button></p>`;
                    document.getElementById('retry-submit').addEventListener('click', () => {
                        updateLeaderboard(playerName, finalScore);
                    });
                });
        } else {
            // Firebase未初始化时显示错误
            displays.endDetails.innerHTML += `<p style="color: red;">${currentLanguage === 'zh' ? '无法提交，连接失败' : 'Failed to connect'}</p>`;
        }
        
        showScreen('success');
    }
    
    function gameOver(isL1Fail = false) { /* 保持不变 */ }

    // 分数提交函数（核心优化：确保手机端能重试）
    async function updateLeaderboard(name, newScore) { 
        if (!db) {
            console.error("Firebase未初始化，无法提交分数");
            return Promise.reject("Firebase未初始化");
        }
        
        try { 
            const scoreNumber = Number(newScore);
            console.log(`[${isMobile ? '手机端' : '网页端'}] 提交分数: ${name} - ${scoreNumber}`);
            
            // 手机端添加延迟重试机制（应对网络波动）
            if (isMobile) {
                console.log("手机端提交，启用重试机制");
                return new Promise((resolve, reject) => {
                    const attemptSubmit = (attempt = 1) => {
                        db.collection("leaderboard").add({ 
                            name: name, 
                            score: scoreNumber, 
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            device: isMobile ? 'mobile' : 'web' // 标记设备类型（方便后台排查）
                        })
                        .then((result) => {
                            console.log(`提交成功（第${attempt}次尝试），ID: ${result.id}`);
                            scoreSubmitted = true;
                            resolve(result.id);
                        })
                        .catch((error) => {
                            if (attempt < 3) { // 最多重试3次
                                console.log(`第${attempt}次提交失败，${2000 * attempt}ms后重试:`, error);
                                setTimeout(() => attemptSubmit(attempt + 1), 2000 * attempt);
                            } else {
                                console.error("超过最大重试次数，提交失败");
                                reject(error);
                            }
                        });
                    };
                    attemptSubmit(); // 开始第一次提交
                });
            }
            
            // 网页端正常提交
            const result = await db.collection("leaderboard").add({ 
                name: name, 
                score: scoreNumber, 
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                device: isMobile ? 'mobile' : 'web'
            }); 
            
            console.log(`网页端提交成功，ID: ${result.id}`);
            scoreSubmitted = true;
            return result.id;
        } catch (error) { 
            console.error("提交分数失败: ", error);
            scoreSubmitted = false;
            return Promise.reject(error);
        } 
    }

    // 监听排行榜变化（保持不变）
    function listenForLeaderboardChanges() { 
        if (!db) return;
        
        const unsubscribe = db.collection("leaderboard")
            .orderBy("score", "desc")
            .limit(10)
            .onSnapshot(
                (snapshot) => { 
                    console.log(`收到排行榜更新，${snapshot.docChanges().length}条变化`);
                    
                    cachedLeaderboard = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            name: data.name || 'Anonymous',
                            score: Number(data.score),
                            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                            device: data.device || 'unknown' // 显示设备类型
                        };
                    }); 
                    
                    isLeaderboardLoaded = true;
                    
                    if (screens.leaderboard.classList.contains('active')) {
                        displayLeaderboard(displays.leaderboardListDisplay);
                    }
                    if (screens.gameOver.classList.contains('active')) {
                        displayLeaderboard(displays.leaderboardList);
                    }
                }, 
                (error) => {
                    console.error("监听排行榜失败: ", error);
                    alert(currentLanguage === 'zh' ? '排行榜连接中断，正在重试...' : 'Leaderboard connection lost, retrying...');
                    setTimeout(listenForLeaderboardChanges, 5000);
                }
            );
            
        gameIntervals.push(() => unsubscribe());
    }

    // 显示排行榜（新增设备类型标记）
    function displayLeaderboard(listElement) { 
        const lang = translations[currentLanguage]; 
        listElement.innerHTML = ''; 
        
        if (cachedLeaderboard.length === 0) { 
            listElement.innerHTML = `<li>${lang.leaderboard_empty}</li>`;
            console.log("排行榜为空");
            return; 
        } 
        
        const sortedLeaderboard = [...cachedLeaderboard].sort((a, b) => b.score - a.score);
        
        sortedLeaderboard.forEach((entry, index) => { 
            const li = document.createElement('li'); 
            // 显示设备类型（方便调试）
            const deviceLabel = entry.device === 'mobile' ? '📱' : '💻';
            li.innerHTML = `<span>${index + 1}. ${entry.name} ${deviceLabel}</span><span>${entry.score}</span>`;
            listElement.appendChild(li); 
        });
        
        console.log(`显示${sortedLeaderboard.length}条排行榜记录`);
    }
    
    // 其他函数（保持不变）
    function movePlayer(element, x) { /* 不变 */ }
    function generateInstructions() { /* 不变 */ }

    init();
});
