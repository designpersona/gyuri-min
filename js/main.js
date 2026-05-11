/** Configuration & State */
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

function installContentProtection() {
  document.body.classList.add('content-protected');

  const allowEditable = (target) => {
    if (!target || !(target instanceof Element)) return false;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  };

  document.addEventListener('contextmenu', (event) => {
    if (!allowEditable(event.target)) event.preventDefault();
  }, { capture: true });

  document.addEventListener('dragstart', (event) => {
    event.preventDefault();
  }, { capture: true });

  document.addEventListener('selectstart', (event) => {
    if (!allowEditable(event.target)) event.preventDefault();
  }, { capture: true });

  document.addEventListener('copy', (event) => {
    if (!allowEditable(event.target)) event.preventDefault();
  }, { capture: true });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && ['a', 'c', 's', 'u', 'p'].includes(key) && !allowEditable(event.target)) {
      event.preventDefault();
    }
  }, { capture: true });
}

installContentProtection();

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
let currentLang = storage.get('site_lang', 'en');
let viewMode = storage.get('view_mode', '3'); // '1', '2', '3', or '5'
let searchQuery = '';
let activeFilters = safeJsonParse(storage.get('activeFilters', '{}'), {}); // { projectType: [], role: [], industry: [], client: [], tools: [] }
let sortMode = storage.get('sort_mode', 'latest'); // featured | latest | oldest
let archiveFocusMode = storage.get('archive_focus', '');
let archiveYearMode = storage.get('archive_year', '');
let toolsShowAll = storage.get('tools_show_all', 'false') === 'true';
let lastHomeScrollTop = 0;
window._lastSlug = '';
const DETAIL_BACK_ROUTE_KEY = 'detail_back_route_session';
let detailBackRouteFallback = '#/archive';
const normalizeDetailBackRoute = (route) => {
  if (route === '#/archive') return route;
  if (typeof route === 'string' && route.startsWith('#/category/')) {
    const categorySlug = route.replace('#/category/', '');
    if (CATEGORY_CONFIG.some((item) => item.slug === categorySlug)) return route;
  }
  return '#/archive';
};
const getRawDetailBackRoute = () => {
  try {
    return sessionStorage.getItem(DETAIL_BACK_ROUTE_KEY) || detailBackRouteFallback;
  } catch (err) {
    return detailBackRouteFallback;
  }
};
const setRawDetailBackRoute = (route) => {
  detailBackRouteFallback = route;
  try {
    sessionStorage.setItem(DETAIL_BACK_ROUTE_KEY, route);
  } catch (err) {
    // Ignore storage failures.
  }
};
const getDetailBackHref = () => normalizeDetailBackRoute(getRawDetailBackRoute());
const rememberDetailBackRoute = (slug) => {
  if (slug === 'archive') {
    setRawDetailBackRoute('#/archive');
    return;
  }
  if (typeof slug === 'string' && slug.startsWith('category/')) {
    setRawDetailBackRoute(`#/${slug}`);
  }
};
// Default filter visibility: Hidden on mobile (<1024), Visible on desktop
const filterVisibleStored = storage.get('filterVisible', null);
let filterVisible = filterVisibleStored === null
  ? (window.innerWidth >= 1024)
  : (filterVisibleStored !== 'false');

const ARCHIVE_DESKTOP_VIEW_MODE = '3';
function getEffectiveViewMode() {
  const isDesktopArchive = window.innerWidth >= 1024 && document.body.classList.contains('archive-page-active');
  return isDesktopArchive ? ARCHIVE_DESKTOP_VIEW_MODE : viewMode;
}

document.documentElement.dataset.lang = currentLang;
document.body.classList.toggle('lang-en', currentLang === 'en');
document.body.classList.toggle('lang-ko', currentLang === 'ko');

// Translations for static text
const I18N = {
  en: {
    aboutName: "Gyuri Min",
    aboutLink: "ABOUT ME",
    mobileAboutLink: "ABOUT ME",
    back: "Back to Archive",
    restricted: "COMING SOON",
    developing: "In Dev.",
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
    homeEyebrow: "Selected Portfolio",
    homeTitle: "Brand systems, content, and experiences built across digital and physical touchpoints.",
    homeDescription: "A curated archive of identity, packaging, campaign, web, and experience design projects across food, technology, public sector, and consumer brands.",
    homeChip1: "Brand Identity",
    homeChip2: "Package & Content",
    homeChip3: "Experience Design",
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
    archive: "Archive",
    categoryEyebrow: "Choose a focus",
    categoryTitle: "Explore work by design capability, not by chronology.",
    categoryDescription: "Start with a focused view, or open the full archive when you want to search and filter every project.",
    viewProjects: "View projects",
    openCategory: "Open category",
    startWith: "Start with",
    allProjects: "All Projects",
    featuredRoutes: "Suggested routes",
    routeBrand: "For brand/BX roles",
    routeBrandDesc: "Identity systems, guides, and visual consistency cases.",
    routeRetail: "For F&B / retail roles",
    routeRetailDesc: "Offline touchpoints, packaging, space, and campaign applications.",
    routeDigital: "For content / digital roles",
    routeDigitalDesc: "Web, e-catalogue, campaigns, and repeatable content systems.",
    lowerOverviewKicker: "Browse by intent",
    lowerOverviewTitle: "Choose a focused route or open the full archive.",
    lowerOverviewDesc: "Use the category paths when you already know the kind of work you want to inspect, or jump into the full project archive for broader search and filtering.",
    contactPrompt: "Need a custom PDF or project deck?",
    contactAction: "Contact by email",
    phil1: "Build the brand architecture.",
    phil2: "Shape the visual strategy.",
    phil3: "Design the experience.",
    phil4: "Connect through creativity.",
    statYears: "Years\nExperience",
    statProjects: "Selected\nProjects",
    statArchive: "Design\nArchive",
    sloganHTML: "Your desire,<br>built with<br><span class=\"highlight\">Design Persona.</span>",
    // About Page
    aboutRole: "Brand Designer",
    aboutTagline: "Brand Architect.<br>Visual Strategist.<br>Experience Builder.<br>Creative Connector.",
    expertise: "Expertise",
    experience: "Experience",
    recognition: "Recognition",
    education: "Education",
    credentials: "Activities & Credentials",
    contact: "Get in touch →",
    competencies: [
      "<span class=\"font-semibold\">Brand Strategy & Design:</span> End-to-end identity, packaging, and campaign execution",
      "<span class=\"font-semibold\">B2G & Public Sector:</span> RFP response, MOU negotiation, and funding acquisition",
      "<span class=\"font-semibold\">Global Market Launch:</span> B2B/B2C experience with distribution partnerships across Southeast Asia and India"
    ],
    experienceList: [
      { period: "2021.12 — 2025.06", company: "Korea Livestock Data", role: "Senior Manager, Brand Communication Team" },
      { period: "2018.07 — 2021.03", company: "Trade Expo", role: "Designer / Assistant Manager, Design Strategy Team" },
      { period: "2017.04 — 2017.12", company: "PIAS Intercosmex Korea", role: "Designer, Sales Department" },
      { period: "2015.09 — 2015.11", company: "The K Holdings", role: "Designer" }
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
    aboutName: "민 규리",
    aboutLink: "about me",
    mobileAboutLink: "about me",
    back: "목록으로",
    restricted: "준비 중",
    developing: "개발중",
    year: "연도",
    client: "고객사",
    role: "역할",
    projectType: "프로젝트 유형",
    industry: "산업",
    tools: "도구",
    clearFilters: "필터 초기화",
    hideFilter: "필터 숨기기",
    showFilter: "필터 보이기",
    filter: "필터",
    resultsSuffix: "개의 결과",
    homeEyebrow: "Selected Portfolio",
    homeTitle: "디지털과 오프라인 접점을 아우르는 브랜드 시스템, 콘텐츠, 경험 디자인.",
    homeDescription: "푸드, 테크, 공공, 소비재 브랜드를 중심으로 아이덴티티, 패키지, 캠페인, 웹, 경험 디자인 프로젝트를 정리한 포트폴리오입니다.",
    homeChip1: "Brand Identity",
    homeChip2: "Package & Content",
    homeChip3: "Experience Design",
    sort: "정렬",
    featured: "무작위",
    latest: "최근 순",
    oldest: "오래된 순",
    moreTools: "+더보기",
    lessTools: "간단히 보기",
    langLabel: "KO",
    viewLabel: "보기",
    magazineView: "매거진",
    thumbnailView: "썸네일",
    archive: "Archive",
    categoryEyebrow: "Choose a focus",
    categoryTitle: "연대순보다 역량별로 작업을 탐색할 수 있게 정리했습니다.",
    categoryDescription: "보고 싶은 디자인 영역을 먼저 선택하거나, 전체 아카이브에서 모든 프로젝트를 검색하고 필터링할 수 있습니다.",
    viewProjects: "프로젝트 보기",
    openCategory: "카테고리 열기",
    startWith: "바로 보기",
    allProjects: "전체 프로젝트",
    featuredRoutes: "추천 탐색 경로",
    routeBrand: "브랜드/BX 직무용",
    routeBrandDesc: "아이덴티티 시스템, 가이드, 시각 일관성 중심 사례.",
    routeRetail: "F&B / 리테일 직무용",
    routeRetailDesc: "오프라인 접점, 패키지, 공간, 캠페인 적용 사례.",
    routeDigital: "콘텐츠 / 디지털 직무용",
    routeDigitalDesc: "웹, e-카탈로그, 캠페인, 반복 가능한 콘텐츠 시스템.",
    lowerOverviewKicker: "Browse by intent",
    lowerOverviewTitle: "목적에 맞는 경로를 고르거나, 전체 아카이브를 열어보세요.",
    lowerOverviewDesc: "보고 싶은 작업 유형이 정해져 있다면 추천 경로로 빠르게 들어가고, 더 넓게 비교하고 싶다면 전체 프로젝트에서 검색과 필터를 사용할 수 있습니다.",
    contactPrompt: "맞춤 PDF나 프로젝트 덱이 필요하신가요?",
    contactAction: "메일로 문의하기",
    phil1: "브랜드 건축가가 되어보세요.",
    phil2: "디자인 전략으로 확장하세요.",
    phil3: "경험을 설계하고 실행하세요.",
    phil4: "창작의 즐거움을 느껴 보세요.",
    statYears: "Years\nExperience",
    statProjects: "Selected\nProjects",
    statArchive: "Design\nArchive",
    sloganHTML: "<span class=\"highlight\">디자인 페르소나,</span><br>당신만의 브랜드를<br>만들어 나가다.",
    // About Page
    aboutRole: "브랜드 디자이너",
    aboutTagline: "Brand Architect.<br>Visual Strategist.<br>Experience Builder.<br>Creative Connector.",
    expertise: "전문 분야",
    experience: "경력",
    recognition: "수상 경력",
    education: "학력",
    credentials: "사회활동 및 자격사항",
    contact: "연락처 →",
    competencies: [
      "<span class=\"font-semibold\">Brand Strategy & Design:</span> 아이덴티티, 패키지, 캠페인의 통합 설계와 실행",
      "<span class=\"font-semibold\">B2G & Public Sector:</span> 제안서, MOU, 지원사업 등 공공·B2G 프로젝트 대응",
      "<span class=\"font-semibold\">Global Market Launch:</span> 동남아·인도 유통 파트너십 기반의 B2B/B2C 시장 진입 경험"
    ],
    experienceList: [
      { period: "2021.12 — 2025.06", company: "한국축산데이터", role: "Brand Communication Team · Senior Manager" },
      { period: "2018.07 — 2021.03", company: "트레이드엑스포", role: "Design Strategy Team · Designer / Assistant Manager" },
      { period: "2017.04 — 2017.12", company: "피아스인터코스멕스한국", role: "Sales Department · Designer" },
      { period: "2015.09 — 2015.11", company: "The K Holdings", role: "Designer" }
    ],
    awards: [
      "한국엔젤투자협회장상",
      "에디슨 어워드 동상 <span class=\"text-neutral-500\">(AID, BX팀)</span>",
      "2012 디자인대전 제 41회 전국대학생 디자인 공모전",
      "제 46회 GG 전국디자인공모전"
    ],
    eduList: [
      "단국대학교 시각디자인과",
      "와이카토 대학교 패스웨이 컬리지"
    ],
    credList: [
      "강남구 벤처 스타트업 아카데미",
      "컴퓨터그래픽스운용기능사",
      "실기교사디자인교원자격증"
    ]
  }
};

const FILTER_CONFIG = {
  projectType: [
    "Art Direction",
    "Brand Design",
    "Character & Illustration",
    "Experience Design",
    "Graphic Design",
    "Package Design",
    "Product Design",
    "Web Design"
  ],
  industry: [
    "Agriculture",
    "Beauty",
    "Contents",
    "Distribution",
    "Food",
    "Goods",
    "Healthcare",
    "Public Sector",
    "Service",
    "Technology"
  ],
  client: [
    "27 Red Brick",
    "AID",
    "Café Terrabite",
    "Korea Stationery Industry Cooperative",
    "NongHyup (Chungnam)",
    "Personal Work",
    "Petit-ours",
    "Pias Corporation",
    "Shinan-gun",
    "Trade Expo"
  ],
  tools: {
    primary: ["Figma", "Illustrator", "Photoshop", "InDesign", "3ds Max", "KeyShot"],
    more: ["After Effects", "ChatGPT", "Dreamweaver", "Sora", "VS Code"]
  }
};

const TOOL_ALIASES = new Map([
  ["Sora(OpenAI)", "Sora"],
  ["Sora (OpenAI)", "Sora"],
  ["3D Max", "3ds Max"],
  ["Adobe Illustrator", "Illustrator"],
  ["Adobe Photoshop", "Photoshop"],
  ["Adobe InDesign", "InDesign"],
  ["Adobe Dreamweaver", "Dreamweaver"]
]);

const TOOL_FILTER_EXCLUDES = new Set([
  "Adobe",
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

const FILTER_KEYS = ["projectType", "industry", "client", "tools"];
const SORT_MODES = ["featured", "latest", "oldest"];
const ARCHIVE_FOCUS_VALUES = ["", "brand-systems", "fnb-retail", "packaging", "campaign-content", "digital-web", "illustration-character"];
const ARCHIVE_YEAR_VALUES = ["", "2026-2024", "2023-2021", "2020-2018", "older"];
const SLUG_ALIASES = {
  "Farmsplan-Swine-Feed": "farmsplan-swine-feed",
  "Farmsplan-Cattle-Feed": "farmsplan-cattle-feed",
  "Farmsplan-Chicken": "farmsplan-chicken",
  "News-Letter": "news-letter",
  "Chabssal-tteogkki": "chabssal-tteogkki"
};

const CATEGORY_CONFIG = [
  {
    slug: "brand-systems",
    accent: "#ffb000",
    title: "Brand Identity & Systems",
    shortTitle: "Brand\nSystems",
    description: "BX·BI, visual systems, brand guidelines, and identity refresh projects.",
    koDescription: "BX·BI, 시각 시스템, 브랜드 가이드, 아이덴티티 리프레시 중심 작업.",
    tags: ["BX·BI", "Guideline", "Identity"],
    slugs: ["aid-rebranding", "fp-brand-identity", "cafe-terrabite", "siso-fair-2020", "gm-portfolio"]
  },
  {
    slug: "fnb-retail",
    accent: "#FF6A2A",
    title: "F&B / Retail Experience",
    shortTitle: "F&B\nRetail",
    description: "Food, cafe, retail, and offline brand touchpoints that connect products with customers.",
    koDescription: "푸드, 카페, 리테일, 오프라인 접점에서 고객 경험을 만드는 작업.",
    tags: ["F&B", "Retail", "Space"],
    slugs: ["farmsplan-deli-cafe", "27-red-brick", "farmsplan-chicken", "record-of-sea-salt", "cafe-terrabite"]
  },
  {
    slug: "packaging",
    accent: "#1559D1",
    title: "Packaging & Product Line",
    shortTitle: "Package\nLine",
    description: "Package systems, product series, sales kits, and scalable visual assets.",
    koDescription: "패키지 시스템, 제품 시리즈, 세일즈 키트, 확장 가능한 브랜드 자산.",
    tags: ["Package", "Series", "Sales Kit"],
    slugs: ["farmsplan-cattle-feed", "farmsplan-swine-feed", "farmsplan-chicken", "record-of-sea-salt", "eye-makeup"]
  },
  {
    slug: "campaign-content",
    accent: "#BCA3FF",
    title: "Campaign & Content Design",
    shortTitle: "Campaign\nContent",
    description: "Key visuals, event branding, digital content, newsletters, and promotional assets.",
    koDescription: "키비주얼, 이벤트 브랜딩, 디지털 콘텐츠, 뉴스레터, 프로모션 디자인.",
    tags: ["Key Visual", "Event", "Content"],
    slugs: ["openfarm", "deep-dive-campaign", "news-letter", "fp-brand-film", "fresh-chungnam"]
  },
  {
    slug: "digital-web",
    accent: "#111111",
    title: "Digital / Web / Service",
    shortTitle: "Digital\nService",
    description: "Websites, e-catalogues, product concepts, and digital service interfaces.",
    koDescription: "웹사이트, e-카탈로그, 제품 콘셉트, 디지털 서비스 인터페이스.",
    tags: ["Web", "UI/UX", "Service"],
    slugs: ["gm-portfolio", "chatlog", "fresh-chungnam", "news-letter"]
  },
  {
    slug: "illustration-character",
    accent: "#FFE85B",
    title: "Illustration & Character",
    shortTitle: "Illustration\nCharacter",
    description: "Character systems, illustration assets, brand films, and goods-oriented visuals.",
    koDescription: "캐릭터 시스템, 일러스트 자산, 브랜드 필름, 굿즈형 비주얼 작업.",
    tags: ["Character", "Illustration", "Goods"],
    slugs: ["gullyjumper-universe", "chabssal-tteogkki", "fp-brand-film"]
  }
];

const getCategoryProjects = (category) => {
  const wanted = new Set(category.slugs);
  return state.projects.filter((project) => wanted.has(project.slug));
};

const PROJECT_TAG_OVERRIDES = {
  chatlog: ["Product", "UIUX", "Dev"],
  "gm-portfolio": ["Web", "UIUX", "Dev"],
  "farmsplan-deli-cafe": ["Brand", "Food", "Retail"],
  openfarm: ["Campaign", "Graphic", "Marketing"],
  "27-red-brick": ["Direction", "Food", "Brand"],
  "farmsplan-swine-feed": ["Package", "Food", "Brand"],
  "aid-rebranding": ["BXBI", "Tech", "Design System"],
  "cafe-terrabite": ["BXBI", "Logo", "Food"],
  "record-of-sea-salt": ["Package", "Food", "Brand"],
  "farmsplan-cattle-feed": ["Package", "Food", "Marketing"],
  "farmsplan-chicken": ["Package", "Food", "Consulting"],
  "fp-brand-film": ["Video", "Illustration", "Brand"],
  "fp-brand-identity": ["BXBI", "Tech", "Design System"],
  "gullyjumper-universe": ["Figure", "Character", "Brand"],
  "deep-dive-campaign": ["Campaign", "Graphic", "Marketing"],
  "fresh-chungnam": ["Digital", "Food", "UIUX"],
  "siso-fair-2020": ["BXBI", "Campaign", "Graphic"],
  "news-letter": ["Web", "Graphic", "Digital"],
  "chabssal-tteogkki": ["Figure", "Character", "Goods"],
  "eye-makeup": ["Beauty", "Graphic", "Package"]
};

const TAG_KEYWORD_RULES = [
  { tag: "BXBI", match: /\b(bx|bi|brand identity|identity|rebrand|visual system)\b/i },
  { tag: "Design System", match: /\b(system|guideline|consistency|ia)\b/i },
  { tag: "Logo", match: /\b(logo|symbol|identity)\b/i },
  { tag: "Icon", match: /\b(icon)\b/i },
  { tag: "Campaign", match: /\b(campaign|event|seminar|promotional|newsletter)\b/i },
  { tag: "Marketing", match: /\b(marketing|sales|launch|promotion|consumer|customer)\b/i },
  { tag: "Graphic", match: /\b(graphic|key visual|visual|content)\b/i },
  { tag: "Package", match: /\b(package|packaging|kit|goods|product line)\b/i },
  { tag: "Food", match: /\b(food|cafe|café|farm|livestock|chicken|swine|cattle|salt|rice cake)\b/i },
  { tag: "Beauty", match: /\b(beauty|makeup|cosmetic)\b/i },
  { tag: "Tech", match: /\b(ai|data|technology|tech)\b/i },
  { tag: "Digital", match: /\b(digital|e-catalog|online|service|product)\b/i },
  { tag: "Web", match: /\b(web|website|responsive|html|dreamweaver)\b/i },
  { tag: "UIUX", match: /\b(ui|ux|interface|responsive|ia|service)\b/i },
  { tag: "Dev", match: /\b(code|vs code|development)\b/i },
  { tag: "Video", match: /\b(video|film|youtube|mp4|sora)\b/i },
  { tag: "Photo", match: /\b(photo|photography|image)\b/i },
  { tag: "3D", match: /\b(3d|sora)\b/i },
  { tag: "Figure", match: /\b(figure|character|bunny|goods)\b/i },
  { tag: "Direction", match: /\b(art direction|direction|directing)\b/i },
  { tag: "Consulting", match: /\b(strategy|consulting|market entry|global market)\b/i },
  { tag: "Brand", match: /\b(brand|branding)\b/i }
];

function getProjectCategoryLabels(project) {
  const override = PROJECT_TAG_OVERRIDES[project.slug];
  if (override) return override.slice(0, 3);

  const searchable = [
    getText(project.title),
    getText(project.summary),
    getText(project.caption),
    getText(project.projectType),
    getText(project.industry),
    getText(project.tools)
  ].join(" ");

  const labels = TAG_KEYWORD_RULES
    .filter((rule) => rule.match.test(searchable))
    .map((rule) => rule.tag);

  if (labels.length) return [...new Set(labels)].slice(0, 3);

  const projectType = getText(project.projectType);
  return projectType
    ? projectType.split(",").map((item) => item.replace(/\s*Design$/i, "").trim()).filter(Boolean).slice(0, 3)
    : [];
}

const sanitizeFilters = (filters) => {
  const clean = {};
  const toolsAllowed = new Set([...FILTER_CONFIG.tools.primary, ...FILTER_CONFIG.tools.more]);
  const allowedValues = {
    projectType: new Set(FILTER_CONFIG.projectType),
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
  sortMode = "latest";
}

const esc = (s = '') => (s ?? '').toString();

let lazyVideoObserver = null;

function initLazyVideos(root = document) {
  const videos = root.querySelectorAll('video[data-src]:not([data-lazy-init])');
  if (!videos.length) return;

  const loadVideo = (video) => {
    if (!video || video.dataset.loaded === '1') return;
    const src = video.dataset.src;
    if (!src) return;
    video.src = src;
    video.dataset.loaded = '1';
    try {
      video.load();
      if (video.hasAttribute('autoplay')) {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => { });
      }
    } catch (e) {
      // Ignore media loading/play failures.
    }
  };

  if ('IntersectionObserver' in window) {
    if (lazyVideoObserver) lazyVideoObserver.disconnect();
    lazyVideoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const video = entry.target;
          loadVideo(video);
          lazyVideoObserver.unobserve(video);
        });
      },
      { rootMargin: '250px 0px' }
    );
    videos.forEach((video) => {
      video.dataset.lazyInit = '1';
      lazyVideoObserver.observe(video);
    });
  } else {
    videos.forEach((video) => {
      video.dataset.lazyInit = '1';
      loadVideo(video);
    });
  }
}

/** Helper: Get localized text */
const getText = (obj) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj;
  return obj[currentLang] || obj['en'] || '';
};

const t = (key) => I18N[currentLang][key] || I18N['en'][key] || key;


// Restoration of listHTML for mobile menu
const listHTML = (items, activeSlug = null) => {
  const sortedItems = [...items].sort((a, b) => {
    const yearA = (a.year || '').toString().slice(-4);
    const yearB = (b.year || '').toString().slice(-4);
    return yearB.localeCompare(yearA);
  });

  return `<ul class="menu-list text-[30px] leading-[1.2] font-medium">` +
  sortedItems
    .map(
      (p) => {
        let displayYear = p.year || '';
        if (p.slug === 'news-letter') displayYear = '2021';
        return `
        <li class="py-2 ${p.slug === activeSlug ? 'active' : ''}">
          <a class="block w-fit pb-1 menu-list-link" style="text-decoration:none" href="#/${p.slug}">
            ${esc(getText(p.title))}<sup class="menu-year">${displayYear}</sup>
          </a>
        </li>`;
      }
    )
    .join('') +
  `</ul>`;
};

const gridHTML = (items, extraCardHTML = '') => {
  // Determine grid classes based on view mode
  const isDesktop = window.innerWidth >= 1024;
  const activeViewMode = getEffectiveViewMode();
  let gridClasses;

  if (isDesktop) {
    if (activeViewMode === '1') {
      gridClasses = 'grid-cols-1 gap-y-12';
    } else if (activeViewMode === '2') {
      gridClasses = 'grid-cols-2 gap-[1px]';
    } else if (activeViewMode === '3') {
      gridClasses = 'grid-cols-4 gap-5';
    } else if (activeViewMode === '5') {
      gridClasses = 'grid-cols-5 gap-[1px]';
    } else {
      gridClasses = 'grid-cols-4 gap-5';
    }
  } else {
    // Mobile/Tablet: Respect 1-column if selected, else default to 2
    if (activeViewMode === '1') {
      gridClasses = 'grid-cols-1 gap-y-8';
    } else {
      gridClasses = 'grid-cols-2 gap-[1px]';
    }
  }

  const mobileArchiveGridClass = !isDesktop ? ` mobile-archive-grid mobile-view-${activeViewMode}` : '';

  return `<div class="grid ${gridClasses}${mobileArchiveGridClass}">` +
    items
      .map(
        (p) => {
          const thumb = esc(p.thumbnail);
          const isVideo = /\.(mp4|webm|mov)$/i.test(thumb);
          const isWideView = activeViewMode === '1'; // Now applies to mobile too
          const aspectClass = isWideView ? 'aspect-[16/9]' : 'aspect-square';
          const coverSrc = esc(p.cover || '');

          let mediaHtml;
          if (isWideView) {
            const slides = [];
            const addedSrcs = new Set();

            const addSlide = (src) => {
              if (!src || addedSrcs.has(src)) return;
              const isVid = /\.(mp4|webm|mov)$/i.test(src);
              const isImg = /\.(png|jpe?g|gif|webp)$/i.test(src);
              if (!isVid && !isImg) return;

              if (isVid) {
                slides.push(`
                  <div class="thumb-roller-slide">
                    <video class="w-full h-full object-cover" data-src="${src}" preload="none" autoplay muted loop playsinline></video>
                  </div>`);
              } else {
                const isGif = src.toLowerCase().endsWith('.gif');
                slides.push(`
                  <div class="thumb-roller-slide">
                    <img loading="lazy" decoding="async" ${isGif ? 'style="will-change: transform;"' : ''} class="w-full h-full object-cover" src="${src}" alt="${esc(getText(p.title))}" />
                  </div>`);
              }
              addedSrcs.add(src);
            };

            // Order: Cover -> Thumbnail -> Gallery
            addSlide(coverSrc);
            addSlide(thumb);
            (p.gallery || []).forEach(g => addSlide(esc(g.src)));

            if (slides.length > 1) {
              const slidesHtml = slides.join('');
              mediaHtml = `
              <div class="thumb-roller ${aspectClass} w-full" data-slide-count="${slides.length}">
                <button class="thumb-roller-btn thumb-roller-prev" type="button" aria-label="Previous thumbnail" data-thumb-slider="prev">‹</button>
                <div class="thumb-roller-track">
                  ${slidesHtml}
                </div>
                <button class="thumb-roller-btn thumb-roller-next" type="button" aria-label="Next thumbnail" data-thumb-slider="next">›</button>
              </div>`;
            } else if (slides.length === 1) {
              const src = Array.from(addedSrcs)[0];
              const isVid = /\.(mp4|webm|mov)$/i.test(src);
              if (isVid) {
                mediaHtml = `<video class="${aspectClass} w-full object-cover thumb-media" data-src="${src}" preload="none" autoplay muted loop playsinline></video>`;
              } else {
                const isGif = src.toLowerCase().endsWith('.gif');
                mediaHtml = `<img loading="lazy" decoding="async" ${isGif ? 'style="will-change: transform;"' : ''} class="${aspectClass} w-full object-cover thumb-media" src="${src}" alt="${esc(getText(p.title))} thumbnail" />`;
              }
            } else {
              // Fallback if somehow no slides
              mediaHtml = `<div class="${aspectClass} w-full bg-neutral-100"></div>`;
            }
          } else {
            // Static thumbnail (Grid view)
            const selectedThumb = thumb || coverSrc;
            const isVid = /\.(mp4|webm|mov)$/i.test(selectedThumb);
            if (isVid) {
              mediaHtml = `<video class="${aspectClass} w-full object-cover thumb-media" data-src="${selectedThumb}" preload="none" autoplay muted loop playsinline></video>`;
            } else {
              const isGif = selectedThumb.toLowerCase().endsWith('.gif');
              mediaHtml = `<img loading="lazy" decoding="async" ${isGif ? 'style="will-change: transform;"' : ''} class="${aspectClass} w-full object-cover thumb-media" src="${selectedThumb}" alt="${esc(getText(p.title))} thumbnail" />`;
            }
          }

          const title = esc(getText(p.title));
          const caption = esc(getText(p.caption));
          const summary = esc(getText(p.summary));
          const year = esc(getText(p.year));
          const projectType = esc(getText(p.projectType));
          const projectCategoryLabels = getProjectCategoryLabels(p);
          const projectCategoryPills = projectCategoryLabels
            .map((label) => `<span class="portfolio-hover-kicker">${esc(label)}</span>`)
            .join('');
          const hoverTitle = title.length > 22 ? title.split(/\s+/).join('<br>') : title;
          const showImageOverlay = isDesktop || isWideView;

          return `
        <article class="portfolio-card relative group ${isWideView ? 'portfolio-card-wide w-full max-w-full' : ''}">
          <a href="#/${p.slug}" class="block overflow-hidden relative thumb-frame portfolio-card-media" style="text-decoration:none">
            ${mediaHtml}
            ${showImageOverlay ? `
            <div class="portfolio-hover-info" aria-hidden="true">
              <div class="portfolio-hover-copy">
                ${projectCategoryPills ? `<div class="portfolio-hover-kickers">${projectCategoryPills}</div>` : ''}
                <h3 class="portfolio-card-title text-[15px] font-medium">${hoverTitle}</h3>
                ${summary ? `<p class="portfolio-card-summary text-[13px]">${summary}</p>` : `<p class="portfolio-card-summary text-[13px]">${caption}</p>`}
              </div>
              <div class="portfolio-hover-bottom">
                <div class="portfolio-card-meta flex items-center gap-2 text-[11px] uppercase tracking-[0.08em]">
                  ${year ? `<span>${year}</span>` : ''}
                </div>
                <span class="portfolio-view-product" aria-label="View project">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </div>
            </div>
            ` : ''}
            ${showImageOverlay && p.locked ? `<div class="absolute top-0 right-0 bg-black/10 text-white text-[10px] px-3 py-1 uppercase tracking-wider font-medium">${t('restricted')}</div>` : ''}
            ${showImageOverlay && p.developing ? `<div class="absolute top-0 right-0 bg-[#7c3aed] text-white text-[10px] px-3 py-1 uppercase tracking-wider font-medium">${t('developing')}</div>` : ''}
          </a>
          <a href="#/${p.slug}" class="portfolio-card-body portfolio-card-body-link" style="text-decoration:none; color:inherit" aria-label="${esc(currentLang === 'ko' ? `${title} 프로젝트 보기` : `View ${title} project`)}">
            <h3 class="portfolio-card-title">${title}</h3>
            <div class="portfolio-card-meta flex items-center gap-2 text-[11px] uppercase tracking-[0.08em]">
              ${year ? `<span>${year}</span>` : ''}
              ${year && projectType ? `<span aria-hidden="true">/</span>` : ''}
              ${projectType ? `<span>${projectType}</span>` : ''}
            </div>
          </a>
        </article>`;
        }
      )
      .join('') +
    extraCardHTML +
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
              <iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/${ytMatch[1]}" title="YouTube video player" frameborder="0" loading="lazy" referrerpolicy="no-referrer" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>`;
      } else if (/\.(mp4|webm|mov)$/i.test(src)) {
        media = `<video class="w-full" controls playsinline preload="metadata">
              <source src="${src}" type="video/mp4">
            </video>`;
      } else {
        media = `<img loading="lazy" decoding="async" class="w-full" src="${src}" alt="${esc(getText(p.title))} image" />`;
      }

      return `
        <figure class="detail-gallery-figure">
          ${media}
          ${caption && caption.trim() !== '' ? `<figcaption class="detail-gallery-caption">${esc(caption)}</figcaption>` : ``}
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
  const tools = getText(p.tools);
  const description = getText(p.description);

  const heroSrc = esc(p.cover);
  const isHeroVideo = /\.(mp4|webm|mov)$/i.test(heroSrc);
  let heroMedia;
  if (isHeroVideo) {
    heroMedia = `<video class="w-full" src="${heroSrc}" autoplay muted loop playsinline></video>`;
  } else {
    heroMedia = `<img class="w-full" src="${heroSrc}" alt="${esc(getText(p.title))} hero" />`;
  }

  const infoSection = `
    <aside class="detail-info-panel">
      <div class="flex flex-col gap-y-10">
        <div class="detail-meta-grid">
          ${year ? `<div class="detail-meta-item"><span class="detail-label">${t('year')}</span><div class="detail-value">${esc(year)}</div></div>` : ''}
          ${client ? `<div class="detail-meta-item"><span class="detail-label">${t('client')}</span><div class="detail-value">${esc(clientDisplay)}</div></div>` : ''}
          ${role ? `<div class="detail-meta-item"><span class="detail-label">${t('role')}</span><div class="detail-value">${esc(role)}</div></div>` : ''}
          ${industry ? `<div class="detail-meta-item"><span class="detail-label">${t('industry')}</span><div class="detail-value">${esc(industry)}</div></div>` : ''}
          ${tools && p.slug !== 'gm-portfolio' && p.slug !== 'chatlog' ? `<div class="detail-meta-item"><span class="detail-label">${t('tools')}</span><div class="detail-value">${esc(tools)}</div></div>` : ''}
        </div>

        <div class="border-t border-neutral-100"></div>

        ${description
      ? `<div class="detail-description text-[15.5px] leading-[1.8] text-neutral-800">${Array.isArray(description) ? description.join('<br>') : esc(description)}</div>`
      : ''
    }
        
        ${hasLinks
      ? `<div class="space-y-4 pt-4 border-t border-neutral-100">
            ${p.links.map(link => `<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer" class="detail-link group flex items-center gap-2">
              <span class="underline underline-offset-4 decoration-neutral-300 group-hover:decoration-neutral-900 transition-colors">${esc(link.label || link.url)}</span>
              <svg class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </a>`).join('')}
          </div>`
      : ''
    }
      </div>
    </aside>
  `;

  return `
    <div class="detail-wrapper">
      <div class="detail-header-row flex items-center justify-between mb-8 md:mb-12">
        <a href="${getDetailBackHref()}" class="back-button-link group flex items-center gap-2 text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors">
          <svg class="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          <span>${t('back')}</span>
        </a>
        <div class="text-[13px] text-neutral-400 font-medium tracking-tight">${esc(getText(p.caption))}</div>
      </div>

      <div class="detail-split-container">
        <!-- Left Column: Gallery Content -->
        <div class="detail-gallery-column">
          <article class="detail-intro mb-12">
            <h1 class="text-[36px] md:text-[52px] font-bold tracking-tight leading-[1.1] text-neutral-900">${esc(getText(p.title))}</h1>
            ${p.summary ? `<p class="mt-6 text-[18px] md:text-[20px] leading-[1.6] text-neutral-500 font-normal max-w-2xl">${esc(getText(p.summary))}</p>` : ``}
          </article>

          <div class="detail-media-stack space-y-12">
            <figure class="detail-hero-media">
              ${heroMedia}
            </figure>
            <div class="detail-gallery-items space-y-12">
              ${gallery}
            </div>
          </div>
        </div>

        <!-- Right Column: Project Info Panel -->
        ${infoSection}
      </div>
    </div>
  `;
}

function aboutHTML() {
  const competencies = t('competencies').map(c => `<div class="about-competency-card">${c}</div>`).join('');
  const awardsData = I18N[currentLang].awards;
  const awardsYears = ['2025', '2023', '2012', '2010'];
  const awardsHTML = awardsData.map((a, i) => `
    <p>${a} <span class="about-log-year">${awardsYears[i]}</span></p>
  `).join('');

  const eduData = I18N[currentLang].eduList;
  const eduHTML = eduData.map(e => `<p>${e}</p>`).join('');

  const credData = I18N[currentLang].credList;
  const credYears = ['2025', '2021', '2013'];
  const credHTML = credData.map((c, i) => `
    <p>${c} <span class="about-log-year">${credYears[i]}</span></p>
  `).join('');

  return `
    <article class="about-page-content max-w-none">
      <section class="about-hero">
        <div class="about-identity flex flex-row items-start gap-5 md:h-full">
          <img src="assets/icons/DesignPersona.png" alt="Design Persona" class="about-mark hidden md:block h-full w-auto object-contain max-h-[180px]" />
          <div>
            <h1 class="about-name">${t('aboutName')}</h1>
            <h2 class="about-role">${t('aboutRole')}</h2>
          </div>
        </div>
        <div class="about-summary">
          <p class="about-tagline">${t('aboutTagline')}</p>
        </div>
      </section>

      <section class="about-section">
        <h2>${t('expertise')}</h2>
        <div class="about-competency-grid">
          ${competencies}
        </div>
      </section>

      <div class="about-log-grid">
        <section class="about-log-section">
          <h2>${t('recognition')}</h2>
          <div class="about-log-list">
            ${awardsHTML}
          </div>
        </section>

        <section class="about-log-section">
          <h2>${t('education')}</h2>
          <div class="about-log-list">
            ${eduHTML}
          </div>
        </section>

        <section class="about-log-section">
          <h2>${t('credentials')}</h2>
          <div class="about-log-list">
            ${credHTML}
          </div>
        </section>
      </div>

      <section class="about-contact">
        <span>${t('contact')}</span>
        <a href="mailto:designpersona.kr@gmail.com">designpersona.kr@gmail.com</a>
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
const mobileViewSelect = document.getElementById('mobileViewSelect');
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
    const desktopDefaultSet = storage.get('view_mode_v2_initialized', '0') === '1';
    if (!desktopDefaultSet) {
      storage.set('view_mode_v2_initialized', '1');
      if (viewMode !== '3') {
        setViewMode('3');
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
    setViewMode('3');
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

  if (menuEl) menuEl.classList.remove('hidden');
  // Small delay to ensure transition works after removing 'hidden'
  requestAnimationFrame(() => {
    if (drawerPanel) drawerPanel.classList.add('open');
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
  if (!drawerPanel) {
    if (menuEl) menuEl.classList.add('hidden');
    menuBtn?.setAttribute('aria-expanded', 'false');
    return;
  }

  if (!drawerPanel.classList.contains('open')) {
    if (menuEl) menuEl.classList.add('hidden');
    menuBtn?.setAttribute('aria-expanded', 'false');
    return;
  }

  drawerPanel.classList.remove('open');
  menuBtn?.setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    if (!drawerPanel.classList.contains('open')) {
      if (menuEl) menuEl.classList.add('hidden');
    }
  }, 300); // matching transition .25s + buffer
}

function closeTransientOverlays() {
  if (drawerPanel) drawerPanel.classList.remove('open');
  if (menuEl) menuEl.classList.add('hidden');
  menuBtn?.setAttribute('aria-expanded', 'false');

  if (desktopDrawerPanel) desktopDrawerPanel.classList.remove('open');
  if (desktopMenuEl) desktopMenuEl.classList.add('hidden');
  desktopMenuBtn?.setAttribute('aria-expanded', 'false');

  if (mobileFilterDrawer) mobileFilterDrawer.classList.remove('open');

  const activeSearchModal = document.getElementById('mobileSearchModal');
  const activeSearchInput = document.getElementById('mobileSearchInput');
  if (activeSearchModal) {
    activeSearchModal.classList.add('hidden');
    activeSearchModal.style.setProperty('display', 'none', 'important');
    activeSearchModal.style.setProperty('visibility', 'hidden', 'important');
    activeSearchModal.style.setProperty('opacity', '0', 'important');
    activeSearchModal.style.setProperty('pointer-events', 'none', 'important');
  }
  if (activeSearchInput) activeSearchInput.value = '';
  searchQuery = '';

  const activeGuide = document.getElementById('personaGuide');
  const activeGuideBtn = document.getElementById('personaGuideBtn');
  const activeGuidePanel = document.getElementById('personaGuidePanel');
  if (activeGuidePanel) activeGuidePanel.classList.add('hidden');
  if (activeGuideBtn) activeGuideBtn.setAttribute('aria-expanded', 'false');
  if (activeGuide) activeGuide.classList.remove('visible');
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
    if (p.projectType) {
      const types = getText(p.projectType).split(',');
      types.forEach(t => options.projectType.add(t.trim()));
    }

    if (p.client) {
      const clients = getText(p.client).split(',');
      clients.forEach(c => options.client.add(c.trim()));
    }

    if (p.industry) {
      const industries = getText(p.industry).split(',');
      industries.forEach(i => options.industry.add(i.trim()));
    }

    getProjectTools(p).forEach((tool) => options.tools.add(tool));
  });

  const filterByUsed = (list, usedSet) => list.filter((value) => usedSet.has(value));
  const toolsAllowed = [...FILTER_CONFIG.tools.primary, ...FILTER_CONFIG.tools.more];

  return {
    projectType: filterByUsed(FILTER_CONFIG.projectType, options.projectType),
    client: filterByUsed(FILTER_CONFIG.client, options.client),
    industry: filterByUsed(FILTER_CONFIG.industry, options.industry),
    tools: filterByUsed(toolsAllowed, options.tools)
  };
}

// Filter projects based on active filters and search query
function filterProjects() {
  let filtered = state.projects;

  // Apply search filter first
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => {
      const text = [
        getText(p.title),
        getText(p.summary),
        getText(p.description),
        getText(p.client),
        p.tools,
        p.year
      ].join(' ').toLowerCase();
      return text.includes(q);
    });
  }

  // Apply category filters
  const activeFilters = safeJsonParse(storage.get('activeFilters', '{}'), {});

  if (Object.keys(activeFilters).length === 0 ||
    Object.values(activeFilters).every(arr => !arr || arr.length === 0)) {
    return filtered;
  }

  return filtered.filter(p => {
    // Client filter
    if (activeFilters.client && activeFilters.client.length > 0) {
      const pClients = p.client ? getText(p.client).split(',').map(t => t.trim()) : [];
      const hasMatch = pClients.some(c => activeFilters.client.includes(c));
      if (!hasMatch) return false;
    }

    // Project Type filter (supports multiple values)
    if (activeFilters.projectType && activeFilters.projectType.length > 0) {
      const pTypes = p.projectType ? getText(p.projectType).split(',').map(t => t.trim()) : [];
      const hasMatch = pTypes.some(pt => activeFilters.projectType.includes(pt));
      if (!hasMatch) return false;
    }

    // Industry filter
    if (activeFilters.industry && activeFilters.industry.length > 0) {
      const pIndustries = p.industry ? getText(p.industry).split(',').map(t => t.trim()) : [];
      const hasMatch = pIndustries.some(i => activeFilters.industry.includes(i));
      if (!hasMatch) return false;
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

function filterArchiveYear(projects) {
  if (!ARCHIVE_YEAR_VALUES.includes(archiveYearMode) || !archiveYearMode) return projects;

  return projects.filter((project) => {
    const projectRange = getYearRange(getText(project.year));
    if (!projectRange.end) return false;
    if (archiveYearMode === 'older') return projectRange.end <= 2017;
    const [filterStart, filterEnd] = archiveYearMode.split('-').map((value) => Number(value));
    if (!Number.isFinite(filterStart) || !Number.isFinite(filterEnd)) return false;
    return projectRange.start <= filterStart && projectRange.end >= filterEnd;
  });
}

function filterArchiveFocus(projects) {
  if (!ARCHIVE_FOCUS_VALUES.includes(archiveFocusMode) || !archiveFocusMode) return projects;

  const category = CATEGORY_CONFIG.find((item) => item.slug === archiveFocusMode);
  if (!category) return projects;

  const wanted = new Set(category.slugs);
  return projects.filter((project) => wanted.has(project.slug));
}

function getArchiveFilteredProjects() {
  return filterArchiveYear(filterArchiveFocus(filterProjects()));
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
    // Stable shuffle: maintain the same random order within a session
    if (!window._stableShuffleOrder) {
      window._stableShuffleOrder = shuffleArray(items.map((_, i) => i));
    }
    // Return items in the pre-determined stable random order
    const shuffled = [];
    window._stableShuffleOrder.forEach(idx => {
      if (items[idx]) shuffled.push(items[idx]);
    });
    // Add any remaining items (if list changed) or handle filtered subsets
    const currentSlugs = new Set(shuffled.map(p => p.slug));
    items.forEach(p => {
      if (!currentSlugs.has(p.slug)) shuffled.push(p);
    });
    // Finally, filter only the items that are actually in the current 'items' list
    const incomingSlugs = new Set(items.map(p => p.slug));
    return shuffled.filter(p => incomingSlugs.has(p.slug));
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
    projectType: t('projectType'),
    industry: t('industry'),
    tools: t('tools')
  };

  let html = '<div class="filter-menu-sections">';

  ['projectType', 'industry', 'client', 'tools'].forEach(filterType => {
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

function homeIntroHTML(resultCount) {
  return `
    <section class="home-intro" aria-label="Portfolio introduction">
      <div class="home-intro-copy">
        <p class="home-eyebrow">${t('homeEyebrow')}</p>
        <h1>${t('homeTitle')}</h1>
        <p class="home-description">${t('homeDescription')}</p>
      </div>
      <div class="home-intro-meta" aria-label="Portfolio focus">
        <span>${t('homeChip1')}</span>
        <span>${t('homeChip2')}</span>
        <span>${t('homeChip3')}</span>
        <span>${resultCount} ${t('resultsSuffix')}</span>
      </div>
    </section>
  `;
}

function hideArchiveControls() {
  const filterMenu = document.getElementById('desktopFilterMenu');
  const viewToggleBar = document.getElementById('viewToggleBar');
  const mobileTopBar = document.getElementById('mobileTopBar');
  const main = document.querySelector('main');
  if (filterMenu) {
    filterMenu.classList.add('hidden', 'filter-hidden');
    filterMenu.classList.remove('filter-visible');
  }
  if (viewToggleBar) viewToggleBar.classList.add('hidden');
  if (mobileTopBar) mobileTopBar.classList.add('hidden');
  if (main) {
    main.classList.add('filter-hidden');
    main.classList.remove('filter-visible');
  }
  if (filterMenuContent) filterMenuContent.innerHTML = '';
}

function setRoutePendingState(slug) {
  const isNonLandingRoute = Boolean(slug && slug !== '/');
  document.documentElement.classList.toggle('route-nonlanding-pending', isNonLandingRoute);
}

function clearRoutePendingState() {
  document.documentElement.classList.remove('route-nonlanding-pending');
  document.documentElement.classList.add('app-routed');
}

function setMobileTopBarMode(mode) {
  const mobileTopBar = document.getElementById('mobileTopBar');
  if (!mobileTopBar) return;

  const forceHide = (el) => {
    if (!el) return;
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute('hidden', '');
    el.setAttribute('aria-hidden', 'true');
  };
  const forceShow = (el) => {
    if (!el) return;
    el.style.removeProperty('display');
    el.removeAttribute('hidden');
    el.removeAttribute('aria-hidden');
  };
  const makePlainControl = (el) => {
    if (!el) return;
    el.style.setProperty('border', '0', 'important');
    el.style.setProperty('background', 'transparent', 'important');
    el.style.setProperty('box-shadow', 'none', 'important');
    el.style.setProperty('outline', '0', 'important');
  };

  const resultCount = document.getElementById('mobileResultCount');
  const filterButton = document.getElementById('mobileFilterOpenBtn');
  const legacySort = document.getElementById('mobileSortSelect');
  const yearSelect = document.getElementById('mobileArchiveYearSelect');
  const yearCell = yearSelect?.closest('.catalog-filter-cell');
  const resetButton = document.getElementById('mobileArchiveResetFiltersBtn');
  const sortCell = document.getElementById('mobileArchiveSortSelect')?.closest('.catalog-filter-cell');
  const focusCell = document.getElementById('mobileArchiveFocusSelect')?.closest('.catalog-filter-cell');
  const viewActions = mobileTopBar.querySelector('.ml-auto');

  if (mode !== 'archive') {
    mobileTopBar.classList.add('hidden');
    forceHide(mobileTopBar);
    return;
  }

  forceShow(mobileTopBar);
  mobileTopBar.classList.remove('hidden');
  mobileTopBar.style.setProperty('background', '#fff', 'important');
  mobileTopBar.style.setProperty('border-top', '1px solid #111', 'important');
  mobileTopBar.style.setProperty('border-bottom', '1px solid #111', 'important');
  mobileTopBar.style.setProperty('box-shadow', '0 1px 0 rgba(17, 17, 17, 0.08)', 'important');

  [sortCell, focusCell, viewActions].forEach(forceShow);
  [resultCount, filterButton, legacySort, yearSelect, yearCell, resetButton].forEach(forceHide);
  [sortCell, focusCell, document.getElementById('mobileArchiveSortSelect'), document.getElementById('mobileArchiveFocusSelect')].forEach(makePlainControl);
  mobileTopBar.querySelectorAll('.view-toggle-btn').forEach(makePlainControl);
}

function categoryCardHTML(category) {
  const projects = getCategoryProjects(category);
  const featured = projects.slice(0, 2);
  const description = currentLang === 'ko' ? category.koDescription : category.description;
  const index = String(CATEGORY_CONFIG.findIndex((item) => item.slug === category.slug) + 1).padStart(2, '0');
  const shortTitle = esc(category.shortTitle || category.title).replace(/\\n/g, '<br>');
  return `
    <article class="category-panel" style="--category-accent:${esc(category.accent || '#FF5A00')}">
      <a href="#/category/${category.slug}" class="category-panel-main" style="text-decoration:none" aria-label="${esc(category.title)}">
        <div class="category-panel-top">
          <span class="category-index">${index}</span>
          <span class="category-count">${projects.length} ${t('resultsSuffix')}</span>
        </div>
        <h2>${shortTitle}</h2>
        <p>${esc(description)}</p>
        <div class="category-tags">
          ${(category.tags || []).map((tag) => `<span>${esc(tag)}</span>`).join('')}
        </div>
      </a>
      <div class="category-panel-actions">
        <a href="#/category/${category.slug}" style="text-decoration:none">${t('openCategory')} <span>→</span></a>
        ${featured.map((project) => `<a href="#/${project.slug}" style="text-decoration:none"><small>${t('startWith')}</small>${esc(getText(project.title))}</a>`).join('')}
      </div>
    </article>
  `;
}

function dashboardCategoryCellHTML(category) {
  const projects = getCategoryProjects(category);
  const index = String(CATEGORY_CONFIG.findIndex((item) => item.slug === category.slug) + 1).padStart(2, '0');
  const preferredDashboardImages = {
    'brand-systems': 'fp-brand-identity',
    'fnb-retail': 'farmsplan-deli-cafe',
    'packaging': 'record-of-sea-salt',
    'campaign-content': 'news-letter',
    'digital-web': 'gm-portfolio',
    'illustration-character': 'gullyjumper-universe'
  };
  const preferredSlug = preferredDashboardImages[category.slug];
  const featured = (preferredSlug ? state.projects.find((project) => project.slug === preferredSlug) : null) || projects[0] || {};
  const image = esc(featured.thumbnail || featured.cover || '');
  const description = currentLang === 'ko' ? category.koDescription : category.description;
  const title = esc(category.shortTitle || category.title).replace(/\\n/g, '<br>');
  return `
    <a href="#/category/${category.slug}" class="dash-cell dash-category-cell" style="--category-accent:${esc(category.accent || '#FF5A00')}; text-decoration:none" aria-label="${esc(category.title)}">
      ${image ? `<img class="dash-card-image" src="${image}" alt="" loading="lazy" decoding="async" />` : ''}
      <span class="dash-details" aria-label="${currentLang === 'ko' ? '자세히 보기' : 'View details'}">
        <span class="dash-details-number" aria-hidden="true">${index}</span>
        <svg class="dash-details-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="6" y1="18" x2="18" y2="6"></line>
          <polyline points="9 6 18 6 18 15"></polyline>
        </svg>
      </span>
      <div class="dash-card-copy">
        <div class="dash-title-row">
          <strong>${title}</strong>
        </div>
        <p>${esc(description)}</p>
      </div>
    </a>
  `;
}

const DESIGN_PERSONA_MARK_SVG = '<svg class="design-persona-mark" viewBox="0 0 50 50" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.35 0h9.15c4.15 0 7.2 3.12 7.72 7.48H25c-7.1 0-12.15-2.78-12.65-7.48Z"></path><circle cx="25" cy="30.85" r="16.9" fill="none" stroke="currentColor" stroke-width="4.15"></circle></svg>';

function landingFeaturedProjectHTML() {
  const project = state.projects.find((item) => item.slug === 'chatlog');
  if (!project) return '';

  const title = esc(getText(project.title));
  const summary = esc(getText(project.summary));
  const image = esc(project.thumbnail || project.cover || '');
  const chatbookDesktopFrames = [1, 2, 3].map((index) => `assets/projects/ChatBook/desktop/${index}.webp`);
  const statusLabel = currentLang === 'ko' ? 'Coming Soon' : 'Coming Soon';

  return `
    <section id="landingFeaturedProject" class="landing-featured-project snap-page" aria-label="${title}">
      <div class="landing-featured-media" aria-label="${title}">
        ${image ? `<img class="landing-featured-fallback-image" src="${image}" alt="${title}" loading="lazy" decoding="async" />` : ''}
        <div class="landing-featured-chatbook-mockup" data-chatbook-slide="0" aria-label="${title} preview">
          <div class="chatbook-screen-window">
            <div class="chatbook-screen-track">
              ${chatbookDesktopFrames.map((src) => `<img src="${src}" alt="" loading="lazy" decoding="async" />`).join('')}
            </div>
          </div>
          <img class="chatbook-device-frame" src="assets/projects/ChatBook/desktop/0.webp" alt="" loading="lazy" decoding="async" />
        </div>
      </div>
      <div class="landing-featured-copy">
        <div class="landing-featured-nav" aria-label="${currentLang === 'ko' ? '섹션 이동' : 'Section navigation'}">
          <button type="button" aria-label="${currentLang === 'ko' ? '이전 블록' : 'Previous section'}" data-landing-action="landing-start">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 15 12 9 18 15"></polyline>
            </svg>
          </button>
          <button type="button" aria-label="${currentLang === 'ko' ? '다음 블록' : 'Next section'}" data-landing-action="philosophy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
        <div class="landing-featured-main">
          <div class="landing-featured-tags" aria-label="Project categories">
            <span>${statusLabel}</span>
          </div>
          <h2 class="landing-featured-logo-title">
            <img src="assets/logo/ChatBook_Symbol.png" alt="${title}" loading="lazy" decoding="async" />
          </h2>
          <p>${summary}</p>
          <div class="landing-featured-downloads" aria-label="${currentLang === 'ko' ? '다운로드 옵션' : 'Download options'}">
            <span aria-disabled="true">macOS</span>
            <span aria-disabled="true">Windows</span>
            <span aria-disabled="true">Linux</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

function landingHTML() {
  return `
    <section class="dashboard-hero">
      <div class="hero-band hero-band-top">
        <div class="hero-band-content" style="justify-content: space-between; display: flex; width: 100%; align-items: center;">
          <a href="#/" class="hero-brand-lockup" data-landing-action="home" aria-label="Design Persona home" style="text-decoration:none">
            ${DESIGN_PERSONA_MARK_SVG}
            <span>Design Persona</span>
          </a>
          <button class="hero-hamburger-btn" type="button" aria-label="Open menu" data-landing-action="menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>
      <div class="hero-band hero-band-bottom">
        <div class="hero-band-content" style="justify-content: space-between; display: flex; width: 100%; align-items: center;">
          <button class="hero-down-btn" type="button" aria-label="Scroll down" data-landing-action="philosophy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
          </button>
          <strong>Build your desire<span class="dot">.</span></strong>
        </div>
      </div>
      <div class="dashboard-category-row">
        ${CATEGORY_CONFIG.map(dashboardCategoryCellHTML).join('')}
      </div>
    </section>

    ${landingFeaturedProjectHTML()}

    <section id="philosophy" class="philosophy-stage" aria-label="Brand philosophy">
      <div class="philosophy-pin">
        <div class="philosophy-static-slogan">
          ${t('sloganHTML')}
        </div>
        <ol class="philosophy-list">
          <li><span>01</span><p>${t('phil1')}</p></li>
          <li><span>02</span><p>${t('phil2')}</p></li>
          <li><span>03</span><p>${t('phil3')}</p></li>
          <li><span>04</span><p>${t('phil4')}</p></li>
        </ol>
      </div>
      <div class="philosophy-nav" aria-label="${currentLang === 'ko' ? '섹션 이동' : 'Section navigation'}">
        <button type="button" aria-label="${currentLang === 'ko' ? '이전 블록' : 'Previous section'}" data-landing-action="landing-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 15 12 9 18 15"></polyline>
          </svg>
        </button>
      </div>
    </section>
  `;
}

function renderLanding(skipScroll = false) {
  document.body.classList.add('landing-page-active');
  document.body.classList.remove('about-page-active', 'detail-page-active', 'archive-page-active', 'category-page-active');
  if (!skipScroll) {
    document.body.classList.remove('landing-header-revealed', 'header-collapsed');
  }
  const mainHeader = document.getElementById('mainHeader');
  const topBar = document.getElementById('topBar');
  if (mainHeader) {
    mainHeader.style.backgroundColor = '';
    mainHeader.style.borderBottom = '';
    mainHeader.style.boxShadow = '';
  }
  if (topBar) topBar.style.display = '';
  clearThumbRollers();
  updateViewToggleBar();
  hideArchiveControls();
  const newHTML = landingHTML();
  if (pane.innerHTML !== newHTML) {
    pane.innerHTML = newHTML;
  }
  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects);
  toggleMobileHamburger(true);
  updateStaticText();
  setupChatbookPreview();

  if (!skipScroll) {
    const scroller = document.getElementById('desktopScroller');
    if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
  }
  clearRoutePendingState();
}

function categoryIntroHTML(category, resultCount) {
  const description = currentLang === 'ko' ? category.koDescription : category.description;
  return `
    <section class="home-intro category-detail-intro">
      <div class="home-intro-copy">
        <p class="home-eyebrow">${t('categoryEyebrow')}</p>
        <h1>${esc(category.title)}</h1>
        <p class="home-description">${esc(description)}</p>
      </div>
      <div class="home-intro-meta">
        <span>${resultCount} ${t('resultsSuffix')}</span>
        <a href="#/archive" style="text-decoration:none"><span>${currentLang === 'ko' ? '모든 프로젝트 보기 ↗' : 'See all projects ↗'}</span></a>
      </div>
    </section>
  `;
}

function categoryFocusDescription(category) {
  const copy = {
    'brand-systems': {
      en: 'Identity systems, guidelines, and brand refresh work.',
      ko: '아이덴티티 시스템, 가이드라인, 브랜드 리프레시 작업.'
    },
    'fnb-retail': {
      en: 'Food, retail, packaging, and offline brand touchpoints.',
      ko: '푸드, 리테일, 패키지와 오프라인 브랜드 접점 디자인.'
    },
    'packaging': {
      en: 'Package systems, product lines, and sales assets.',
      ko: '패키지 시스템, 제품 라인, 세일즈 비주얼 디자인.'
    },
    'campaign-content': {
      en: 'Key visuals, campaigns, and repeatable content.',
      ko: '키비주얼, 캠페인, 반복 가능한 콘텐츠 디자인.'
    },
    'digital-web': {
      en: 'Web, UIUX, catalogues, and digital services.',
      ko: '웹, UIUX, 카탈로그와 디지털 서비스 디자인.'
    },
    'illustration-character': {
      en: 'Characters, illustration assets, and goods visuals.',
      ko: '캐릭터, 일러스트 에셋, 굿즈형 비주얼 작업.'
    }
  };
  const item = copy[category.slug];
  if (item) return currentLang === 'ko' ? item.ko : item.en;
  return currentLang === 'ko' ? category.koDescription : category.description;
}

function categoryMoreCardHTML() {
  const label = currentLang === 'ko' ? '다른 프로젝트 보기' : 'Other Projects';
  const displayLabel = currentLang === 'ko' ? '다른 프로젝트\n보기' : 'Other\nProjects';
  return `
        <article class="portfolio-card category-more-card relative group">
          <a href="#/archive" class="category-more-link" style="text-decoration:none" aria-label="${esc(label)}">
            <span>${esc(displayLabel).replace(/\n/g, '<br>')}</span>
            <span class="category-more-arrow" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
          </a>
        </article>`;
}

function archivePlaceholderCardHTML() {
  const label = currentLang === 'ko' ? '추가 프로젝트 자리' : 'Reserved project slot';
  const status = currentLang === 'ko' ? 'Coming Soon' : 'Coming Soon';
  const title = currentLang === 'ko' ? 'More\nProjects' : 'More\nProjects';
  return `
        <article class="portfolio-card archive-empty-card relative group" aria-label="${esc(label)}">
          <div class="archive-empty-thumb" aria-hidden="true">
            <span class="archive-empty-title">${esc(title).replace(/\n/g, '<br>')}</span>
            <span class="archive-empty-status">${esc(status)}</span>
          </div>
        </article>`;
}

function updateCategoryFocusBar(category, resultCount) {
  const bar = document.getElementById('categoryFocusBar');
  if (!bar || !category) return;
  const description = categoryFocusDescription(category);
  bar.innerHTML = `
    <div class="category-focus-bar-inner">
      <div class="category-focus-copy">
        <strong>${esc(category.title)}</strong>
        <span>${esc(description)}</span>
      </div>
      <div class="category-focus-view-toggle" aria-label="${currentLang === 'ko' ? '보기 형식' : 'View mode'}">
        <button type="button" data-category-view="1" class="${viewMode === '1' ? 'active' : ''}" aria-label="${currentLang === 'ko' ? '1개씩 보기' : 'One by one'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          </svg>
        </button>
        <button type="button" data-category-view="3" class="${viewMode === '3' ? 'active' : ''}" aria-label="${currentLang === 'ko' ? '3개씩 보기' : 'Three-up thumbnails'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <line x1="12" y1="3" x2="12" y2="21"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
          </svg>
        </button>
        <button type="button" data-category-view="5" class="${viewMode === '5' ? 'active' : ''}" aria-label="${currentLang === 'ko' ? '5개씩 보기' : 'Five-up thumbnails'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
            <line x1="15" y1="3" x2="15" y2="21"></line>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="3" y1="15" x2="21" y2="15"></line>
          </svg>
        </button>
      </div>
    </div>
  `;
  bar.classList.remove('hidden');
  bar.style.display = '';
}

function renderCategory(categorySlug, skipScroll = false) {
  const category = CATEGORY_CONFIG.find((item) => item.slug === categorySlug);
  if (!category) {
    renderLanding();
    return;
  }
  document.body.classList.add('category-page-active');
  document.body.classList.remove('about-page-active', 'detail-page-active', 'archive-page-active', 'landing-page-active');
  document.body.classList.remove('landing-header-revealed', 'header-collapsed');
  const mainHeader = document.getElementById('mainHeader');
  const topBar = document.getElementById('topBar');
  if (mainHeader) {
    mainHeader.style.backgroundColor = '#ffb000';
    mainHeader.style.borderBottom = '0';
    mainHeader.style.boxShadow = 'none';
    Array.from(mainHeader.children).forEach((child) => {
      child.style.backgroundColor = '#ffb000';
      child.style.borderBottom = '0';
    });
  }
  if (topBar) topBar.style.display = 'none';
  clearThumbRollers();
  updateViewToggleBar();
  hideArchiveControls();
  const items = sortProjects(getCategoryProjects(category));
  updateCategoryFocusBar(category, items.length);
  pane.innerHTML = categoryIntroHTML(category, items.length) + gridHTML(items, categoryMoreCardHTML());
  initThumbRollers();
  initLazyVideos(pane);
  if (mobileProjectList) mobileProjectList.innerHTML = listHTML(state.projects);
  toggleMobileHamburger(true);
  updateStaticText();
  if (!skipScroll) {
    const scroller = document.getElementById('desktopScroller');
    if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
  }
  clearRoutePendingState();
}

function renderArchive(skipScroll = false) {
  const mainHeader = document.getElementById('mainHeader');
  if (mainHeader && document.body.classList.contains('landing-page-active')) {
    mainHeader.style.transition = 'none';
    requestAnimationFrame(() => {
      mainHeader.style.transition = '';
    });
  }
  document.body.classList.remove('about-page-active', 'landing-page-active', 'category-page-active');
  document.body.classList.remove('detail-page-active');
  document.body.classList.add('archive-page-active');
  const topBar = document.getElementById('topBar');
  if (mainHeader) {
    mainHeader.style.backgroundColor = '';
    mainHeader.style.borderBottom = '';
    mainHeader.style.boxShadow = '';
    Array.from(mainHeader.children).forEach((child) => {
      child.style.backgroundColor = '';
      child.style.borderBottom = '';
    });
  }
  if (topBar) topBar.style.display = '';
  const viewToggleBar = document.getElementById('viewToggleBar');
  const mobileTopBar = document.getElementById('mobileTopBar');
  if (viewToggleBar) viewToggleBar.classList.remove('hidden');
  if (mobileTopBar) mobileTopBar.classList.remove('hidden');
  setMobileTopBarMode('archive');
  clearThumbRollers();
  const filteredItems = sortProjects(getArchiveFilteredProjects());

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
  syncArchiveFilterBar();

  pane.innerHTML = `<div class="mobile-archive-start-spacer" aria-hidden="true"></div>${gridHTML(filteredItems, archivePlaceholderCardHTML())}`;
  initThumbRollers();
  initLazyVideos(pane);
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

  // Reset scroll position on view change ONLY if requested or significant change
  const scroller = document.getElementById('desktopScroller');
  if (scroller) {
    if (window._preventNextScrollReset || skipScroll) {
      // Keep current scroll
    } else if (lastHomeScrollTop > 0) {
      // Restore scroll
      const targetPos = lastHomeScrollTop;
      requestAnimationFrame(() => {
        scroller.scrollTo({ top: targetPos, behavior: "instant" });
        lastHomeScrollTop = 0;
      });
    } else {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
    }
    window._preventNextScrollReset = false;
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  clearRoutePendingState();
}

function renderHome() {
  renderArchive();
}

function renderAbout(skipScroll = false) {
  document.body.classList.add('about-page-active');
  document.body.classList.remove('detail-page-active', 'archive-page-active', 'landing-page-active', 'category-page-active');
  const mainHeader = document.getElementById('mainHeader');
  const topBar = document.getElementById('topBar');
  if (mainHeader) {
    mainHeader.style.backgroundColor = '';
    mainHeader.style.borderBottom = '';
    mainHeader.style.boxShadow = '';
    Array.from(mainHeader.children).forEach((child) => {
      child.style.backgroundColor = '';
      child.style.borderBottom = '';
    });
  }
  if (topBar) topBar.style.display = '';
  updateViewToggleBar(); // Ensure bar is hidden
  setMobileTopBarMode('hidden');
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

  // Reset scroll position on view change
  if (!skipScroll) {
    const scroller = document.getElementById('desktopScroller');
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }
  clearRoutePendingState();
}

function renderDetail(slug, skipScroll = false) {
  document.body.classList.remove('about-page-active', 'landing-page-active', 'category-page-active');
  document.body.classList.add('detail-page-active');
  document.body.classList.remove('archive-page-active');
  document.body.classList.remove('landing-header-revealed', 'header-collapsed');
  const mainHeader = document.getElementById('mainHeader');
  const topBar = document.getElementById('topBar');
  if (mainHeader) {
    mainHeader.style.backgroundColor = '';
    mainHeader.style.borderBottom = '';
    mainHeader.style.boxShadow = '';
    Array.from(mainHeader.children).forEach((child) => {
      child.style.backgroundColor = '';
      child.style.borderBottom = '';
    });
  }
  if (topBar) topBar.style.display = '';
  clearThumbRollers();
  const filterMenu = document.getElementById('desktopFilterMenu');
  if (filterMenu) {
    filterMenu.classList.add('hidden');
  }
  setMobileTopBarMode('hidden');
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
  if (!skipScroll) {
    const scroller = document.getElementById('desktopScroller');
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  clearRoutePendingState();
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
    // No initial random offset anymore
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
  const mobileFilterTitle = document.querySelector('#mobileFilterDrawer h3');
  if (mobileFilterTitle) mobileFilterTitle.textContent = t('filter');

  // Copyright
  const copyText = getText(state.site.copyright);
  const desktopCopyright = document.getElementById('desktopCopyright');
  if (desktopCopyright) {
    desktopCopyright.innerHTML = `${esc(copyText)}<span class="site-footer-version">Site v1.0.3</span>`;
  }
  const mobileCopyright = document.getElementById('mobileCopyright');
  if (mobileCopyright) {
    mobileCopyright.innerHTML = `${esc(copyText)}<span class="site-footer-version">Site v1.0.3</span>`;
  }

  // Language Label
  if (currentLangLabel) currentLangLabel.textContent = t('langLabel');
  const topBarLangLabel = document.getElementById('topBarLangLabel');
  if (topBarLangLabel) topBarLangLabel.textContent = t('langLabel');

  // Desktop Sort Labels
  const desktopSortLabel = document.getElementById('desktopSortLabel');
  const desktopViewLabel = document.getElementById('desktopViewLabel');
  const desktopSortFeatured = document.getElementById('desktopSortFeatured');
  const desktopSortLatest = document.getElementById('desktopSortLatest');
  const desktopSortOldest = document.getElementById('desktopSortOldest');
  if (desktopSortLabel) desktopSortLabel.textContent = t('sort');
  if (desktopViewLabel) desktopViewLabel.textContent = t('viewLabel');
  if (desktopSortFeatured) desktopSortFeatured.textContent = t('featured');
  if (desktopSortLatest) desktopSortLatest.textContent = t('latest');
  if (desktopSortOldest) desktopSortOldest.textContent = t('oldest');
  const mobileSortFeatured = document.getElementById('mobileSortFeatured');
  const mobileSortLatest = document.getElementById('mobileSortLatest');
  const mobileSortOldest = document.getElementById('mobileSortOldest');
  if (mobileSortFeatured) mobileSortFeatured.textContent = t('featured');
  if (mobileSortLatest) mobileSortLatest.textContent = t('latest');
  if (mobileSortOldest) mobileSortOldest.textContent = t('oldest');
  const mobileViewMagazine = document.getElementById('mobileViewMagazine');
  if (mobileViewMagazine) mobileViewMagazine.textContent = t('magazineView');
  const mobileViewThumbnail = document.getElementById('mobileViewThumbnail');
  if (mobileViewThumbnail) mobileViewThumbnail.textContent = t('thumbnailView');



  // Language Option Styles (Desktop)
  document.querySelectorAll('.lang-option').forEach(btn => {
    if (btn.dataset.lang === currentLang) {
      btn.classList.add('bg-neutral-50', 'font-semibold');
    } else {
      btn.classList.remove('bg-neutral-50', 'font-semibold');
    }
  });

  // Desktop Header Lang Toggle Styles
  document.querySelectorAll('.desktop-lang-toggle').forEach(btn => {
    if (btn.dataset.lang === currentLang) {
      btn.classList.add('text-neutral-900', 'font-bold');
      btn.classList.remove('text-neutral-400');
    } else {
      btn.classList.add('text-neutral-400');
      btn.classList.remove('text-neutral-900', 'font-bold');
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

  if (window.__personaGuideReady) updatePersonaGuideCopy();
}

function setLanguage(lang) {
  if (!lang) return;
  currentLang = lang;
  storage.set('site_lang', lang);
  document.documentElement.dataset.lang = lang;
  document.body.classList.toggle('lang-en', lang === 'en');
  document.body.classList.toggle('lang-ko', lang === 'ko');
  // document.documentElement.lang = lang; // optional
  updateStaticText();
  updateFilterToggleButton();
  updateMobileViewDropdown();
  updateMobileResultCount();
  updateDesktopResultCount();
  router(true); // re-render current view without scrolling
  // Update filter toggle button text if on home page
  if (location.hash === '#/archive') {
    window._stableShuffleOrder = null; // Clear shuffle order when explicitly changing language/refreshing archive
    updateFilterToggleButton();
  }
}

function router(skipScroll = false) {

  const raw = location.hash || '#/';
  const m = raw.match(/^#\/(.*)$/);
  const slug = m ? (SLUG_ALIASES[m[1]] || m[1]) : '';
  const previousSlug = window._lastSlug || '';
  setRoutePendingState(slug);
  closeTransientOverlays();

  // Save scroll if leaving home
  const scroller = document.getElementById('desktopScroller');
  if ((window._lastSlug === '' || window._lastSlug === '/') && slug !== '' && slug !== '/') {
    if (scroller) lastHomeScrollTop = scroller.scrollTop;
  }
  window._lastSlug = slug;

  if (!slug) {
    renderLanding(skipScroll);
    closeMenu();
    return;
  }
  if (slug === 'archive') {
    renderArchive(skipScroll);
    closeMenu();
    return;
  }
  if (slug.startsWith('category/')) {
    renderCategory(slug.replace('category/', ''), skipScroll);
    closeMenu();
    return;
  }
  if (slug === 'about') {
    renderAbout(skipScroll);
    closeMenu();
    return;
  }

  const p = state.projects.find((x) => x.slug === slug);
  if (p && p.locked) {
    location.hash = '#/archive';
    closeMenu();
    return;
  }

  if (p) rememberDetailBackRoute(previousSlug);
  renderDetail(slug, skipScroll);
  closeMenu();
}

// init
const brandLink = document.getElementById('brandLink');
if (brandLink && !brandLink.innerHTML.trim()) {
  brandLink.innerHTML = `${DESIGN_PERSONA_MARK_SVG}Design Persona`;
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
    const scroller = document.getElementById('desktopScroller');
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, 30);
});
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

document.querySelectorAll('.desktop-lang-toggle').forEach(btn => {
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
  // No-op for select removed. Handled by updateViewToggleButtons.
};

function setViewMode(nextMode, { render = true } = {}) {
  if (!nextMode || nextMode === viewMode) return;
  viewMode = nextMode;
  storage.set('view_mode', viewMode);
  updateViewToggleButtons();
  updateMobileViewDropdown();
  if (render && (location.hash === '#/archive')) {
    renderHome();
  }
  if (render && location.hash.indexOf('#/category/') === 0) {
    renderCategory(location.hash.replace('#/category/', ''), true);
  }
}

const updateMobileResultCount = () => {
  if (!mobileResultCount) return;
  const count = document.body.classList.contains('archive-page-active')
    ? getArchiveFilteredProjects().length
    : filterProjects().length;
  mobileResultCount.textContent = currentLang === 'ko'
    ? `${count}${t('resultsSuffix')}`
    : `${count} ${t('resultsSuffix')}`;
};

const updateDesktopResultCount = () => {
  const desktopResultCount = document.getElementById('desktopResultCount');
  if (!desktopResultCount) return;
  const count = document.body.classList.contains('archive-page-active')
    ? getArchiveFilteredProjects().length
    : filterProjects().length;
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
    if (location.hash === '#/archive') {
      renderHome();
    } else if (filterMenuContent) {
      filterMenuContent.innerHTML = filterMenuHTML();
      setupFilterListeners();
      syncMobileFilterContent();
    }
    updateViewToggleButtons();
  });
}

function getArchiveFocusFilterValue() {
  return ARCHIVE_FOCUS_VALUES.includes(archiveFocusMode) ? archiveFocusMode : '';
}

function setArchiveFocusFilter(nextValue) {
  const selected = ARCHIVE_FOCUS_VALUES.includes(nextValue) ? nextValue : '';
  archiveFocusMode = selected;
  storage.set('archive_focus', archiveFocusMode);
  renderHome();
}

function setArchiveYearFilter(nextValue) {
  archiveYearMode = ARCHIVE_YEAR_VALUES.includes(nextValue) ? nextValue : '';
  storage.set('archive_year', archiveYearMode);
  renderHome();
}

function resetArchiveFilters() {
  sortMode = 'latest';
  archiveFocusMode = '';
  archiveYearMode = '';
  searchQuery = '';
  activeFilters = {};
  storage.set('sort_mode', sortMode);
  storage.set('archive_focus', archiveFocusMode);
  storage.set('archive_year', archiveYearMode);
  storage.set('activeFilters', JSON.stringify(activeFilters));
  if (searchInput) searchInput.value = '';
  if (mobileSearchInput) mobileSearchInput.value = '';
  renderHome();
}

function updateMobileFilterReadouts() {
  const readoutIds = {
    mobileArchiveSortSelect: 'mobileArchiveSortReadout',
    mobileArchiveFocusSelect: 'mobileArchiveFocusReadout',
  };

  Object.keys(readoutIds).forEach((id) => {
    const select = document.getElementById(id);
    const cell = select?.closest('.catalog-filter-cell');
    const readout = document.getElementById(readoutIds[id]);
    if (!select || !cell) return;
    const selectedOption = select.options[select.selectedIndex];
    const label = selectedOption ? selectedOption.textContent.trim() : '';
    cell.dataset.filterLabel = label;
    if (readout) readout.textContent = label;
  });
}

function syncArchiveFilterBar() {
  const archiveSortSelect = document.getElementById('archiveSortSelect');
  const archiveFocusSelect = document.getElementById('archiveFocusSelect');
  const archiveYearSelect = document.getElementById('archiveYearSelect');
  const mobileArchiveSortSelect = document.getElementById('mobileArchiveSortSelect');
  const mobileArchiveFocusSelect = document.getElementById('mobileArchiveFocusSelect');
  const mobileArchiveYearSelect = document.getElementById('mobileArchiveYearSelect');

  if (archiveSortSelect) archiveSortSelect.value = sortMode;
  if (archiveFocusSelect) archiveFocusSelect.value = getArchiveFocusFilterValue();
  if (archiveYearSelect) archiveYearSelect.value = archiveYearMode;
  if (mobileArchiveSortSelect) mobileArchiveSortSelect.value = sortMode;
  if (mobileArchiveFocusSelect) mobileArchiveFocusSelect.value = getArchiveFocusFilterValue();
  if (mobileArchiveYearSelect) mobileArchiveYearSelect.value = archiveYearMode;
  updateMobileFilterReadouts();
}

const archiveSortSelect = document.getElementById('archiveSortSelect');
if (archiveSortSelect) {
  archiveSortSelect.addEventListener('change', (e) => {
    const nextMode = e.target.value;
    if (!SORT_MODES.includes(nextMode) || sortMode === nextMode) return;
    sortMode = nextMode;
    storage.set('sort_mode', sortMode);
    renderHome();
  });
}

const archiveFocusSelect = document.getElementById('archiveFocusSelect');
if (archiveFocusSelect) {
  archiveFocusSelect.addEventListener('change', (e) => {
    setArchiveFocusFilter(e.target.value);
  });
}

const archiveYearSelect = document.getElementById('archiveYearSelect');
if (archiveYearSelect) {
  archiveYearSelect.addEventListener('change', (e) => {
    setArchiveYearFilter(e.target.value);
  });
}

const archiveResetFiltersBtn = document.getElementById('archiveResetFiltersBtn');
if (archiveResetFiltersBtn) {
  archiveResetFiltersBtn.addEventListener('click', resetArchiveFilters);
}

const mobileArchiveSortSelect = document.getElementById('mobileArchiveSortSelect');
if (mobileArchiveSortSelect) {
  mobileArchiveSortSelect.addEventListener('change', (e) => {
    const nextMode = e.target.value;
    if (!SORT_MODES.includes(nextMode) || sortMode === nextMode) return;
    sortMode = nextMode;
    storage.set('sort_mode', sortMode);
    renderHome();
  });
}

const mobileArchiveFocusSelect = document.getElementById('mobileArchiveFocusSelect');
if (mobileArchiveFocusSelect) {
  mobileArchiveFocusSelect.addEventListener('change', (e) => {
    setArchiveFocusFilter(e.target.value);
  });
}

const mobileArchiveYearSelect = document.getElementById('mobileArchiveYearSelect');
if (mobileArchiveYearSelect) {
  mobileArchiveYearSelect.addEventListener('change', (e) => {
    setArchiveYearFilter(e.target.value);
  });
}

const mobileArchiveResetFiltersBtn = document.getElementById('mobileArchiveResetFiltersBtn');
if (mobileArchiveResetFiltersBtn) {
  mobileArchiveResetFiltersBtn.addEventListener('click', resetArchiveFilters);
}

const mobileSortSelect = document.getElementById('mobileSortSelect');
if (mobileSortSelect) {
  mobileSortSelect.addEventListener('change', (e) => {
    const nextMode = e.target.value;
    if (!SORT_MODES.includes(nextMode) || sortMode === nextMode) return;
    sortMode = nextMode;
    storage.set('sort_mode', sortMode);
    if (location.hash === '#/archive') {
      renderHome();
    } else if (filterMenuContent) {
      filterMenuContent.innerHTML = filterMenuHTML();
      setupFilterListeners();
      syncMobileFilterContent();
    }
    updateViewToggleButtons();
  });
}

// Mobile view select removed. Handled by button listeners in setupViewToggle.

// Search functionality
const searchInput = document.getElementById('searchInput');
const mobileSearchBtn = document.getElementById('mobileSearchBtn');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const mobileSearchModal = document.getElementById('mobileSearchModal');
const mobileSearchBox = document.getElementById('mobileSearchBox');
const mobileSearchClose = document.getElementById('mobileSearchClose');

function enableMobileSearchButton() {
  if (!mobileSearchBtn) return;
  mobileSearchBtn.style.setProperty('pointer-events', 'auto', 'important');
  mobileSearchBtn.style.setProperty('cursor', 'pointer', 'important');
  mobileSearchBtn.style.setProperty('touch-action', 'manipulation', 'important');
}

enableMobileSearchButton();

if (searchInput) {
  const desktopSearchContainer = document.querySelector('.desktop-search');
  if (desktopSearchContainer) {
    desktopSearchContainer.addEventListener('click', () => {
      searchInput.focus();
    });
  }

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (location.hash === '#/archive') {
      renderHome();
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (location.hash !== '#/archive') {
        location.hash = '#/archive';
        setTimeout(() => renderHome(), 100);
      }
    }
  });
}

const openMobileSearch = () => {
  if (!mobileSearchModal || !mobileSearchInput) return;
  mobileSearchModal.classList.remove('hidden');
  mobileSearchModal.style.setProperty('display', 'block', 'important');
  mobileSearchModal.style.setProperty('visibility', 'visible', 'important');
  mobileSearchModal.style.setProperty('opacity', '1', 'important');
  mobileSearchModal.style.setProperty('pointer-events', 'auto', 'important');
  setTimeout(() => mobileSearchInput.focus(), 0);
};

const closeMobileSearch = () => {
  if (!mobileSearchModal || !mobileSearchInput) return;
  mobileSearchModal.classList.add('hidden');
  mobileSearchModal.style.setProperty('display', 'none', 'important');
  mobileSearchModal.style.setProperty('visibility', 'hidden', 'important');
  mobileSearchModal.style.setProperty('opacity', '0', 'important');
  mobileSearchModal.style.setProperty('pointer-events', 'none', 'important');
  mobileSearchInput.value = '';
  searchQuery = '';
  if (location.hash === '#/archive') renderHome();
};

if (mobileSearchBtn && mobileSearchInput) {
  const handleMobileSearchOpen = (event) => {
    event.preventDefault();
    event.stopPropagation();
    enableMobileSearchButton();
    openMobileSearch();
  };

  mobileSearchBtn.addEventListener('click', handleMobileSearchOpen);
  mobileSearchBtn.addEventListener('touchend', handleMobileSearchOpen, { passive: false });

  mobileSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (location.hash === '#/archive') {
      renderHome();
    }
  });

  mobileSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (location.hash !== '#/archive') {
        location.hash = '#/archive';
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
    if (e.target === mobileSearchModal) {
      closeMobileSearch();
      return;
    }
    if (mobileSearchBox && !mobileSearchBox.contains(e.target)) {
      closeMobileSearch();
    }
  });
}

window.addEventListener('hashchange', router);
document.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-landing-action]');
  if (!actionButton) return;

  const action = actionButton.dataset.landingAction;
  event.preventDefault();
  event.stopPropagation();

  if (action === 'menu') {
    if (window.innerWidth >= 1024) {
      toggleDesktopMenu();
    } else {
      toggleMenu();
    }
  } else if (action === 'philosophy') {
    scrollToPhilosophy();
  } else if (action === 'landing-start') {
    scrollToLandingStart();
  } else if (action === 'landing-feature') {
    scrollToLandingFeature();
  } else if (action === 'home') {
    if (location.hash !== '#/' && location.hash !== '') {
      location.hash = '#/';
    }
    window.setTimeout(scrollToLandingStart, 30);
  }
});
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category-view]');
  if (!button) return;
  setViewMode(button.dataset.categoryView);
});
let chatbookSlideTimer = null;
let chatbookSlideKickTimer = null;
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

  const mToggle1 = document.getElementById('mobileViewToggle1');
  const mToggle2 = document.getElementById('mobileViewToggle2');

  if (mToggle1) {
    mToggle1.addEventListener('click', () => {
      setViewMode('1');
    });
  }

  if (mToggle2) {
    mToggle2.addEventListener('click', () => {
      setViewMode('2');
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
  const activeViewMode = getEffectiveViewMode();
  const toggle1 = document.getElementById('viewToggle1');
  const toggle2 = document.getElementById('viewToggle2');
  const toggle3 = document.getElementById('viewToggle3');
  const toggle5 = document.getElementById('viewToggle5');

  document.body.classList.remove('view-mode-1', 'view-mode-2', 'view-mode-3', 'view-mode-5');
  document.body.classList.add(`view-mode-${activeViewMode}`);

  [toggle1, toggle2, toggle3, toggle5].forEach(toggle => {
    if (toggle) {
      toggle.classList.remove('active');
    }
  });

  const activeToggle = document.getElementById(`viewToggle${activeViewMode}`);
  if (activeToggle) {
    activeToggle.classList.add('active');
  }

  const mToggleActive1 = document.getElementById('mobileViewToggle1');
  const mToggleActive2 = document.getElementById('mobileViewToggle2');

  if (mToggleActive1) {
    mToggleActive1.classList.toggle('active', activeViewMode === '1');
  }
  if (mToggleActive2) {
    mToggleActive2.classList.toggle('active', activeViewMode === '2' || (window.innerWidth < 1024 && activeViewMode !== '1'));
  }
  const desktopSortSelect = document.getElementById('desktopSortSelect');
  if (desktopSortSelect) {
    desktopSortSelect.value = sortMode;
  }
  const mobileSortSelect = document.getElementById('mobileSortSelect');
  if (mobileSortSelect) {
    mobileSortSelect.value = sortMode;
  }
  syncArchiveFilterBar();
}

/** Update the fixed view toggle bar state */
function updateViewToggleBar() {
  // Update button states
  updateViewToggleButtons();
  updateFilterToggleButton();

  // Show/hide the bar based on page
  const viewToggleBar = document.getElementById('viewToggleBar');
  if (viewToggleBar) {
    if (document.body.classList.contains('archive-page-active')) {
      viewToggleBar.classList.remove('hidden');
      viewToggleBar.style.display = '';
    } else {
      viewToggleBar.classList.add('hidden');
      viewToggleBar.style.display = 'none';
    }
  }

  const categoryFocusBar = document.getElementById('categoryFocusBar');
  if (categoryFocusBar && !document.body.classList.contains('category-page-active')) {
    categoryFocusBar.classList.add('hidden');
    categoryFocusBar.style.display = 'none';
    categoryFocusBar.innerHTML = '';
  }

  if (!document.body.classList.contains('archive-page-active')) {
    setMobileTopBarMode('hidden');
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
  const isArchivePage = location.hash === '#/archive';
  const isDetailPage = location.hash && location.hash !== '#/archive' && location.hash !== '#/about';

  if (!isArchivePage) {
    if (filterMenu) {
      filterMenu.classList.add('hidden', 'filter-hidden');
      filterMenu.classList.remove('filter-visible');
    }
    if (main) {
      main.classList.add('filter-hidden');
      main.classList.remove('filter-visible');
    }
    return;
  }

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

      if (location.hash === '#/archive') {
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
      if (location.hash === '#/archive') {
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
  if (location.hash === '#/archive') {
    window._preventNextScrollReset = true; // Prevent jumping to top
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
      if (location.hash === '#/archive') {
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
      if (location.hash === '#/archive') {
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
const personaGuide = document.getElementById('personaGuide');

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
  const isLanding = document.body.classList.contains('landing-page-active');
  const isCollapsed = document.body.classList.contains('header-collapsed');
  const offset = (isCollapsed || isLanding) ? 0 : headerStack;
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

function getPrimaryScrollY(isDesktop = window.innerWidth >= 1024) {
  const scroller = document.getElementById('desktopScroller');
  const windowY = Math.max(
    window.scrollY || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0
  );
  if (isDesktop && scroller) {
    return Math.max(scroller.scrollTop || 0, windowY);
  }
  return windowY;
}

function setImportantStyle(el, prop, value) {
  if (!el) return;
  el.style.setProperty(prop, value, 'important');
}

function syncMobileChromeState(currentY = getPrimaryScrollY(false)) {
  if (window.innerWidth >= 1024) return;

  const isLanding = document.body.classList.contains('landing-page-active');
  const isDetail = document.body.classList.contains('detail-page-active');
  const isArchive = document.body.classList.contains('archive-page-active');
  const guidePanel = document.getElementById('personaGuidePanel');
  const isPersonaGuideOpen = Boolean(guidePanel && !guidePanel.classList.contains('hidden'));
  const headerShouldShow = (isDetail || isArchive) ? currentY <= 50 : (!isLanding || currentY > 80);
  const scrollTopShouldShow = currentY > (isLanding ? 80 : 300) || isPersonaGuideOpen;

  if (isLanding) {
    document.body.classList.toggle('landing-header-revealed', headerShouldShow);
    document.body.classList.remove('header-collapsed');
    isHeaderCollapsed = headerShouldShow;
  } else {
    document.body.classList.remove('landing-header-revealed');
  }

  if (mainHeader) {
    setImportantStyle(mainHeader, 'transform', headerShouldShow ? 'translate3d(0, 0, 0)' : 'translate3d(0, -100%, 0)');
    setImportantStyle(mainHeader, 'opacity', headerShouldShow ? '1' : '0');
    setImportantStyle(mainHeader, 'visibility', headerShouldShow ? 'visible' : 'hidden');
    setImportantStyle(mainHeader, 'pointer-events', headerShouldShow ? 'auto' : 'none');
  }

  if (scrollTopBtn) {
    scrollTopBtn.classList.toggle('visible', scrollTopShouldShow);
    setImportantStyle(scrollTopBtn, 'display', 'flex');
    setImportantStyle(scrollTopBtn, 'opacity', scrollTopShouldShow ? '1' : '0');
    setImportantStyle(scrollTopBtn, 'visibility', scrollTopShouldShow ? 'visible' : 'hidden');
    setImportantStyle(scrollTopBtn, 'pointer-events', scrollTopShouldShow ? 'auto' : 'none');
  }
}

function updateHeader() {
  updatePinnedScrollEffects();
  const isDesktop = window.innerWidth >= 1024;
  const currentY = getPrimaryScrollY(isDesktop);
  const isLanding = document.body.classList.contains('landing-page-active');
  const isArchive = document.body.classList.contains('archive-page-active');
  const isCategory = document.body.classList.contains('category-page-active');
  const isDetail = document.body.classList.contains('detail-page-active');
  const guidePanel = document.getElementById('personaGuidePanel');
  const isPersonaGuideOpen = Boolean(guidePanel && !guidePanel.classList.contains('hidden'));

  if (isLanding) {
    const shouldRevealLandingHeader = currentY > 80;
    if (document.body.classList.contains('landing-header-revealed') !== shouldRevealLandingHeader) {
      document.body.classList.toggle('landing-header-revealed', shouldRevealLandingHeader);
      updateDesktopHeaderVars();
    }
    if (document.body.classList.contains('header-collapsed')) {
      document.body.classList.remove('header-collapsed');
      isHeaderCollapsed = false;
      updateDesktopHeaderVars();
    }
    if (!isDesktop) {
      isHeaderCollapsed = shouldRevealLandingHeader;
    }
  }

  // Header collapse effect
  if (isLanding && !isDesktop) {
    // Mobile landing uses the branded hero header at the top, then reveals the fixed site header after scroll.
  } else if (isDesktop) {
    const shouldCollapse = (isArchive || isCategory || isDetail) && currentY > 80;
    if (shouldCollapse !== isHeaderCollapsed) {
      document.body.classList.toggle('header-collapsed', shouldCollapse);
      isHeaderCollapsed = shouldCollapse;
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
  const scrollTopThreshold = isLanding ? 80 : 300;
  if (currentY > scrollTopThreshold || isPersonaGuideOpen) {
    if (scrollTopBtn) scrollTopBtn.classList.add('visible');
    if (personaGuide && (isArchive || isCategory)) personaGuide.classList.add('visible');
  } else {
    if (scrollTopBtn) scrollTopBtn.classList.remove('visible');
    if (personaGuide && !isPersonaGuideOpen) {
      personaGuide.classList.remove('visible');
      togglePersonaGuide(false);
    }
  }

  syncMobileChromeState(currentY);
  lastY = currentY > 0 ? currentY : 0; // Prevent negative
  ticking = false;
}

const handleScroll = () => {
  if (!ticking) {
    window.requestAnimationFrame(updateHeader);
    ticking = true;
  }
};

window.addEventListener("scroll", handleScroll, { passive: true });
document.addEventListener("scroll", handleScroll, { passive: true, capture: true });

window.setInterval(() => {
  if (
    window.innerWidth < 1024 ||
    document.body.classList.contains('landing-page-active') ||
    document.body.classList.contains('archive-page-active') ||
    document.body.classList.contains('category-page-active')
  ) {
    updateHeader();
  }
}, 250);

const desktopScroller = document.getElementById('desktopScroller');
if (desktopScroller) {
  desktopScroller.addEventListener('scroll', handleScroll, { passive: true });
}

// Also listen to desktopScroller if it exists
document.addEventListener('DOMContentLoaded', () => {
  const scroller = document.getElementById('desktopScroller');
  if (scroller) {
    scroller.addEventListener('scroll', handleScroll, { passive: true });
  }
});

window.addEventListener('resize', () => {
  updateDesktopHeaderVars();
  updateHeader();
  requestPinnedScrollEffects();
});

window.addEventListener('load', () => {
  updateDesktopHeaderVars();
  updateHeader();
  requestPinnedScrollEffects();
  setupChatbookPreview();
});

function updatePinnedScrollEffects() {
  const isLanding = document.body.classList.contains('landing-page-active');
  if (!isLanding) return;

  const stage = document.querySelector('.philosophy-stage');
  if (!stage) return;

  const isDesktop = window.innerWidth >= 1024;
  const scroller = document.getElementById('desktopScroller');
  const viewportHeight = window.innerHeight;
  const stageHeight = stage.offsetHeight;

  const rect = stage.getBoundingClientRect();
  const scrollDistance = stageHeight - viewportHeight;

  // Calculate progress relative to the stage's presence in the viewport
  let progress = -rect.top / scrollDistance;
  progress = Math.max(0, Math.min(1, progress));

  // Set on both root and stage for maximum compatibility
  document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(4));
  stage.style.setProperty('--scroll-progress', progress.toFixed(4));
}

let pinnedScrollFrame = null;
function requestPinnedScrollEffects() {
  if (pinnedScrollFrame) return;
  pinnedScrollFrame = requestAnimationFrame(() => {
    pinnedScrollFrame = null;
    updatePinnedScrollEffects();
  });
}

// Add scroll listener

if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => {
    const scroller = document.getElementById('desktopScroller');
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => syncMobileChromeState(0), 260);
  });
}

const personaGuideBtn = document.getElementById('personaGuideBtn');
const personaGuidePanel = document.getElementById('personaGuidePanel');
const personaGuideClose = document.getElementById('personaGuideClose');
const personaGuideNote = document.getElementById('personaGuideNote');
const personaGuideEmail = document.getElementById('personaGuideEmail');
const personaGuideState = {
  focus: '',
  timeline: '',
  scope: ''
};

const PERSONA_GUIDE_COPY = {
  en: {
    title: 'Persona Guide',
    note: 'No data is saved. Your email app will open with a draft.',
    close: 'Close guide',
    groups: {
      focus: 'What do you need?',
      timeline: 'Timeline',
      scope: 'Scope'
    },
    options: {
      'Brand identity': 'Brand',
      'Package line': 'Package',
      'Web / service': 'Web',
      'Campaign content': 'Campaign',
      'Soon': 'Soon',
      '1-2 months': '1-2 months',
      'Flexible': 'Flexible',
      'Small start': 'Small start',
      'One project': 'One project',
      'Discuss first': 'Discuss first'
    },
    values: {
      'Brand identity': 'Brand identity',
      'Package line': 'Package line',
      'Web / service': 'Web / service',
      'Campaign content': 'Campaign content',
      'Soon': 'Soon',
      '1-2 months': '1-2 months',
      'Flexible': 'Flexible',
      'Small start': 'Small start',
      'One project': 'One project',
      'Discuss first': 'Discuss first'
    },
    empty: 'Not selected yet',
    message: {
      greeting: 'Hello site operator,',
      request: 'I would like to discuss a project.',
      interest: 'Interest',
      timeline: 'Timeline',
      scope: 'Scope',
      source: 'I found your work through the portfolio archive.'
    },
    email: 'Email this note',
    subject: 'Project inquiry from portfolio archive'
  },
  ko: {
    title: 'Persona Guide',
    note: '내용은 저장되지 않으며, 이메일 앱에 초안이 열립니다.',
    close: '가이드 닫기',
    groups: {
      focus: '무엇이 필요하세요?',
      timeline: '일정',
      scope: '범위'
    },
    options: {
      'Brand identity': '브랜드',
      'Package line': '패키지',
      'Web / service': '웹',
      'Campaign content': '캠페인',
      'Soon': '빠르게',
      '1-2 months': '1-2개월',
      'Flexible': '유동적',
      'Small start': '작게 시작',
      'One project': '단일 프로젝트',
      'Discuss first': '먼저 상담'
    },
    values: {
      'Brand identity': '브랜드 아이덴티티',
      'Package line': '패키지 라인',
      'Web / service': '웹 / 서비스',
      'Campaign content': '캠페인 콘텐츠',
      'Soon': '빠르게',
      '1-2 months': '1-2개월',
      'Flexible': '유동적',
      'Small start': '작게 시작',
      'One project': '단일 프로젝트',
      'Discuss first': '먼저 상담'
    },
    empty: '아직 선택하지 않음',
    message: {
      greeting: '사이트 운영자님께,',
      request: '프로젝트 상담을 요청드립니다.',
      interest: '관심 분야',
      timeline: '일정',
      scope: '범위',
      source: '포트폴리오 아카이브를 통해 작업을 확인했습니다.'
    },
    email: '이메일 초안 열기',
    subject: '포트폴리오 아카이브 프로젝트 문의'
  }
};

function guideCopy() {
  return PERSONA_GUIDE_COPY[currentLang] || PERSONA_GUIDE_COPY.en;
}

function guideValueLabel(value) {
  const copy = guideCopy();
  if (!value) return copy.empty;
  return copy.values[value] || value;
}

function getPersonaGuideMessage() {
  const copy = guideCopy();
  const message = copy.message;
  return [
    message.greeting,
    '',
    message.request,
    '',
    `${message.interest}: ${guideValueLabel(personaGuideState.focus)}`,
    `${message.timeline}: ${guideValueLabel(personaGuideState.timeline)}`,
    `${message.scope}: ${guideValueLabel(personaGuideState.scope)}`,
    '',
    message.source
  ].join('\n');
}

function updatePersonaGuideCopy() {
  if (!personaGuidePanel) return;
  const copy = guideCopy();
  const title = document.getElementById('personaGuideTitle');
  if (title) title.textContent = copy.title;
  const note = personaGuidePanel.querySelector('.persona-guide-head span');
  if (note) note.textContent = copy.note;
  if (personaGuideClose) personaGuideClose.setAttribute('aria-label', copy.close);
  personaGuidePanel.querySelectorAll('[data-guide-group]').forEach((group) => {
    const key = group.dataset.guideGroup;
    const label = group.querySelector('p');
    if (label && copy.groups[key]) label.textContent = copy.groups[key];
    group.querySelectorAll('[data-guide-value]').forEach((button) => {
      const value = button.dataset.guideValue || '';
      button.textContent = copy.options[value] || value;
    });
  });
  if (personaGuideEmail) personaGuideEmail.textContent = copy.email;
  updatePersonaGuideEmail();
}

function updatePersonaGuideEmail() {
  if (!personaGuideNote || !personaGuideEmail) return;
  const copy = guideCopy();
  const body = getPersonaGuideMessage();
  const subject = copy.subject;
  personaGuideNote.textContent = body;
  personaGuideEmail.href = `mailto:designpersona.kr@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function togglePersonaGuide(forceOpen = null) {
  if (!personaGuidePanel || !personaGuideBtn) return;
  const shouldOpen = forceOpen === null
    ? personaGuidePanel.classList.contains('hidden')
    : forceOpen;
  personaGuidePanel.classList.toggle('hidden', !shouldOpen);
  personaGuideBtn.setAttribute('aria-expanded', String(shouldOpen));
  if (shouldOpen && personaGuide) personaGuide.classList.add('visible');
  if (shouldOpen) updatePersonaGuideEmail();
}

if (personaGuideBtn) {
  personaGuideBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePersonaGuide();
  });
}

if (personaGuideClose) {
  personaGuideClose.addEventListener('click', () => togglePersonaGuide(false));
}

if (personaGuidePanel) {
  personaGuidePanel.addEventListener('click', (event) => {
    const option = event.target.closest('[data-guide-value]');
    if (!option) return;

    const group = option.closest('[data-guide-group]');
    const key = group?.dataset.guideGroup;
    if (!key || !(key in personaGuideState)) return;

    personaGuideState[key] = option.dataset.guideValue || '';
    group.querySelectorAll('[data-guide-value]').forEach((button) => {
      button.classList.toggle('active', button === option);
    });
    updatePersonaGuideEmail();
  });
}

window.__personaGuideReady = true;
updatePersonaGuideCopy();

function syncMobileFilterContent() {
  if (!filterMenuContent || !mobileFilterContent) return;
  if (!filterMenuContent.innerHTML) return;
  mobileFilterContent.innerHTML = filterMenuContent.innerHTML;
  setupFilterListeners();
  bindMobileFilterDelegation();
}

function scrollToPhilosophy() {
  const scroller = document.getElementById('desktopScroller');
  const philosophy = document.getElementById('philosophy');
  if (window.innerWidth < 1024 && philosophy) {
    philosophy.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (scroller && philosophy) {
    scroller.scrollTo({
      top: philosophy.offsetTop,
      behavior: 'smooth'
    });
  } else if (philosophy) {
    window.scrollTo({
      top: philosophy.offsetTop,
      behavior: 'smooth'
    });
  }
}

function scrollToLandingStart() {
  const scroller = document.getElementById('desktopScroller');
  const target = document.querySelector('.dashboard-hero');
  if (window.innerWidth < 1024 && target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (scroller && target) {
    scroller.scrollTo({
      top: target.offsetTop,
      behavior: 'smooth'
    });
  } else if (target) {
    window.scrollTo({
      top: target.offsetTop,
      behavior: 'smooth'
    });
  }
}

function scrollToLandingFeature() {
  const scroller = document.getElementById('desktopScroller');
  const target = document.getElementById('landingFeaturedProject') || document.getElementById('philosophy');
  if (window.innerWidth < 1024 && target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (scroller && target) {
    scroller.scrollTo({
      top: target.offsetTop,
      behavior: 'smooth'
    });
  } else if (target) {
    window.scrollTo({
      top: target.offsetTop,
      behavior: 'smooth'
    });
  }
}

function setChatbookSlide(index) {
  const mockup = document.querySelector('.landing-featured-chatbook-mockup');
  if (!mockup) return;
  const total = 3;
  const next = ((Number(index) % total) + total) % total;
  mockup.dataset.chatbookSlide = String(next);
  mockup.style.setProperty('--chatbook-slide-index', next);
  const track = mockup.querySelector('.chatbook-screen-track');
  if (track) {
    track.style.transform = `translate3d(${next * -33.333333}%, 0, 0)`;
  }
}

function shiftChatbookSlide(direction) {
  const mockup = document.querySelector('.landing-featured-chatbook-mockup');
  if (!mockup) return;
  const current = Number(mockup.dataset.chatbookSlide || 0);
  setChatbookSlide(current + direction);
}

function startChatbookAutoplay() {
  window.clearInterval(chatbookSlideTimer);
  window.clearTimeout(chatbookSlideKickTimer);
  chatbookSlideKickTimer = window.setTimeout(() => {
    shiftChatbookSlide(1);
  }, 1800);
  chatbookSlideTimer = window.setInterval(() => {
    shiftChatbookSlide(1);
  }, 6400);
}

function setupChatbookPreview() {
  const screen = document.querySelector('.chatbook-screen-window');
  const mockup = document.querySelector('.landing-featured-chatbook-mockup');
  if (!screen || !mockup) {
    window.clearInterval(chatbookSlideTimer);
    window.clearTimeout(chatbookSlideKickTimer);
    chatbookSlideTimer = null;
    chatbookSlideKickTimer = null;
    return;
  }

  setChatbookSlide(Number(mockup.dataset.chatbookSlide || 0));
  startChatbookAutoplay();

  if (screen.dataset.swipeReady === 'true') return;
  screen.dataset.swipeReady = 'true';

  let startX = 0;
  let startY = 0;
  let pointerDown = false;

  screen.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    startX = event.clientX;
    startY = event.clientY;
    window.clearInterval(chatbookSlideTimer);
    window.clearTimeout(chatbookSlideKickTimer);
    screen.classList.add('is-dragging');
    try {
      screen.setPointerCapture(event.pointerId);
    } catch (error) {
      // Some older browsers do not support capture for every pointer type.
    }
  });

  screen.addEventListener('pointerup', (event) => {
    if (!pointerDown) return;
    pointerDown = false;
    screen.classList.remove('is-dragging');
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) > 34 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      shiftChatbookSlide(deltaX < 0 ? 1 : -1);
    }
    startChatbookAutoplay();
  });

  screen.addEventListener('pointercancel', () => {
    pointerDown = false;
    screen.classList.remove('is-dragging');
    startChatbookAutoplay();
  });
}

function scrollToFooter() {
  const scroller = document.getElementById('desktopScroller');
  const target = window.innerWidth < 1024 ? document.querySelector('.mobile-footer') : document.querySelector('.desktop-footer');
  if (window.innerWidth < 1024 && target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (scroller && target) {
    scroller.scrollTo({
      top: target.offsetTop,
      behavior: 'smooth'
    });
  } else if (target) {
    window.scrollTo({
      top: target.offsetTop,
      behavior: 'smooth'
    });
  }
}

function switchLang(lang) {
  if (!lang) return;
  currentLang = lang;
  storage.set('site_lang', lang);
  document.documentElement.dataset.lang = lang;
  document.body.classList.toggle('lang-en', lang === 'en');
  document.body.classList.toggle('lang-ko', lang === 'ko');
  updateStaticText();
  updateFilterToggleButton();
  updateMobileViewDropdown();
  updateMobileResultCount();
  updateDesktopResultCount();
  // Re-render the menu list in place (don't close)
  if (desktopProjectListNav) {
    desktopProjectListNav.innerHTML = listHTML(state.projects);
  }
  // Update lang button styles in drawer
  document.querySelectorAll('.drawer-lang-btn').forEach(btn => {
    if (btn.dataset.lang === lang) {
      btn.style.color = '#111';
      btn.style.fontWeight = '700';
    } else {
      btn.style.color = '#999';
      btn.style.fontWeight = '500';
    }
  });
  // Also re-render the current page content behind the menu
  const raw = location.hash || '#/';
  const m = raw.match(/^#\/(.*)$/);
  const slug = m ? m[1] : '';
  if (!slug) renderLanding(true);
  else if (slug === 'archive') renderArchive(true);
  else if (slug === 'about') renderAbout(true);
  else if (slug.startsWith('category/')) renderCategory(slug.replace('category/', ''), true);
  else renderDetail(slug, true);
}
