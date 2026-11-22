const el = id => document.getElementById(id);
el('openGame').addEventListener('click', () => window.flight.openGame());
el('exportEvents')?.addEventListener('click', async () => {
  const result = await window.flight.exportEvents();
  if (!result?.canceled) {
    el('exportEvents').textContent = 'تم تصدير ' + result.count + ' رسالة';
  }
});

const plane = document.querySelector('.plane');
const motionStyle = document.createElement('style');
motionStyle.textContent = `
.plane.explode { animation: crashFlightExplosion .9s ease-out forwards !important; }
@keyframes crashFlightExplosion {
  0% { transform:translate(0,0) scale(1) rotate(0); opacity:1; filter:drop-shadow(0 0 18px #65baff); }
  30% { transform:translate(-12px,-20px) scale(1.22) rotate(-12deg); opacity:1; filter:drop-shadow(0 0 30px #ffb347); }
  62% { transform:translate(8px,12px) scale(.78) rotate(18deg); opacity:.9; filter:drop-shadow(0 0 42px #ff5b45); }
  100% { transform:translate(30px,48px) scale(.08) rotate(58deg); opacity:0; filter:none; }
}`;
document.head.appendChild(motionStyle);
let lastCrashKey = null;
function render(state) {
  const s = state.stats || {};
  el('connections').textContent = s.wsConnections ?? 0;
  el('frames').textContent = s.wsFrames ?? 0;
  el('events').textContent = s.signalrEvents ?? 0;
  el('saved').textContent = s.saved ?? 0;
  el('lastEvent').textContent = 'آخر حدث: ' + (s.lastEvent || 'لا يوجد');
  el('lastActivity').textContent = 'آخر نشاط: ' + (s.lastActivity || '—');
  const connection = el('connectionStatus');
  if (connection) connection.textContent = 'حالة الربط: ' + (s.connectionStatus || 'غير معروف');

  const current = state.currentRound;
  const messageLog = state.messageLog || [];
  const logNode = el('messageLog');
  if (logNode) {
    logNode.innerHTML = messageLog.slice().reverse().map(item =>
      '<tr><td>' + safe(item.target) + '</td><td>' + safe(item.roundId) +
      '</td><td>' + safe(item.gapMs == null ? '—' : item.gapMs + ' ms') +
      '</td><td>' + safe(item.roundElapsedMs == null ? '—' : (item.roundElapsedMs / 1000).toFixed(2) + ' ث') +
      '</td><td>' + safe(item.receivedAt) + '</td></tr>'
    ).join('') || '<tr><td colspan="5" class="muted">في انتظار رسائل SignalR معروفة…</td></tr>';
  }
  if (el('messageCount')) el('messageCount').textContent = messageLog.length;
  el('roundState').textContent = current
    ? 'الجولة ' + (current.roundId ?? 'غير معروف') + ' · ' + current.status
    : 'في انتظار بداية أول جولة…';

  if (current?.status === 'جارية') {
    plane.classList.remove('explode');
    plane.classList.add('flying');
    plane.style.opacity = '1';
    el('planeState').textContent = '✈️ الطيارة في الجو · الجولة ' + (current.roundId ?? '');
  } else if (current?.status === 'انتهت') {
    plane.classList.remove('flying');
    const crashKey = String(current.roundId ?? '') + ':' + String(current.crashedAt ?? '');
    if (crashKey !== lastCrashKey) {
      lastCrashKey = crashKey;
      plane.classList.remove('explode');
      plane.style.opacity = '1';
      void plane.offsetWidth;
      plane.classList.add('explode');
    }
    el('planeState').textContent = '💥 تم تشغيل الانفجار بعد استلام حدث نهاية الجولة';
  } else {
    plane.classList.remove('flying', 'explode');
    plane.style.opacity = '1';
    el('planeState').textContent = 'الطيارة على أرض المطار · افتح اللعبة لبدء المراقبة';
  }

  const rows = (state.rounds || []).slice().reverse().map(r =>
    '<tr><td>' + safe(r.roundId) + '</td><td>' + safe(r.multiplier == null ? 'غير متاح' : r.multiplier + 'x') +
    '</td><td>' + safe(r.crashedAt) + '</td></tr>').join('');
  el('rounds').innerHTML = rows || '<tr><td colspan="3" class="muted">لا توجد جولات مسجلة بعد</td></tr>';
}
function safe(v) {
  return String(v ?? '—').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
window.flight.getState().then(render).catch(err => {
  el('roundState').textContent = 'تعذر قراءة حالة البرنامج: ' + err.message;
});
window.flight.onState(render);
