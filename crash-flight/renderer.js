const el = id => document.getElementById(id);
el('openGame').addEventListener('click', () => window.flight.openGame());

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
let activeRoundStart = null, warningLevel = 0, audioContext = null;
function playWarningTone(level) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc=audioContext.createOscillator(), gain=audioContext.createGain();
    osc.connect(gain); gain.connect(audioContext.destination);
    osc.frequency.value=level===2?960:620;
    gain.gain.setValueAtTime(.0001,audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.16,audioContext.currentTime+.03);
    gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+.32);
    osc.start(); osc.stop(audioContext.currentTime+.34);
  } catch (_) {}
}
function resetWarning() {
  activeRoundStart=null; warningLevel=0;
  const n=el('warningState'); if(n){n.textContent='بانتظار الجولة';n.style.color='#91a4bd';}
}
setInterval(()=>{
  if(!activeRoundStart)return;
  const elapsed=(Date.now()-activeRoundStart)/1000;
  const yellow=Math.max(2,Number(el('warnSeconds')?.value)||8);
  const red=Math.max(yellow+1,Number(el('dangerSeconds')?.value)||12);
  const level=elapsed>=red?2:elapsed>=yellow?1:0;
  if(level>warningLevel){warningLevel=level;playWarningTone(level);}
  const n=el('warningState'); if(n){
    n.textContent=level===2?'🔴 تحذير زمني أحمر · '+elapsed.toFixed(1)+' ث':level===1?'🟡 تحذير زمني أصفر · '+elapsed.toFixed(1)+' ث':'🟢 الجولة جارية · '+elapsed.toFixed(1)+' ث';
    n.style.color=level===2?'#ff6969':level===1?'#f0c66c':'#75d6a0';
  }
},200);

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
  el('roundState').textContent = current
    ? 'الجولة ' + (current.roundId ?? 'غير معروف') + ' · ' + current.status
    : 'في انتظار بداية أول جولة…';

  if (current?.status === 'جارية') {
    const started = current.startedAt ? Date.parse(current.startedAt) : NaN;
    if (Number.isFinite(started) && activeRoundStart !== started) { activeRoundStart = started; warningLevel = 0; }
    plane.classList.remove('explode');
    plane.classList.add('flying');
    plane.style.opacity = '1';
    el('planeState').textContent = '✈️ الطيارة في الجو · الجولة ' + (current.roundId ?? '');
  } else if (current?.status === 'انتهت') {
    resetWarning();
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
    resetWarning();
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
