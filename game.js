document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN DE FIREBASE ---
    const firebaseConfig = {
      apiKey: "AIzaSyDZXqVF1FjNIXriEcCKzO5jpDW1lNJC6yI", // Asegúrate de que esta clave sea correcta
      authDomain: "idle-empire-online.firebaseapp.com",
      projectId: "idle-empire-online",
      storageBucket: "idle-empire-online.appspot.com",
      messagingSenderId: "89028523115",
      appId: "1:89028523115:web:be7023d31fc7ab5c666d2e",
      measurementId: "G-D1LRRNYQRY"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- CONFIGURACIÓN ESTÁTICA DEL JUEGO ---
    const CONFIG = {
        MATERIALS: {
            Piedra: { name: "Piedra", baseValue: 1, upgradeCostBase: 20, prodPerLevel: 0.5 },
            Cobre: { name: "Cobre", unlockCost: 250, baseValue: 5, upgradeCostBase: 120, prodPerLevel: 0.2 },
            Hierro: { name: "Hierro", unlockCost: 2000, baseValue: 20, upgradeCostBase: 800, prodPerLevel: 0.08 },
            Oro: { name: "Oro", unlockCost: 15000, baseValue: 100, upgradeCostBase: 5000, prodPerLevel: 0.02 }
        },
        TRADE_GOODS: {
            Carbon: { name: "Carbón", baseValue: 10 },
            Herramientas: { name: "Herramientas", baseValue: 50 }
        },
        CITIES: {
            PuebloRoca: { name: "Pueblo Roca", basePriceModifiers: { Piedra: 1.0, Cobre: 1.0, Hierro: 1.0, Oro: 1.0 }, sells: [{ good: 'Carbon', modifier: 1.2 }] },
            ForjaFérrea: { name: "Forja Férrea", unlockCost: 5000, basePriceModifiers: { Piedra: 0.7, Cobre: 1.3, Hierro: 1.6, Oro: 0.8 }, sells: [{ good: 'Herramientas', modifier: 1.0 }] },
            PuertoDorado: { name: "Puerto Dorado", unlockCost: 50000, basePriceModifiers: { Piedra: 1.2, Cobre: 0.8, Hierro: 1.0, Oro: 2.0 }, sells: [] }
        },
        CONTRACTS: [
            { id: 'C001', title: 'Primeros Pasos', requirements: { Piedra: 200, Carbon: 10 }, reward: { money: 500 } },
            { id: 'C002', title: 'Forja Básica', requirements: { Cobre: 150, Hierro: 50, Herramientas: 5 }, reward: { money: 3000 } }
        ],
        MARKET_REFRESH_INTERVAL: 600,
        SAVE_INTERVAL: 5000 // 5 segundos
    };

    let state = {};
    const DOM = {};
    const gameLogic = {};
    const ui = {};
    let saveInterval;
    let tickInterval;

    function init() {
        // Asignación de elementos del DOM
        Object.assign(DOM, {
            moneyDisplay: document.getElementById('money-display'), locationDisplay: document.getElementById('location-display'),
            marketTimerDisplay: document.getElementById('market-timer-display'),
            screens: { mine: document.getElementById('mine-screen'), map: document.getElementById('map-screen'), city: document.getElementById('city-screen') },
            navButtons: { mine: document.getElementById('nav-mine-btn'), map: document.getElementById('nav-map-btn') },
            mineScreen: { inventory: document.getElementById('inventory-display'), prodUpgrades: document.getElementById('production-upgrades-container'), mineUnlocks: document.getElementById('unlock-mines-container'), contracts: document.getElementById('contracts-container') },
            mapScreen: { cities: document.getElementById('cities-container'), leaderboard: document.getElementById('leaderboard-container') },
            cityScreen: { name: document.getElementById('city-name'), market: document.getElementById('market-display'), goods: document.getElementById('goods-for-sale-display') },
            notification: document.getElementById('notification'),
            loginOverlay: document.getElementById('login-overlay'),
            mainContainer: document.getElementById('main-container'),
            googleLoginBtn: document.getElementById('google-login-btn'),
            userInfo: document.getElementById('user-info'),
            userDisplay: document.getElementById('user-display'),
            logoutBtn: document.getElementById('logout-btn')
        });

        // Lógica de autenticación
        gameLogic.handleAuthStateChanges();

        // Asignación de eventos de botones
        DOM.googleLoginBtn.onclick = gameLogic.signInWithGoogle;
        DOM.logoutBtn.onclick = game.logic.signOut;
        DOM.navButtons.mine.onclick = () => ui.showScreen('mine');
        DOM.navButtons.map.onclick = () => ui.showScreen('map');
    }

    function startGame(loadedState) {
        state = loadedState;
        DOM.loginOverlay.classList.add('hidden');
        DOM.mainContainer.classList.remove('hidden');
        DOM.userInfo.style.display = 'flex';
        DOM.userDisplay.innerText = auth.currentUser.displayName || auth.currentUser.email.split('@')[0];

        if (!state.marketPrices || Object.keys(state.marketPrices).length === 0) { gameLogic.updateMarketPrices(false); }
        
        // Inicia los bucles del juego
        tickInterval = setInterval(tick, 1000);
        saveInterval = setInterval(gameLogic.save, CONFIG.SAVE_INTERVAL);
        
        ui.showScreen(state.currentScreen || 'mine');
        ui.render();
    }

    function stopGame() {
        // Detiene los bucles y resetea la UI
        if (tickInterval) clearInterval(tickInterval);
        if (saveInterval) clearInterval(saveInterval);
        state = {};
        DOM.loginOverlay.classList.remove('hidden');
        DOM.mainContainer.classList.add('hidden');
        DOM.userInfo.style.display = 'none';
    }

    function tick() {
        for (const matName in CONFIG.MATERIALS) { state.inventory[matName] += gameLogic.calculateProduction(matName); }
        state.marketRefreshTimer--;
        if (state.marketRefreshTimer <= 0) {
            gameLogic.updateMarketPrices(true);
            state.marketRefreshTimer = CONFIG.MARKET_REFRESH_INTERVAL;
        }
        ui.render();
    }
    
    // --- LÓGICA DEL JUEGO ---
    Object.assign(gameLogic, {
        handleAuthStateChanges: () => {
            auth.onAuthStateChanged(user => {
                if (user) {
                    gameLogic.load();
                } else {
                    stopGame();
                }
            });
        },
        signInWithGoogle: () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(e => console.error("Error al iniciar sesión con Google:", e));
        },
        signOut: () => {
            gameLogic.save().then(() => {
                auth.signOut();
            });
        },
        getDefaultState: () => ({
            money: 0,
            inventory: Object.fromEntries([...Object.keys(CONFIG.MATERIALS), ...Object.keys(CONFIG.TRADE_GOODS)].map(k => [k, 0])),
            productionLevels: Object.fromEntries(Object.keys(CONFIG.MATERIALS).map(k => [k, 1])),
            unlockedMaterials: ['Piedra'],
            unlockedCities: ['PuebloRoca'],
            completedContracts: [],
            currentScreen: 'mine',
            marketPrices: {},
            marketRefreshTimer: CONFIG.MARKET_REFRESH_INTERVAL
        }),
        save: () => {
            if (!auth.currentUser) return Promise.resolve();
            return db.collection('players').doc(auth.currentUser.uid).set(state, { merge: true })
                .then(gameLogic.updateLeaderboard)
                .catch(e => console.error("Error guardando en Firestore:", e));
        },
        load: () => {
            if (!auth.currentUser) return;
            const docRef = db.collection('players').doc(auth.currentUser.uid);
            docRef.get().then(doc => {
                if (doc.exists) {
                    const loadedData = doc.data();
                    const finalState = { ...gameLogic.getDefaultState(), ...loadedData };
                    startGame(finalState);
                } else {
                    const newState = gameLogic.getDefaultState();
                    startGame(newState);
                    gameLogic.save(); // Guarda el estado inicial para el nuevo jugador
                }
            }).catch(e => {
                console.error("Error al cargar datos de Firestore:", e);
                startGame(gameLogic.getDefaultState());
            });
        },
        updateLeaderboard: () => {
            if (!auth.currentUser) return;
            db.collection('leaderboard').doc(auth.currentUser.uid).set({
                money: state.money,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                playerName: auth.currentUser.displayName || 'Anónimo'
            }).catch(e => console.error("Error actualizando leaderboard:", e));
        },
        calculateProduction: (matName) => {
            if (!state.unlockedMaterials.includes(matName)) return 0;
            const mat = CONFIG.MATERIALS[matName];
            return mat.prodPerLevel * state.productionLevels[matName];
        },
        getProductionUpgradeCost: (matName) => {
            const mat = CONFIG.MATERIALS[matName];
            return Math.ceil(mat.upgradeCostBase * Math.pow(1.25, state.productionLevels[matName]));
        },
        buyProductionUpgrade: (matName) => {
            const cost = gameLogic.getProductionUpgradeCost(matName);
            if (state.money >= cost) {
                state.money -= cost;
                state.productionLevels[matName]++;
                ui.showNotification(`Eficiencia de ${CONFIG.MATERIALS[matName].name} Nvl ${state.productionLevels[matName]}`, 'success');
            } else { ui.showNotification("Sin dinero", 'error'); }
        },
        unlockMine: (matName) => {
            const cost = CONFIG.MATERIALS[matName].unlockCost;
            if (!state.unlockedMaterials.includes(matName) && state.money >= cost) {
                state.money -= cost;
                state.unlockedMaterials.push(matName);
                ui.showNotification(`Mina de ${CONFIG.MATERIALS[matName].name} desbloqueada`, 'success');
            }
        },
        unlockCity: (cityId) => {
            const city = CONFIG.CITIES[cityId];
            if (!state.unlockedCities.includes(cityId) && state.money >= city.unlockCost) {
                state.money -= city.unlockCost;
                state.unlockedCities.push(cityId);
                ui.showNotification(`Viaje a ${city.name} desbloqueado`, 'success');
            }
        },
        sellAll: (matName) => {
            const amount = Math.floor(state.inventory[matName]);
            if (amount > 0) {
                const price = state.marketPrices[state.currentScreen][matName];
                const earnings = price * amount;
                state.inventory[matName] -= amount;
                state.money += earnings;
                ui.showNotification(`Vendido ${amount.toLocaleString()} de ${CONFIG.MATERIALS[matName].name} por $${earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'success');
            }
        },
        updateMarketPrices: (notify = true) => {
            for (const cityId in CONFIG.CITIES) {
                state.marketPrices[cityId] = {};
                for (const matName in CONFIG.MATERIALS) {
                    const baseMod = CONFIG.CITIES[cityId].basePriceModifiers[matName];
                    const fluctuation = (Math.random() * 0.4) + 0.8;
                    const finalMod = baseMod * fluctuation;
                    state.marketPrices[cityId][matName] = CONFIG.MATERIALS[matName].baseValue * finalMod;
                }
            }
            if (notify) { ui.showNotification("Precios de mercado actualizados", "success"); }
        },
        buyGood: (goodName) => {
            const good = CONFIG.TRADE_GOODS[goodName];
            const city = CONFIG.CITIES[state.currentScreen];
            const saleInfo = city.sells.find(item => item.good === goodName);
            if (!good || !saleInfo) return;
            const cost = good.baseValue * saleInfo.modifier;
            if (state.money >= cost) {
                state.money -= cost;
                state.inventory[goodName]++;
                ui.showNotification(`Comprado 1 ${good.name}`, 'success');
            } else { ui.showNotification("Sin dinero", 'error'); }
        },
        completeContract: (contractId) => {
            if (state.completedContracts.includes(contractId)) return;
            const contract = CONFIG.CONTRACTS.find(c => c.id === contractId);
            const canComplete = Object.entries(contract.requirements).every(([mat, amount]) => state.inventory[mat] >= amount);
            if (canComplete) {
                Object.entries(contract.requirements).forEach(([mat, amount]) => state.inventory[mat] -= amount);
                state.money += contract.reward.money;
                state.completedContracts.push(contractId);
                ui.showNotification(`Contrato '${contract.title}' completado: $${contract.reward.money.toLocaleString()}`, 'success');
            } else { ui.showNotification("Requisitos no cumplidos", 'error'); }
        }
    });
    
    // --- LÓGICA DE LA INTERFAZ DE USUARIO (UI) ---
    Object.assign(ui, {
        showScreen: (screenId) => {
            state.currentScreen = screenId;
            Object.values(DOM.screens).forEach(s => s.classList.add('hidden'));
            Object.values(DOM.navButtons).forEach(b => b.classList.remove('active'));
            if (CONFIG.CITIES[screenId]) {
                DOM.screens.city.classList.remove('hidden');
                DOM.navButtons.map.classList.add('active');
            } else {
                DOM.screens[screenId].classList.remove('hidden');
                DOM.navButtons[screenId].classList.add('active');
            }
            if (screenId === 'map') ui.renderLeaderboard();
        },
        render: () => {
            if (!state || !state.money) return; // Previene errores si el estado aún no se ha cargado
            DOM.moneyDisplay.innerText = `$${Math.floor(state.money).toLocaleString()}`;
            const locName = CONFIG.CITIES[state.currentScreen]?.name || (state.currentScreen === 'mine' ? 'La Mina' : 'Mapa');
            DOM.locationDisplay.innerText = locName;
            const mins = Math.floor(state.marketRefreshTimer / 60);
            const secs = state.marketRefreshTimer % 60;
            DOM.marketTimerDisplay.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
            if (state.currentScreen === 'mine') ui.renderMineScreen();
            if (state.currentScreen === 'map') ui.renderMapScreen();
            if (CONFIG.CITIES[state.currentScreen]) ui.renderCityScreen();
        },
        // Todas las demás funciones de renderizado (renderMineScreen, renderContractsBoard, etc.)
        // son exactamente iguales que antes. Las incluyo por completitud.
        renderMineScreen: () => {
            DOM.mineScreen.inventory.innerHTML = '';
            [...Object.keys(CONFIG.MATERIALS),...Object.keys(CONFIG.TRADE_GOODS)].forEach(iName=>{const i=CONFIG.MATERIALS[iName]||CONFIG.TRADE_GOODS[iName];const p=gameLogic.calculateProduction(iName)||0;const pTxt=p>0?` (+${p.toFixed(2)}/s)`:'';if(state.inventory[iName]>0||state.unlockedMaterials.includes(iName)){DOM.mineScreen.inventory.innerHTML+=`<div class="resource-line"><span>${i.name}</span><span><b>${Math.floor(state.inventory[iName]).toLocaleString()}</b>${pTxt}</span></div>`}});
            DOM.mineScreen.prodUpgrades.innerHTML = '';
            DOM.mineScreen.mineUnlocks.innerHTML = '';
            for (const mName in CONFIG.MATERIALS) {
                if (state.unlockedMaterials.includes(mName)) {
                    const cost = gameLogic.getProductionUpgradeCost(mName);
                    const can = state.money >= cost;
                    const el = document.createElement('div'); el.className = 'resource-line';
                    el.innerHTML = `<span>${CONFIG.MATERIALS[mName].name} Eficiencia (Nvl ${state.productionLevels[mName]})</span>`;
                    const btn = document.createElement('button'); btn.className = `upgrade-btn ${can ? '' : 'disabled'}`;
                    btn.innerText = `Mejorar ($${cost.toLocaleString()})`;
                    btn.onclick = () => gameLogic.buyProductionUpgrade(mName);
                    el.appendChild(btn); DOM.mineScreen.prodUpgrades.appendChild(el);
                } else {
                    const cost = CONFIG.MATERIALS[mName].unlockCost;
                    const can = state.money >= cost;
                    const btn = document.createElement('button'); btn.className = `upgrade-btn ${can ? '' : 'disabled'}`;
                    btn.innerText = `Desbloquear Mina de ${CONFIG.MATERIALS[mName].name} ($${cost.toLocaleString()})`;
                    btn.onclick = () => gameLogic.unlockMine(mName);
                    DOM.mineScreen.mineUnlocks.appendChild(btn);
                }
            }
            ui.renderContractsBoard();
        },
        renderContractsBoard: () => {
            DOM.mineScreen.contracts.innerHTML = '';
            CONFIG.CONTRACTS.forEach(c => {
                const isComp = state.completedContracts.includes(c.id);
                let reqsHtml = ''; let canComp = true;
                for (const mName in c.requirements) {
                    const reqAm = c.requirements[mName]; const hasAm = state.inventory[mName];
                    const hasEn = hasAm >= reqAm; if (!hasEn) canComp = false;
                    const i = CONFIG.MATERIALS[mName] || CONFIG.TRADE_GOODS[mName];
                    reqsHtml += `<li class="${hasEn ? 'req-met' : 'req-not-met'}">${i.name}: ${Math.floor(hasAm).toLocaleString()} / ${reqAm.toLocaleString()}</li>`;
                }
                const el = document.createElement('div'); el.className = `contract ${isComp ? 'completed' : ''}`;
                el.innerHTML = `<div class="contract-title">${c.title}</div><ul class="contract-reqs">${reqsHtml}</ul><div><b>Recompensa:</b> $${c.reward.money.toLocaleString()}</div>`;
                if (!isComp) {
                    const btn = document.createElement('button'); btn.className = `contract-btn ${canComp ? '' : 'disabled'}`;
                    btn.innerText = 'Completar Contrato';
                    btn.onclick = () => gameLogic.completeContract(c.id);
                    el.appendChild(btn);
                }
                DOM.mineScreen.contracts.appendChild(el);
            });
        },
        renderMapScreen: () => {
            DOM.mapScreen.cities.innerHTML = '';
            for (const cId in CONFIG.CITIES) {
                const c = CONFIG.CITIES[cId];
                const btn = document.createElement('button'); btn.className = 'city-btn';
                if (state.unlockedCities.includes(cId)) {
                    btn.innerText = `Viajar a ${c.name}`;
                    btn.onclick = () => ui.showScreen(cId);
                } else {
                    const can = state.money >= c.unlockCost;
                    btn.className += ` ${can ? '' : 'disabled'}`;
                    btn.innerText = `Desbloquear ruta a ${c.name} ($${c.unlockCost.toLocaleString()})`;
                    btn.onclick = () => gameLogic.unlockCity(cId);
                }
                DOM.mapScreen.cities.appendChild(btn);
            }
        },
        renderLeaderboard: () => {
            DOM.mapScreen.leaderboard.innerHTML = 'Cargando...';
            db.collection('leaderboard').orderBy('money', 'desc').limit(10).get().then(snap => {
                if (snap.empty) { DOM.mapScreen.leaderboard.innerHTML = 'Sé el primero en la clasificación.'; return; }
                DOM.mapScreen.leaderboard.innerHTML = '';
                let rank = 1;
                snap.forEach(doc => {
                    const data = doc.data(); const isPlayer = auth.currentUser && doc.id === auth.currentUser.uid;
                    const playerName = isPlayer ? 'Tú' : (data.playerName || 'Anónimo');
                    const el = document.createElement('div'); el.className = 'leaderboard-entry';
                    el.innerHTML = `<span class="leaderboard-rank">#${rank}</span><span>${playerName}</span><span class="leaderboard-money">$${Math.floor(data.money).toLocaleString()}</span>`;
                    DOM.mapScreen.leaderboard.appendChild(el); rank++;
                });
            }).catch(e => { console.error(e); DOM.mapScreen.leaderboard.innerHTML = 'Error al cargar.'; });
        },
        renderCityScreen: () => {
            const c = CONFIG.CITIES[state.currentScreen];
            DOM.cityScreen.name.innerText = c.name;
            ui.renderCityMarket(); ui.renderCityGoodsForSale();
        },
        renderCityMarket: () => {
            DOM.cityScreen.market.innerHTML = '';
            for (const mName in CONFIG.MATERIALS) {
                if (state.inventory[mName] && Math.floor(state.inventory[mName]) > 0) {
                    const am = Math.floor(state.inventory[mName]);
                    const p = state.marketPrices[state.currentScreen][mName];
                    const el = document.createElement('div'); el.className = 'resource-line';
                    el.innerHTML = `<span>${mName} (${am.toLocaleString()}) - <b>$${p.toFixed(2)}</b>/u</span>`;
                    const btn = document.createElement('button'); btn.innerText = 'Vender Todo';
                    btn.onclick = () => gameLogic.sellAll(mName);
                    el.appendChild(btn); DOM.cityScreen.market.appendChild(el);
                }
            }
        },
        renderCityGoodsForSale: () => {
            const c = CONFIG.CITIES[state.currentScreen];
            DOM.cityScreen.goods.innerHTML = '';
            if (!c.sells || c.sells.length === 0) { DOM.cityScreen.goods.innerHTML = '<p>No hay mercancías a la venta.</p>'; return; }
            c.sells.forEach(item => {
                const g = CONFIG.TRADE_GOODS[item.good]; const cost = g.baseValue * item.modifier;
                const can = state.money >= cost;
                const el = document.createElement('div'); el.className = 'resource-line';
                el.innerHTML = `<span>${g.name} - <b>$${cost.toFixed(2)}</b>/u</span>`;
                const btn = document.createElement('button'); btn.className = can ? '' : 'disabled';
                btn.innerText = 'Comprar 1'; btn.onclick = () => gameLogic.buyGood(item.good);
                el.appendChild(btn); DOM.cityScreen.goods.appendChild(el);
            });
        },
        showNotification: (message, type = 'success') => {
            DOM.notification.textContent = message;
            DOM.notification.className = `hidden ${type}`;
            DOM.notification.classList.add('show');
            setTimeout(() => { DOM.notification.classList.remove('show'); }, 3000);
        }
    });

    // Iniciar el juego
    init();
});