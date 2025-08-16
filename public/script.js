document.addEventListener('DOMContentLoaded', () => {
    // ----- Firebase & UI Elements -----
    const firebaseConfig = { apiKey: "AIzaSyDQ_sNfeyHbZAJU1cIJ-Vt9b5E1FlE8a60", authDomain: "benz-parts-road.firebaseapp.com", projectId: "benz-parts-road", storageBucket: "benz-parts-road.firebasestorage.app", messagingSenderId: "423603206033", appId: "1:423603206033:web:1c280e79a1ee618b260c30" };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
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
    let gameState = {
        current: 'menu', playerName: "玩家", score: 0, finalScore: 0, level1Timer: 30, level2TotalTime: 35,
        hitCooldown: false, cachedLeaderboard: [], currentLanguage: 'zh', animationFrameId: null
    };

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
    const level1WeightedItems = ['engine', 'battery', 'battery', 'tire', 'tire', 'tire', 'brake_disc', 'brake_disc', 'piston', 'piston', 'piston', 'star', 'star', 'screw', 'screw', 'screw', 'oil', 'oil', 'oil', 'oil'];
    const roadObjectTypes = { cone: { img: 'images/obstacle.png', size: 50 }, car_obstacle_red: { img: 'images/car_obstacle_red.png', size: 55 }, car_obstacle_blue: { img: 'images/car_obstacle_blue.png', size: 55 } };
    const translations = {
        zh: { title: "奔驰星辉之路", start_game: "开始游戏", instructions: "玩法说明", leaderboard: "查看排行榜", back_to_menu: "返回主菜单", enter_name_title: "输入你的名字", enter_name_placeholder: "最多10个字符", confirm: "确定", hud_score: "分数", hud_target: "目标", hud_time: "时间", transition_text: "恭喜过关！准备发车！", hud_remaining_time: "剩余时间", success_title: "恭喜！零件已成功送达！", success_details_win: "剩余时间奖励", fail_title: "运输失败！", fail_details_l1: "未达到目标分数！", fail_details_l2: "时间耗尽！", success_continue: "查看最终得分", final_score: "最终得分", online_leaderboard: "在线积分榜", leaderboard_empty: "还没有人上榜，快来争第一！" },
        en: { title: "Mercedes-Benz Star Road", start_game: "Start Game", instructions: "How to Play", leaderboard: "Leaderboard", back_to_menu: "Back to Menu", enter_name_title: "Enter Your Name", enter_name_placeholder: "Max 10 characters", confirm: "Confirm", hud_score: "Score", hud_target: "Target", hud_time: "Time", transition_text: "Level Clear! Get Ready!", hud_remaining_time: "Time Left", success_title: "Congratulations! Parts Delivered!", success_details_win: "Time Bonus", fail_title: "Delivery Failed!", fail_details_l1: "Target score not reached!", fail_details_l2: "Out of time!", success_continue: "View Final Score", final_score: "Final Score", online_leaderboard: "Online Leaderboard", leaderboard_empty: "No scores yet. Be the first!" }
    };
    
    // ----- 语言与UI -----
    function updateUIText() { const langPack = translations[gameState.currentLanguage]; document.documentElement.lang = gameState.currentLanguage; document.querySelectorAll('[data-lang-key]').forEach(el => { const key = el.getAttribute('data-lang-key'); if (langPack[key]) el.textContent = langPack[key]; }); document.querySelectorAll('[data-lang-key-placeholder]').forEach(el => { const key = el.getAttribute('data-lang-key-placeholder'); if(langPack[key]) el.placeholder = langPack[key]; }); generateInstructions(); }
    
    // ----- 初始化 -----
    function init() { document.getElementById('start-screen').prepend(langSwitcherContainer); updateUIText(); listenForLeaderboardChanges(); movePlayer(playerElements.box, window.innerWidth / 2); movePlayer(playerElements.truck, window.innerWidth / 2); buttons.startGame.addEventListener('click', () => { modals.nameEntry.style.display = 'flex'; }); buttons.confirmName.addEventListener('click', () => { const name = playerNameInput.value.trim(); if (name) { gameState.playerName = name; modals.nameEntry.style.display = 'none'; startGame(); } else { alert(gameState.currentLanguage === 'zh' ? '请输入你的名字！' : 'Please enter your name!'); } }); buttons.instructions.addEventListener('click', () => showScreen('instructions')); buttons.leaderboard.addEventListener('click', () => { showScreen('leaderboard'); displayLeaderboard(displays.leaderboardListDisplay); }); buttons.backToMenu.forEach(btn => btn.addEventListener('click', () => showScreen('start'))); buttons.restartGame.addEventListener('click', () => { showScreen('start'); }); buttons.continueToLeaderboard.addEventListener('click', () => gameOver()); document.getElementById('lang-switcher').addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { const lang = e.target.id.split('-')[1]; if (lang !== gameState.currentLanguage) { gameState.currentLanguage = lang; document.getElementById('lang-zh').classList.toggle('active'); document.getElementById('lang-en').classList.toggle('active'); updateUIText(); } } }); gameAreas.level1.addEventListener('touchmove', (e) => { e.preventDefault(); if(gameState.current === 'playing' && gameState.level === 1) movePlayer(playerElements.box, e.touches[0].clientX); }, { passive: false }); gameAreas.level1.addEventListener('mousemove', (e) => { if (e.buttons === 1 && gameState.current === 'playing' && gameState.level === 1) movePlayer(playerElements.box, e.clientX); }); gameAreas.level2.addEventListener('touchmove', (e) => { e.preventDefault(); if(gameState.current === 'playing' && gameState.level === 2) movePlayer(playerElements.truck, e.touches[0].clientX); }, { passive: false }); gameAreas.level2.addEventListener('mousemove', (e) => { if (e.buttons === 1 && gameState.current === 'playing' && gameState.level === 2) movePlayer(playerElements.truck, e.clientX); }); }
    
    // ----- 游戏流程 -----
    function showScreen(screenName) { Object.values(screens).forEach(s => s.classList.remove('active')); screens[screenName].classList.add('active'); langSwitcherContainer.style.display = (screenName === 'start') ? 'block' : 'none'; }
    function startGame() { resetGame(); show
