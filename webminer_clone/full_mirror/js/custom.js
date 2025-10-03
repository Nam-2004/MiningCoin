(function () {
  const ensureTheme = () => {
    const body = document.body;
    if (!body.classList.contains('neo-theme')) {
      body.classList.add('neo-theme');
    }
    if (!document.querySelector('.neo-orb--violet')) {
      const orbConfigs = [
        { className: 'neo-orb neo-orb--violet' },
        { className: 'neo-orb neo-orb--cyan' },
        { className: 'neo-orb neo-orb--magenta' }
      ];
      orbConfigs.forEach(cfg => {
        const el = document.createElement('div');
        el.className = cfg.className;
        document.body.appendChild(el);
      });
    }
    document.documentElement.style.scrollBehavior = 'smooth';
  };

  const decorateHeadings = () => {
    document.querySelectorAll('.ant-card-head-title').forEach(node => {
      if (!node.dataset.neoEnhanced) {
        const original = node.textContent.trim();
        node.dataset.neoEnhanced = 'true';
        node.textContent = '';
        const span = document.createElement('span');
        span.className = 'neo-heading';
        span.textContent = original;
        node.appendChild(span);
      }
    });
  };

  const decorateStats = () => {
    document.querySelectorAll('.ant-statistic-content-value').forEach(node => {
      node.classList.add('neo-glow');
    });
  };

  const decorateTags = () => {
    document.querySelectorAll('.ant-tag').forEach(tag => {
      if (!tag.dataset.neoEnhanced) {
        tag.dataset.neoEnhanced = 'true';
        tag.classList.add('neo-chip');
      }
    });
  };

  const attachRipple = () => {
    if (attachRipple.initialised) return;
    attachRipple.initialised = true;
    document.addEventListener('pointerdown', evt => {
      const button = evt.target.closest('.ant-btn');
      if (!button) return;
      const ripple = document.createElement('span');
      ripple.className = 'neo-ripple';
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const offsetX = evt.clientX - rect.left;
      const offsetY = evt.clientY - rect.top;
      ripple.style.width = ripple.style.height = `${size * 2}px`;
      ripple.style.left = `${offsetX}px`;
      ripple.style.top = `${offsetY}px`;
      button.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  };

  const hydrate = () => {
    ensureTheme();
    decorateHeadings();
    decorateStats();
    decorateTags();
    attachRipple();
  };

  const observer = new MutationObserver(() => {
    hydrate();
  });

  window.addEventListener('load', () => {
    hydrate();
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();

