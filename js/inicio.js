/* Arranca el simulador cuando la página terminó de cargar */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
