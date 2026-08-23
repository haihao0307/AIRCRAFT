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

const fallbackBoard = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <rect width="1200" height="720" fill="#d8d3c5"/>
  <rect x="36" y="36" width="1128" height="648" rx="18" fill="#4d4b38" stroke="#b48d49" stroke-width="4"/>
  <text x="600" y="310" text-anchor="middle" fill="#f2d69a" font-family="sans-serif" font-size="58" font-weight="700">UBANGI BAG III</text>
  <text x="600" y="380" text-anchor="middle" fill="#eee8d8" font-family="sans-serif" font-size="32">测试涂装 V1</text>
  <text x="600" y="438" text-anchor="middle" fill="#bfc7c9" font-family="sans-serif" font-size="24">等待第二版正确历史图替换</text>
</svg>`)} `;

try {
  let boardDataUri = fallbackBoard.trim();
  try {
    const boardBase64 = await readParts('board', 5);
    boardDataUri = `data:image/webp;base64,${boardBase64}`;
  } catch (boardError) {
    console.warn('涂装参考分块暂缺，使用明确标记的测试占位图。', boardError);
  }
  window.__UBANGI_BOARD_DATA_URI__ = boardDataUri;
  const preview = document.getElementById('liveryBoardPreview');
  if (preview) preview.src = boardDataUri;

  const appBase64 = await readParts('app', 1);
  const source = decodeUtf8(appBase64);
  const moduleUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  await import(moduleUrl);
  URL.revokeObjectURL(moduleUrl);
} catch (error) {
  console.error(error);
  const status = document.getElementById('status');
  if (status) { status.textContent = `网站启动失败：${error.message}`; status.dataset.tone = 'error'; }
}
