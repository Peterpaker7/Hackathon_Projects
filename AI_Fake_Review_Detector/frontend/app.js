/* ========================================
   TrustSphere — Realistic Earth Globe + live API
   ======================================== */

(function () {
  'use strict';

  // ============ API CONFIG ============
  // Change this if your FastAPI server runs on a different host/port.
  const API_URL = 'http://127.0.0.1:8000/predict';

  // ============ STATE MACHINE ============
  const State = { IDLE: 'idle', SEARCHING: 'searching', RESULTS: 'results' };
  let currentState = State.IDLE;

  // ============ DOM REFERENCES ============
  const body = document.body;
  const canvas = document.getElementById('globe-canvas');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const scanAgainBtn = document.getElementById('scan-again-btn');

  // ============ THREE.JS SETUP ============
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  camera.position.set(0, 0.15, 2.8);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ============ EARTH GROUP ============
  const EARTH_RADIUS = 1.0;
  const earthGroup = new THREE.Group();
  earthGroup.rotation.z = -0.41; // ~23.5° axial tilt
  scene.add(earthGroup);

  // ============ PROCEDURAL EARTH TEXTURE ============
  function createProceduralTexture() {
    var w = 2048, h = 1024;
    var cvs = document.createElement('canvas');
    cvs.width = w; cvs.height = h;
    var ctx = cvs.getContext('2d');

    var oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
    oceanGrad.addColorStop(0, '#040405');
    oceanGrad.addColorStop(0.5, '#0a0a0c');
    oceanGrad.addColorStop(1, '#040405');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    for (var i = 0; i < 80000; i++) {
      var nx = Math.random() * w;
      var ny = Math.random() * h;
      var nb = Math.random() * 6;
      ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.03) + ')';
      ctx.fillRect(nx, ny, nb, nb);
    }

    ctx.fillStyle = '#111111';
    for (var i = 0; i < 40; i++) {
      var cx = Math.random() * w;
      var cy = Math.random() * h;
      var cr = 50 + Math.random() * 150;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    for (var i = 0; i < 150000; i++) {
      var nx = Math.random() * w;
      var ny = Math.random() * h;
      var nb = Math.random() * 4;
      ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.08) + ')';
      ctx.fillRect(nx, ny, nb, nb);
    }

    var tex = new THREE.CanvasTexture(cvs);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // ============ EARTH MESH ============
  var earthGeom = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
  var earthMat = new THREE.MeshBasicMaterial({
    map: createProceduralTexture(),
  });
  var earth = new THREE.Mesh(earthGeom, earthMat);
  earthGroup.add(earth);

  var textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin('anonymous');
  textureLoader.load(
    'https://unpkg.com/three-globe/example/img/earth-night.jpg',
    function (tex) {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      earthMat.map = tex;
      earthMat.needsUpdate = true;
    },
    undefined,
    function () {
      console.log('[TrustSphere] Using procedural Earth texture');
    }
  );

  // ============ ATMOSPHERE — OUTER GLOW ============
  var atmosGeom = new THREE.SphereGeometry(EARTH_RADIUS * 1.14, 64, 64);
  var atmosMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uIntensity: { value: 0.65 },
      uColor: { value: new THREE.Color(0.25, 0.55, 1.0) },
    },
    vertexShader: [
      'varying vec3 vNormal;',
      'varying vec3 vViewPos;',
      'void main() {',
      '  vNormal = normalize(normalMatrix * normal);',
      '  vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;',
      '  gl_Position = projectionMatrix * vec4(vViewPos, 1.0);',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform float uIntensity;',
      'uniform vec3 uColor;',
      'varying vec3 vNormal;',
      'varying vec3 vViewPos;',
      'void main() {',
      '  vec3 viewDir = normalize(-vViewPos);',
      '  float fresnel = 1.0 - abs(dot(vNormal, viewDir));',
      '  float intensity = pow(fresnel, 2.2) * uIntensity;',
      '  gl_FragColor = vec4(uColor * intensity * 1.5, intensity);',
      '}',
    ].join('\n'),
  });
  var outerAtmos = new THREE.Mesh(atmosGeom, atmosMat);
  earthGroup.add(outerAtmos);

  // ============ ATMOSPHERE — INNER RIM ============
  var innerAtmosGeom = new THREE.SphereGeometry(EARTH_RADIUS * 1.004, 64, 64);
  var innerAtmosMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uIntensity: { value: 0.45 },
      uColor: { value: new THREE.Color(0.3, 0.6, 1.0) },
    },
    vertexShader: atmosMat.vertexShader,
    fragmentShader: [
      'uniform float uIntensity;',
      'uniform vec3 uColor;',
      'varying vec3 vNormal;',
      'varying vec3 vViewPos;',
      'void main() {',
      '  vec3 viewDir = normalize(-vViewPos);',
      '  float fresnel = 1.0 - abs(dot(vNormal, viewDir));',
      '  float intensity = pow(fresnel, 4.5) * uIntensity;',
      '  gl_FragColor = vec4(uColor * intensity, intensity * 0.8);',
      '}',
    ].join('\n'),
  });
  var innerAtmos = new THREE.Mesh(innerAtmosGeom, innerAtmosMat);
  earthGroup.add(innerAtmos);

  // ============ STARS ============
  var STAR_COUNT = 2500;
  var starPositions = new Float32Array(STAR_COUNT * 3);
  var starColors = new Float32Array(STAR_COUNT * 3);
  for (var si = 0; si < STAR_COUNT; si++) {
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);
    var sr = 30 + Math.random() * 70;
    starPositions[si * 3] = sr * Math.sin(phi) * Math.cos(theta);
    starPositions[si * 3 + 1] = sr * Math.sin(phi) * Math.sin(theta);
    starPositions[si * 3 + 2] = sr * Math.cos(phi);
    var temp = 0.85 + Math.random() * 0.15;
    starColors[si * 3] = temp;
    starColors[si * 3 + 1] = temp;
    starColors[si * 3 + 2] = 0.9 + Math.random() * 0.1;
  }
  var starGeom = new THREE.BufferGeometry();
  starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeom.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  var starMat = new THREE.PointsMaterial({
    size: 0.12,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
    vertexColors: true,
  });
  var stars = new THREE.Points(starGeom, starMat);
  scene.add(stars);

  // ============ SCANNING RING PARTICLES ============
  var RING_COUNT = 200;
  var ringPositions = new Float32Array(RING_COUNT * 3);
  var ringVelocities = [];
  for (var ri = 0; ri < RING_COUNT; ri++) {
    var angle = (ri / RING_COUNT) * Math.PI * 2;
    var rr = EARTH_RADIUS * 1.25 + (Math.random() - 0.5) * 0.15;
    ringPositions[ri * 3] = Math.cos(angle) * rr;
    ringPositions[ri * 3 + 1] = (Math.random() - 0.5) * 0.3;
    ringPositions[ri * 3 + 2] = Math.sin(angle) * rr;
    ringVelocities.push(0.5 + Math.random() * 1.0);
  }
  var ringGeom = new THREE.BufferGeometry();
  ringGeom.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
  var ringMat = new THREE.PointsMaterial({
    color: 0xC4FF00,
    size: 0.02,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  var scanRing = new THREE.Points(ringGeom, ringMat);
  earthGroup.add(scanRing);

  // ============ MOUSE PARALLAX ============
  var mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ============ ANIMATION STATE ============
  var targetBrightness = 1.0, currentBrightness = 1.0;
  var targetScale = 1.0, currentScale = 1.0;
  var targetRotSpeed = 0.0008, rotSpeed = 0.0008;
  var targetAtmosIntensity = 0.65;
  var targetRingOpacity = 0;
  var targetGroupX = 0, currentGroupX = 0;
  var targetGroupY = 0, currentGroupY = 0;
  var targetCamZ = 2.8;
  var clock = new THREE.Clock();

  // ============ ANIMATION LOOP ============
  function animate() {
    requestAnimationFrame(animate);

    var elapsed = clock.getElapsedTime();

    currentBrightness += (targetBrightness - currentBrightness) * 0.025;
    currentScale += (targetScale - currentScale) * 0.025;
    rotSpeed += (targetRotSpeed - rotSpeed) * 0.035;

    var curAtmos = atmosMat.uniforms.uIntensity.value;
    atmosMat.uniforms.uIntensity.value += (targetAtmosIntensity - curAtmos) * 0.03;
    innerAtmosMat.uniforms.uIntensity.value = atmosMat.uniforms.uIntensity.value * 0.7;

    ringMat.opacity += (targetRingOpacity - ringMat.opacity) * 0.04;

    earthMat.color.setScalar(currentBrightness);
    earthGroup.scale.setScalar(currentScale);

    currentGroupX += (targetGroupX - currentGroupX) * 0.025;
    currentGroupY += (targetGroupY - currentGroupY) * 0.025;
    earthGroup.position.x = currentGroupX;
    earthGroup.position.y = currentGroupY;

    earth.rotation.y += rotSpeed;

    if (ringMat.opacity > 0.01) {
      var rp = ringGeom.attributes.position;
      for (var ri = 0; ri < RING_COUNT; ri++) {
        var angle = Math.atan2(rp.getZ(ri), rp.getX(ri));
        angle += rotSpeed * 3 * ringVelocities[ri];
        var rr = Math.sqrt(rp.getX(ri) * rp.getX(ri) + rp.getZ(ri) * rp.getZ(ri));
        rp.setX(ri, Math.cos(angle) * rr);
        rp.setZ(ri, Math.sin(angle) * rr);
        rp.setY(ri, rp.getY(ri) + Math.sin(elapsed * 3 + ri) * 0.001);
      }
      rp.needsUpdate = true;
    }

    var camTargetX = mouseX * 0.12 + currentGroupX * 0.3;
    var camTargetY = -mouseY * 0.08 + 0.15;
    camera.position.x += (camTargetX - camera.position.x) * 0.015;
    camera.position.y += (camTargetY - camera.position.y) * 0.015;
    camera.position.z += (targetCamZ - camera.position.z) * 0.02;
    camera.lookAt(currentGroupX, currentGroupY, 0);

    stars.rotation.y += 0.00002;

    renderer.render(scene, camera);
  }

  animate();

  // ============ STATE TRANSITIONS ============
  function transitionTo(state) {
    if (currentState === state) return;
    currentState = state;

    body.className = 'state-' + state;

    switch (state) {
      case State.IDLE:
        document.getElementById('intro-view').classList.remove('view-active');
        document.getElementById('intro-view').classList.add('view-hidden');
        document.getElementById('scanner-view').classList.remove('view-hidden');
        document.getElementById('scanner-view').classList.add('view-active');

        targetBrightness = 1.0;
        targetScale = 1.0;
        targetRotSpeed = 0.0008;
        targetAtmosIntensity = 0.65;
        targetRingOpacity = 0;
        targetGroupX = 0;
        targetGroupY = 0.5;
        targetCamZ = 2.2;
        break;

      case State.SEARCHING:
        targetBrightness = 1.6;
        targetScale = 1.18;
        targetRotSpeed = 0.006;
        targetAtmosIntensity = 1.4;
        targetRingOpacity = 0.6;
        targetGroupX = 0;
        targetGroupY = 0.5;
        break;

      case State.RESULTS:
        targetBrightness = 0.85;
        targetScale = 1.05;
        targetRotSpeed = 0.0012;
        targetAtmosIntensity = 0.7;
        targetRingOpacity = 0;
        targetGroupX = 0;      // centered behind the glass card
        targetGroupY = 0.15;
        break;

      case 'intro':
      default:
        document.getElementById('intro-view').classList.remove('view-hidden');
        document.getElementById('intro-view').classList.add('view-active');
        document.getElementById('scanner-view').classList.remove('view-active');
        document.getElementById('scanner-view').classList.add('view-hidden');

        targetBrightness = 0.7;
        targetScale = 1.4;
        targetGroupX = 0;
        targetGroupY = -1.2;
        targetCamZ = 2.8;
        break;
    }
  }

  // ============ SPA NAVIGATION ============
  document.getElementById('nav-launch').addEventListener('click', function () { transitionTo(State.IDLE); });
  document.getElementById('hero-launch').addEventListener('click', function () { transitionTo(State.IDLE); });
  document.getElementById('nav-home').addEventListener('click', function (e) { e.preventDefault(); transitionTo('intro'); });

  transitionTo('intro');

  // ============ SCROLL REVEAL (INTRO) ============
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(function (el) {
    observer.observe(el);
  });

  // ============ FORM SUBMIT — CALLS THE REAL API ============
  searchForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var text = searchInput.value.trim();
    if (!text) return;

    transitionTo(State.SEARCHING);

    // Keep the "analyzing" globe animation on screen for at least 1.5s
    var minDelay = new Promise(function (r) { setTimeout(r, 1500); });

    try {
      var res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();

      await minDelay;
      populateResults(data, text);
      transitionTo(State.RESULTS);
    } catch (err) {
      await minDelay;
      transitionTo(State.IDLE);
      console.error('[TrustSphere] API error:', err);
      alert('Could not reach the analysis API.\nMake sure the FastAPI server is running at ' + API_URL);
    }
  });

  // ============ SCAN AGAIN ============
  scanAgainBtn.addEventListener('click', function () {
    searchInput.value = '';
    transitionTo(State.IDLE);
    setTimeout(function () { searchInput.focus(); }, 500);
  });

  // ============ RENDER REAL RESULTS ============
  function populateResults(data, reviewText) {
    // Normalize score: accept either 0–1 or 0–100 from the API.
    var raw = typeof data.score === 'number' ? data.score : parseFloat(data.score);
    if (isNaN(raw)) raw = 0;
    var trust = Math.round(raw <= 1 ? raw * 100 : raw);   // truthful % = trust score

    // Normalize label ("fake"/"deceptive" vs "genuine"/"truthful").
    var label = (data.label || '').toLowerCase();
    var isFake = (label === 'fake' || label === 'deceptive');
    var isUncertain = (data.confidence || '').toLowerCase() === 'low';

    var scoreEl = document.getElementById('score-number');
    var labelEl = document.getElementById('verdict-label');
    var summaryEl = document.getElementById('verdict-summary');
    var badgeEl = document.getElementById('verdict-badge');
    var scoreRing = document.getElementById('score-ring-fill');

    animateCount(scoreEl, 0, trust, 800);

    var circumference = 326.73; // 2 * PI * 52
    if (scoreRing) {
      var offset = circumference - (trust / 100) * circumference;
      scoreRing.style.strokeDashoffset = circumference;
      setTimeout(function () { scoreRing.style.strokeDashoffset = offset; }, 200);
    }

    var color, verdictText, badgeText;
    if (isFake) {
      color = '#FF4D4D'; verdictText = 'Likely Fake'; badgeText = 'Suspicious';
    } else if (isUncertain) {
      color = '#FFB800'; verdictText = 'Uncertain'; badgeText = 'Caution';
    } else {
      color = '#C4FF00'; verdictText = 'Likely Genuine'; badgeText = 'Trusted';
    }

    scoreEl.style.color = color;
    if (scoreRing) scoreRing.style.stroke = color;
    labelEl.textContent = verdictText;

    var badgeSpan = badgeEl.querySelector('span');
    badgeSpan.textContent = badgeText;
    badgeEl.style.background = hexToRgba(color, 0.12);
    badgeEl.style.borderColor = hexToRgba(color, 0.25);
    badgeEl.style.color = color;

    var reason = data.reason || (data.confidence ? (data.confidence + ' confidence in this result') : 'Based on the review wording.');
    summaryEl.textContent = reason;

    renderReview(reviewText, trust, isFake, isUncertain, reason);
  }

  function renderReview(reviewText, trust, isFake, isUncertain, reason) {
    var list = document.getElementById('evidence-list');
    if (!list) return;

    var scoreClass = isFake ? 'score-bad' : (isUncertain ? 'score-warn' : 'score-good');

    var card = document.createElement('div');
    card.className = 'evidence-card';

    var header = document.createElement('div');
    header.className = 'evidence-header';
    var scoreSpan = document.createElement('span');
    scoreSpan.className = 'evidence-score ' + scoreClass;
    scoreSpan.textContent = trust + '% trust';
    header.appendChild(scoreSpan);

    var textP = document.createElement('p');
    textP.className = 'evidence-text';
    textP.textContent = '"' + reviewText + '"';   // textContent avoids HTML injection

    var flag = document.createElement('span');
    flag.className = 'evidence-flag';
    flag.textContent = reason;

    card.appendChild(header);
    card.appendChild(textP);
    card.appendChild(flag);

    list.innerHTML = '';
    list.appendChild(card);
  }

  function hexToRgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function animateCount(el, from, to, duration) {
    var start = performance.now();
    function update(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // ============ RESIZE ============
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  window.addEventListener('resize', onResize);

  // ============ KEYBOARD ============
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && currentState === State.RESULTS) {
      scanAgainBtn.click();
    }
  });

  // ============ INIT ============

})();