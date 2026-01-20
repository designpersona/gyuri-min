/** Configuration & State */
const LOCK_PASSWORD = '123412'; // password for protected content

// Parse embedded JSON data
const DATA = window.PROJECT_DATA;
const state = { site: DATA.site, projects: DATA.projects };
let pendingSlug = null;
let currentLang = localStorage.getItem('site_lang') || 'en';

// Translations for static text
const I18N = {
  en: {
    aboutLink: "ABOUT ME",
    mobileAboutLink: "ABOUT ME",
    back: "← Back to Archive",
    restricted: "Restricted",
    lockedTitle: "Protected Project",
    lockedDesc: "Enter password to view details",
    unlock: "Unlock",
    cancel: "Cancel",
    year: "Year",
    client: "Client",
    role: "Role",
    tools: "Tools",
    langLabel: "Language",
    // About Page
    aboutRole: "Brand Designer",
    aboutTagline: "Brand Architect.<br />Visual Strategist.<br />Experience Builder.<br />Creative Connector.",
    expertise: "Expertise",
    recognition: "Recognition",
    education: "Education",
    credentials: "Credentials",
    contact: "Get in touch →",
    competencies: [
      "<span class=\"font-semibold\">Brand Strategy & Design:</span> End-to-end identity, packaging, and campaign execution",
      "<span class=\"font-semibold\">B2G & Public Sector:</span> RFP response, MOU negotiation, and funding acquisition",
      "<span class=\"font-semibold\">Global Market Launch:</span> B2B/B2C expertise with distribution partnerships across Southeast Asia and India"
    ],
    awards: [
      "Korea Angel Investment Association President's Award",
      "Edison Awards Bronze Medal <span class=\"text-neutral-500\">(AID, BX Team)</span>",
      "National University Student Design Contest",
      "46th GG National Design Competition"
    ],
    eduList: [
      "Dankook University, Visual Communication Design",
      "The University of Waikato Pathways College"
    ],
    credList: [
      "Gangnam-gu Venture Startup Academy",
      "Craftsman Computer Graphics Operator",
      "Design Teacher Certificate"
    ]
  },
  ko: {
    aboutLink: "ABOUT ME",
    mobileAboutLink: "ABOUT ME",
    back: "← 목록으로 가기",
    restricted: "비공개",
    lockedTitle: "비공개 프로젝트",
    lockedDesc: "비밀번호를 입력하여 상세 내용을 확인하세요",
    unlock: "확인",
    cancel: "취소",
    year: "Year",
    client: "Client",
    role: "Role",
    tools: "Tools",
    langLabel: "Language",
    // About Page
    aboutRole: "브랜드 디자이너",
    aboutTagline: "브랜드 아키텍트.<br />비주얼 스트래티지스트.<br />익스피리언스 빌더.<br />크리에이티브 커넥터.",
    expertise: "전문 분야",
    recognition: "수상 경력",
    education: "학력",
    credentials: "자격증",
    contact: "연락처 →",
    competencies: [
      "<span class=\"font-semibold\">브랜드 전략 및 디자인:</span> 아이덴티티, 패키지, 캠페인 실행의 전 과정 수행",
      "<span class=\"font-semibold\">B2G 및 공공 부문:</span> 제안서(RFP) 작성, MOU 협상 및 자금 확보",
      "<span class=\"font-semibold\">글로벌 시장 진출:</span> 동남아시아 및 인도를 아우르는 B2B/B2C 유통 파트너십 전문성"
    ],
    awards: [
      "한국엔젤투자협회장상",
      "에디슨 어워드 동상 <span class=\"text-neutral-500\">(AID, BX팀)</span>",
      "전국 대학생 디자인 공모전",
      "제46회 경기미술대전"
    ],
    eduList: [
      "단국대학교 시각디자인과",
      "와이카토 대학교 패스웨이 컬리지"
    ],
    credList: [
      "강남구 벤처 스타트업 아카데미",
      "컴퓨터그래픽스운용기능사",
      "디자인 교원 자격증"
    ]
  }
};

const esc = (s = '') => (s ?? '').toString();

/** Helper: Get localized text */
const getText = (obj) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[currentLang] || obj['en'] || '';
};

const t = (key) => I18N[currentLang][key] || I18N['en'][key] || key;


// Restoration of listHTML for mobile menu
const listHTML = (items, activeSlug = null) =>
  `<ul class="menu-list text-[30px] leading-[1.2] font-medium">` +
  items
    .map(
      (p) => `
        <li class="py-2 ${p.slug === activeSlug ? 'active' : ''}">
          <a class="block w-fit pb-1 hover-accent" style="text-decoration:none" href="#/${p.slug}">
            ${esc(getText(p.title))}
          </a>
        </li>`
    )
    .join('') +
  `</ul>`;

const gridHTML = (items) =>

  `<div class="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">` +
  items
    .map(
      (p) => {
        const thumb = esc(p.thumbnail);
        const isVideo = /\.(mp4|webm|mov)$/i.test(thumb);

        let mediaHtml;
        if (isVideo) {
          mediaHtml = `<video class="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" src="${thumb}" autoplay muted loop playsinline></video>`;
        } else {
          const isGif = thumb.toLowerCase().endsWith('.gif');
          mediaHtml = `<img loading="lazy" decoding="async" ${isGif ? 'style="will-change: transform;"' : ''} class="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" src="${thumb}" alt="${esc(getText(p.title))} thumbnail" />`;
        }

        return `
        <article class="relative group">
          <a href="#/${p.slug}" class="block overflow-hidden relative rounded-lg" style="text-decoration:none">
            ${mediaHtml}
            ${p.locked ? `<div class="absolute top-0 right-0 bg-black/10 text-white text-[10px] px-3 py-1 uppercase tracking-wider font-medium">${t('restricted')}</div>` : ''}
          </a>
          <div class="mt-3">
            <h3 class="text-[15px] font-medium">${esc(getText(p.title))}</h3>
            <p class="text-[13px] text-neutral-500">${esc(getText(p.caption))}</p>
          </div>
        </article>`;
      }
    )
    .join('') +
  `</div>`;

function detailHTML(p) {
  const gallery = (p.gallery || [])
    .map((g) => {
      const src = esc(g.src);
      let media;
      const caption = getText(g.caption);

      // 1. YouTube Video
      const ytMatch = src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);

      if (ytMatch) {
        media = `<div class="relative w-full aspect-video">
              <iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/${ytMatch[1]}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>`;
      }
      // 2. Local Video (MP4/WebM/MOV)
      else if (/\.(mp4|webm|mov)$/i.test(src)) {
        media = `<video class="w-full" controls playsinline preload="metadata">
              <source src="${src}" type="video/mp4">
            </video>`;
      }
      // 3. Default Image
      else {
        media = `<img loading="lazy" decoding="async" class="w-full" src="${src}" alt="${esc(getText(p.title))} image" />`;
      }

      return `
        <figure>
          ${media}
          ${caption && caption.trim() !== '' ? `<figcaption>${esc(caption)}</figcaption>` : ``}
        </figure>`;
    })
    .join('');

  const hasLinks = p.links && Array.isArray(p.links) && p.links.length > 0;
  const year = getText(p.year);
  const client = getText(p.client);
  const role = getText(p.role);
  const tools = getText(p.tools); // Tools usually shared but just in case
  const description = getText(p.description); // Array or String

  const hasLeftContent = year || client || role || tools;
  const hasRightContent = description || hasLinks;

  let infoSection = '';
  if (hasLeftContent || hasRightContent) {
    const gridCols = hasLeftContent && hasRightContent ? 'grid-cols-1 md:grid-cols-[200px_1fr]' : 'grid-cols-1';
    infoSection = `
          <section class="mt-8 pt-8 mb-12 border-t border-neutral-200 order-2 lg:order-1">
            <div class="grid ${gridCols} gap-8 md:gap-12">
              ${hasLeftContent
        ? `<div>
                <div class="flex flex-col gap-y-4">
                  ${year
          ? `<div>
                      <span class="text-[13px] text-neutral-500">${t('year')}</span>
                      <div class="text-[15px] mt-1">${esc(year)}</div>
                    </div>`
          : ''
        }
                  ${client
          ? `<div>
                      <span class="text-[13px] text-neutral-500">${t('client')}</span>
                      <div class="text-[15px] mt-1">${esc(client)}</div>
                    </div>`
          : ''
        }
                  ${role
          ? `<div>
                      <span class="text-[13px] text-neutral-500">${t('role')}</span>
                      <div class="text-[15px] mt-1">${esc(role)}</div>
                    </div>`
          : ''
        }
                  ${tools
          ? `<div>
                      <span class="text-[13px] text-neutral-500">${t('tools')}</span>
                      <div class="text-[15px] mt-1">${esc(tools)}</div>
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
                ${description
          ? `<div class="text-[15px] leading-[1.7] text-neutral-700 mb-0">${Array.isArray(description) ? description.join('<br>') : esc(description)
          }</div>`
          : ''
        }
                ${hasLinks
          ? `<div class="${description ? 'mt-4' : ''} space-y-2">
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

  // --- Render Functions ---
  const heroSrc = esc(p.cover);
  const isHeroVideo = /\.(mp4|webm|mov)$/i.test(heroSrc);
  let heroMedia;
  if (isHeroVideo) {
    heroMedia = `<video class="w-full" src="${heroSrc}" autoplay muted loop playsinline></video>`;
  } else {
    heroMedia = `<img class="w-full" src="${heroSrc}" alt="${esc(getText(p.title))} hero" />`;
  }

  return `
        <div class="flex items-center justify-between">
          <a href="#/" class="text-[14px] text-neutral-600 hover:text-neutral-900" style="text-decoration:none">
            ${t('back')}
          </a>
          <div class="text-[13px] text-neutral-500">${esc(getText(p.caption))}</div>
        </div>
        <article class="mt-3">
          <h1 class="text-[30px] md:text-[40px] font-semibold tracking-tight">${esc(getText(p.title))}</h1>
          ${p.summary ? `<p class="mt-2 text-[16px] leading-[1.7] text-neutral-700">${esc(getText(p.summary))}</p>` : ``}
        </article>
        <div class="flex flex-col">
          ${infoSection}
          <section class="mt-6 space-y-6 order-1 lg:order-2">
            <figure>
              ${heroMedia}
              <!-- Hide caption for cover/hero media -->
            </figure>
            ${gallery}
          </section>
        </div>
      `;
}

function aboutHTML() {
  const years = ['2025', '2023', '2012', '2010', '2025', '2021', '2013']; // Just keeping track of years for styling if needed, but they are hardcoded below in loops

  // Helper to get array items
  const competencies = t('competencies').map(c => `<p>${c}</p>`).join('');

  // Custom logic for awards with years
  const awardsData = I18N[currentLang].awards;
  const awardsYears = ['2025', '2023', '2012', '2010'];
  const awardsHTML = awardsData.map((a, i) => `
    <p>${a} <span class="text-[11px] align-top text-neutral-400 font-mono">${awardsYears[i]}</span></p>
  `).join('');

  // Education
  const eduData = I18N[currentLang].eduList;
  const eduHTML = eduData.map(e => `<p>${e}</p>`).join('');

  // Credentials
  const credData = I18N[currentLang].credList;
  const credYears = ['2025', '2021', '2013'];
  const credHTML = credData.map((c, i) => `
    <p>${c} <span class="text-[11px] align-top text-neutral-400 font-mono">${credYears[i]}</span></p>
  `).join('');

  return `
    <article class="max-w-none">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        <div>
          <h1 class="text-[34px] md:text-[34px] font-semibold tracking-tight">Gyuri Min</h1>
          <h1 class="text-[34px] md:text-[34px] font-semibold tracking-tight text-[var(--accent-orange)] -mt-2">${t('aboutRole')}</h1>
        </div>
        <div class="text-right">
          <h1 class="text-[34px] md:text-[34px] tracking-tight">
            ${t('aboutTagline')}
          </h1>
        </div>
      </div>

      <hr class="my-6 border-neutral-300" />

      <!-- Core Competencies -->
      <section class="mb-8">
        <h2 class="text-xl font-bold tracking-tight mb-4">${t('expertise')}</h2>
        <div class="text-base leading-relaxed text-neutral-700 space-y-3">
          ${competencies}
        </div>
      </section>

      <hr class="my-8 border-neutral-300" />

      <!-- Log: Recognition & Awards -->
      <section class="mb-8">
        <h2 class="text-xl font-bold tracking-tight mb-4">${t('recognition')}</h2>
        <div class="text-base leading-relaxed text-neutral-700 space-y-2">
          ${awardsHTML}
        </div>
      </section>

      <hr class="my-8 border-neutral-300" />

      <!-- Education -->
      <section class="mb-8">
        <h2 class="text-xl font-bold tracking-tight mb-4">${t('education')}</h2>
        <div class="text-base leading-relaxed text-neutral-700 space-y-2">
          ${eduHTML}
        </div>
      </section>

      <hr class="my-8 border-neutral-300" />

      <!-- Professional Credentials -->
      <section class="mb-8">
        <h2 class="text-xl font-bold tracking-tight mb-4">${t('credentials')}</h2>
        <div class="text-base leading-relaxed text-neutral-700 space-y-2">
          ${credHTML}
        </div>
      </section>

      <!-- Contact Section -->
      <section class="mb-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 text-[34px]">
          <div>
            <span class="text-neutral-500">${t('contact')}</span>
          </div>
          <div class="text-right">
            <a href="mailto:kimashe@naver.com" class="text-[var(--accent-orange)] font-medium">
              kimashe@naver.com
            </a>
          </div>
        </div>
      </section>

    </article>
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

// Language Elements
const desktopLangBtn = document.getElementById('desktopLangBtn');
const currentLangLabel = document.getElementById('currentLangLabel');

/** Layout Logic: Mobile vs Desktop */
function updateLayoutMode() {
  // Update layout mode based on window width
  // < 768px: Mobile mode behaviors
  // >= 768px: Desktop/Split-view behaviors (including iPad Portrait)
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
  // Update active status of lang toggles in mobile menu
  document.querySelectorAll('.lang-toggle').forEach(btn => {
    const isActive = btn.dataset.lang === currentLang;
    if (isActive) {
      btn.classList.remove('text-neutral-300');
      btn.classList.add('text-neutral-900', 'font-bold');
    } else {
      btn.classList.add('text-neutral-300');
      btn.classList.remove('text-neutral-900', 'font-bold');
    }
  });

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

  if (desktopList) desktopList.innerHTML = listHTML(items);

  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(items);
  toggleMobileHamburger(true);
  updateStaticText();

  // Reset scroll position on view change
  window.scrollTo({ top: 0, behavior: "smooth" });
  pane.scrollTo({ top: 0, behavior: "auto" }); // Pane reset instant

}

function renderAbout() {
  // Use JS rendering instead of template
  pane.innerHTML = aboutHTML();

  if (desktopList) desktopList.innerHTML = listHTML(state.projects);

  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects);
  toggleMobileHamburger(true);
  updateStaticText();

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
    : `<p class="text-sm text-neutral-500">Not found.</p>`;

  if (desktopList) desktopList.innerHTML = listHTML(state.projects, slug);

  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects, slug);
  toggleMobileHamburger(true);
  updateStaticText();


  // Scroll Reset
  pane.scrollTo({ top: 0, behavior: "auto" });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateStaticText() {
  // Header Links
  const aboutMeText = t('aboutLink');
  const aboutLinkEl = document.querySelector('a[href="#/about"].hidden.lg\\:block');
  if (aboutLinkEl) aboutLinkEl.textContent = aboutMeText;

  // Mobile About Link
  const mobileAboutLink = document.getElementById('mobileAboutLink');
  if (mobileAboutLink) mobileAboutLink.textContent = t('mobileAboutLink');

  // Copyright
  const copyText = getText(state.site.copyright);
  (document.getElementById('desktopCopyright') || {}).textContent = copyText;
  (document.getElementById('mobileCopyright') || {}).textContent = copyText;

  // Language Label
  if (currentLangLabel) currentLangLabel.textContent = t('langLabel');



  // Language Option Styles (Desktop)
  document.querySelectorAll('.lang-option').forEach(btn => {
    if (btn.dataset.lang === currentLang) {
      btn.classList.add('bg-neutral-50', 'font-semibold');
    } else {
      btn.classList.remove('bg-neutral-50', 'font-semibold');
    }
  });

  // Lock Modal Strings
  document.querySelector('#lockModal h3').textContent = t('lockedTitle');
  document.querySelector('#lockModal p').textContent = t('lockedDesc');
  document.querySelector('#lockForm button[type="submit"]').textContent = t('unlock');
  document.getElementById('lockCancel').textContent = t('cancel');
}

function setLanguage(lang) {
  if (!lang) return;
  currentLang = lang;
  localStorage.setItem('site_lang', lang);
  // document.documentElement.lang = lang; // optional
  router(); // re-render current view
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

/** Modal Logic: Lock/Unlock */
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
  // Return to Home on cancel
  location.hash = '#/';
}

lockCancel.addEventListener('click', cancelLock);
lockCloseX.addEventListener('click', cancelLock);

// Event: Close modal on outside click
lockModal.addEventListener('click', (e) => {
  if (e.target === lockModal) {
    cancelLock();
  }
});

// Event: Close modal on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lockModal.classList.contains('active')) {
    cancelLock();
  }
});

// init
const brandLink = document.getElementById('brandLink');
brandLink.innerHTML = '<img src="assets/icons/1.png" alt="" class="w-[30px] h-[30px] lg:w-6 lg:h-6 inline-block mr-1.5 align-middle -mt-[12px] lg:mt-[-7px]" />Design Persona';

/** Brand Link Navigation & Smooth Scroll */
brandLink.addEventListener('click', (e) => {
  e.preventDefault();

  // Navigate if needed
  if (location.hash !== '#/' && location.hash !== '') {
    window.location.hash = '#/';
  }

  // Force scroll after logic (User requested setTimeout for stability)
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const pane = document.getElementById('pane');
    if (pane) pane.scrollTo({ top: 0, behavior: "smooth" });
  }, 30);
});
const s = state.site.social || {};
(document.getElementById('snsLinkedIn') || {}).href = s.linkedin || '#';
(document.getElementById('snsX') || {}).href = s.x || '#';
(document.getElementById('snsBehance') || {}).href = s.behance || '#';

// Footer Social Links
(document.getElementById('fLinkedIn') || {}).href = s.linkedin || '#';
(document.getElementById('fX') || {}).href = s.x || '#';
(document.getElementById('fBehance') || {}).href = s.behance || '#';

// Desktop Footer Social Links
(document.getElementById('dLinkedIn') || {}).href = s.linkedin || '#';
(document.getElementById('dX') || {}).href = s.x || '#';
(document.getElementById('dBehance') || {}).href = s.behance || '#';

// Language Event Listeners
document.querySelectorAll('.lang-option').forEach(btn => {
  btn.addEventListener('click', (e) => {
    setLanguage(e.target.dataset.lang);
  });
});
document.querySelectorAll('.lang-toggle').forEach(btn => {
  btn.addEventListener('click', (e) => {
    setLanguage(e.target.dataset.lang);
  });
});

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

/** Feature: Scroll to Top Button (Mobile) */
const scrollTopBtn = document.getElementById('scrollTopBtn');

let lastScrollY = window.scrollY;
const mainHeader = document.getElementById('mainHeader');

// 1. Scroll Position Restoration
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

// 2. Header Scroll Behavior (Hide/Show)
let lastY = window.scrollY;
let ticking = false;

function updateHeader() {
  const currentY = window.scrollY;
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

if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
