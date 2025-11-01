document.addEventListener('DOMContentLoaded', () => {

    // TU CONFIGURACIÓN DE FIREBASE YA INTEGRADA
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
    // Este bloque detecta si estás en modo de prueba local (ej. 127.0.0.1 o localhost)
    if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
        console.log("MENÚ: MODO DE PRUEBA LOCAL DETECTADO. CONECTANDO A EMULADORES...");
        auth.useEmulator("http://localhost:9099");
        db.useEmulator("localhost", 8080);
    }
    // --- FIN DEL BLOQUE DEL EMULADOR ---

    // --- PANEL DE ADMINISTRADOR ---
    const adminKeyInput = document.getElementById('admin-key-input');
    const adminPanel = document.getElementById('admin-panel');
    const deleteDataBtn = document.getElementById('delete-data-btn');
    const deleteAccountsBtn = document.getElementById('delete-accounts-btn');
    
    const ADMIN_KEY = "CODIGO_ROJO_1337";
    const CONFIRM_DELETE_DATA = "PURGAR DATOS DE JUGADORES";
    const CONFIRM_DELETE_ACCOUNTS = "PROTOCOLO EXTINCION";

    adminKeyInput.addEventListener('input', (e) => {
        if (e.target.value === ADMIN_KEY) {
            adminPanel.classList.remove('hidden');
        } else {
            adminPanel.classList.add('hidden');
        }
    });

    deleteDataBtn.addEventListener('click', () => {
        const confirmation = prompt(`ACCIÓN IRREVERSIBLE.\n\nEscribe: "${CONFIRM_DELETE_DATA}"`);
        if (confirmation === CONFIRM_DELETE_DATA) {
            alert("Confirmación recibida.\nACCIÓN SIMULADA.\nPara borrar los datos realmente, ejecuta la Cloud Function 'deleteAllPlayerData'.");
        } else {
            alert("Confirmación incorrecta. Operación cancelada.");
        }
    });

    deleteAccountsBtn.addEventListener('click', () => {
        const confirmation = prompt(`MÁXIMA ALERTA.\n\nEscribe: "${CONFIRM_DELETE_ACCOUNTS}"`);
        if (confirmation === CONFIRM_DELETE_ACCOUNTS) {
            alert("Confirmación final recibida.\nACCIÓN SIMULADA.\nPara borrar las cuentas realmente, ejecuta la Cloud Function 'deleteAllUsers'.");
        } else {
            alert("Confirmación incorrecta. Operación cancelada.");
        }
    });

    // --- CÓDIGO RESTANTE DEL MENÚ ---
    const iconLogin = `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>`;
    const iconLogout = `<svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"></path></svg>`;
    const authIconButton = document.getElementById('auth-icon-btn');
    const authModal = document.getElementById('auth-modal');
    const optionsModal = document.getElementById('options-modal');
    const creditsModal = document.getElementById('credits-modal');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const loginErrorMsg = document.getElementById('login-error-message');
    const registerErrorMsg = document.getElementById('register-error-message');
    const allModals = document.querySelectorAll('.modal-overlay');
    const optionsBtn = document.getElementById('options-btn');
    const creditsBtn = document.getElementById('credits-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const startGameLink = document.getElementById('start-game-btn');
    const userInfoDisplay = document.getElementById('user-info');
    const startGameBtnText = startGameLink.querySelector('span');
    const leaderboardContainer = document.getElementById('leaderboard-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const registerBtn = document.getElementById('register-btn');
    const loginBtn = document.getElementById('login-btn');
    function showAuthError(message, type) { const element = type === 'login' ? loginErrorMsg : registerErrorMsg; element.textContent = message; element.style.display = 'block'; }
    function clearAuthErrors() { loginErrorMsg.style.display = 'none'; registerErrorMsg.style.display = 'none'; }
    function translateFirebaseError(error) { switch (error.code) { case 'auth/email-already-in-use': return 'Este correo ya está registrado. Intenta iniciar sesión.'; case 'auth/wrong-password': return 'Contraseña incorrecta.'; case 'auth/user-not-found': return 'No se encontró ninguna cuenta con este correo.'; case 'auth/invalid-email': return 'El formato del correo no es válido.'; case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.'; default: return 'Ha ocurrido un error inesperado.'; } }
    function closeModal(modal) { modal.classList.add('hidden'); }
    function openModal(modal) { clearAuthErrors(); modal.classList.remove('hidden'); }
    optionsBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(optionsModal); });
    creditsBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(creditsModal); });
    leaderboardBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(leaderboardModal); fetchAndDisplayLeaderboard(); });
    allModals.forEach(modal => { const closeBtn = modal.querySelector('.close-btn'); if (closeBtn) { closeBtn.addEventListener('click', () => closeModal(modal)); } modal.addEventListener('click', (event) => { if (event.target === modal) { closeModal(modal); } }); });
    startGameLink.addEventListener('click', (e) => { e.preventDefault(); document.body.style.transition = 'opacity 1s ease-out'; document.body.style.opacity = '0'; setTimeout(() => { window.location.href = 'game.html'; }, 1000); });
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); clearAuthErrors(); loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); clearAuthErrors(); registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });
    registerBtn.addEventListener('click', () => { clearAuthErrors(); const username = document.getElementById('register-username').value; const email = document.getElementById('register-email').value; const password = document.getElementById('register-password').value; if (!username || !email || !password) { showAuthError("Todos los campos son obligatorios.", 'register'); return; } auth.createUserWithEmailAndPassword(email, password).then(userCredential => userCredential.user.updateProfile({ displayName: username })).then(() => { closeModal(authModal); }).catch(error => showAuthError(translateFirebaseError(error), 'register')); });
    loginBtn.addEventListener('click', () => { clearAuthErrors(); const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value; if (!email || !password) { showAuthError("Por favor, introduce correo y contraseña.", 'login'); return; } auth.signInWithEmailAndPassword(email, password).then(() => { closeModal(authModal); }).catch(error => showAuthError(translateFirebaseError(error), 'login')); });
    auth.onAuthStateChanged(user => { if (user) { userInfoDisplay.textContent = user.displayName || user.email.split('@')[0]; userInfoDisplay.classList.remove('hidden'); authIconButton.innerHTML = iconLogout; authIconButton.title = "Cerrar Sesión"; authIconButton.onclick = () => { if (confirm('¿Seguro que quieres cerrar sesión?')) { auth.signOut(); } }; startGameBtnText.textContent = 'Continuar Partida'; } else { userInfoDisplay.classList.add('hidden'); authIconButton.innerHTML = iconLogin; authIconButton.title = "Iniciar Sesión / Perfil"; authIconButton.onclick = () => openModal(authModal); startGameBtnText.textContent = 'Iniciar Partida'; } });
    async function fetchAndDisplayLeaderboard() { leaderboardContainer.innerHTML = '<p>Cargando clasificación...</p>'; const user = auth.currentUser; try { const snapshot = await db.collection('leaderboard').orderBy('money', 'desc').limit(10).get(); if (snapshot.empty) { leaderboardContainer.innerHTML = '<p>Aún no hay nadie en la clasificación. ¡Sé el primero!</p>'; return; } let tableHTML = '<table class="leaderboard-table"><thead><tr><th class="rank">#</th><th class="name">Piloto</th><th class="score">Fortuna</th></tr></thead><tbody>'; let rank = 1; snapshot.forEach(doc => { const data = doc.data(); const isCurrentUser = user && doc.id === user.uid; tableHTML += `<tr class="${isCurrentUser ? 'current-player-row' : ''}"><td class="rank">${rank}</td><td class="name">${data.playerName}</td><td class="score">$${data.money.toLocaleString()}</td></tr>`; rank++; }); tableHTML += '</tbody></table>'; leaderboardContainer.innerHTML = tableHTML; } catch (error) { console.error("Error al obtener la clasificación: ", error); leaderboardContainer.innerHTML = '<p>Error al cargar la clasificación.</p>'; } }
});