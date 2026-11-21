const el = id => document.getElementById(id);
el('openGame').addEventListener('click', () => window.flight.openGame());

const plane = document.querySelector('.plane');
const motionStyle = document.createElement('style');
motionStyle.textContent = `
.plane { display:inline-block; transform-origin:center; }
.plane.explode { animation: crashFlightExplosion .85s ease-out forwards !important; }
@keyframes crashFlightExplosion {
  0% { transform:translate(0,0) scale(1) rotate(0); opacity:1; filter:drop-shadow(0 0 18px #65baff); }
  35% { transform:translate(-12px,-22px) scale(1.25) rotate(-12deg); opacity:1; filter:drop-shadow(0 0 28px #ffb347); }
  65% { transform:translate(8px,12px) scale(.8) rotate(18deg); opacity:.85; filter:drop-shadow(0 0 36px #ff5b45); }
  100% { transform:translate(28px,45px) scale(.12) rotate(55deg); opacity:0; filter:none; }
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
  const current = state.currentRound;
  el('roundState').textContent = current
    ? 'الجولة ' + (current.roundId ?? 'غير معروف') + ' · ' + current.status
    : 'في انتظار بداية أول جولة…';

  if (current?.status === 'جارية') {
    plane.classList.remove('explode');
    plane.style.opacity = '1';
    el('planeState').textContent = '✈️ الطيارة في الجو · الجولة ' + (current.roundId ?? '');
  } else if (current?.status === 'انتهت') {
    const crashKey = String(current.roundId ?? '') + ':' + String(current.crashedAt ?? '');
    if (crashKey !== lastCrashKey) {
      lastCrashKey = crashKey;
      plane.classList.remove('explode');
      void plane.offsetWidth;
      plane.classList.add('explode');
    }
    el('planeState').textContent = '💥 الطيارة انفجرت عند استلام رسالة الانفجار من اللعبة';
  } else {
    el('planeState').textContent = 'الطيارة على أرض المطار · في انتظار الجولة';
  }

  const rows = (state.rounds || []).slice().reverse().map(r =>
    '<tr><td>' + safe(r.roundId) + '</td><td>' + safe(r.multiplier == null ? 'غير متاح' : r.multiplier + 'x') +
    '</td><td>' + safe(r.crashedAt) + '</td></tr>').join('');
  el('rounds').innerHTML = rows || '<tr><td colspan="3" class="muted">لا توجد جولات مسجلة بعد</td></tr>';
}
function safe(v) { return String(v ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
window.flight.getState().then(render);
window.flight.onState(render);
