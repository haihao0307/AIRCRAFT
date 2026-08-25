const lineList = document.querySelector('#line-list');

function statusLabel(status) {
  return {
    ready: 'READY',
    pending: 'PENDING',
    open: 'OPEN',
    blocked: 'BLOCKED'
  }[status] ?? status.toUpperCase();
}

function renderLine(line) {
  const article = document.createElement('article');
  article.className = 'line-card';
  article.dataset.status = line.status;
  article.innerHTML = `
    <div class="line-head">
      <span class="line-number">${line.number}</span>
      <span class="line-state">${statusLabel(line.status)}</span>
    </div>
    <h3>${line.title}</h3>
    <p>${line.summary}</p>
    <div class="line-gate">GATE · ${line.gate}</div>
  `;
  return article;
}

async function start() {
  try {
    const response = await fetch('./data/production-lines.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Registry request failed with ${response.status}`);
    const data = await response.json();

    document.querySelector('#updated-at').textContent = `UPDATED ${data.updatedAt}`;
    document.querySelector('#aircraft-label').textContent = data.aircraft.label;
    document.querySelector('#model-status').textContent = data.aircraft.modelStatus;
    document.querySelector('#runtime-status').textContent = data.aircraft.runtimeStatus;
    document.querySelector('#livery-status').textContent = data.aircraft.activeLivery ?? 'NONE';

    const fragment = document.createDocumentFragment();
    for (const line of data.lines) fragment.append(renderLine(line));
    lineList.replaceChildren(fragment);
  } catch (error) {
    const message = document.createElement('div');
    message.className = 'error-card';
    message.textContent = `Production registry unavailable: ${error.message}`;
    lineList.replaceChildren(message);
  }
}

start();
