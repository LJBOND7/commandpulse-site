// Round tubes and spheres follow the seven vertices and detached point of the
// CommandPulse mark. Projecting the mesh preserves its cross-section when turned.
(() => {
  const figure = document.querySelector('.cp-film-mark');
  if (!figure) return;
  const canvas = figure.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const slider = figure.querySelector('input');
  const control = figure.querySelector('[data-pulse-motion]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const vertices = [[2,22], [13,22], [18,8], [25,34], [30,18], [34,26], [42,26]]
    .map(([x, y]) => [x - 28.5, 21 - y, 0]);
  const faces = [];
  const sides = 18;
  const tau = Math.PI * 2;
  const gold = [229,185,88];
  const dot = [255,207,94];

  function face(a, b, c, d, color) {
    const u = b.map((value, i) => value - a[i]);
    const v = c.map((value, i) => value - a[i]);
    const normal = [u[1]*v[2] - u[2]*v[1], u[2]*v[0] - u[0]*v[2], u[0]*v[1] - u[1]*v[0]];
    const length = Math.hypot(...normal);
    if (length > .0001) faces.push({ points: [a,b,c,d], normal: normal.map(n => n/length), color });
  }

  function addTube(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx,dy);
    const ringA = [], ringB = [];
    for (let i=0; i<sides; i++) {
      const phi = i/sides*tau;
      const rx = -dy/length * Math.cos(phi)*1.5, ry = dx/length * Math.cos(phi)*1.5, rz = Math.sin(phi)*1.5;
      ringA.push([a[0]+rx,a[1]+ry,rz]); ringB.push([b[0]+rx,b[1]+ry,rz]);
    }
    for (let i=0; i<sides; i++) {
      const j=(i+1)%sides;
      face(ringA[i],ringA[j],ringB[j],ringB[i],gold);
    }
  }

  function addSphere(center, radius, color) {
    const rings = 10, surface = [];
    for (let row=0; row<=rings; row++) {
      const lat = Math.PI*(row/rings-.5);
      const circle = [];
      for (let i=0; i<sides; i++) {
        const lon = tau*i/sides;
        circle.push([center[0]+radius*Math.cos(lat)*Math.cos(lon),
          center[1]+radius*Math.sin(lat),center[2]+radius*Math.cos(lat)*Math.sin(lon)]);
      }
      surface.push(circle);
    }
    for (let row=0; row<rings; row++) {
      for (let i=0; i<sides; i++) {
        const j=(i+1)%sides, a=surface[row], b=surface[row+1];
        // Start the top cap from its lower ring and the bottom cap from its upper ring.
        if (row===0) face(b[i],b[j],a[j],a[i],color);
        else if (row===rings-1) face(a[j],a[i],b[i],b[j],color);
        else face(a[i],b[i],b[j],a[j],color);
      }
    }
  }
  vertices.forEach((p,i) => {
    addSphere(p,1.5,gold);
    if (i) addTube(vertices[i-1],p);
  });
  addSphere([55-28.5,21-22,0],3.4,dot);

  let width=0, height=0, visible=true, frame=0, elapsed=0, previous=0, drag=null;
  let playing=!reduced.matches, angle=0;
  function draw() {
    if (!width || !height) return;
    const yaw = angle*Math.PI/180 + Math.sin(elapsed*.45)*.31;
    const pitch = .13 + Math.sin(elapsed*.34)*.05;
    const cy=Math.cos(yaw), sy=Math.sin(yaw), cx=Math.cos(pitch), sx=Math.sin(pitch);
    const unit=Math.min(width/69,height/37);
    function turn(p) {
      const x=cy*p[0]+sy*p[2], z=cy*p[2]-sy*p[0];
      return [x,cx*p[1]-sx*z,sx*p[1]+cx*z];
    }
    const polys = [];
    for (const f of faces) {
      const n=turn(f.normal);
      if (n[2] < -.16) continue;
      const pts=f.points.map(turn);
      const depth=pts.reduce((s,p)=>s+p[2],0)/4;
      const projected=pts.map(p=>{
        const scale=unit*120/(120-p[2]);
        return [width*.5+p[0]*scale, height*.5-p[1]*scale];
      });
      // Cool reflected light in the shadows, a warm key and a narrow metallic highlight.
      const light=Math.max(0,-n[0]*.45+n[1]*.64+n[2]*.58);
      const rim=Math.pow(Math.max(0,-.21*n[0]+.38*n[1]+.90*n[2]),14);
      const value=.39+.68*light, ink=[8,20,48];
      const color=f.color.map((c,i)=>Math.min(255,Math.round(c*value+ink[i]*(1-light)+rim*75)));
      polys.push({depth,projected,fill:'rgb('+color.join(',')+')'});
    }
    polys.sort((a,b)=>a.depth-b.depth);
    ctx.clearRect(0,0,width,height);
    for (const p of polys) {
      ctx.beginPath(); ctx.moveTo(...p.projected[0]);
      p.projected.slice(1).forEach(point=>ctx.lineTo(...point)); ctx.closePath();
      ctx.fillStyle=p.fill; ctx.fill(); ctx.lineWidth=.65; ctx.strokeStyle=p.fill; ctx.stroke();
    }
  }
  function size() {
    const box=canvas.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1);
    width=box.width; height=box.height;
    canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0); draw();
  }
  function animate(now) {
    frame=0;
    if (!playing || !visible || document.hidden) { previous=0; return; }
    if (previous && now-previous < 30) { frame=requestAnimationFrame(animate); return; }
    if (previous) elapsed+=Math.min(.08,(now-previous)/1000);
    previous=now; draw(); frame=requestAnimationFrame(animate);
  }
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame=0; previous=0;
    control.textContent=playing?'Pause motion':'Play motion';
    if (playing && visible && !document.hidden) frame=requestAnimationFrame(animate);
    else draw();
  }
  function setAngle(value) {
    if (playing) { playing=false; }
    elapsed=0;
    angle=Math.max(-55,Math.min(55,Math.round(value)));
    slider.value=String(angle);
    slider.setAttribute('aria-valuetext',angle ? Math.abs(angle)+' degrees '+(angle<0?'left':'right') : 'Front view');
    sync();
  }
  slider.addEventListener('input',()=>setAngle(Number(slider.value)));
  control.addEventListener('click',()=>{playing=!playing; sync();});
  canvas.addEventListener('pointerdown',event=>{
    if (event.button!==0 || !event.isPrimary) return;
    drag={x:event.clientX,angle}; canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{ if (drag) setAngle(drag.angle+(event.clientX-drag.x)*.42); });
  canvas.addEventListener('lostpointercapture',()=>{drag=null;});
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{playing=!reduced.matches; elapsed=0; sync();});
  canvas.hidden=false;
  figure.querySelector('svg').setAttribute('hidden','');
  figure.querySelector('figcaption').hidden=false;
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas);
  else window.addEventListener('resize',size,{passive:true});
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting; sync();
  }).observe(figure);
  size(); sync();
})();

