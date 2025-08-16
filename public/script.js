document.addEventListener('DOMContentLoaded', () => {
    // 全局错误捕获，便于调试
    window.addEventListener('error', (e) => {
        console.error('全局错误:', e.error);
        alert('发生错误: ' + e.error.message);
    });

    // ----- Firebase & UI Elements -----
    const firebaseConfig = { 
        apiKey: "AIzaSyDQ_sNfeyHbZAJU1cIJ-Vt9b5E1FlE8a60", 
        authDomain: "benz-parts-road.firebaseapp.com", 
        projectId: "benz-parts-road", 
        storageBucket: "benz-parts-road.firebasestorage.app", 
        messagingSenderId: "423603206033", 
        appId: "1:423603206033:web:1c280e79a1ee618b260c30" 
    };
    
    // 确保Firebase初始化正确，添加错误处理
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
        alert("Firebase初始化失败，请检查网络连接");
    }
    const db = firebaseApp ? firebaseApp.firestore() : null;

    // 辅助函数：安全获取元素并检查存在性
    function getElement(id) {
        const el = document.getElementById(id);
        if (!el) console.warn(`元素不存在: ${id} - 这可能导致功能异常`);
        return el;
    }

    // 元素引用 - 使用安全获取函数
    const screens = { 
        start: getElement('start-screen'), 
        instructions: getElement('instructions-screen'), 
        game: getElement('game-screen'), 
        success: getElement('level2-end-screen'), 
        gameOver: getElement('game-over-screen'), 
        leaderboard: getElement('leaderboard-screen') 
    };
    const modals = { 
        nameEntry: getElement('name-entry-modal') 
    };
    const buttons = { 
        startGame: getElement('start-game-btn'), 
        instructions: getElement('instructions-btn'), 
        leaderboard: getElement('leaderboard-btn'), 
        confirmName: getElement('confirm-name-btn'), 
        backToMenu: document.querySelectorAll('.back-to-menu'), 
        restartGame: getElement('restart-game-btn'), 
        continueToLeaderboard: getElement('continue-to-leaderboard-btn') 
    };
    const displays = { 
        score: getElement('score'), 
        targetScore: getElement('target-score'), 
        timer: getElement('timer'), 
        remainingTime: getElement('remaining-time'), 
        feedbackText: getElement('feedback-text'), 
        endTitle: getElement('end-title'), 
        endDetails: getElement('end-details'), 
        finalScore: getElement('final-score'), 
        finalScoreTitle: getElement('final-score-title'), 
        leaderboardList: getElement('leaderboard-list'), 
        leaderboardListDisplay: getElement('leaderboard-list-display'), 
        instructionsContent: getElement('instructions-content'), 
        progressBar: getElement('progress-bar'), 
        progressPercentage: getElement('progress-percentage') 
    };
    const gameAreas = { 
        level1: getElement('game-area1'), 
        level2: getElement('game-area2') 
    };
    const levels = { 
        level1: getElement('level1'), 
        levelTransition: getElement('level-transition'), 
        level2: getElement('level2') 
    };
    const playerElements = { 
        box: getElement('player-box'), 
        truck: getElement('player-truck') 
    };
    const playerNameInput = getElement('player-name-input');
    const langSwitcherContainer = getElement('lang-switcher-container');
    const langSwitcher = getElement('lang-switcher');

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
    let scoreSubmitted = false; // 跟踪分数是否已提交

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
        zh: { title: "奔驰星辉之路", start_game: "开始游戏", instructions: "玩法说明", leaderboard: "查看排行榜", back_to_menu: "返回主菜单", enter_name_title: "输入你的名字", enter_name_placeholder: "最多10个字符", confirm: "确定", hud_score: "分数", hud_target: "目标", hud_time: "时间", transition_text: "恭喜过关！准备发车！", hud_remaining_time: "剩余时间", success_title: "恭喜！零件已成功送达！", success_details_win: "剩余时间奖励", fail_title: "运输失败！", fail_details_l1: "未达到目标分数！", fail_details_l2: "时间耗尽！", success_continue: "查看最终得分", final_score: "最终得分", online_leaderboard: "在线积分榜", leaderboard_empty: "还没有人上榜，快来争第一！", loading_leaderboard: "正在加载排行榜...", submit_success: "分数提交成功", submit_failed: "分数提交失败，请重试", retry_submit: "重试提交" }
        en: { title: "Mercedes-Benz Star Road", start_game: "Start Game", instructions: "How to Play", leaderboard: "Leaderboard", back_to_menu: "Back to Menu", enter_name_title: "Enter Your Name", enter_name_placeholder: "Max 10 characters", confirm: "Confirm", hud_score: "Score", hud_target: "Target", hud_time: "Time", transition_text: "Level Clear! Get Ready!", hud_remaining_time: "Time Left", success_title: "Congratulations! Parts Delivered!", success_details_win: "Time Bonus", fail_title: "Delivery Failed!", fail_details_l1: "Target score not reached!", fail_details_l2: "Out of time!", success_continue: "View Final Score", final_score: "Final Score", online_leaderboard: "Online Leaderboard", leaderboard_empty: "No scores yet. Be the first!", loading_leaderboard: "Loading leaderboard...", submit_success: "Score submitted successfully", submit_failed: "Score submission failed, please retry", retry_submit: "Retry submission" }
    };
    
    // ----- 确保按钮可点击的核心函数 -----
    function ensureClickable(element) {
        if (!element) return;
        
        // 移除可能阻止点击的样式
        element.style.pointerEvents = 'auto';
        element.style.zIndex = '1000'; // 确保在最上层
        element.style.opacity = '1';
        element.style.cursor = 'pointer';
        
        // 添加视觉反馈
        element.classList.add('clickable');
    }
    
    // ----- 语言与UI -----
    function updateUIText() { 
        const langPack = translations[currentLanguage]; 
        document.documentElement.lang = currentLanguage; 
        document.querySelectorAll('[data-lang-key]').forEach(el => { 
            const key = el.getAttribute('data-lang-key'); 
            if (langPack[key]) el.textContent = langPack[key]; 
        }); 
        document.querySelectorAll('[data-lang-key-placeholder]').forEach(el => { 
            const key = el.getAttribute('data-lang-key-placeholder'); 
            if(langPack[key]) el.placeholder = langPack[key]; 
        }); 
        generateInstructions(); 
    }
    
    // ----- 初始化 -----
    function init() { 
        console.log("开始初始化应用...");
        
        // 确保所有按钮可点击
        if (buttons.startGame) ensureClickable(buttons.startGame);
        if (buttons.instructions) ensureClickable(buttons.instructions);
        if (buttons.leaderboard) ensureClickable(buttons.leaderboard);
        if (buttons.confirmName) ensureClickable(buttons.confirmName);
        if (buttons.restartGame) ensureClickable(buttons.restartGame);
        if (buttons.continueToLeaderboard) ensureClickable(buttons.continueToLeaderboard);
        buttons.backToMenu.forEach(btn => ensureClickable(btn));
        
        // 确保屏幕元素层级正确
        Object.values(screens).forEach(screen => {
            if (screen) {
                screen.style.position = 'relative';
                screen.style.zIndex = '10';
            }
        });
        
        // 确保弹窗在最上层
        if (modals.nameEntry) {
            modals.nameEntry.style.zIndex = '100';
            modals.nameEntry.style.position = 'fixed';
        }
        
        if (langSwitcherContainer && screens.start) {
            screens.start.prepend(langSwitcherContainer); 
        }
        
        updateUIText(); 
        
        // 初始化排行榜显示
        if (displays.leaderboardList) displays.leaderboardList.innerHTML = `<li>${translations[currentLanguage].loading_leaderboard}</li>`;
        if (displays.leaderboardListDisplay) displays.leaderboardListDisplay.innerHTML = `<li>${translations[currentLanguage].loading_leaderboard}</li>`;
        
        // 检查Firebase是否可用
        if (!db) {
            console.error("Firebase未初始化，无法加载排行榜");
            if (displays.leaderboardList) displays.leaderboardList.innerHTML = `<li>${currentLanguage === 'zh' ? '无法连接到服务器' : 'Cannot connect to server'}</li>`;
            if (displays.leaderboardListDisplay) displays.leaderboardListDisplay.innerHTML = `<li>${currentLanguage === 'zh' ? '无法连接到服务器' : 'Cannot connect to server'}</li>`;
        } else {
            // 加载排行榜数据，带重试机制
            loadLeaderboardData();
            listenForLeaderboardChanges();
        }
            
        // 初始化玩家位置
        if (playerElements.box) movePlayer(playerElements.box, window.innerWidth / 2); 
        if (playerElements.truck) movePlayer(playerElements.truck, window.innerWidth / 2); 
        
        // 按钮事件绑定 - 使用捕获阶段确保事件被触发
        if (buttons.startGame) {
            buttons.startGame.addEventListener('click', () => { 
                console.log('点击开始游戏按钮');
                if (modals.nameEntry) {
                    modals.nameEntry.style.display = 'flex';
                }
            }, true);
        }
        
        if (buttons.confirmName) {
            buttons.confirmName.addEventListener('click', () => { 
                console.log('点击确认名字按钮');
                if (playerNameInput) {
                    const name = playerNameInput.value.trim(); 
                    if (name) { 
                        playerName = name; 
                        if (modals.nameEntry) modals.nameEntry.style.display = 'none'; 
                        startGame(); 
                    } else { 
                        alert(currentLanguage === 'zh' ? '请输入你的名字！' : 'Please enter your name!'); 
                    } 
                }
            }, true);
        }
        
        if (buttons.instructions) {
            buttons.instructions.addEventListener('click', () => {
                console.log('点击玩法说明按钮');
                showScreen('instructions');
            }, true);
        }
        
        if (buttons.leaderboard) {
            buttons.leaderboard.addEventListener('click', () => { 
                console.log('点击排行榜按钮');
                showScreen('leaderboard'); 
                if (isLeaderboardLoaded && displays.leaderboardListDisplay) {
                    displayLeaderboard(displays.leaderboardListDisplay);
                } else if (displays.leaderboardListDisplay) {
                    displays.leaderboardListDisplay.innerHTML = `<li>${translations[currentLanguage].loading_leaderboard}</li>`;
                }
            }, true);
        }
        
        buttons.backToMenu.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('点击返回主菜单按钮');
                showScreen('start');
            }, true);
        });
        
        if (buttons.restartGame) {
            buttons.restartGame.addEventListener('click', () => { 
                console.log('点击重新开始按钮');
                showScreen('start'); 
            }, true);
        }
        
        if (buttons.continueToLeaderboard) {
            buttons.continueToLeaderboard.addEventListener('click', () => {
                console.log('点击查看最终得分按钮');
                gameOver(); 
            }, true);
        }
        
        // 语言切换
        if (langSwitcher) {
            langSwitcher.addEventListener('click', (e) => { 
                if (e.target.tagName === 'BUTTON') { 
                    const lang = e.target.id.split('-')[1]; 
                    if (lang && lang !== currentLanguage) { 
                        console.log(`切换语言到: ${lang}`);
                        currentLanguage = lang; 
                        document.getElementById('lang-zh').classList.toggle('active', lang === 'zh');
                        document.getElementById('lang-en').classList.toggle('active', lang === 'en');
                        updateUIText(); 
                    } 
                }
            }, true);
        }
        
        // 玩家移动控制 - 限制在游戏区域内，防止事件冒泡
        if (gameAreas.level1) {
            gameAreas.level1.addEventListener('touchmove', (e) => { 
                e.preventDefault();
                e.stopPropagation();
                if (playerElements.box && e.touches[0]) {
                    movePlayer(playerElements.box, e.touches[0].clientX); 
                }
            }, { passive: false }); 
            
            gameAreas.level1.addEventListener('mousemove', (e) => { 
                if (e.buttons === 1 && playerElements.box) {
                    movePlayer(playerElements.box, e.clientX); 
                }
            });
        }
        
        if (gameAreas.level2) {
            gameAreas.level2.addEventListener('touchmove', (e) => { 
                e.preventDefault();
                e.stopPropagation();
                if (playerElements.truck && e.touches[0]) {
                    movePlayer(playerElements.truck, e.touches[0].clientX); 
                }
            }, { passive: false }); 
            
            gameAreas.level2.addEventListener('mousemove', (e) => { 
                if (e.buttons === 1 && playerElements.truck) {
                    movePlayer(playerElements.truck, e.clientX); 
                }
            });
        }

        console.log("初始化完成");
    }
    
    // 加载排行榜数据 - 增强错误处理和重试机制
    async function loadLeaderboardData(attempt = 1) {
        if (!db) return;
        
        try {
            console.log(`尝试加载排行榜数据（第${attempt}次）...`);
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
            console.log(`成功加载${cachedLeaderboard.length}条排行榜记录`);
            
            // 更新显示
            if (screens.leaderboard?.classList.contains('active') && displays.leaderboardListDisplay) {
                displayLeaderboard(displays.leaderboardListDisplay);
            }
            if (screens.gameOver?.classList.contains('active') && displays.leaderboardList) {
                displayLeaderboard(displays.leaderboardList);
            }
            
            return cachedLeaderboard;
        } catch (error) {
            console.error(`加载排行榜失败（第${attempt}次）:`, error);
            
            // 显示错误信息
            if (displays.leaderboardList) displays.leaderboardList.innerHTML = `<li>${currentLanguage === 'zh' ? '加载失败，请重试' : 'Failed to load, please retry'}</li>`;
            if (displays.leaderboardListDisplay) displays.leaderboardListDisplay.innerHTML = `<li>${currentLanguage === 'zh' ? '加载失败，请重试' : 'Failed to load, please retry'}</li>`;
            
            // 重试机制：最多5次，指数退避
            if (attempt < 5) {
                const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s...
                console.log(`将在${delay}ms后重试`);
                setTimeout(() => loadLeaderboardData(attempt + 1), delay);
            }
            return [];
        }
    }
    
    // ----- 游戏流程 -----
    function showScreen(screenName) { 
        // 隐藏所有屏幕
        Object.values(screens).forEach(s => {
            if (s) s.classList.remove('active'); 
        }); 
        
        // 显示目标屏幕
        if (screens[screenName]) {
            screens[screenName].classList.add('active'); 
            screens[screenName].style.zIndex = '20'; // 确保当前屏幕在最上层
        }
        
        // 控制语言切换器显示
        if (langSwitcherContainer) {
            langSwitcherContainer.style.display = (screenName === 'start') ? 'block' : 'none';
        }
        
        // 处理排行榜数据显示
        if ((screenName === 'leaderboard' || screenName === 'gameOver') && !isLeaderboardLoaded) {
            const listElement = screenName === 'leaderboard' ? displays.leaderboardListDisplay : displays.leaderboardList;
            if (listElement) {
                listElement.innerHTML = `<li>${translations[currentLanguage].loading_leaderboard}</li>`;
            }
            if (!isLeaderboardLoaded && db) {
                loadLeaderboardData().then(() => {
                    if (listElement) {
                        displayLeaderboard(listElement);
                    }
                });
            }
        }
    }
    
    function startGame() { 
        console.log("开始游戏");
        resetGame(); 
        showScreen('game'); 
        startLevel1(); 
    }
    
    function resetGame() {
        // 清除所有定时器
        gameIntervals.forEach(clearInterval);
        gameIntervals = [];
        
        // 重置游戏状态
        score = 0;
        finalScore = 0;
        scoreSubmitted = false;
        level1Timer = 30;
        level2TotalTime = 35;
        hitCooldown = false;
        
        // 更新UI显示
        if (displays.score) displays.score.textContent = score;
        if (displays.timer) displays.timer.textContent = level1Timer;
        if (displays.remainingTime) displays.remainingTime.textContent = level2TotalTime.toFixed(1);
        
        // 重置游戏区域
        if (gameAreas.level1 && playerElements.box) {
            gameAreas.level1.innerHTML = ''; 
            gameAreas.level1.appendChild(playerElements.box);
        }
        
        if (gameAreas.level2 && playerElements.truck) {
            gameAreas.level2.innerHTML = ''; 
            gameAreas.level2.appendChild(playerElements.truck); 
            if (displays.feedbackText) {
                gameAreas.level2.appendChild(displays.feedbackText);
            }
        }
        
        // 重置关卡显示
        if (levels.level1) levels.level1.classList.add('active');
        if (levels.levelTransition) levels.levelTransition.style.display = 'none';
        if (levels.level2) levels.level2.classList.remove('active');
    }

    // ----- 关卡一 -----
    function startLevel1() {
        currentLevel = 1;
        console.log("开始第一关");
        
        const countdown = setInterval(() => { 
            level1Timer--; 
            if (displays.timer) displays.timer.textContent = Math.max(0, level1Timer); 
            if (level1Timer <= 0) endLevel1(); 
        }, 1000); 
        gameIntervals.push(countdown);
        
        const itemFall = setInterval(createItem_L1, 650); 
        gameIntervals.push(itemFall);
        
        const gameLoop = setInterval(() => { 
            moveItems_L1(); 
            checkCollisions_L1(); 
        }, 1000/60); 
        gameIntervals.push(gameLoop);
    }
    
    function createItem_L1() { 
        if (!gameAreas.level1) return;
        
        const key = level1WeightedItems[Math.floor(Math.random() * level1WeightedItems.length)]; 
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
    
    function moveItems_L1() { 
        if (!gameAreas.level1) return;
        
        gameAreas.level1.querySelectorAll('.item').forEach(item => { 
            item.style.top = `${item.offsetTop + parseFloat(item.dataset.speed)}px`; 
            if (item.offsetTop > gameAreas.level1.offsetHeight) item.remove(); 
        }); 
    }
    
    function checkCollisions_L1() { 
        if (!playerElements.box || !gameAreas.level1) return;
        
        const boxRect = playerElements.box.getBoundingClientRect(); 
        gameAreas.level1.querySelectorAll('.item').forEach(item => { 
            const itemRect = item.getBoundingClientRect(); 
            if (boxRect.left < itemRect.right && boxRect.right > itemRect.left && 
                boxRect.top < itemRect.bottom && boxRect.bottom > itemRect.top) { 
                handleCollision_L1(item); 
                item.remove(); 
            } 
        }); 
    }
    
    function handleCollision_L1(item) { 
        const data = itemTypes[item.dataset.type]; 
        score += data.score; 
        if (displays.score) displays.score.textContent = score; 
        
        if(item.dataset.type === 'oil') { 
            document.body.style.filter = 'blur(3px)'; 
            setTimeout(() => { 
                document.body.style.filter = 'none'; 
            }, 500); 
        } 
    }
    
    function endLevel1() { 
        gameIntervals.forEach(clearInterval); 
        gameIntervals = []; 
        console.log("结束第一关，得分:", score);
        
        if (score >= TARGET_SCORE) { 
            if (levels.level1) levels.level1.classList.remove('active');
            if (levels.levelTransition) {
                levels.levelTransition.style.display = 'flex'; 
                levels.levelTransition.style.zIndex = '30'; // 确保过渡层可见
            }
            setTimeout(() => { 
                if (levels.levelTransition) levels.levelTransition.style.display = 'none';
                if (levels.level2) levels.level2.classList.add('active'); 
                startLevel2(); 
            }, 2000); 
        } else { 
            gameOver(true); 
        } 
    }

    // ----- 关卡二 -----
    function startLevel2() {
        currentLevel = 2;
        console.log("开始第二关");
        
        let safeDrivingTimer = 0;
        let elapsedTime = 0;

        const mainInterval = setInterval(() => {
            elapsedTime += 0.1;
            level2TotalTime -= 0.1;
            safeDrivingTimer += 0.1;
            
            if (displays.remainingTime) displays.remainingTime.textContent = Math.max(0, level2TotalTime).toFixed(1);
            
            const progress = Math.min((elapsedTime / LEVEL_2_DURATION) * 100, 100);
            if (displays.progressBar) displays.progressBar.style.width = `${progress}%`;
            if (displays.progressPercentage) displays.progressPercentage.textContent = `${Math.floor(progress)}%`;

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
    
    function createRoadObject_L2() { 
        if (!gameAreas.level2) return;
        
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
        gameAreas.level2.appendChild(el); 
    }
    
    function checkTruckCollisions_L2() { 
        if (!gameAreas.level2) return;
        
        gameAreas.level2.querySelectorAll('.obstacle').forEach(obj => { 
            obj.style.top = `${obj.offsetTop + 5}px`; 
            if (obj.offsetTop > gameAreas.level2.offsetHeight) obj.remove(); 
        }); 
        
        if (hitCooldown) return;
        if (!playerElements.truck) return;
        
        const truckRect = playerElements.truck.getBoundingClientRect(); 
        gameAreas.level2.querySelectorAll('.obstacle').forEach(obj => { 
            const objRect = obj.getBoundingClientRect(); 
            if (truckRect.left < objRect.right && truckRect.right > objRect.left && 
                truckRect.top < objRect.bottom && truckRect.bottom > objRect.top) { 
                obj.remove(); 
                triggerHitPenalty(); 
            } 
        }); 
    }
    
    function triggerHitPenalty() { 
        hitCooldown = true; 
        level2TotalTime -= PENALTY_PER_COLLISION; 
        showFeedback(`-${PENALTY_PER_COLLISION}s`, '#ff4d4d'); 
        
        if (playerElements.truck) {
            playerElements.truck.classList.add('hit'); 
            setTimeout(() => { 
                playerElements.truck.classList.remove('hit'); 
                hitCooldown = false; 
            }, 1000); 
        }
    }
    
    function showFeedback(text, color) { 
        if (!displays.feedbackText) return;
        
        const el = displays.feedbackText; 
        el.textContent = text; 
        el.style.color = color; 
        el.style.opacity = 1; 
        setTimeout(() => { 
            el.style.opacity = 0; 
        }, 1000); 
    }
    
    function endLevel2(isSuccess) {
        gameIntervals.forEach(clearInterval);
        gameIntervals = [];
        console.log(`结束第二关，成功: ${isSuccess}`);
        
        const lang = translations[currentLanguage];
        if (displays.endTitle) displays.endTitle.textContent = isSuccess ? lang.success_title : lang.fail_title;
        
        if (isSuccess) {
            const timeBonus = (level2TotalTime > 0) ? Math.floor(level2TotalTime * 100) : 0;
            finalScore = score + timeBonus;
            if (displays.endDetails) {
                displays.endDetails.innerHTML = `<p>${lang.success_details_win}: ${level2TotalTime.toFixed(1)}s × 100 = +${timeBonus}</p>`;
            }
        } else {
            finalScore = score;
            if (displays.endDetails) {
                displays.endDetails.innerHTML = `<p>${lang.fail_details_l2}</p>`;
            }
        }
        
        // 提交分数并显示结果
        if (db) {
            updateLeaderboard(playerName, finalScore)
                .then(() => {
                    if (displays.endDetails) {
                        displays.endDetails.innerHTML += `<p style="color: green;">${lang.submit_success}</p>`;
                    }
                })
                .catch(() => {
                    if (displays.endDetails) {
                        displays.endDetails.innerHTML += `
                            <p style="color: red;">${lang.submit_failed} 
                                <button class="retry-submit" style="margin-left: 8px; padding: 4px 8px; background: #ff4d4d; color: white; border: none; border-radius: 4px;">
                                    ${lang.retry_submit}
                                </button>
                            </p>
                        `;
                        
                        // 添加重试按钮事件
                        document.querySelector('.retry-submit').addEventListener('click', () => {
                            updateLeaderboard(playerName, finalScore);
                        });
                    }
                });
        } else {
            if (displays.endDetails) {
                displays.endDetails.innerHTML += `<p style="color: red;">${currentLanguage === 'zh' ? '无法提交，服务器连接失败' : 'Failed to connect to server'}</p>`;
            }
        }
        
        showScreen('success');
    }
    
    function gameOver(isL1Fail = false) {
        console.log("游戏结束");
        const lang = translations[currentLanguage];
        if (displays.finalScoreTitle) {
            displays.finalScoreTitle.style.display = 'block';
            if (isL1Fail) {
                displays.finalScoreTitle.textContent = lang.fail_details_l1;
            } else {
                displays.finalScoreTitle.innerHTML = `<span data-lang-key="final_score">${lang.final_score}</span>: <span>${finalScore}</span>`;
            }
        }
        
        showScreen('gameOver');
        
        // 确保数据加载完成后再显示排行榜
        if (isLeaderboardLoaded && displays.leaderboardList) {
            displayLeaderboard(displays.leaderboardList);
        } else if (displays.leaderboardList) {
            displays.leaderboardList.innerHTML = `<li>${translations[currentLanguage].loading_leaderboard}</li>`;
            loadLeaderboardData().then(() => {
                if (displays.leaderboardList) {
                    displayLeaderboard(displays.leaderboardList);
                }
            });
        }
    }

    // 提交分数 - 增强错误处理和重试机制
    async function updateLeaderboard(name, newScore, attempt = 1) { 
        if (!db) {
            console.error("Firebase未初始化，无法提交分数");
            return Promise.reject("Firebase未初始化");
        }
        
        try { 
            const scoreNumber = Number(newScore);
            console.log(`提交分数（第${attempt}次尝试）: ${name} - ${scoreNumber}`);
            
            const result = await db.collection("leaderboard").add({ 
                name: name, 
                score: scoreNumber, 
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }); 
            
            console.log(`分数提交成功，文档ID: ${result.id}`);
            scoreSubmitted = true;
            return result.id;
        } catch (error) { 
            console.error(`分数提交失败（第${attempt}次尝试）: `, error);
            
            // 最多重试5次
            if (attempt < 5) {
                const delay = 1000 * Math.pow(2, attempt); // 指数退避重试
                console.log(`将在${delay}ms后重试提交`);
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(updateLeaderboard(name, newScore, attempt + 1));
                    }, delay);
                });
            }
            
            // 超过重试次数，提示用户
            alert(currentLanguage === 'zh' ? '提交分数失败，请稍后再试' : 'Failed to submit score. Please try again later.');
            return Promise.reject(error);
        } 
    }

    // 监听排行榜变化
    function listenForLeaderboardChanges() { 
        if (!db) return;
        
        console.log("开始监听排行榜变化");
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
                            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                        };
                    }); 
                    
                    isLeaderboardLoaded = true;
                    
                    // 更新显示
                    if (screens.leaderboard?.classList.contains('active') && displays.leaderboardListDisplay) {
                        displayLeaderboard(displays.leaderboardListDisplay);
                    }
                    if (screens.gameOver?.classList.contains('active') && displays.leaderboardList) {
                        displayLeaderboard(displays.leaderboardList);
                    }
                }, 
                (error) => {
                    console.error("监听排行榜失败: ", error);
                    alert(currentLanguage === 'zh' ? '排行榜连接中断，正在重试...' : 'Leaderboard connection lost, retrying...');
                    // 重新连接
                    setTimeout(listenForLeaderboardChanges, 5000);
                }
            );
            
        // 存储取消订阅函数，以便在需要时清理
        gameIntervals.push(() => unsubscribe());
    }

    // 显示排行榜
    function displayLeaderboard(listElement) { 
        if (!listElement) return;
        
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
            li.innerHTML = `<span>${index + 1}. ${entry.name}</span><span>${entry.score}</span>`;
            listElement.appendChild(li); 
        });
        
        console.log(`显示${sortedLeaderboard.length}条排行榜记录`);
    }
    
    // 移动玩家
    function movePlayer(element, x) { 
        if (!element || !element.parentElement) return;
        
        const parent = element.parentElement; 
        const parentWidth = parent.offsetWidth; 
        const playerWidth = element.offsetWidth; 
        let newLeft = x - playerWidth / 2; 
        if (newLeft < 0) newLeft = 0; 
        if (newLeft > parentWidth - playerWidth) newLeft = parentWidth - playerWidth; 
        element.style.left = `${newLeft}px`; 
    }
    
    // 生成游戏说明
    function generateInstructions() {
        if (!displays.instructionsContent) return;
        
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

    // 初始化应用
    init();
});
