// ===== 설정 =====
const LOCK_PASSWORD = '1234'; // ✅ 여기서만 비밀번호 바꾸면 됨

// Parse embedded JSON data
const jsonEl = document.getElementById('projectsData');
const DATA = JSON.parse(jsonEl.textContent);
const state = { site: DATA.site, projects: DATA.projects };
let pendingSlug = null;

const esc = (s = '') => (s ?? '').toString();

const listHTML = (items, activeSlug = null) =>
  `<ul class="menu-list text-[30px] leading-[1.2] font-medium">` +
  items
    .map(
      (p) => `
        <li class="py-2 ${p.slug === activeSlug ? 'active' : ''}">
          <a class="block w-fit pb-1 hover-accent" style="text-decoration:none" href="#/${p.slug}">
            ${esc(p.title)}
          </a>
        </li>`
    )
    .join('') +
  `</ul>`;

const gridHTML = (items) =>
  `<div class="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">` +
  items
    .map(
      (p) => `
        <article class="relative group">
          <a href="#/${p.slug}" class="block overflow-hidden relative" style="text-decoration:none">
            <img loading="lazy" decoding="async" ${esc(p.cover).toLowerCase().endsWith('.gif') ? 'style="will-change: transform;"' : ''} class="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" src="${esc(p.cover)}" alt="${esc(
        p.title
      )} thumbnail" />
            ${p.locked ? `<div class="absolute top-0 right-0 bg-black/10 text-white text-[10px] px-3 py-1 uppercase tracking-wider font-medium">Restricted</div>` : ''}
          </a>
          <div class="mt-3">
            <h3 class="text-[15px] font-medium">${esc(p.title)}</h3>
            <p class="text-[13px] text-neutral-500">${esc(p.caption)}</p>
          </div>
        </article>`
    )
    .join('') +
  `</div>`;

function detailHTML(p) {
  const gallery = (p.gallery || [])
    .map((g) => {
      const src = esc(g.src);
      let media;

      // YouTube detection
      const ytMatch = src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);

      if (ytMatch) {
        media = `<div class="relative w-full aspect-video">
              <iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/${ytMatch[1]}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>`;
      }
      // MP4 / WebM detection
      else if (/\.(mp4|webm)$/i.test(src)) {
        media = `<video class="w-full" controls playsinline preload="metadata">
              <source src="${src}" type="video/mp4">
            </video>`;
      }
      // Default to Image
      else {
        media = `<img loading="lazy" decoding="async" class="w-full" src="${src}" alt="${esc(p.title)} image" />`;
      }

      return `
        <figure>
          ${media}
          ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ``}
        </figure>`;
    })
    .join('');

  const hasLinks = p.links && Array.isArray(p.links) && p.links.length > 0;
  const hasLeftContent = p.year || p.client || p.role || p.Tools;
  const hasRightContent = p.description || hasLinks;

  let infoSection = '';
  if (hasLeftContent || hasRightContent) {
    const gridCols = hasLeftContent && hasRightContent ? 'grid-cols-1 md:grid-cols-[200px_1fr]' : 'grid-cols-1';
    infoSection = `
          <section class="mt-12 pt-8 pb-8 border-t border-neutral-200">
            <div class="grid ${gridCols} gap-8 md:gap-12">
              ${hasLeftContent
        ? `<div>
                <div class="flex flex-col gap-y-4">
                  ${p.year
          ? `<div>
                      <span class="text-[13px] text-neutral-500">Year</span>
                      <div class="text-[15px] mt-1">${esc(p.year)}</div>
                    </div>`
          : ''
        }
                  ${p.client
          ? `<div>
                      <span class="text-[13px] text-neutral-500">Client</span>
                      <div class="text-[15px] mt-1">${esc(p.client)}</div>
                    </div>`
          : ''
        }
                  ${p.role
          ? `<div>
                      <span class="text-[13px] text-neutral-500">Role</span>
                      <div class="text-[15px] mt-1">${esc(p.role)}</div>
                    </div>`
          : ''
        }
                  ${p.Tools
          ? `<div>
                      <span class="text-[13px] text-neutral-500">Tools</span>
                      <div class="text-[15px] mt-1">${esc(p.Tools)}</div>
                    </div>`
          : ''
        }
                  ${p.country || p.flagImage
          ? `<div>
                      <div class="text-[15px] mt-1">
                        ${p.flagImage
            ? `<img src="${esc(p.flagImage)}" class="w-[24px] h-[24px] object-contain" alt="flag">`
            : p.country === 'India' ? '🇮🇳'
              : p.country === 'Malaysia' ? '🇲🇾'
                : ''
          }
                      </div>
                    </div>`
          : ''
        }
                </div>
              </div>`
        : ''
      }
              ${hasRightContent
        ? `<div class="${hasLeftContent ? '' : 'w-full'}">
                ${p.description
          ? `<div class="text-[15px] leading-[1.7] text-neutral-700 mb-0">${Array.isArray(p.description) ? p.description.join('<br>') : esc(p.description)
          }</div>`
          : ''
        }
                ${hasLinks
          ? `<div class="${p.description ? 'mt-4' : ''} space-y-2">
                  ${p.links
            .map(
              (link) =>
                `<a href="${esc(link.url)}" target="_blank" rel="noopener" class="text-[14px] text-neutral-600 hover:text-neutral-900" style="text-decoration:underline">${esc(
                  link.label || link.url
                )}</a>`
            )
            .join('<br>')}
                </div>`
          : ''
        }
              </div>`
        : ''
      }
            </div>
          </section>
        `;
  }

  return `
        <div class="flex items-center justify-between">
          <a href="#/" class="text-[14px] text-neutral-600 hover:text-neutral-900" style="text-decoration:none">
            ← Back to Archive
          </a>
          <div class="text-[13px] text-neutral-500">${esc(p.caption)}</div>
        </div>
        <article class="mt-3">
          <h1 class="text-[30px] md:text-[40px] font-semibold tracking-tight">${esc(p.title)}</h1>
          ${p.summary ? `<p class="mt-2 text-[16px] leading-[1.7] text-neutral-700">${esc(p.summary)}</p>` : ``}
        </article>
        <section class="mt-6 space-y-6">
          <figure>
            <img class="w-full" src="${esc(p.cover)}" alt="${esc(p.title)} hero" />
            <!-- 커버 아래에는 캡션 표시 안 함 -->
          </figure>
          ${gallery}
        </section>
        ${infoSection}
      `;
}

const pane = document.getElementById('pane');
const desktopList = document.getElementById('projectListDesktop');
const menuBtn = document.getElementById('menuBtn');
const menuEl = document.getElementById('mobileMenu');
const drawerPanel = document.getElementById('drawerPanel');
const menuBackdrop = document.getElementById('menuBackdrop');
const menuClose = document.getElementById('menuClose');
const mobileProjectList = document.getElementById('mobileProjectList');

// Mobile Mode Logic
function updateLayoutMode() {
  // Use 1024px (lg) as the split-view threshold.
  // iPad (768px) is tablet but not split-view, so it falls into 'mobile/single column' logic for main pane?
  // User asked for iPad menu visibility. That is CSS (hidden md:block).
  // Here we just toggle the "mobile-mode" for scroll behavior purposes.
  // If we want iPad to behave like desktop (split scroll), this should be < 1024.
  // If we want iPad to behave like mobile (window scroll), it stays < 1024.
  // Requirement 4 said "Mobile (main or pane) ... internal scroll disabled".
  // Let's keep 1024 as the break point for "Split View".
  // iPad Portrait (768-1023) should be treated as "Desktop-like" (Split View) per user request.
  // So we lower the mobile-mode threshold to 768px.
  if (window.innerWidth < 768) {
    document.body.classList.add('mobile-mode');
  } else {
    document.body.classList.remove('mobile-mode');
  }
}
window.addEventListener('resize', updateLayoutMode);
updateLayoutMode();

function toggleMobileHamburger(show) {
  if (!menuBtn) return;
  if (show) menuBtn.classList.remove('hidden');
  else menuBtn.classList.add('hidden');
}

function openMenu() {
  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects);
  menuEl.classList.remove('hidden');
  drawerPanel.classList.add('open');
  menuBtn?.setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  drawerPanel.classList.remove('open');
  menuBtn?.setAttribute('aria-expanded', 'false');
  setTimeout(() => menuEl.classList.add('hidden'), 250);
}

function renderHome() {
  const items = state.projects;
  pane.innerHTML = `
        ${gridHTML(items)}
      `;
  desktopList.innerHTML = listHTML(items);
  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(items);
  toggleMobileHamburger(true);

  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(items);
  toggleMobileHamburger(true);

  // Scroll Reset
  pane.scrollTo({ top: 0, behavior: "auto" });
  window.scrollTo({ top: 0, behavior: "smooth" });

  window.isBrandClick = false; // Reset flag
}

function renderAbout() {
  const tpl = document.getElementById('infoTpl');
  if (tpl) {
    pane.innerHTML = tpl.innerHTML;
  } else {
    pane.innerHTML = '<p>About</p>';
  }
  desktopList.innerHTML = listHTML(state.projects);
  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects);
  toggleMobileHamburger(true);

  if (document.body.classList.contains('mobile-mode')) {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  } else {
    requestAnimationFrame(() => pane.scrollTo({ top: 0, behavior: 'instant' }));
  }
}

function renderDetail(slug) {
  const p = state.projects.find((x) => x.slug === slug);
  pane.innerHTML = p
    ? detailHTML(p)
    : '<p class="text-sm text-neutral-500">Not found.</p>';
  desktopList.innerHTML = listHTML(state.projects, slug);
  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects, slug);
  toggleMobileHamburger(true);

  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects, slug);
  toggleMobileHamburger(true);

  // Scroll Reset
  pane.scrollTo({ top: 0, behavior: "auto" });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function router() {
  const raw = location.hash || '#/';
  const m = raw.match(/^#\/(.*)$/);
  const slug = m ? m[1] : '';
  if (!slug) {
    renderHome();
    closeMenu();
    return;
  }
  if (slug === 'about') {
    renderAbout();
    closeMenu();
    return;
  }

  const p = state.projects.find((x) => x.slug === slug);
  if (p && p.locked) {
    pendingSlug = slug;
    showLockModal();
    closeMenu();
    return;
  }

  renderDetail(slug);
  closeMenu();
}

// Lock Modal Logic
const lockModal = document.getElementById('lockModal');
const lockForm = document.getElementById('lockForm');
const lockInput = document.getElementById('lockInput');
const lockError = document.getElementById('lockError');
const lockCancel = document.getElementById('lockCancel');
const lockCloseX = document.getElementById('lockCloseX');

function showLockModal() {
  lockModal.classList.add('active');
  lockInput.value = '';
  lockError.classList.add('hidden');
  lockInput.classList.remove('border-red-500');
  setTimeout(() => lockInput.focus(), 50);
}

function hideLockModal() {
  lockModal.classList.remove('active');
  pendingSlug = null;
}

lockForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const pwd = lockInput.value;
  if (pwd === LOCK_PASSWORD) {
    if (pendingSlug) {
      renderDetail(pendingSlug);
    }
    hideLockModal();
  } else {
    lockError.classList.remove('hidden');
    lockInput.classList.add('border-red-500');
  }
});

lockInput.addEventListener('input', () => {
  lockError.classList.add('hidden');
  lockInput.classList.remove('border-red-500');
});

function cancelLock() {
  hideLockModal();
  // 홈으로 돌려보내기
  location.hash = '#/';
}

lockCancel.addEventListener('click', cancelLock);
lockCloseX.addEventListener('click', cancelLock);

// 모달 바깥 클릭 시 닫기
lockModal.addEventListener('click', (e) => {
  if (e.target === lockModal) {
    cancelLock();
  }
});

// ESC로 닫기
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lockModal.classList.contains('active')) {
    cancelLock();
  }
});

// init
const brandLink = document.getElementById('brandLink');
brandLink.innerHTML = '<img src="assets/icons/1.png" alt="" class="w-[30px] h-[30px] lg:w-4 lg:h-4 inline-block mr-1.5 align-middle -mt-[12px] lg:mt-[-6px]" />Claire Min';

// Brand Link Smooth Scroll
// Brand Link Smooth Scroll
brandLink.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Also navigate if not home?
  if (location.hash !== '#/' && location.hash !== '') {
    location.hash = '#/';
  }
});
const s = state.site.social || {};
(document.getElementById('snsLinkedIn') || {}).href = s.linkedin || '#';
(document.getElementById('snsX') || {}).href = s.x || '#';
(document.getElementById('snsBehance') || {}).href = s.behance || '#';
(document.getElementById('mLinkedIn') || {}).href = s.linkedin || '#';
(document.getElementById('mX') || {}).href = s.x || '#';
(document.getElementById('mBehance') || {}).href = s.behance || '#';
// Footer SNS
(document.getElementById('fLinkedIn') || {}).href = s.linkedin || '#';
(document.getElementById('fX') || {}).href = s.x || '#';
(document.getElementById('fBehance') || {}).href = s.behance || '#';

(document.getElementById('desktopCopyright') || {}).textContent = state.site.copyright || '';
(document.getElementById('mobileCopyright') || {}).textContent = state.site.copyright || '';
if (desktopList) desktopList.innerHTML = listHTML(state.projects);
if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects);

updateLayoutMode(); // Ensure mode is set on init

const mobileAboutLink = document.getElementById('mobileAboutLink');

menuBtn?.addEventListener('click', openMenu);
menuBackdrop?.addEventListener('click', closeMenu);
menuClose?.addEventListener('click', closeMenu);
mobileAboutLink?.addEventListener('click', closeMenu);

window.addEventListener('hashchange', router);
// Resize listener merged into updateLayoutMode
router();

// Scroll to Top Button (Mobile only)
const scrollTopBtn = document.getElementById('scrollTopBtn');

let lastScrollY = window.scrollY;
const mainHeader = document.getElementById('mainHeader');

// 1. Force Scroll to Top on Load & Reload (Mobile P2R / bfcache support)
window.onbeforeunload = function () {
  window.scrollTo(0, 0);
};

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // bfcache restore
    window.scrollTo(0, 0);
    // Force reload if needed, but scrollTo(0,0) usually sufficient
  }
});

// 2. Optimized Scroll Listener (rAF based for Safari 60fps)
let lastY = window.scrollY;
let ticking = false;

function updateHeader() {
  const currentY = window.scrollY;
  // const mainHeader = document.getElementById('mainHeader'); // Global

  if (mainHeader) {
    // Logic: Hide on Down, Show on Up (Immediate)
    if (currentY > lastY && currentY > 10) {
      // Scroll Down -> Hide
      // Use translate3d for GPU
      mainHeader.style.transform = "translate3d(0, -100%, 0)";
    } else {
      // Scroll Up -> Show
      mainHeader.style.transform = "translate3d(0, 0, 0)";
    }
  }

  // Scroll Top Button Logic
  if (currentY > 300) {
    if (scrollTopBtn) scrollTopBtn.classList.add('visible');
  } else {
    if (scrollTopBtn) scrollTopBtn.classList.remove('visible');
  }

  lastY = currentY > 0 ? currentY : 0; // Prevent negative
  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    window.requestAnimationFrame(updateHeader);
    ticking = true;
  }
}, { passive: true });

// Add scroll listener
// checkScroll replaced by inline listener above

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
