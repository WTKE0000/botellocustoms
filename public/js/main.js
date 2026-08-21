// ===== Mobile nav toggle =====
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');

  // On phones, some mobile browsers badly mis-size a full-screen fixed
  // menu when it's nested inside a position:sticky header — it gets
  // squeezed down to the header's own height instead of filling the
  // screen. Moving the menu to be a direct child of <body> (outside the
  // header entirely) avoids that bug completely, on every browser.
  if (nav && window.matchMedia('(max-width:860px)').matches) {
    document.body.appendChild(nav);
  }

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      const isOpen = nav.classList.contains('open');
      toggle.textContent = isOpen ? '✕' : '☰';
      document.body.classList.toggle('nav-open', isOpen);
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.textContent = '☰';
      document.body.classList.remove('nav-open');
    }));
  }

  // ===== Firearms category filter =====
  const chips = document.querySelectorAll('.filter-chip');
  const items = document.querySelectorAll('[data-category]');
  if (chips.length && items.length) {
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const cat = chip.dataset.filter;
        items.forEach(item => {
          const show = cat === 'all' || item.dataset.category === cat;
          item.style.display = show ? '' : 'none';
        });
        const resultCount = document.querySelector('.result-count');
        if (resultCount) {
          const visible = Array.from(items).filter(i => i.style.display !== 'none').length;
          resultCount.textContent = `${visible} item${visible === 1 ? '' : 's'}`;
        }
      });
    });
  }

  // ===== Raffle ticket stepper =====
  const stepperEl = document.querySelector('.stepper');
  const stepperCount = document.querySelector('.stepper .count');
  const minusBtn = document.querySelector('.stepper .minus');
  const plusBtn = document.querySelector('.stepper .plus');
  const totalDisplay = document.querySelector('.ticket-total');
  const ticketPrice = stepperEl ? parseInt(stepperEl.dataset.price, 10) || 100 : 100;
  const maxTickets = stepperEl ? parseInt(stepperEl.dataset.max, 10) || 3 : 3;

  if (stepperCount && minusBtn && plusBtn) {
    let qty = 1;
    const render = () => {
      stepperCount.textContent = qty;
      if (totalDisplay) totalDisplay.textContent = `$${(qty * ticketPrice).toLocaleString()}`;
      minusBtn.disabled = qty <= 1;
      plusBtn.disabled = qty >= maxTickets;
    };
    minusBtn.addEventListener('click', () => { if (qty > 1) qty--; render(); });
    plusBtn.addEventListener('click', () => { if (qty < maxTickets) qty++; render(); });
    render();

    const payBtn = document.querySelector('.raffle-pay-btn');
    if (payBtn) {
      payBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const summary = document.querySelector('.pay-redirect-note');
        if (summary) {
          summary.textContent = `Reserving ${qty} ticket${qty > 1 ? 's' : ''} ($${(qty * ticketPrice).toLocaleString()}) — opening Snapchat to confirm your entry and complete payment...`;
          summary.style.display = 'block';
        }
        window.open(payBtn.dataset.snapchatUrl, '_blank', 'noopener');
      });
    }
  }

  // ===== Raffle number wheel =====
  const wheelContainer = document.getElementById('raffle-wheel-container');
  if (wheelContainer) {
    const stepperEl2 = document.querySelector('.stepper');
    const totalSegments = stepperEl2 ? (parseInt(stepperEl2.dataset.totalTickets, 10) || 50) : 50;
    const wheelEl = buildWheel(wheelContainer, totalSegments);

    const form = document.getElementById('redeem-form');
    const input = document.getElementById('redeem-code-input');
    const messageEl = document.getElementById('redeem-message');
    const submitBtn = document.getElementById('redeem-submit-btn');
    let currentRotation = 0;
    let spinning = false;

    if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (spinning) return;
      const code = input.value.trim();
      if (!code) {
        messageEl.textContent = 'Enter the code we sent you on Snapchat.';
        messageEl.style.color = 'var(--rust-bright)';
        return;
      }

      submitBtn.disabled = true;
      messageEl.textContent = 'Checking your code...';
      messageEl.style.color = 'var(--ink-dim)';

      let result;
      try {
        const resp = await fetch('/raffle/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        result = await resp.json();
      } catch (err) {
        messageEl.textContent = 'Something went wrong reaching the server — try again.';
        messageEl.style.color = 'var(--rust-bright)';
        submitBtn.disabled = false;
        return;
      }

      if (!result.success) {
        submitBtn.disabled = false;
        if (result.error === 'used') {
          messageEl.textContent = `That code was already used — it's tied to ticket #${result.ticketNumber}.`;
        } else if (result.error === 'soldout') {
          messageEl.textContent = 'All tickets have been claimed. The raffle is closed to new entries.';
        } else if (result.error === 'empty') {
          messageEl.textContent = 'Enter the code we sent you on Snapchat.';
        } else {
          messageEl.textContent = "We don't recognize that code — double check it and try again.";
        }
        messageEl.style.color = 'var(--rust-bright)';
        return;
      }

      // Valid — spin the wheel to the assigned number
      spinning = true;
      messageEl.textContent = 'Spinning...';
      messageEl.style.color = 'var(--ink-dim)';

      const segAngle = 360 / totalSegments;
      const targetCenter = (result.ticketNumber - 1) * segAngle + segAngle / 2;
      const extraSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full turns
      const targetRotation = extraSpins * 360 + ((360 - targetCenter) % 360);
      currentRotation = targetRotation;

      wheelEl.style.transition = 'transform 4.2s cubic-bezier(0.15, 0.85, 0.25, 1)';
      wheelEl.style.transform = `rotate(${currentRotation}deg)`;

      setTimeout(() => {
        spinning = false;
        submitBtn.disabled = false;
        input.disabled = true;
        input.value = '';
        messageEl.innerHTML = `🎉 Your ticket number is <strong style="color:var(--brass-bright);font-size:1.2em">#${result.ticketNumber}</strong>. Screenshot this — that's your official entry.`;
        messageEl.style.color = 'var(--ink)';
      }, 4300);
    });
    } // end if(form)
  }
});

function buildWheel(container, segments) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const segAngle = 360 / segments;

  const svgns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.style.display = 'block';
  svg.style.transformOrigin = '50% 50%';

  const colorA = getComputedStyle(document.documentElement).getPropertyValue('--brass').trim() || '#A9793D';
  const colorB = getComputedStyle(document.documentElement).getPropertyValue('--walnut').trim() || '#4A2F20';

  for (let i = 0; i < segments; i++) {
    const startAngle = i * segAngle - 90; // -90 so segment 0 starts at top
    const endAngle = startAngle + segAngle;
    const x1 = cx + r * Math.cos(startAngle * Math.PI / 180);
    const y1 = cy + r * Math.sin(startAngle * Math.PI / 180);
    const x2 = cx + r * Math.cos(endAngle * Math.PI / 180);
    const y2 = cy + r * Math.sin(endAngle * Math.PI / 180);
    const path = document.createElementNS(svgns, 'path');
    path.setAttribute('d', `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`);
    path.setAttribute('fill', i % 2 === 0 ? colorA : colorB);
    path.setAttribute('stroke', '#00000022');
    path.setAttribute('stroke-width', '0.5');
    svg.appendChild(path);

    // number label
    const labelAngle = startAngle + segAngle / 2;
    const labelR = r * 0.8;
    const lx = cx + labelR * Math.cos(labelAngle * Math.PI / 180);
    const ly = cy + labelR * Math.sin(labelAngle * Math.PI / 180);
    const text = document.createElementNS(svgns, 'text');
    text.setAttribute('x', lx);
    text.setAttribute('y', ly);
    text.setAttribute('fill', '#F1EAD9');
    text.setAttribute('font-size', segments > 30 ? '8' : '11');
    text.setAttribute('font-family', 'JetBrains Mono, monospace');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('transform', `rotate(${labelAngle + 90}, ${lx}, ${ly})`);
    text.textContent = i + 1;
    svg.appendChild(text);
  }

  // center hub
  const hub = document.createElementNS(svgns, 'circle');
  hub.setAttribute('cx', cx);
  hub.setAttribute('cy', cy);
  hub.setAttribute('r', size * 0.09);
  hub.setAttribute('fill', 'var(--ink)');
  svg.appendChild(hub);

  container.innerHTML = '';
  container.appendChild(svg);
  return svg;
}