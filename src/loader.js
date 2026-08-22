const readParts = async (prefix, count) => {
  const texts = await Promise.all(Array.from({ length: count }, (_, index) =>
    fetch(`./src/${prefix}-part-${String(index).padStart(3, '0')}.txt`).then((response) => {
      if (!response.ok) throw new Error(`读取 ${response.url} 失败：${response.status}`);
      return response.text();
    })
  ));
  return texts.join('').replace(/\s+/g, '');
};

const decodeUtf8 = (base64) => {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

try {
  const boardBase64 = await readParts('board', 5);
  window.__UBANGI_BOARD_DATA_URI__ = `data:image/webp;base64,${boardBase64}`;
  const preview = document.getElementById('liveryBoardPreview');
  if (preview) preview.src = window.__UBANGI_BOARD_DATA_URI__;

  const appBase64 = await readParts('app', 3);
  const source = decodeUtf8(appBase64);
  const moduleUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  await import(moduleUrl);
  URL.revokeObjectURL(moduleUrl);
} catch (error) {
  console.error(error);
  const status = document.getElementById('status');
  if (status) { status.textContent = `网站启动失败：${error.message}`; status.dataset.tone = 'error'; }
}
