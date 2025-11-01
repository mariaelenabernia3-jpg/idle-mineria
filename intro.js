window.onload = () => {
    const splashScreen = document.getElementById('splash-screen');
    const techScreen = document.getElementById('tech-screen');

    const logoDuration = 4000;
    const techDuration = 4500;

    setTimeout(() => {
        splashScreen.classList.remove('visible');
        splashScreen.classList.add('hidden');
        techScreen.classList.remove('hidden');
        techScreen.classList.add('visible');
    }, logoDuration);

    setTimeout(() => {
        document.body.style.opacity = 0;
        setTimeout(() => {
            window.location.href = 'menu.html';
        }, 1500);
    }, logoDuration + techDuration);
};