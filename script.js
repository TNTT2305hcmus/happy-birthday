/* ============ 3. NỘI DUNG — SỬA Ở ĐÂY ============ */
const CONFIG = {
  girlName: "Người Ấy",              // tên người được chúc mừng sinh nhật
  loveStartDate: "2023-06-14",       // ngày bắt đầu yêu (YYYY-MM-DD)
  letterMessage: null                // để null sẽ dùng lời nhắn mặc định trong HTML, hoặc thay bằng chuỗi text của bạn
};

document.getElementById('girlName').textContent = CONFIG.girlName;
if (CONFIG.letterMessage) {
  document.getElementById('letterBody').textContent = CONFIG.letterMessage;
}

/* ---- đếm số ngày bên nhau ---- */
(function countDays(){
  const start = new Date(CONFIG.loveStartDate);
  const now = new Date();
  const diffDays = Math.max(0, Math.floor((now - start) / 86400000));
  const el = document.getElementById('dayCount');
  let current = 0;
  const duration = 1400;
  const startTime = performance.now();
  function tick(t){
    const p = Math.min(1, (t - startTime) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    current = Math.floor(eased * diffDays);
    el.textContent = current.toLocaleString('vi-VN');
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

document.getElementById('footerDate').textContent = new Date().toLocaleDateString('vi-VN');

/* ---- trái tim bay lên nền ---- */
const heartsLayer = document.getElementById('hearts-layer');
const heartEmojis = ['💗','💕','💓','💖'];
function spawnHeart(){
  const h = document.createElement('div');
  h.className = 'floaty-heart';
  h.textContent = heartEmojis[Math.floor(Math.random()*heartEmojis.length)];
  h.style.left = Math.random()*100 + 'vw';
  h.style.setProperty('--drift', (Math.random()*80-40) + 'px');
  h.style.animationDuration = (7 + Math.random()*6) + 's';
  h.style.fontSize = (14 + Math.random()*14) + 'px';
  heartsLayer.appendChild(h);
  setTimeout(()=>h.remove(), 14000);
}
setInterval(spawnHeart, 900);
for(let i=0;i<5;i++) setTimeout(spawnHeart, i*300);

/* ---- bong bóng bay trong hero ---- */
const balloonColors = ['#FF9EC4','#C6B4FF','#8FE9D2','#FFC24B'];
const balloonsWrap = document.getElementById('balloons');
function spawnBalloon(){
  const b = document.createElement('div');
  b.className = 'balloon';
  b.style.left = (5 + Math.random()*90) + '%';
  b.style.background = balloonColors[Math.floor(Math.random()*balloonColors.length)];
  b.style.animationDuration = (10 + Math.random()*6) + 's';
  balloonsWrap.appendChild(b);
  setTimeout(()=>b.remove(), 17000);
}
for(let i=0;i<6;i++) setTimeout(spawnBalloon, i*700);
setInterval(spawnBalloon, 2600);

/* ---- letter reveal khi cuộn tới ---- */
const letterCard = document.querySelector('.letter-card');
const obs = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('in-view'); });
},{ threshold:.3 });
obs.observe(letterCard);

/* ---- thổi nến + confetti ---- */
const candles = document.querySelectorAll('.candle');
const cakeHint = document.getElementById('cakeHint');
const wishReveal = document.getElementById('wishReveal');
let blownCount = 0;
candles.forEach(c=>{
  c.addEventListener('click', ()=>{
    if (c.classList.contains('out')) return;
    c.classList.add('out');
    blownCount++;
    if (blownCount === candles.length){
      cakeHint.textContent = 'chúc mừng sinh nhật! 🥳 điều ước đã được gửi đi rồi đó';
      wishReveal.classList.add('show');
      launchConfetti();
    }
  });
});

/* ---- confetti particle system (canvas) ---- */
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const confettiColors = ['#FF9EC4','#C6B4FF','#8FE9D2','#FFC24B','#FF6FA5'];
let particles = [];
let confettiRunning = false;

function launchConfetti(){
  const count = 140;
  for(let i=0;i<count;i++){
    particles.push({
      x: canvas.width/2 + (Math.random()*200-100),
      y: canvas.height*0.4,
      vx: (Math.random()-0.5)*10,
      vy: -(Math.random()*9+4),
      size: 5+Math.random()*6,
      color: confettiColors[Math.floor(Math.random()*confettiColors.length)],
      rot: Math.random()*360,
      vr: (Math.random()-0.5)*12,
      shape: Math.random()>0.5 ? 'rect' : 'circle',
      life: 0
    });
  }
  if(!confettiRunning){ confettiRunning = true; requestAnimationFrame(animateConfetti); }
}

function animateConfetti(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  particles.forEach(p=>{
    p.vy += 0.22;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life++;
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.rotate(p.rot*Math.PI/180);
    ctx.fillStyle = p.color;
    if(p.shape === 'rect'){
      ctx.fillRect(-p.size/2, -p.size/3, p.size, p.size*0.6);
    } else {
      ctx.beginPath();
      ctx.arc(0,0,p.size/2,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  });
  particles = particles.filter(p => p.y < canvas.height + 40 && p.life < 260);
  if(particles.length > 0){
    requestAnimationFrame(animateConfetti);
  } else {
    confettiRunning = false;
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }
}
