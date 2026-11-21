const el = id => document.getElementById(id);
el('openGame').addEventListener('click', () => window.flight.openGame());

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
  el('planeState').textContent = current?.status === 'جارية'
    ? '✈️ الطيارة في الجو · الجولة ' + (current.roundId ?? '')
    : current?.status === 'انتهت' ? '💥 وصلت رسالة الانفجار · انتهت الجولة' : 'الطيارة على أرض المطار · في انتظار الجولة';
  const rows = (state.rounds || []).slice().reverse().map(r =>
    '<tr><td>' + safe(r.roundId) + '</td><td>' + safe(r.multiplier == null ? 'غير متاح' : r.multiplier + 'x') +
    '</td><td>' + safe(r.crashedAt) + '</td></tr>').join('');
  el('rounds').innerHTML = rows || '<tr><td colspan="3" class="muted">لا توجد جولات مسجلة بعد</td></tr>';
}
function safe(v) { return String(v ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
window.flight.getState().then(render);
window.flight.onState(render);
