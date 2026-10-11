const data = await fetch('./assets/content.json').then(response => {
  if (!response.ok) throw new Error('Content could not be loaded');
  return response.json();
}).catch(() => null);
const categories = [
  ['all', 'Selected work'], ['food', 'Food & drinks'], ['fashion', 'Fashion & lifestyle'],
  ['art-direction', 'Art direction'], ['events', 'Events'], ['motion', 'Motion'], ['event-design', 'Event design']
];
const categoryName = id => categories.find(category => category[0] === id)?.[1] || 'Selected work';
let currentItems = [], activeIndex = 0, returnFocus;
const dialog = document.querySelector('.lightbox');
const stage = dialog?.querySelector('.lightbox-stage');
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  const video = entry.target;
  if (entry.isIntersecting && !prefersReducedMotion.matches && video.dataset.paused !== 'true' && !dialog?.open) {
    if (!video.src) video.src = video.dataset.src;
    video.play().catch(() => {});
  } else video.pause();
}), { threshold: .3 });

if (data) {
  document.querySelectorAll('[data-social]').forEach(link => {
    const target = data.about?.[link.dataset.social];
    if (target) link.href = target;
    else link.remove();
  });
  document.querySelectorAll('[data-email]').forEach(link => {
    link.href = `mailto:${data.about?.email || 'raffy@dishtag.com'}`;
    link.textContent = data.about?.email || 'raffy@dishtag.com';
  });
}

function mediaElement(item, large = false) {
  if (item.kind === 'loop') {
    const video = document.createElement('video');
    video.poster = item.poster;
    video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
    video.setAttribute('aria-label', item.alt || 'Motion study');
    if (large) { video.src = item.file; video.controls = true; }
    else video.dataset.src = item.file;
    return video;
  }
  const img = document.createElement('img');
  img.src = large ? (item.large || item.file) : item.file;
  img.alt = item.alt || categoryName(item.category);
  img.width = item.width || 600; img.height = item.height || 900;
  img.decoding = 'async'; img.loading = large ? 'eager' : 'lazy';
  if (!large && item.thumb) img.src = item.thumb;
  return img;
}

function tile(item, index) {
  const figure = document.createElement('figure');
  figure.className = `tile ${(item.width || 600) / (item.height || 900) > 1.2 ? 'landscape' : (item.width || 600) / (item.height || 900) > .85 ? 'square' : 'portrait'}`;
  const control = document.createElement(item.project ? 'a' : 'button');
  control.className = 'tile-link';
  if (item.project) control.href = `./project.html?id=${encodeURIComponent(item.project)}`;
  else { control.type = 'button'; control.addEventListener('click', () => openLightbox(index, control)); }
  control.setAttribute('aria-label', `${item.project ? 'View project' : item.kind === 'video' ? 'Play video' : 'View image'}: ${item.title || item.alt || categoryName(item.category)}`);
  const media = mediaElement(item);
  // Width/height reserve the image space while a lazy image is being fetched.
  if (index < 4 && item.kind !== 'loop') { media.loading = 'eager'; if (index === 0) media.fetchPriority = 'high'; }
  control.append(media);
  if (item.kind === 'video' || item.project) {
    const badge = document.createElement('span'); badge.className = 'media-badge';
    badge.textContent = item.kind === 'video' ? 'Play ↗' : 'Project ↗';
    control.append(badge);
  }
  const caption = document.createElement('span'); caption.className = 'caption';
  caption.textContent = item.title || categoryName(item.category); control.append(caption);
  figure.append(control);
  if (item.kind === 'loop') {
    observer.observe(media);
    const pause = document.createElement('button'); pause.className = 'motion-actions'; pause.type = 'button';
    pause.textContent = prefersReducedMotion.matches ? 'Play loop' : 'Pause loop';
    pause.setAttribute('aria-label', `${pause.textContent}: ${item.alt}`);
    if (prefersReducedMotion.matches) media.dataset.paused = 'true';
    pause.addEventListener('click', () => {
      const paused = media.dataset.paused === 'true'; media.dataset.paused = String(!paused);
      if (paused) { if (!media.src) media.src = media.dataset.src; media.play().catch(() => {}); }
      else media.pause();
      pause.textContent = paused ? 'Pause loop' : 'Play loop';
      pause.setAttribute('aria-label', `${pause.textContent}: ${item.alt}`);
    });
    figure.append(pause);
  }
  return figure;
}

function renderGallery(filter, updateURL = false) {
  const gallery = document.querySelector('.gallery');
  if (!gallery || !data) return;
  observer.disconnect();
  gallery.querySelectorAll('video').forEach(video => video.pause());
  gallery.replaceChildren();
  const selection = filter === 'all' ? data.selected : data.images.filter(item => item.category === filter);
  currentItems = selection || [];
  currentItems.forEach((item, index) => gallery.append(tile(item, index)));
  document.querySelectorAll('.filters button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  const status = document.querySelector('.gallery-status');
  status.textContent = currentItems.length ? '' : 'This selection is being prepared.';
  document.querySelector('#gallery-announcement').textContent = `${categoryName(filter)}: ${currentItems.length} works`;
  if (updateURL) {
    const url = new URL(location.href);
    if (filter === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', filter);
    history.replaceState(null, '', url);
  }
}

function showLightboxItem() {
  const item = currentItems[activeIndex];
  if (!item || !stage) return;
  stage.replaceChildren();
  if (item.kind === 'video') {
    const frame = document.createElement('iframe');
    frame.src = item.player; frame.title = item.title || 'Raffaella Bichiri — video';
    frame.allow = 'fullscreen; autoplay'; frame.allowFullscreen = true; stage.append(frame);
  } else stage.append(mediaElement(item, true));
  dialog.querySelector('.lightbox-title').textContent = item.title || categoryName(item.category);
  dialog.querySelector('.lightbox-count').textContent = `${activeIndex + 1} / ${currentItems.length}`;
  dialog.querySelector('[data-prev]').disabled = activeIndex === 0;
  dialog.querySelector('[data-next]').disabled = activeIndex === currentItems.length - 1;
  dialog.querySelector('[data-project]').hidden = !item.project;
  if (item.project) dialog.querySelector('[data-project]').href = `./project.html?id=${encodeURIComponent(item.project)}`;
}

function openLightbox(index, origin) {
  activeIndex = index; returnFocus = origin;
  document.querySelectorAll('.gallery video').forEach(video => video.pause());
  showLightboxItem(); dialog.showModal(); document.body.classList.add('dialog-open');
  dialog.querySelector('[data-close]').focus();
}
function closeLightbox() { dialog.close(); }
dialog?.addEventListener('close', () => {
  stage.replaceChildren(); document.body.classList.remove('dialog-open'); returnFocus?.focus();
  document.querySelectorAll('.gallery video').forEach(video => {
    if (video.dataset.paused !== 'true' && !prefersReducedMotion.matches) {
      const box = video.getBoundingClientRect();
      if (box.top < innerHeight && box.bottom > 0 && video.src) video.play().catch(() => {});
    }
  });
});
dialog?.querySelector('[data-close]').addEventListener('click', closeLightbox);
dialog?.querySelector('[data-prev]').addEventListener('click', () => { if (activeIndex > 0) { activeIndex--; showLightboxItem(); } });
dialog?.querySelector('[data-next]').addEventListener('click', () => { if (activeIndex < currentItems.length - 1) { activeIndex++; showLightboxItem(); } });
dialog?.addEventListener('keydown', event => {
  if (event.target.closest('video,iframe')) return;
  if (event.key === 'ArrowLeft' && activeIndex > 0) { activeIndex--; showLightboxItem(); }
  if (event.key === 'ArrowRight' && activeIndex < currentItems.length - 1) { activeIndex++; showLightboxItem(); }
});

if (document.querySelector('.gallery')) {
  if (!data) document.querySelector('.gallery-status').textContent = 'The selection could not be loaded. Please refresh the page.';
  else {
    const filters = document.querySelector('.filters');
    categories.forEach(([id, label]) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.dataset.filter = id; button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => renderGallery(id, true)); filters.append(button);
    });
    const requested = new URL(location.href).searchParams.get('category') || 'all';
    renderGallery(categories.some(([id]) => id === requested) ? requested : 'all');
  }
}

const projectView = document.querySelector('#project-content');
if (projectView && data) {
  const projectID = new URL(location.href).searchParams.get('id') || data.projects?.[0]?.id;
  const project = data.projects?.find(project => project.id === projectID);
  if (!project) projectView.innerHTML = '<h1>Project not found.</h1><a class="text-link" href="./">Return to selected work</a>';
  else {
    document.title = `${project.title} — Raffaella Bichiri`;
    document.querySelector('#project-title').textContent = project.title;
    document.querySelector('#project-category').textContent = categoryName(project.category);
    document.querySelector('#project-description').textContent = project.description;
    document.querySelector('#project-credits').textContent = project.credits || '';
    currentItems = project.images;
    project.images.forEach((item, index) => {
      const figure = document.createElement('figure'), button = document.createElement('button');
      button.type = 'button'; button.setAttribute('aria-label', `Enlarge ${item.alt}`);
      const photo = mediaElement(item); photo.src = item.large || item.file;
      button.append(photo); button.addEventListener('click', () => openLightbox(index, button));
      figure.append(button); document.querySelector('.project-images').append(figure);
    });
  }
}
if (document.querySelector('#about-bio') && data) {
  (data.about?.bio || ['Photography, art direction and creative production across food, fashion and events.']).forEach(text => {
    const paragraph = document.createElement('p'); paragraph.textContent = text;
    document.querySelector('#about-bio').append(paragraph);
  });
  const portrait = document.querySelector('.about-portrait');
  if (data.about?.portrait) portrait.src = data.about.portrait; else portrait.remove();
}
