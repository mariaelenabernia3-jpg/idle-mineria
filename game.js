document.addEventListener('DOMContentLoaded', () => {

    const firebaseConfig = {
      apiKey: "AIzaSyB5XMrJtKg-EzP3Tea3-yllj-NZEoDXJlY",
      authDomain: "proyecto-genesis-f2425.firebaseapp.com",
      projectId: "proyecto-genesis-f2425",
      storageBucket: "proyecto-genesis-f2425.appspot.com",
      messagingSenderId: "724952032149",
      appId: "1:724952032149:web:38ac600d150c3e979f4c9c"
    };
    
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- CONEXIÓN AL EMULADOR LOCAL ---
    if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
        console.log("JUEGO: MODO DE PRUEBA LOCAL DETECTADO. CONECTANDO A EMULADORES...");
        auth.useEmulator("http://localhost:9099");
        db.useEmulator("localhost", 8080);
    }
    // --- FIN DEL BLOQUE DEL EMULADOR ---

    const CONFIG = {
        MATERIALS: { Helium3: { name: "Helio-3", baseValue: 10 }, AsteroidOre: { name: "Mineral de Asteroide", baseValue: 25 }, IceCrystals: { name: "Cristales de Hielo", baseValue: 60 }, AlienArtifacts: { name: "Artefactos Alienígenas", baseValue: 250 } },
        PLANETS: { Terra: { name: "Terra", priceModifiers: { Helium3: 1.0, AsteroidOre: 0.8, IceCrystals: 0.5, AlienArtifacts: 0.2 } }, Mars: { name: "Marte", priceModifiers: { Helium3: 1.2, AsteroidOre: 1.5, IceCrystals: 0.7, AlienArtifacts: 0.3 } }, Europa: { name: "Europa", priceModifiers: { Helium3: 0.6, AsteroidOre: 1.0, IceCrystals: 2.0, AlienArtifacts: 0.5 } }, Kepler186f: { name: "Kepler-186f", priceModifiers: { Helium3: 2.0, AsteroidOre: 1.8, IceCrystals: 1.5, AlienArtifacts: 3.0 } } },
        UPGRADES: { Drones: { name: "Drones de Minería", cost: 50, baseProd: { Helium3: 0.5 } }, Frigates: { name: "Fragatas de Carga", cost: 500, baseProd: { AsteroidOre: 0.2 } }, IceDrills: { name: "Taladros Criogénicos", cost: 2500, baseProd: { IceCrystals: 0.1 } }, Scanners: { name: "Escáneres de Largo Alcance", cost: 15000, baseProd: { AlienArtifacts: 0.01 } } }
    };
    
    let gameState = {};
    const moneyCountEl = document.getElementById('money-count');
    const planetNameEl = document.getElementById('planet-name');
    const inventoryListEl = document.getElementById('inventory-list');
    const upgradesListEl = document.getElementById('upgrades-list');
    const marketListEl = document.getElementById('market-list');
    const travelListEl = document.getElementById('travel-list');
    const loadingOverlay = document.getElementById('loading-overlay');

    let saveTimeout;
    function requestSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveGame, 2000); 
    }

    function saveGame() {
        const user = auth.currentUser;
        if (user && typeof gameState.money !== 'undefined') {
            db.collection('players').doc(user.uid).set(gameState, { merge: true });
            const playerName = user.displayName || user.email.split('@')[0];
            db.collection('leaderboard').doc(user.uid).set({
                playerName: playerName,
                money: Math.floor(gameState.money)
            }, { merge: true });
        }
    }

    function getDefaultState() { return { money: 100, currentPlanet: 'Terra', inventory: Object.keys(CONFIG.MATERIALS).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}), upgradeLevels: Object.keys(CONFIG.UPGRADES).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}) }; }
    function updateUI() { if (typeof gameState.money === 'undefined') return; moneyCountEl.textContent = Math.floor(gameState.money).toLocaleString(); planetNameEl.textContent = CONFIG.PLANETS[gameState.currentPlanet].name; inventoryListEl.innerHTML = Object.entries(gameState.inventory).map(([key, value]) => `<div class="resource-line"><span class="item-name">${CONFIG.MATERIALS[key].name}</span><span class="item-details">${Math.floor(value).toLocaleString()}</span></div>`).join(''); upgradesListEl.innerHTML = Object.entries(gameState.upgradeLevels).map(([key, level]) => { const upgrade = CONFIG.UPGRADES[key]; const cost = Math.ceil(upgrade.cost * Math.pow(1.15, level)); return `<div class="resource-line"><div class="item-name">${upgrade.name} (Nvl ${level})</div><button onclick="buyUpgrade('${key}')" class="upgrade-btn ${gameState.money < cost ? 'disabled' : ''}">Coste: ${cost.toLocaleString()}</button></div>`; }).join(''); marketListEl.innerHTML = Object.entries(CONFIG.MATERIALS).map(([key, material]) => { const modifier = CONFIG.PLANETS[gameState.currentPlanet].priceModifiers[key]; const price = material.baseValue * modifier; const hasMaterial = gameState.inventory[key] >= 1; return `<div class="resource-line"><div class="item-name">${material.name}<div class="item-details"><span>Precio: $${price.toFixed(2)}</span></div></div><div class="button-group"><button onclick="sellMaterial('${key}', 1)" class="sell-btn ${!hasMaterial ? 'disabled' : ''}">Vender 1</button><button onclick="sellMaterial('${key}', 'all')" class="sell-all-btn ${!hasMaterial ? 'disabled' : ''}">Vender Todo</button></div></div>`; }).join(''); travelListEl.innerHTML = Object.entries(CONFIG.PLANETS).map(([key, planet]) => `<button onclick="travelToPlanet('${key}')" class="travel-btn ${gameState.currentPlanet === key ? 'disabled' : ''}">Viajar a ${planet.name}</button>`).join(''); }
    window.sellMaterial = (key, amount) => { let amountToSell = (amount === 'all') ? Math.floor(gameState.inventory[key]) : parseInt(amount, 10); if (gameState.inventory[key] >= amountToSell && amountToSell > 0) { const material = CONFIG.MATERIALS[key]; const modifier = CONFIG.PLANETS[gameState.currentPlanet].priceModifiers[key]; const price = material.baseValue * modifier; gameState.inventory[key] -= amountToSell; gameState.money += price * amountToSell; requestSave(); } };
    window.buyUpgrade = (key) => { const upgrade = CONFIG.UPGRADES[key]; const cost = Math.ceil(upgrade.cost * Math.pow(1.15, gameState.upgradeLevels[key])); if (gameState.money >= cost) { gameState.money -= cost; gameState.upgradeLevels[key]++; requestSave(); } };
    window.travelToPlanet = (key) => { if (gameState.currentPlanet !== key) { gameState.currentPlanet = key; requestSave(); } };
    function calculateProduction() { const production = {}; for (const key in CONFIG.UPGRADES) { const upgrade = CONFIG.UPGRADES[key]; const level = gameState.upgradeLevels[key]; if (level > 0) { for (const material in upgrade.baseProd) { production[material] = (production[material] || 0) + (upgrade.baseProd[material] * level); } } } return production; }
    function gameLoop() { const production = calculateProduction(); for (const material in production) { gameState.inventory[material] += production[material] / 10; } updateUI(); }
    
    async function loadGame() {
        const user = auth.currentUser;
        if (!user) { gameState = getDefaultState(); loadingOverlay.classList.add('hidden'); return; }
        const docRef = db.collection('players').doc(user.uid);
        const doc = await docRef.get();
        gameState = doc.exists ? { ...getDefaultState(), ...doc.data() } : getDefaultState();
        loadingOverlay.classList.add('hidden');
    }

    auth.onAuthStateChanged(user => {
        if (user) { loadGame(); } 
        else { window.location.href = 'menu.html'; }
    });

    setInterval(gameLoop, 100);
    setInterval(requestSave, 15000);
    window.addEventListener('beforeunload', saveGame);
});