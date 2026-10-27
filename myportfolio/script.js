const worldFrame = document.getElementById('world-frame');
const world = document.getElementById('world');
const stickman = document.getElementById('stickman');
const gameStatus = document.getElementById('game-status');
const mapPlayer = document.getElementById('map-player');
const siteHeader = document.querySelector('.site-header');
const landmarks = Array.from(document.querySelectorAll('.world-landmark[data-target]'));
const keysDown = new Set();
const player = { x: 120, direction: 1 };
const worldWidth = 2280;
const playerWidth = 74;
const landmarkPositions = new Map([
  ['about', 510],
  ['projects', 1120],
  ['contact', 1800]
]);

let lastFrame = 0;
let activeScene = null;
let sceneTransitionTimer = 0;
let cameraX = 0;

function updateHeaderHeight() {
  document.documentElement.style.setProperty('--header-height', `${siteHeader.offsetHeight}px`);
}

updateHeaderHeight();
window.addEventListener('resize', updateHeaderHeight);

function enterSection(target) {
  const section = document.getElementById(target);

  if (!section || !section.classList.contains('scene-section')) {
    return;
  }

  if (activeScene === section) {
    return;
  }

  window.clearTimeout(sceneTransitionTimer);
  const isSwitchingScene = Boolean(activeScene);

  if (activeScene) {
    activeScene.classList.remove('scene-open', 'scene-closing');
    activeScene.setAttribute('aria-hidden', 'true');
  }

  activeScene = section;
  keysDown.clear();
  player.x = Math.max(20, Math.min(worldWidth - playerWidth - 20, landmarkPositions.get(target) - 36));
  worldFrame.classList.add('camera-zoom');
  worldFrame.setAttribute('inert', '');
  document.querySelector('.game-hero').setAttribute('inert', '');
  document.body.classList.add('scene-active');
  section.setAttribute('aria-hidden', 'false');
  history.replaceState(history.state, '', `#${target}`);

  if (isSwitchingScene) {
    section.classList.add('scene-open');
    section.querySelector('.back-home').focus();
    return;
  }

  sceneTransitionTimer = window.setTimeout(() => {
    section.classList.add('scene-open');
    section.querySelector('.back-home').focus();
  }, 320);
}

landmarks.forEach((landmark) => {
  landmark.addEventListener('click', () => enterSection(landmark.dataset.target));
});

function returnHome() {
  if (!activeScene) {
    return;
  }

  window.clearTimeout(sceneTransitionTimer);
  const closingScene = activeScene;
  const target = closingScene.id;
  closingScene.classList.add('scene-closing');
  worldFrame.classList.remove('camera-zoom');
  keysDown.clear();
  history.replaceState(history.state, '', '#home');

  sceneTransitionTimer = window.setTimeout(() => {
    closingScene.classList.remove('scene-open');
    closingScene.classList.remove('scene-closing');
    closingScene.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('scene-active');
    worldFrame.removeAttribute('inert');
    document.querySelector('.game-hero').removeAttribute('inert');
    activeScene = null;
    const landmark = landmarks.find((item) => item.dataset.target === target);
    (landmark || worldFrame).focus();
  }, 250);
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = link.getAttribute('href').slice(1);

    if (target === 'home') {
      event.preventDefault();
      returnHome();
    } else if (document.getElementById(target)?.classList.contains('scene-section')) {
      event.preventDefault();
      enterSection(target);
    }
  });
});

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (key === 'escape' && activeScene) {
    event.preventDefault();
    returnHome();
    return;
  }

  if (activeScene) {
    return;
  }

  const isMovementKey = ['arrowleft', 'arrowright', 'a', 'd'].includes(key);

  if (isMovementKey) {
    event.preventDefault();
    keysDown.add(key);
  }

  if (key === 'e') {
    const nearbyLandmark = landmarks.find((landmark) => {
      const targetX = landmarkPositions.get(landmark.dataset.target);
      return Math.abs(player.x - targetX) < 115;
    });

    if (nearbyLandmark) {
      enterSection(nearbyLandmark.dataset.target);
    }
  }
});

window.addEventListener('keyup', (event) => {
  keysDown.delete(event.key.toLowerCase());
});

window.addEventListener('blur', () => keysDown.clear());

document.querySelectorAll('.move-button').forEach((button) => {
  const direction = Number(button.dataset.move);
  const startMoving = (event) => {
    event.preventDefault();
    keysDown.add(direction < 0 ? 'arrowleft' : 'arrowright');
  };
  const stopMoving = () => {
    keysDown.delete(direction < 0 ? 'arrowleft' : 'arrowright');
  };

  button.addEventListener('pointerdown', startMoving);
  button.addEventListener('pointerup', stopMoving);
  button.addEventListener('pointerleave', stopMoving);
  button.addEventListener('pointercancel', stopMoving);
});

function updateWorld(timestamp) {
  const elapsed = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
  lastFrame = timestamp;

  const movingLeft = keysDown.has('arrowleft') || keysDown.has('a');
  const movingRight = keysDown.has('arrowright') || keysDown.has('d');
  const direction = Number(movingRight) - Number(movingLeft);

  if (direction !== 0) {
    player.direction = direction;
    player.x = Math.max(20, Math.min(worldWidth - playerWidth - 20, player.x + direction * 310 * elapsed));
  }

  stickman.style.left = `${player.x}px`;
  stickman.style.transform = `scaleX(${player.direction})`;
  stickman.classList.toggle('walking', direction !== 0);
  mapPlayer.style.left = `${(player.x / worldWidth) * 100}%`;

  const viewportWidth = worldFrame.clientWidth;
  const targetCameraX = Math.max(0, Math.min(worldWidth - viewportWidth, player.x - viewportWidth * 0.38));
  cameraX += (targetCameraX - cameraX) * (1 - Math.exp(-10 * elapsed));
  world.style.transform = `translateX(${-cameraX}px)`;

  let nearestLandmark = null;
  let nearestDistance = Infinity;

  landmarks.forEach((landmark) => {
    const distance = Math.abs(player.x - landmarkPositions.get(landmark.dataset.target));
    const nearby = distance < 115;
    landmark.classList.toggle('nearby', nearby);

    if (nearby && distance < nearestDistance) {
      nearestLandmark = landmark;
      nearestDistance = distance;
    }
  });

  if (activeScene) {
    gameStatus.textContent = `Exploring ${activeScene.id}`;
  } else if (nearestLandmark) {
    gameStatus.textContent = `Press E to explore ${nearestLandmark.dataset.target}`;
  } else if (direction !== 0) {
    gameStatus.textContent = 'Exploring the world...';
  } else {
    gameStatus.textContent = 'Your adventure starts here';
  }

  window.requestAnimationFrame(updateWorld);
}

window.requestAnimationFrame(updateWorld);

if (['about', 'projects', 'contact'].includes(window.location.hash.slice(1))) {
  enterSection(window.location.hash.slice(1));
}

const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((filterButton) => filterButton.classList.remove('active'));
    button.classList.add('active');

    const selectedFilter = button.dataset.filter;
    projectCards.forEach((card) => {
      const isVisible = selectedFilter === 'all' || card.dataset.category === selectedFilter;
      card.classList.toggle('hidden', !isVisible);
    });
  });
});

const contactForm = document.getElementById('contact-form');
const formStatus = document.querySelector('.form-status');

if (contactForm && formStatus) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const formData = new FormData(contactForm);
    const payload = Object.fromEntries(formData.entries());
    payload._replyto = formData.get('email');

    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    formStatus.textContent = 'Sending your message...';

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok || (result.success !== true && result.success !== 'true')) {
        throw new Error(result.message || 'The email service could not accept your message.');
      }

      const name = formData.get('name');
      contactForm.reset();
      formStatus.textContent = `Thanks, ${name}! Your message was sent.`;
    } catch (error) {
      console.error('Contact form submission failed:', error);
      formStatus.textContent = 'Sorry, your message could not be sent. Please try again or email angelosebalosa@gmail.com directly.';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Send message';
    }
  });
}
