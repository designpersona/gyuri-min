/** Configuration & State */
const LOCK_PASSWORD = '123412'; // password for protected content

const storage = (() => {
  let available = true;
  try {
    const key = '__storage_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
  } catch (err) {
    available = false;
  }
  return {
    get(key, fallback) {
      if (!available) return fallback;
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      if (!available) return;
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        // Ignore storage failures (private mode, quota, etc.)
      }
    }
  };
})();

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
};

// Parse embedded JSON data
const DATA = window.PROJECT_DATA;
if (!DATA || !DATA.site || !DATA.projects) {
  const paneFallback = document.getElementById('pane');
  let retryCount = 0;
  try {
    retryCount = parseInt(sessionStorage.getItem('data_retry_count') || '0', 10);
  } catch (err) {
    retryCount = 0;
  }
  if (retryCount < 2) {
    try {
      sessionStorage.setItem('data_retry_count', String(retryCount + 1));
    } catch (err) {
      // Ignore storage failures.
    }
    if (paneFallback) {
      paneFallback.innerHTML = '<div class="py-16 text-center text-sm text-neutral-500">Loading failed. Retrying...</div>';
    }
    const retryScript = document.createElement('script');
    retryScript.src = `js/data.js?v=${Date.now()}`;
    retryScript.onload = () => window.location.reload();
    retryScript.onerror = () => {
      if (paneFallback) {
        paneFallback.innerHTML = '<div class="py-16 text-center text-sm text-neutral-500">Failed to load data. Please refresh.</div>';
      }
    };
    document.head.appendChild(retryScript);
    throw new Error('PROJECT_DATA missing');
  }
  if (paneFallback) {
    paneFallback.innerHTML = '<div class="py-16 text-center text-sm text-neutral-500">Failed to load data.<div class="mt-3"><button id="retryDataBtn" class="text-[12px] text-neutral-500 hover:text-neutral-900 transition-colors underline">Retry</button></div></div>';
    const retryBtn = document.getElementById('retryDataBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        try {
          sessionStorage.removeItem('data_retry_count');
        } catch (err) {
          // Ignore storage failures.
        }
        window.location.reload();
      });
    }
  }
  throw new Error('PROJECT_DATA missing');
}
try {
  sessionStorage.removeItem('data_retry_count');
} catch (err) {
  // Ignore storage failures.
}
const state = { site: DATA.site, projects: DATA.projects };
let pendingSlug = null;
let currentLang = storage.get('site_lang', 'en');
let viewMode = storage.get('view_mode', '1'); // '1', '2', '3', or '5'
let searchQuery = '';
let activeFilters = safeJsonParse(storage.get('activeFilters', '{}'), {}); // { projectType: [], role: [], industry: [], client: [], tools: [] }
let sortMode = storage.get('sort_mode', 'featured'); // featured | latest | oldest
let toolsShowAll = storage.get('tools_show_all', 'false') === 'true';
// Default filter visibility: Hidden on mobile (<1024), Visible on desktop
const filterVisibleStored = storage.get('filterVisible', null);
let filterVisible = filterVisibleStored === null
  ? (window.innerWidth >= 1024)
  : (filterVisibleStored !== 'false');

document.documentElement.dataset.lang = currentLang;
document.body.classList.toggle('lang-en', currentLang === 'en');
document.body.classList.toggle('lang-ko', currentLang === 'ko');

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
    projectType: "Project Type",
    industry: "Industry",
    tools: "Tools",
    clearFilters: "Clear all filters",
    hideFilter: "Hide Filter",
    showFilter: "Show Filter",
    filter: "Filter",
    resultsSuffix: "Results",
    sort: "Sort",
    featured: "Random",
    latest: "Latest",
    oldest: "Oldest",
    moreTools: "+ More",
    lessTools: "Show less",
    langLabel: "EN",
    viewLabel: "View",
    magazineView: "Magazine",
    thumbnailView: "Thumbnail",
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
    aboutLink: "소개",
    mobileAboutLink: "소개",
    back: "← 목록으로",
    restricted: "비공개",
    lockedTitle: "비공개 프로젝트",
    lockedDesc: "비밀번호를 입력하여 상세 내용을 확인하세요",
    unlock: "확인",
    cancel: "취소",
    year: "연도",
    client: "클라이언트",
    role: "역할",
    projectType: "프로젝트 유형",
    industry: "산업",
    tools: "도구",
    clearFilters: "필터 초기화",
    hideFilter: "필터 숨기기",
    showFilter: "필터 보이기",
    filter: "필터",
    resultsSuffix: "개의 결과",
    sort: "정렬",
    featured: "무작위",
    latest: "최근 순",
    oldest: "오래된 순",
    moreTools: "+더보기",
    lessTools: "간단히 보기",
    langLabel: "KO",
    viewLabel: "뷰",
    magazineView: "매거진",
    thumbnailView: "썸네일",
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

const FILTER_CONFIG = {
  projectType: [
    "Brand Experience",
    "Digital Product",
    "Campaign",
    "Character IP",
    "Personal Work"
  ],
  role: [
    "Brand Designer",
    "Brand Experience Designer",
    "Art Director",
    "Graphic Designer",
    "Web Designer",
    "Illustrator",
    "3D Artist"
  ],
  industry: [
    "Beauty",
    "Food",
    "Healthcare",
    "Retail",
    "Public Sector",
    "Technology"
  ],
  client: [
    "AID",
    "KOTRA",
    "NongHyup (Chungnam)",
    "Shinan-gun",
    "Café Terrabite",
    "Korea Stationery Industry Cooperative",
    "Petit-ours (Collaboration)",
    "Personal Project",
    "27 Red Brick"
  ],
  tools: {
    primary: ["Figma", "Illustrator", "Photoshop", "3ds Max", "KeyShot"],
    more: ["After Effects", "ChatGPT", "Cursor", "DALL·E", "Sora", "VS Code"]
  }
};

const TOOL_ALIASES = new Map([
  ["ChatGPT(Codex)", "ChatGPT"],
  ["ChatGPT (Codex)", "ChatGPT"],
  ["DALL·E(OpenAI)", "DALL·E"],
  ["DALL·E (OpenAI)", "DALL·E"],
  ["Sora(OpenAI)", "Sora"],
  ["Sora (OpenAI)", "Sora"],
  ["3D Max", "3ds Max"],
  ["Adobe Illustrator", "Illustrator"],
  ["Adobe Photoshop", "Photoshop"]
]);

const TOOL_FILTER_EXCLUDES = new Set([
  "Adobe",
  "Dreamweaver",
  "Antigravity",
  "Acrylic Paint",
  "Sculpey"
]);

const normalizeToolName = (tool) => {
  if (!tool) return "";
  const fixed = tool.replace(/OpenAl/g, "OpenAI").trim();
  return TOOL_ALIASES.get(fixed) || fixed;
};

const getProjectTools = (project) => {
  if (!project?.tools) return [];
  return project.tools
    .split(",")
    .map((tool) => normalizeToolName(tool))
    .map((tool) => tool.trim())
    .filter((tool) => tool && !TOOL_FILTER_EXCLUDES.has(tool));
};

const FILTER_KEYS = ["projectType", "role", "industry", "client", "tools"];
const SORT_MODES = ["featured", "latest", "oldest"];

const sanitizeFilters = (filters) => {
  const clean = {};
  const toolsAllowed = new Set([...FILTER_CONFIG.tools.primary, ...FILTER_CONFIG.tools.more]);
  const allowedValues = {
    projectType: new Set(FILTER_CONFIG.projectType),
    role: new Set(FILTER_CONFIG.role),
    industry: new Set(FILTER_CONFIG.industry),
    client: new Set(FILTER_CONFIG.client),
    tools: toolsAllowed
  };

  FILTER_KEYS.forEach((key) => {
    const values = Array.isArray(filters?.[key]) ? filters[key] : [];
    clean[key] = values.filter((value) => allowedValues[key].has(value));
  });

  return clean;
};

activeFilters = sanitizeFilters(activeFilters);
storage.set('activeFilters', JSON.stringify(activeFilters));
if (!SORT_MODES.includes(sortMode)) {
  sortMode = "featured";
}

const esc = (s = '') => (s ?? '').toString();

/** Helper: Get localized text */
const getText = (obj) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj;
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

const gridHTML = (items) => {
  // Determine grid classes based on view mode
  const isDesktop = window.innerWidth >= 1024;
  let gridClasses;

  if (isDesktop) {
    if (viewMode === '1') {
      gridClasses = 'grid-cols-1 gap-y-12';
    } else if (viewMode === '2') {
      gridClasses = 'grid-cols-2 gap-x-6 gap-y-6';
    } else if (viewMode === '3') {
      gridClasses = 'grid-cols-3 gap-x-6 gap-y-6';
    } else if (viewMode === '5') {
      gridClasses = 'grid-cols-5 gap-x-4 gap-y-4';
    } else {
      gridClasses = 'grid-cols-3 gap-x-6 gap-y-6';
    }
  } else {
    // Mobile/Tablet: Respect 1-column if selected, else default to 2
    if (viewMode === '1') {
      gridClasses = 'grid-cols-1 gap-y-8';
    } else {
      gridClasses = 'grid-cols-2 gap-x-4 gap-y-6';
    }
  }

  return `<div class="grid ${gridClasses}">` +
    items
      .map(
        (p) => {
          const thumb = esc(p.thumbnail);
          const isVideo = /\.(mp4|webm|mov)$/i.test(thumb);
          const isWideView = viewMode === '1'; // Now applies to mobile too
          const aspectClass = isWideView ? 'aspect-[16/9]' : 'aspect-square';
          const galleryImages = (p.gallery || [])
            .map((g) => esc(g.src))
            .filter((src) => /\.(png|jpe?g|gif|webp)$/i.test(src))
            .slice(0, 3);
          const coverSrc = esc(p.cover || '');
          const isCoverImage = /\.(png|jpe?g|gif|webp)$/i.test(coverSrc);
          const isCoverVideo = /\.(mp4|webm|mov)$/i.test(coverSrc);

          let mediaHtml;
          if (isWideView && (galleryImages.length || isVideo || isCoverImage || isCoverVideo)) {
            const slides = [];
            if (isCoverVideo) {
              slides.push(`
              <div class="thumb-roller-slide">
                <video class="w-full h-full object-cover" src="${coverSrc}" autoplay muted loop playsinline></video>
              </div>`);
            } else if (isCoverImage) {
              slides.push(`
              <div class="thumb-roller-slide">
                <img loading="lazy" decoding="async" class="w-full h-full object-cover" src="${coverSrc}" alt="${esc(getText(p.title))} cover" />
              </div>`);
            }
            slides.push(
              ...galleryImages.map(
                (src) => `
              <div class="thumb-roller-slide">
                <img loading="lazy" decoding="async" class="w-full h-full object-cover" src="${src}" alt="${esc(getText(p.title))} slide" />
              </div>`
              )
            );
            if (isVideo && thumb !== coverSrc) {
              slides.push(`
              <div class="thumb-roller-slide">
                <video class="w-full h-full object-cover" src="${thumb}" autoplay muted loop playsinline></video>
              </div>`);
            }
            const slidesHtml = slides.join('');
            mediaHtml = `
            <div class="thumb-roller ${aspectClass} w-full" data-slide-count="${slides.length}">
              <button class="thumb-roller-btn thumb-roller-prev" type="button" aria-label="Previous thumbnail" data-thumb-slider="prev">‹</button>
              <div class="thumb-roller-track">
                ${slidesHtml}
              </div>
              <button class="thumb-roller-btn thumb-roller-next" type="button" aria-label="Next thumbnail" data-thumb-slider="next">›</button>
            </div>`;
          } else if (isVideo) {
            mediaHtml = `<video class="${aspectClass} w-full object-cover thumb-media" src="${thumb}" autoplay muted loop playsinline></video>`;
          } else {
            const isGif = thumb.toLowerCase().endsWith('.gif');
            mediaHtml = `<img loading="lazy" decoding="async" ${isGif ? 'style="will-change: transform;"' : ''} class="${aspectClass} w-full object-cover thumb-media" src="${thumb}" alt="${esc(getText(p.title))} thumbnail" />`;
          }

          return `
        <article class="relative group ${isWideView ? 'w-full max-w-full' : ''}">
          <a href="#/${p.slug}" class="block overflow-hidden relative thumb-frame" style="text-decoration:none">
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
};

function detailHTML(p) {
  const gallery = (p.gallery || [])
    .map((g) => {
      const src = esc(g.src);
      let media;
      const caption = getText(g.caption);

      const ytMatch = src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);

      if (ytMatch) {
        media = `<div class="relative w-full aspect-video">
              <iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/${ytMatch[1]}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>`;
      } else if (/\.(mp4|webm|mov)$/i.test(src)) {
        media = `<video class="w-full" controls playsinline preload="metadata">
              <source src="${src}" type="video/mp4">
            </video>`;
      } else {
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
  const clientDetail = getText(p.client_detail);
  const clientDisplay = clientDetail ? `${client} (${clientDetail})` : client;
  const role = getText(p.role);
  const projectType = getText(p.projectType);
  const industry = getText(p.industry);
  const tools = getText(p.tools); // Tools usually shared but just in case
  const description = getText(p.description); // Array or String

  const hasLeftContent = year || client || role || projectType || industry || tools;
  const hasRightContent = description || hasLinks;

  let infoSection = '';
  if (hasLeftContent || hasRightContent) {
    const gridCols = hasLeftContent && hasRightContent ? 'grid-cols-1 md:grid-cols-[200px_1fr]' : 'grid-cols-1';
    infoSection = `
          <section class="mt-8 pt-8 mb-12 border-t border-neutral-200">
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
                      <div class="text-[15px] mt-1">${esc(clientDisplay)}</div>
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
                  ${projectType
          ? `<div>
                      <span class="text-[13px] text-neutral-500">${t('projectType')}</span>
                      <div class="text-[15px] mt-1">${esc(projectType)}</div>
                    </div>`
          : ''
        }
                  ${industry
          ? `<div>
                      <span class="text-[13px] text-neutral-500">${t('industry')}</span>
                      <div class="text-[15px] mt-1">${esc(industry)}</div>
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
          <section class="mt-6 space-y-6">
            <figure>
              ${heroMedia}
              <!-- Hide caption for cover/hero media -->
            </figure>
            ${gallery}
          </section>
          ${infoSection}
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
const paneLoading = pane ? pane.querySelector('.pane-loading') : null;
if (paneLoading) paneLoading.remove();
const desktopList = document.getElementById('projectListDesktop');
const menuBtn = document.getElementById('menuBtn');
const desktopMenuBtn = document.getElementById('desktopMenuBtn');
const menuEl = document.getElementById('mobileMenu');
const desktopMenuEl = document.getElementById('desktopMenu');
const drawerPanel = document.getElementById('drawerPanel');
const desktopDrawerPanel = document.getElementById('desktopDrawerPanel');
const menuBackdrop = document.getElementById('menuBackdrop');
const desktopMenuBackdrop = document.getElementById('desktopMenuBackdrop');
const menuClose = document.getElementById('menuClose');
const desktopMenuClose = document.getElementById('desktopMenuClose');
const mobileProjectList = document.getElementById('mobileProjectList');
const desktopProjectListNav = document.getElementById('desktopProjectListNav');
const filterMenuContent = document.getElementById('filterMenuContent');
const mobileFilterContent = document.getElementById('mobileFilterContent');
const mobileFilterOpenBtn = document.getElementById('mobileFilterOpenBtn');
const mobileFilterDrawer = document.getElementById('mobileFilterDrawer');
const mobileFilterClose = document.getElementById('mobileFilterClose');
const mobileViewDropdownBtn = document.getElementById('mobileViewDropdownBtn');
const mobileViewDropdownLabel = document.getElementById('mobileViewDropdownLabel');
const mobileViewDropdown = document.getElementById('mobileViewDropdown');
const mobileResultCount = document.getElementById('mobileResultCount');

function clearThumbRollers() {
  // No-op for manual sliders.
}

// Language Elements
const desktopLangBtn = document.getElementById('desktopLangBtn');
const currentLangLabel = document.getElementById('currentLangLabel');

/** Layout Logic: Mobile vs Desktop */
function updateLayoutMode() {
  // Update layout mode based on window width
  // < 1024px: Mobile mode behaviors (includes iPad)
  // >= 1024px: Desktop behaviors
  const isMobile = window.innerWidth < 1024;
  if (isMobile) {
    document.body.classList.add('mobile-mode');
  } else {
    document.body.classList.remove('mobile-mode');
  }

  if (!isMobile) {
    const desktopDefaultSet = storage.get('view_mode_initialized', '0') === '1';
    if (!desktopDefaultSet) {
      storage.set('view_mode_initialized', '1');
      if (viewMode !== '1') {
        setViewMode('1');
      }
    }
  }

  if (isMobile) {
    const mobileDefaultSet = storage.get('mobile_view_mode_initialized', '0') === '1';
    if (!mobileDefaultSet) {
      storage.set('mobile_view_mode_initialized', '1');
      if (viewMode !== '2') {
        setViewMode('2');
      }
    }
  }

  if (!isMobile && viewMode === '2') {
    setViewMode('1');
  }

  updateViewToggleButtons();
}
let layoutResizeTimer = null;
window.addEventListener('resize', () => {
  if (layoutResizeTimer) {
    clearTimeout(layoutResizeTimer);
  }
  layoutResizeTimer = setTimeout(() => {
    updateLayoutMode();
    layoutResizeTimer = null;
  }, 150);
});
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
  // Small delay to ensure transition works after removing 'hidden'
  requestAnimationFrame(() => {
    drawerPanel.classList.add('open');
    menuBtn?.setAttribute('aria-expanded', 'true');
    // Change icon to X or similar if needed - currently using internal X
  });
}

function toggleMenu() {
  const isOpen = drawerPanel?.classList.contains('open');
  if (isOpen) {
    closeMenu();
  } else {
    openMenu();
  }
}

function closeMenu() {
  if (!drawerPanel.classList.contains('open')) return;
  drawerPanel.classList.remove('open');
  menuBtn?.setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    if (!drawerPanel.classList.contains('open')) {
      menuEl.classList.add('hidden');
    }
  }, 300); // matching transition .25s + buffer
}

// Extract unique filter values from projects
function getFilterOptions() {
  const options = {
    projectType: new Set(),
    client: new Set(),
    role: new Set(),
    industry: new Set(),
    tools: new Set()
  };

  state.projects.forEach((p) => {
    const projectType = getText(p.projectType);
    if (projectType) options.projectType.add(projectType);

    const client = getText(p.client);
    if (client) options.client.add(client);

    const role = getText(p.role);
    if (role) options.role.add(role);

    const industry = getText(p.industry);
    if (industry) options.industry.add(industry);

    getProjectTools(p).forEach((tool) => options.tools.add(tool));
  });

  const filterByUsed = (list, usedSet) => list.filter((value) => usedSet.has(value));
  const toolsAllowed = [...FILTER_CONFIG.tools.primary, ...FILTER_CONFIG.tools.more];

  return {
    projectType: filterByUsed(FILTER_CONFIG.projectType, options.projectType),
    client: filterByUsed(FILTER_CONFIG.client, options.client),
    role: filterByUsed(FILTER_CONFIG.role, options.role),
    industry: filterByUsed(FILTER_CONFIG.industry, options.industry),
    tools: filterByUsed(toolsAllowed, options.tools)
  };
}

// Filter projects based on active filters and search query
function filterProjects() {
  let filtered = state.projects;

  // Apply search filter first
  if (searchQuery && searchQuery.trim() !== '') {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => {
      const title = getText(p.title).toLowerCase();
      const caption = getText(p.caption).toLowerCase();
      const summary = getText(p.summary || '').toLowerCase();
      return title.includes(query) || caption.includes(query) || summary.includes(query);
    });
  }

  // Apply other filters
  if (!activeFilters || Object.keys(activeFilters).length === 0 ||
    Object.values(activeFilters).every(arr => !arr || arr.length === 0)) {
    return filtered;
  }

  return filtered.filter(p => {
    // Client filter
    if (activeFilters.client && activeFilters.client.length > 0) {
      const client = getText(p.client);
      if (!client || !activeFilters.client.includes(client)) return false;
    }

    // Role filter
    if (activeFilters.role && activeFilters.role.length > 0) {
      const role = getText(p.role);
      if (!role || !activeFilters.role.includes(role)) return false;
    }

    // Project Type filter
    if (activeFilters.projectType && activeFilters.projectType.length > 0) {
      const projectType = getText(p.projectType);
      if (!projectType || !activeFilters.projectType.includes(projectType)) return false;
    }

    // Industry filter
    if (activeFilters.industry && activeFilters.industry.length > 0) {
      const industry = getText(p.industry);
      if (!industry || !activeFilters.industry.includes(industry)) return false;
    }

    // Tools filter
    if (activeFilters.tools && activeFilters.tools.length > 0) {
      const toolsList = getProjectTools(p);
      const hasMatchingTool = activeFilters.tools.some(t => toolsList.includes(t));
      if (!hasMatchingTool) return false;
    }

    return true;
  });
}

const getYearRange = (yearValue) => {
  const matches = `${yearValue || ''}`.match(/\d{4}/g) || [];
  if (matches.length === 0) return { start: 0, end: 0 };
  const start = parseInt(matches[0], 10) || 0;
  const end = parseInt(matches[matches.length - 1], 10) || start;
  return { start, end };
};

const shuffleArray = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const sortProjects = (items) => {
  if (sortMode === 'featured') {
    const featuredItems = items.filter((item) => item.featured);
    const normalItems = items.filter((item) => !item.featured);
    return [...shuffleArray(featuredItems), ...shuffleArray(normalItems)];
  }

  const sorted = [...items];
  sorted.sort((a, b) => {
    const yearA = getYearRange(getText(a.year));
    const yearB = getYearRange(getText(b.year));

    if (sortMode === 'oldest') {
      return yearA.start - yearB.start;
    }

    return yearB.end - yearA.end;
  });

  return sorted;
};

// Helper to track collapsed states
let collapsedSections = safeJsonParse(storage.get('collapsedSections', '{}'), {});

// Generate filter menu HTML
function filterMenuHTML() {
  const options = getFilterOptions();
  const filterLabels = {
    client: t('client'),
    role: t('role'),
    projectType: t('projectType'),
    industry: t('industry'),
    tools: t('tools')
  };

  let html = '<div class="filter-menu-sections">';

  ['projectType', 'role', 'industry', 'client', 'tools'].forEach(filterType => {
    const filterValues = options[filterType];
    if (filterValues.length === 0) return;

    const isCollapsed = collapsedSections[filterType] || false;
    const isTools = filterType === 'tools';
    let toolsMore = [];
    let toolsPrimary = [];
    if (isTools) {
      const usedTools = new Set(filterValues);
      toolsPrimary = FILTER_CONFIG.tools.primary.filter((tool) => usedTools.has(tool));
      toolsMore = FILTER_CONFIG.tools.more.filter((tool) => usedTools.has(tool));
    }

    html += `
      <div class="filter-section ${isCollapsed ? 'collapsed' : ''}" data-filter-type="${filterType}">
        <h3 class="filter-section-title">
          ${filterLabels[filterType]}
          <svg class="filter-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </h3>
        <div class="filter-options-wrapper">
          <div class="filter-options-container space-y-2">
    `;

    const visibleValues = isTools && !toolsShowAll ? toolsPrimary : filterValues;

    visibleValues.forEach(value => {
      const isActive = activeFilters[filterType] && activeFilters[filterType].includes(value);
      html += `
        <label class="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" 
                 class="filter-checkbox" 
                 data-filter-type="${filterType}" 
                 data-filter-value="${esc(value)}"
                 ${isActive ? 'checked' : ''}>
          <span class="text-[13px] text-neutral-600 group-hover:text-neutral-900 transition-colors">${esc(value)}</span>
        </label>
      `;
    });

    if (isTools && toolsMore.length > 0) {
      html += `
          <button type="button" id="toolsToggleBtn" class="text-[12px] text-neutral-500 hover:text-neutral-900 transition-colors underline mt-2">
            ${toolsShowAll ? t('lessTools') : t('moreTools')}
          </button>
      `;
    }

    html += `
          </div>
        </div>
      </div>
    `;
  });

  // Clear filters button
  const hasActiveFilters = Object.values(activeFilters).some(arr => arr && arr.length > 0);
  if (hasActiveFilters) {
    html += `
      <div class="pt-4 border-t border-neutral-200">
        <button id="clearFiltersBtn" class="text-[12px] text-neutral-500 hover:text-neutral-900 transition-colors underline">
          ${t('clearFilters')}
        </button>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

function renderHome() {
  document.body.classList.remove('about-page-active');
  document.body.classList.remove('detail-page-active');
  clearThumbRollers();
  const filteredItems = sortProjects(filterProjects());

  // Show filter menu on home page - respect filterVisible state
  const filterMenu = document.getElementById('desktopFilterMenu');
  const main = document.querySelector('main');

  if (filterMenu) {
    if (filterVisible && window.innerWidth >= 1024) {
      filterMenu.classList.remove('hidden');
    }
  }

  // Just update visibility state on main based on the actual state
  if (main) {
    if (filterVisible) {
      main.classList.add('filter-visible');
      main.classList.remove('filter-hidden');
    } else {
      main.classList.add('filter-hidden');
      main.classList.remove('filter-visible');
    }
  }

  // View toggle bar is now a fixed element in HTML, just update its state
  updateViewToggleBar();

  pane.innerHTML = gridHTML(filteredItems);
  initThumbRollers();
  updateMobileViewDropdown();
  updateMobileResultCount();
  updateDesktopResultCount();

  // Render filter menu
  if (filterMenuContent) {
    filterMenuContent.innerHTML = filterMenuHTML();
    setupFilterListeners();
    syncMobileFilterContent();
  }

  // Update filter visibility
  updateFilterVisibility();

  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects);
  toggleMobileHamburger(true);
  updateStaticText();

  // Reset scroll position on view change
  window.scrollTo({ top: 0, behavior: "smooth" });
  pane.scrollTo({ top: 0, behavior: "auto" }); // Pane reset instant

}

function renderAbout() {
  document.body.classList.add('about-page-active');
  document.body.classList.remove('detail-page-active');
  clearThumbRollers();
  // Use JS rendering instead of template
  pane.innerHTML = aboutHTML();

  // Hide filter menu on about page
  if (filterMenuContent) {
    filterMenuContent.innerHTML = '';
  }

  // Hide filter menu visually
  const filterMenu = document.getElementById('desktopFilterMenu');
  if (filterMenu) {
    filterMenu.classList.add('hidden');
  }

  // Adjust main layout for about page (no filter)
  const main = document.querySelector('main');
  if (main) {
    main.classList.remove('filter-visible', 'filter-hidden');
  }

  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects);
  toggleMobileHamburger(true);
  updateStaticText();
  updateMobileResultCount();

  if (document.body.classList.contains('mobile-mode')) {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  } else {
    requestAnimationFrame(() => pane.scrollTo({ top: 0, behavior: 'instant' }));
  }
}

function renderDetail(slug) {
  document.body.classList.remove('about-page-active');
  document.body.classList.add('detail-page-active');
  clearThumbRollers();
  const filterMenu = document.getElementById('desktopFilterMenu');
  if (filterMenu) {
    filterMenu.classList.add('hidden');
  }
  const main = document.querySelector('main');
  if (main) {
    main.classList.remove('filter-visible', 'filter-hidden');
  }
  updateViewToggleBar();
  const p = state.projects.find((x) => x.slug === slug);
  pane.innerHTML = p
    ? detailHTML(p)
    : `<p class="text-sm text-neutral-500">Not found.</p>`;

  // Do not render filter menu on detail page.

  // Update filter visibility
  updateFilterVisibility();

  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects, slug);
  toggleMobileHamburger(true);
  updateStaticText();
  updateMobileResultCount();


  // Scroll Reset
  pane.scrollTo({ top: 0, behavior: "auto" });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initThumbRollers() {
  const rollers = document.querySelectorAll('.thumb-roller');
  if (!rollers.length) return;
  rollers.forEach((roller) => {
    const track = roller.querySelector('.thumb-roller-track');
    const slides = roller.querySelectorAll('.thumb-roller-slide');
    if (!track || slides.length === 0) return;
    const prevBtn = roller.querySelector('[data-thumb-slider="prev"]');
    const nextBtn = roller.querySelector('[data-thumb-slider="next"]');
    let index = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let didSwipe = false;
    let suppressClick = false;
    let lockedAxis = null;
    const setActive = (nextIndex) => {
      index = (nextIndex + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
    };
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActive(index - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActive(index + 1);
      });
    }

    const handleTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      lastTouchX = touchStartX;
      didSwipe = false;
      suppressClick = false;
      lockedAxis = null;
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      if (!lockedAxis) {
        if (Math.abs(deltaX) > Math.abs(deltaY) + 4) {
          lockedAxis = 'x';
        } else if (Math.abs(deltaY) > Math.abs(deltaX) + 4) {
          lockedAxis = 'y';
        }
      }
      if (lockedAxis === 'x') {
        lastTouchX = touch.clientX;
        if (Math.abs(deltaX) > 12) {
          didSwipe = true;
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (lockedAxis !== 'x' || !didSwipe) {
        lockedAxis = null;
        return;
      }
      const swipeDistance = touchStartX - lastTouchX;
      if (Math.abs(swipeDistance) > 40) {
        if (swipeDistance > 0) {
          setActive(index + 1);
        } else {
          setActive(index - 1);
        }
        suppressClick = true;
      }
      didSwipe = false;
      lockedAxis = null;
    };

    roller.addEventListener('touchstart', handleTouchStart, { passive: true });
    roller.addEventListener('touchmove', handleTouchMove, { passive: false });
    roller.addEventListener('touchend', handleTouchEnd);
    roller.addEventListener('touchcancel', () => {
      didSwipe = false;
      suppressClick = false;
      lockedAxis = null;
    });
    roller.addEventListener('click', (e) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick = false;
      }
    });
  });
}


function updateStaticText() {
  // Header Links
  const aboutMeText = t('aboutLink');
  const aboutLinkEl = document.querySelector('a[href="#/about"].hidden.lg\\:block');
  if (aboutLinkEl) aboutLinkEl.textContent = aboutMeText;

  // Mobile About Link
  const mobileAboutLink = document.getElementById('mobileAboutLink');
  if (mobileAboutLink) mobileAboutLink.textContent = t('mobileAboutLink');
  const mobileFilterLabel = document.getElementById('mobileFilterLabel');
  if (mobileFilterLabel) mobileFilterLabel.textContent = t('filter');

  // Copyright
  const copyText = getText(state.site.copyright);
  (document.getElementById('desktopCopyright') || {}).textContent = copyText;
  (document.getElementById('mobileCopyright') || {}).textContent = copyText;

  // Language Label
  if (currentLangLabel) currentLangLabel.textContent = t('langLabel');
  const topBarLangLabel = document.getElementById('topBarLangLabel');
  if (topBarLangLabel) topBarLangLabel.textContent = t('langLabel');

  // Desktop Sort Labels
  const desktopSortLabel = document.getElementById('desktopSortLabel');
  const desktopSortFeatured = document.getElementById('desktopSortFeatured');
  const desktopSortLatest = document.getElementById('desktopSortLatest');
  const desktopSortOldest = document.getElementById('desktopSortOldest');
  if (desktopSortLabel) desktopSortLabel.textContent = t('sort');
  if (desktopSortFeatured) desktopSortFeatured.textContent = t('featured');
  if (desktopSortLatest) desktopSortLatest.textContent = t('latest');
  if (desktopSortOldest) desktopSortOldest.textContent = t('oldest');
  const mobileSortFeatured = document.getElementById('mobileSortFeatured');
  const mobileSortLatest = document.getElementById('mobileSortLatest');
  const mobileSortOldest = document.getElementById('mobileSortOldest');
  if (mobileSortFeatured) mobileSortFeatured.textContent = t('featured');
  if (mobileSortLatest) mobileSortLatest.textContent = t('latest');
  if (mobileSortOldest) mobileSortOldest.textContent = t('oldest');
  document.querySelectorAll('.mobile-view-option').forEach((option) => {
    const nextView = option.dataset.view;
    if (nextView === '1') {
      option.textContent = t('magazineView');
    } else if (nextView === '2') {
      option.textContent = t('thumbnailView');
    }
  });



  // Language Option Styles (Desktop)
  document.querySelectorAll('.lang-option').forEach(btn => {
    if (btn.dataset.lang === currentLang) {
      btn.classList.add('bg-neutral-50', 'font-semibold');
    } else {
      btn.classList.remove('bg-neutral-50', 'font-semibold');
    }
  });
  // Top Bar Language Option Styles
  document.querySelectorAll('.topbar-lang-option').forEach(btn => {
    if (btn.dataset.lang === currentLang) {
      btn.classList.add('bg-neutral-50', 'font-semibold', 'active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('bg-neutral-50', 'font-semibold', 'active');
      btn.setAttribute('aria-pressed', 'false');
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
  storage.set('site_lang', lang);
  document.documentElement.dataset.lang = lang;
  document.body.classList.toggle('lang-en', lang === 'en');
  document.body.classList.toggle('lang-ko', lang === 'ko');
  // document.documentElement.lang = lang; // optional
  router(); // re-render current view
  // Update filter toggle button text if on home page
  if (location.hash === '#/' || location.hash === '') {
    updateFilterToggleButton();
  }
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
if (brandLink && !brandLink.innerHTML.trim()) {
  brandLink.innerHTML = '<img src="assets/icons/1.png" alt="" class="w-[60px] h-[60px] lg:w-12 lg:h-12 inline-block mr-3 align-middle -mt-[24px] lg:mt-[-14px]" />Design Persona';
}

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

// Top Bar Social Links
(document.getElementById('topBarLinkedIn') || {}).href = s.linkedin || '#';

// Language Event Listeners
document.querySelectorAll('.lang-option').forEach(btn => {
  btn.addEventListener('click', (e) => {
    setLanguage(e.target.dataset.lang);
  });
});
document.querySelectorAll('.topbar-lang-option').forEach(btn => {
  btn.addEventListener('click', (e) => {
    setLanguage(e.target.dataset.lang);
  });
});
document.querySelectorAll('.lang-toggle').forEach(btn => {
  btn.addEventListener('click', (e) => {
    setLanguage(e.target.dataset.lang);
  });
});

if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects);

updateLayoutMode(); // Ensure mode is set on init

// Initialize filter visibility on page load
updateFilterVisibility();

const mobileAboutLink = document.getElementById('mobileAboutLink');
const desktopAboutLink = document.getElementById('desktopAboutLink');

menuBtn?.addEventListener('click', toggleMenu);
menuBackdrop?.addEventListener('click', closeMenu);
menuClose?.addEventListener('click', closeMenu);
mobileAboutLink?.addEventListener('click', closeMenu);

desktopMenuBtn?.addEventListener('click', toggleDesktopMenu);
desktopMenuBackdrop?.addEventListener('click', closeDesktopMenu);
desktopMenuClose?.addEventListener('click', closeDesktopMenu);
desktopAboutLink?.addEventListener('click', closeDesktopMenu);

if (mobileFilterOpenBtn && mobileFilterDrawer) {
  if (mobileFilterOpenBtn.dataset.bound !== 'true') {
    mobileFilterOpenBtn.dataset.bound = 'true';
    mobileFilterOpenBtn.addEventListener('click', () => {
      mobileFilterDrawer.classList.add('open');
    });
  }
}

if (mobileFilterClose && mobileFilterDrawer) {
  if (mobileFilterClose.dataset.bound !== 'true') {
    mobileFilterClose.dataset.bound = 'true';
    mobileFilterClose.addEventListener('click', () => {
      mobileFilterDrawer.classList.remove('open');
    });
  }
}

if (mobileFilterDrawer) {
  if (mobileFilterDrawer.dataset.bound !== 'true') {
    mobileFilterDrawer.dataset.bound = 'true';
    mobileFilterDrawer.addEventListener('click', (e) => {
      if (e.target === mobileFilterDrawer) {
        mobileFilterDrawer.classList.remove('open');
      }
    });
  }
}

const updateMobileViewDropdown = () => {
  if (!mobileViewDropdownLabel) return;
  const isMagazine = viewMode === '1';
  mobileViewDropdownLabel.textContent = isMagazine ? t('magazineView') : t('thumbnailView');
};

function setViewMode(nextMode, { render = true, closeMobileDropdown = false } = {}) {
  if (!nextMode || nextMode === viewMode) return;
  viewMode = nextMode;
  storage.set('view_mode', viewMode);
  updateViewToggleButtons();
  updateMobileViewDropdown();
  if (closeMobileDropdown && mobileViewDropdown) {
    mobileViewDropdown.classList.add('hidden');
    mobileViewDropdownBtn?.setAttribute('aria-expanded', 'false');
  }
  if (render && (location.hash === '#/' || location.hash === '')) {
    renderHome();
  }
}

const updateMobileResultCount = () => {
  if (!mobileResultCount) return;
  const count = filterProjects().length;
  mobileResultCount.textContent = currentLang === 'ko'
    ? `${count}${t('resultsSuffix')}`
    : `${count} ${t('resultsSuffix')}`;
};

const updateDesktopResultCount = () => {
  const desktopResultCount = document.getElementById('desktopResultCount');
  if (!desktopResultCount) return;
  const count = filterProjects().length;
  desktopResultCount.textContent = currentLang === 'ko'
    ? `${count}${t('resultsSuffix')}`
    : `${count} ${t('resultsSuffix')}`;
};

const desktopSortSelect = document.getElementById('desktopSortSelect');
if (desktopSortSelect) {
  desktopSortSelect.addEventListener('change', (e) => {
    const nextMode = e.target.value;
    if (!SORT_MODES.includes(nextMode) || sortMode === nextMode) return;
    sortMode = nextMode;
    storage.set('sort_mode', sortMode);
    if (location.hash === '#/' || location.hash === '') {
      renderHome();
    } else if (filterMenuContent) {
      filterMenuContent.innerHTML = filterMenuHTML();
      setupFilterListeners();
      syncMobileFilterContent();
    }
    updateViewToggleButtons();
  });
}

const mobileSortSelect = document.getElementById('mobileSortSelect');
if (mobileSortSelect) {
  mobileSortSelect.addEventListener('change', (e) => {
    const nextMode = e.target.value;
    if (!SORT_MODES.includes(nextMode) || sortMode === nextMode) return;
    sortMode = nextMode;
    storage.set('sort_mode', sortMode);
    if (location.hash === '#/' || location.hash === '') {
      renderHome();
    } else if (filterMenuContent) {
      filterMenuContent.innerHTML = filterMenuHTML();
      setupFilterListeners();
      syncMobileFilterContent();
    }
    updateViewToggleButtons();
  });
}

if (mobileViewDropdownBtn && mobileViewDropdown) {
  if (mobileViewDropdownBtn.dataset.bound !== 'true') {
    mobileViewDropdownBtn.dataset.bound = 'true';
    mobileViewDropdownBtn.addEventListener('click', () => {
      const isOpen = !mobileViewDropdown.classList.contains('hidden');
      mobileViewDropdown.classList.toggle('hidden', isOpen);
      mobileViewDropdownBtn.setAttribute('aria-expanded', (!isOpen).toString());
    });
  }
}

document.querySelectorAll('.mobile-view-option').forEach((option) => {
  if (option.dataset.bound === 'true') return;
  option.dataset.bound = 'true';
  option.addEventListener('click', () => {
    const nextView = option.dataset.view;
    if (!nextView) return;
    setViewMode(nextView, { closeMobileDropdown: true });
  });
});

window.addEventListener('click', (e) => {
  if (!mobileViewDropdown || !mobileViewDropdownBtn) return;
  if (mobileViewDropdown.contains(e.target) || mobileViewDropdownBtn.contains(e.target)) return;
  if (!mobileViewDropdown.classList.contains('hidden')) {
    mobileViewDropdown.classList.add('hidden');
    mobileViewDropdownBtn.setAttribute('aria-expanded', 'false');
  }
});

// Search functionality
const searchInput = document.getElementById('searchInput');
const mobileSearchBtn = document.getElementById('mobileSearchBtn');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const mobileSearchModal = document.getElementById('mobileSearchModal');
const mobileSearchClose = document.getElementById('mobileSearchClose');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (location.hash === '#/' || location.hash === '') {
      renderHome();
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (location.hash !== '#/' && location.hash !== '') {
        location.hash = '#/';
        setTimeout(() => renderHome(), 100);
      }
    }
  });
}

const openMobileSearch = () => {
  if (!mobileSearchModal || !mobileSearchInput) return;
  mobileSearchModal.classList.remove('hidden');
  setTimeout(() => mobileSearchInput.focus(), 0);
};

const closeMobileSearch = () => {
  if (!mobileSearchModal || !mobileSearchInput) return;
  mobileSearchModal.classList.add('hidden');
  mobileSearchInput.value = '';
  searchQuery = '';
  if (location.hash === '#/' || location.hash === '') renderHome();
};

if (mobileSearchBtn && mobileSearchInput) {
  mobileSearchBtn.addEventListener('click', () => {
    openMobileSearch();
  });

  mobileSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (location.hash === '#/' || location.hash === '') {
      renderHome();
    }
  });

  mobileSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (location.hash !== '#/' && location.hash !== '') {
        location.hash = '#/';
        setTimeout(() => renderHome(), 100);
      }
    }
  });
}

if (mobileSearchClose) {
  mobileSearchClose.addEventListener('click', closeMobileSearch);
}

if (mobileSearchModal) {
  mobileSearchModal.addEventListener('click', (e) => {
    if (e.target === mobileSearchModal) closeMobileSearch();
  });
}

window.addEventListener('hashchange', router);
// Resize listener merged into updateLayoutMode
router();
setupViewToggle(); // Initialize fixed view toggle bar event listeners

/** View Toggle Functionality */
function setupViewToggle() {
  const toggle1 = document.getElementById('viewToggle1');
  const toggle2 = document.getElementById('viewToggle2');
  const toggle3 = document.getElementById('viewToggle3');
  const toggle5 = document.getElementById('viewToggle5');
  const toggleFilterBtn = document.getElementById('toggleFilterBtn');

  if (toggle1) {
    toggle1.addEventListener('click', () => {
      setViewMode('1');
    });
  }

  if (toggle2) {
    toggle2.addEventListener('click', () => {
      setViewMode('2');
    });
  }

  if (toggle3) {
    toggle3.addEventListener('click', () => {
      setViewMode('3');
    });
  }

  if (toggle5) {
    toggle5.addEventListener('click', () => {
      setViewMode('5');
    });
  }

  if (toggleFilterBtn) {
    toggleFilterBtn.addEventListener('click', () => {
      filterVisible = !filterVisible;
      storage.set('filterVisible', filterVisible);
      updateFilterVisibility();
      updateFilterToggleButton();
    });
  }
}

function updateViewToggleButtons() {
  const toggle1 = document.getElementById('viewToggle1');
  const toggle2 = document.getElementById('viewToggle2');
  const toggle3 = document.getElementById('viewToggle3');
  const toggle5 = document.getElementById('viewToggle5');

  document.body.classList.remove('view-mode-1', 'view-mode-2', 'view-mode-3', 'view-mode-5');
  document.body.classList.add(`view-mode-${viewMode}`);

  [toggle1, toggle2, toggle3, toggle5].forEach(toggle => {
    if (toggle) {
      toggle.classList.remove('active');
    }
  });

  const activeToggle = document.getElementById(`viewToggle${viewMode}`);
  if (activeToggle) {
    activeToggle.classList.add('active');
  }
  const desktopSortSelect = document.getElementById('desktopSortSelect');
  if (desktopSortSelect) {
    desktopSortSelect.value = sortMode;
  }
  const mobileSortSelect = document.getElementById('mobileSortSelect');
  if (mobileSortSelect) {
    mobileSortSelect.value = sortMode;
  }
}

/** Update the fixed view toggle bar state */
function updateViewToggleBar() {
  // Update button states
  updateViewToggleButtons();
  updateFilterToggleButton();

  // Show/hide the bar based on page
  const viewToggleBar = document.getElementById('viewToggleBar');
  if (viewToggleBar) {
    if (document.body.classList.contains('about-page-active')) {
      viewToggleBar.classList.add('hidden');
      viewToggleBar.classList.remove('lg:flex');
    } else if (location.hash && location.hash !== '#/' && location.hash !== '') {
      viewToggleBar.classList.add('hidden');
      viewToggleBar.classList.remove('lg:flex');
    } else {
      viewToggleBar.classList.remove('hidden');
      viewToggleBar.classList.add('lg:flex');
    }
  }
}

function updateFilterToggleButton() {
  const filterToggleLabel = document.getElementById('filterToggleLabel');
  if (filterToggleLabel) {
    filterToggleLabel.textContent = filterVisible ? t('hideFilter') : t('showFilter');
  }
}

function updateFilterVisibility() {
  const filterMenu = document.getElementById('desktopFilterMenu');
  const main = document.querySelector('main');
  const isDetailPage = location.hash && location.hash !== '#/' && location.hash !== '' && location.hash !== '#/about';

  if (filterMenu) {
    if (isDetailPage) {
      filterMenu.classList.add('hidden');
      filterMenu.classList.remove('filter-visible', 'filter-hidden');
    } else
    if (filterVisible) {
      filterMenu.classList.remove('filter-hidden');
      filterMenu.classList.add('filter-visible');
      if (window.innerWidth >= 1024) {
        filterMenu.classList.remove('hidden');
      }
    } else {
      filterMenu.classList.remove('filter-visible');
      filterMenu.classList.add('filter-hidden');
    }
  }

  if (main) {
    if (isDetailPage) {
      main.classList.remove('filter-visible', 'filter-hidden');
    } else
    if (filterVisible) {
      main.classList.remove('filter-hidden');
      main.classList.add('filter-visible');
    } else {
      main.classList.remove('filter-visible');
      main.classList.add('filter-hidden');
    }
  }
}

/** Filter Functionality */
function setupFilterListeners() {
  // Collapsible sections
  document.querySelectorAll('.filter-section-title').forEach(title => {
    if (title.dataset.bound === 'true') return;
    title.dataset.bound = 'true';
    title.addEventListener('click', (e) => {
      const section = e.currentTarget.closest('.filter-section');
      const filterType = section.dataset.filterType;
      const isCollapsed = section.classList.toggle('collapsed');

      collapsedSections[filterType] = isCollapsed;
      storage.set('collapsedSections', JSON.stringify(collapsedSections));
    });
  });

  // Filter checkboxes
  document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
    if (checkbox.dataset.bound === 'true') return;
    checkbox.dataset.bound = 'true';
    checkbox.addEventListener('change', (e) => {
      const filterType = e.target.dataset.filterType;
      const filterValue = e.target.dataset.filterValue;
      const isChecked = e.target.checked;

      updateFilterSelection(filterType, filterValue, isChecked);
    });
  });

  // Sort options
  document.querySelectorAll('.sort-option').forEach(option => {
    if (option.dataset.bound === 'true') return;
    option.dataset.bound = 'true';
    option.addEventListener('click', (e) => {
      const nextMode = e.currentTarget.dataset.sort;
      if (!SORT_MODES.includes(nextMode) || sortMode === nextMode) return;
      sortMode = nextMode;
      storage.set('sort_mode', sortMode);

      if (location.hash === '#/' || location.hash === '') {
        renderHome();
      } else {
        if (filterMenuContent) {
          filterMenuContent.innerHTML = filterMenuHTML();
          setupFilterListeners();
        }
      }
    });
  });

  const toolsToggleBtn = document.getElementById('toolsToggleBtn');
  if (toolsToggleBtn) {
    if (toolsToggleBtn.dataset.bound === 'true') return;
    toolsToggleBtn.dataset.bound = 'true';
    toolsToggleBtn.addEventListener('click', () => {
      toolsShowAll = !toolsShowAll;
      storage.set('tools_show_all', toolsShowAll);
      if (filterMenuContent) {
        filterMenuContent.innerHTML = filterMenuHTML();
        setupFilterListeners();
        syncMobileFilterContent();
      }
    });
  }

  // Clear filters button
  const clearBtn = document.getElementById('clearFiltersBtn');
  if (clearBtn) {
    if (clearBtn.dataset.bound === 'true') return;
    clearBtn.dataset.bound = 'true';
    clearBtn.addEventListener('click', () => {
      activeFilters = {};
      storage.set('activeFilters', JSON.stringify(activeFilters));
      if (location.hash === '#/' || location.hash === '') {
        renderHome();
      } else {
        if (filterMenuContent) {
          filterMenuContent.innerHTML = filterMenuHTML();
          setupFilterListeners();
        }
      }
    });
  }
}

function updateFilterSelection(filterType, filterValue, isChecked) {
  if (!activeFilters[filterType]) {
    activeFilters[filterType] = [];
  }

  if (isChecked) {
    if (!activeFilters[filterType].includes(filterValue)) {
      activeFilters[filterType].push(filterValue);
    }
  } else {
    activeFilters[filterType] = activeFilters[filterType].filter(v => v !== filterValue);
  }

  storage.set('activeFilters', JSON.stringify(activeFilters));

  // Re-render home if we're on home page
  if (location.hash === '#/' || location.hash === '') {
    renderHome();
  } else {
    // Just update filter menu
    if (filterMenuContent) {
      filterMenuContent.innerHTML = filterMenuHTML();
      setupFilterListeners();
      syncMobileFilterContent();
    }
  }
}

function bindMobileFilterDelegation() {
  if (!mobileFilterContent || mobileFilterContent.dataset.bound === 'true') return;
  mobileFilterContent.dataset.bound = 'true';
  mobileFilterContent.addEventListener('change', (e) => {
    const target = e.target;
    if (!target.classList.contains('filter-checkbox')) return;
    updateFilterSelection(target.dataset.filterType, target.dataset.filterValue, target.checked);
  });
  mobileFilterContent.addEventListener('click', (e) => {
    const title = e.target.closest('.filter-section-title');
    if (title) {
      const section = title.closest('.filter-section');
      if (!section) return;
      const filterType = section.dataset.filterType;
      const isCollapsed = section.classList.toggle('collapsed');
      collapsedSections[filterType] = isCollapsed;
      storage.set('collapsedSections', JSON.stringify(collapsedSections));
      return;
    }

    const sortOption = e.target.closest('.sort-option');
    if (sortOption) {
      const nextMode = sortOption.dataset.sort;
      if (!SORT_MODES.includes(nextMode) || sortMode === nextMode) return;
      sortMode = nextMode;
      storage.set('sort_mode', sortMode);
      if (location.hash === '#/' || location.hash === '') {
        renderHome();
      } else if (filterMenuContent) {
        filterMenuContent.innerHTML = filterMenuHTML();
        setupFilterListeners();
        syncMobileFilterContent();
      }
      return;
    }

    const toolsToggle = e.target.closest('#toolsToggleBtn');
    if (toolsToggle) {
      toolsShowAll = !toolsShowAll;
      storage.set('tools_show_all', toolsShowAll);
      if (filterMenuContent) {
        filterMenuContent.innerHTML = filterMenuHTML();
        setupFilterListeners();
        syncMobileFilterContent();
      }
      return;
    }

    const clearBtn = e.target.closest('#clearFiltersBtn');
    if (clearBtn) {
      activeFilters = {};
      storage.set('activeFilters', JSON.stringify(activeFilters));
      if (location.hash === '#/' || location.hash === '') {
        renderHome();
      } else if (filterMenuContent) {
        filterMenuContent.innerHTML = filterMenuHTML();
        setupFilterListeners();
        syncMobileFilterContent();
      }
    }
  });
}

/** Desktop Menu Functionality */
function openDesktopMenu() {
  if (desktopMenuEl && desktopDrawerPanel) {
    desktopMenuEl.classList.remove('hidden');
    desktopDrawerPanel.classList.add('open');
    desktopMenuBtn?.setAttribute('aria-expanded', 'true');
    if (desktopProjectListNav) {
      desktopProjectListNav.innerHTML = listHTML(state.projects);
    }
  }
}

function toggleDesktopMenu() {
  const isOpen = desktopDrawerPanel?.classList.contains('open');
  if (isOpen) {
    closeDesktopMenu();
  } else {
    openDesktopMenu();
  }
}

function closeDesktopMenu() {
  if (!desktopDrawerPanel.classList.contains('open')) return;
  desktopDrawerPanel.classList.remove('open');
  desktopMenuBtn?.setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    if (!desktopDrawerPanel.classList.contains('open')) {
      if (desktopMenuEl) desktopMenuEl.classList.add('hidden');
    }
  }, 300);
}

/** Feature: Scroll to Top Button (Mobile) */
const scrollTopBtn = document.getElementById('scrollTopBtn');

let lastScrollY = window.scrollY;
const mainHeader = document.getElementById('mainHeader');
const topBar = document.getElementById('topBar');
const viewToggleBar = document.getElementById('viewToggleBar');

function getOuterHeight(el) {
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  const styles = window.getComputedStyle(el);
  const marginTop = parseFloat(styles.marginTop) || 0;
  const marginBottom = parseFloat(styles.marginBottom) || 0;
  return rect.height + marginTop + marginBottom;
}

function updateDesktopHeaderVars() {
  if (window.innerWidth < 1024) return;
  const headerStack = getOuterHeight(topBar) + getOuterHeight(mainHeader);
  const viewToggleHeight = getOuterHeight(viewToggleBar);
  document.documentElement.style.setProperty('--desktop-header-stack', `${Math.round(headerStack)}px`);
  if (viewToggleHeight) {
    document.documentElement.style.setProperty('--desktop-view-toggle', `${Math.round(viewToggleHeight)}px`);
  }
  const isCollapsed = document.body.classList.contains('header-collapsed');
  const offset = isCollapsed ? 0 : headerStack;
  document.documentElement.style.setProperty('--desktop-header-offset', `${Math.round(offset)}px`);
  const contentHeight = Math.max(0, window.innerHeight - offset - viewToggleHeight);
  document.documentElement.style.setProperty('--desktop-content-height', `${Math.round(contentHeight)}px`);
}

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
let isHeaderCollapsed = document.body.classList.contains('header-collapsed');

function updateHeader() {
  const currentY = window.scrollY;
  const isDesktop = window.innerWidth >= 1024;

  // Header collapse effect
  if (isDesktop) {
    if (isHeaderCollapsed) {
      document.body.classList.remove('header-collapsed');
      isHeaderCollapsed = false;
      updateDesktopHeaderVars();
    }
  } else {
    const shouldCollapse = currentY > 50;
    if (shouldCollapse !== isHeaderCollapsed) {
      document.body.classList.toggle('header-collapsed', shouldCollapse);
      isHeaderCollapsed = shouldCollapse;
      updateDesktopHeaderVars();
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

window.addEventListener('resize', () => {
  updateDesktopHeaderVars();
});

window.addEventListener('load', () => {
  updateDesktopHeaderVars();
});

// Add scroll listener

if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
function syncMobileFilterContent() {
  if (!filterMenuContent || !mobileFilterContent) return;
  if (!filterMenuContent.innerHTML) return;
  mobileFilterContent.innerHTML = filterMenuContent.innerHTML;
  setupFilterListeners();
  bindMobileFilterDelegation();
}
