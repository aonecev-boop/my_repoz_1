/**
 * АлИИна — Embed script
 * Add to any website: <script src="https://chat.vstroy-mebel.ru/embed.js" defer></script>
 */
(function () {
    'use strict';

    const WIDGET_BASE = (document.currentScript && document.currentScript.src)
        ? new URL(document.currentScript.src).origin
        : '';

    // Set API base for widget
    window.ALIINA_API_BASE = WIDGET_BASE;

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = WIDGET_BASE + '/widget/widget.css';
    document.head.appendChild(link);

    // Load fonts
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Montserrat:wght@500;600;700&display=swap';
    document.head.appendChild(fonts);

    // Create root div
    const root = document.createElement('div');
    root.id = 'aliina-widget-root';
    document.body.appendChild(root);

    // Load widget JS
    const script = document.createElement('script');
    script.src = WIDGET_BASE + '/widget/widget.js';
    script.defer = true;
    document.body.appendChild(script);
})();
