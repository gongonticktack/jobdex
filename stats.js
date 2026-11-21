"use strict";

/*
 * 統計ページ（stats.html）専用スクリプト。
 * 求人を Supabase から全件取得し、職種カテゴリ・スキル・資格の
 * 件数ランキングと月別推移をブラウザ側で集計して SVG で描く。
 * 集計ロジック（StatsLogic）は DOM に依存しないので Node でも検証できる。
 */

const StatsLogic = (() => {
  // 職種カテゴリの丸めルール。タイトルに含まれるキーワードで判定し、
  // 上から順に最初に一致したカテゴリへ振り分ける（どれにも当たらなければ「その他」）。
  const JOB_CATEGORY_RULES = [
    { name: "セキュリティ", patterns: ["セキュリティ", "Security", "Cybersecurity", "\\bSOC\\b", "脆弱性", "ペネトレーション"] },
    { name: "データ・AI", patterns: ["データサイエンティスト", "データエンジニア", "データアナリスト", "データサイエンス", "データ分析", "データ基盤", "データマネジメント", "データ活用", "データドリブン", "機械学習", "AIエンジニア", "AI/データ", "AI・データ", "LLM", "生成AI", "AI研究", "AI開発", "AIモデル", "Data Scientist", "Data Engineer", "Data Analyst", "Machine Learning"] },
    { name: "コーポレート", patterns: ["経理", "人事", "法務", "総務", "財務", "FP&A", "M&A", "広報", "調達", "特許", "知財", "知的財産", "監査"] },
    { name: "コンサルタント", patterns: ["コンサルタント", "コンサルティング", "コンサル", "Consultant", "業務改革", "プロセス改革", "BPR", "ビジネスアナリスト"] },
    { name: "プロジェクト管理", patterns: ["プロジェクトマネージャ", "プロジェクトマネジメント", "プロジェクトリーダー", "プロジェクト管理", "プログラムマネージャ", "PMO", "ＰＭ", "\\bPM\\b", "プロダクトマネージャ", "プロダクトオーナー", "スクラムマスタ", "マネジメント", "マネージャー", "Manager", "プロジェクト推進", "推進マネージャー"] },
    { name: "クラウド", patterns: ["クラウド", "AWS", "Azure", "GCP"] },
    { name: "インフラ・ネットワーク", patterns: ["インフラ", "基盤", "サーバ", "ネットワーク", "プラットフォームエンジニア", "IAM", "認証基盤", "SRE"] },
    { name: "アーキテクト", patterns: ["アーキテクト", "アーキテクチャ"] },
    { name: "組込み・制御・生産", patterns: ["組み込み", "組込み", "組込", "ファームウェア", "制御系", "生産管理", "生産技術", "生産DX", "ハードウェア", "施工管理"] },
    { name: "テスト・QA", patterns: ["テスト", "品質保証", "品質管理", "品質評価", "検証エンジニア", "QA", "試験", "検査"] },
    { name: "運用・サポート・社内SE", patterns: ["運用", "保守", "ITサービスマネージャ", "サービスマネージャ", "ITSM", "業務管理", "社内SE", "社内ＳＥ", "情報システム", "情シス", "社内システム", "テクニカルサポート", "ヘルプデスク", "カスタマーサポート", "サポートエンジニア", "サポートメンバー", "support", "カスタマーサクセス"] },
    { name: "アプリケーション開発", patterns: ["アプリケーションエンジニア", "アプリケーション開発", "アプリケーションアーキテクト", "アプリケーションスペシャリスト", "アプリケーション", "フルスタック", "ソフトウェアエンジニア", "ソフトウェア開発", "バックエンド", "フロントエンド", "Webエンジニア", "アプリエンジニア", "アプリ開発"] },
    { name: "システムエンジニア", patterns: ["システムエンジニア", "システム開発", "開発エンジニア", "システム構築", "システムアナリスト", "システム更改", "\\bSE\\b", "開発", "設計"] },
    { name: "企画・事業開発・営業", patterns: ["事業企画", "事業開発", "企画提案", "企画", "セールス", "営業", "プリセールス", "ビジネスディベロッパー", "新規事業", "新規ビジネス", "新規サービス", "サービス企画", "ビジネス企画", "デザイナ", "マーケティング", "Marketing", "Designer", "Design", "インキュベーション", "事業探索", "経営変革", "事業構想", "アカウント"] },
    { name: "研究開発", patterns: ["研究開発", "リサーチ", "技術調査", "技術戦略", "研究職", "研究員", "研究者", "Research", "Scientist", "Researcher"] },
    { name: "エンジニア（その他）", patterns: ["エンジニア", "テックリード", "技術者", "スペシャリスト", "プロフェッショナル", "リード", "リーダー", "Engineer", "Lead"] }
  ];
  const OTHER_CATEGORY = "その他";
  const compiledRules = JOB_CATEGORY_RULES.map((rule) => ({
    name: rule.name,
    regexes: rule.patterns.map((pattern) => new RegExp(pattern, "i"))
  }));

  function categorizeTitle(title) {
    const text = String(title || "").normalize("NFKC");
    for (const rule of compiledRules) {
      if (rule.regexes.some((regex) => regex.test(text))) return rule.name;
    }
    return OTHER_CATEGORY;
  }

  // app.js の normalizeSkill と同じ整形（NFKC化・空白圧縮・末尾の「経験」「スキル」を除去）。
  function normalizeSkillName(skill) {
    return String(skill || "").normalize("NFKC").replace(/\s+/g, " ").trim()
      .replace(/経験$/, "").replace(/スキル$/, "").trim();
  }

  // company-parsers.js の skillAliases を使って表記ゆれを代表表記へ寄せる（app.js の canonicalSkillTerm 相当）。
  function buildSkillCanonicalizer(aliases) {
    const index = new Map();
    for (const [canonical, variants] of Object.entries(aliases || {})) {
      for (const alias of [canonical, ...(variants || [])]) {
        index.set(normalizeSkillName(alias).toLowerCase(), canonical);
      }
    }
    return (skill) => {
      const term = normalizeSkillName(skill).replace(/C♯/g, "C#");
      if (!term) return "";
      return index.get(term.toLowerCase()) || term;
    };
  }

  // required_skills は JSON 配列（文字列で入っている行もあるため両対応）。
  function parseSkillList(value) {
    if (Array.isArray(value)) return value.map((item) => String(item ?? "")).filter(Boolean);
    if (typeof value === "string") {
      const text = value.trim();
      if (!text) return [];
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? "")).filter(Boolean);
      } catch { /* JSON でなければ区切り文字で分割する */ }
      return text.split(/[,、/・\n]/).map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  // app.js の CERTIFICATION_ALIASES と同じ代表表記への寄せ。
  const CERTIFICATION_ALIASES = {
    "応用情報処理技術者": "応用情報技術者",
    "基本情報処理技術者": "基本情報技術者",
    "project management professional": "PMP",
    "project manager professional": "PMP",
    "pmp": "PMP",
    "aws certified solutions architect": "AWS Certified Solutions Architect - Associate",
    "aws certified solutions architect - associate": "AWS Certified Solutions Architect - Associate",
    "aws certified solutions architect associate": "AWS Certified Solutions Architect - Associate",
    "aws solutions architect": "AWS Certified Solutions Architect - Associate",
    "aws certified developer": "AWS Certified Developer - Associate",
    "aws certified sysops administrator": "AWS Certified CloudOps Engineer - Associate",
    "aws certified devops engineer": "AWS Certified DevOps Engineer - Professional",
    "aws certified security": "AWS Certified Security - Specialty",
    "aws certified machine learning": "AWS Certified Machine Learning - Specialty",
    "google cloud cloud digital leader": "Cloud Digital Leader",
    "google cloud generative ai leader": "Generative AI Leader",
    "google cloud associate cloud engineer": "Associate Cloud Engineer",
    "google cloud associate google workspace administrator": "Associate Google Workspace Administrator",
    "google cloud associate data practitioner": "Associate Data Practitioner",
    "google cloud professional cloud architect": "Professional Cloud Architect",
    "google cloud professional cloud database engineer": "Professional Cloud Database Engineer",
    "google cloud professional cloud developer": "Professional Cloud Developer",
    "google cloud professional data engineer": "Professional Data Engineer",
    "google cloud professional cloud devops engineer": "Professional Cloud DevOps Engineer",
    "google cloud professional cloud security engineer": "Professional Cloud Security Engineer",
    "google cloud professional cloud network engineer": "Professional Cloud Network Engineer",
    "google cloud professional machine learning engineer": "Professional Machine Learning Engineer",
    "google cloud professional security operations engineer": "Professional Security Operations Engineer",
    "csm": "Certified ScrumMaster",
    "cspo": "Certified Scrum Product Owner",
    "psm": "Professional Scrum Master",
    "pspo": "Professional Scrum Product Owner",
    "itil foundation": "ITIL Foundation",
    "認定スクラムマスター": "Certified ScrumMaster",
    "aws認定クラウドプラクティショナー": "AWS Certified Cloud Practitioner",
    "aws認定ソリューションアーキテクトアソシエイト": "AWS Certified Solutions Architect - Associate",
    "aws認定ソリューションアーキテクトプロフェッショナル": "AWS Certified Solutions Architect - Professional",
    "応用情報技術者資格": "応用情報技術者",
    "基本情報技術者資格": "基本情報技術者",
    "プロジェクトマネージャ試験": "プロジェクトマネージャ",
    "システムアーキテクト試験": "システムアーキテクト",
    "データベース": "データベーススペシャリスト",
    "データベーススペシャリスト試験": "データベーススペシャリスト",
    "ネットワーク": "ネットワークスペシャリスト",
    "ネットワークスペシャリスト試験": "ネットワークスペシャリスト",
    "情報処理安全確保支援士試験": "情報処理安全確保支援士",
    "応用情報技術者試験": "応用情報技術者",
    "基本情報技術者試験": "基本情報技術者",
    "itパスポート試験": "ITパスポート",
    "情報セキュリティマネジメント試験": "情報セキュリティマネジメント",
    "itストラテジスト試験": "ITストラテジスト",
    "エンベデッドシステムスペシャリスト試験": "エンベデッドシステムスペシャリスト",
    "itサービスマネージャ試験": "ITサービスマネージャ",
    "システム監査技術者試験": "システム監査技術者"
  };
  const EXCLUDED_CERTIFICATIONS = new Set(["ipa", "情報処理技術者"]);

  function normalizeCertificationName(certification) {
    const normalized = normalizeSkillName(certification);
    if (!normalized) return "";
    const key = normalized.toLowerCase();
    if (EXCLUDED_CERTIFICATIONS.has(key)) return "";
    return CERTIFICATION_ALIASES[key] || normalized;
  }

  // 資格文字列（"PMP / ITIL" 形式）を分割・正規化し、求人単位で重複と包含関係を除く。
  function splitCertifications(value) {
    if (Array.isArray(value)) return [...new Set(value.flatMap((item) => splitCertifications(item)))];
    const text = String(value || "").normalize("NFKC")
      .replace(/応用情報処理技術者/g, "応用情報技術者")
      .replace(/基本情報処理技術者/g, "基本情報技術者");
    if (!text.trim()) return [];
    const parts = text.split(/\s*\/\s*|、|・|，|,|\n/).map((part) => part.trim()).filter(Boolean);
    const normalized = [...new Set(parts.map(normalizeCertificationName).filter(Boolean))];
    return normalized.filter((name, _index, all) =>
      !all.some((other) => other !== name && other.toLowerCase().includes(name.toLowerCase())));
  }

  function jobCertifications(job) {
    return [...new Set([
      ...splitCertifications(job.required_certifications),
      ...splitCertifications(job.preferred_certifications)
    ])];
  }

  function monthKeyOf(isoDate) {
    const key = String(isoDate || "").slice(0, 7);
    return /^\d{4}-\d{2}$/.test(key) ? key : "";
  }

  // データの実期間に合わせて、最小月から最大月までの連続した月リストを作る。
  function buildMonthRange(jobs) {
    const keys = jobs.map((job) => monthKeyOf(job.created_at)).filter(Boolean);
    if (!keys.length) return [];
    const min = keys.reduce((a, b) => (a < b ? a : b));
    const max = keys.reduce((a, b) => (a > b ? a : b));
    const months = [];
    let [year, month] = min.split("-").map(Number);
    const [endYear, endMonth] = max.split("-").map(Number);
    while (year < endYear || (year === endYear && month <= endMonth)) {
      months.push(`${year}-${String(month).padStart(2, "0")}`);
      month += 1;
      if (month > 12) { month = 1; year += 1; }
    }
    return months;
  }

  function sortRanking(map) {
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"));
  }

  // 項目ごとの「全期間ランキング」と「月別推移（上位 topN）」を作る共通処理。
  // itemsOf(job) は求人1件が持つ項目名の配列（重複なし）を返す。
  function buildDimension(jobs, months, itemsOf, topN) {
    const counts = new Map();
    const perMonth = new Map();
    const monthIndex = new Map(months.map((month, index) => [month, index]));
    for (const job of jobs) {
      const items = itemsOf(job);
      const idx = monthIndex.get(monthKeyOf(job.created_at));
      for (const item of items) {
        counts.set(item, (counts.get(item) || 0) + 1);
        if (idx !== undefined) {
          if (!perMonth.has(item)) perMonth.set(item, new Array(months.length).fill(0));
          perMonth.get(item)[idx] += 1;
        }
      }
    }
    const ranking = sortRanking(counts);
    const series = ranking.slice(0, topN).map(({ name }) => ({
      name,
      values: perMonth.get(name) || new Array(months.length).fill(0)
    }));
    return { ranking, series };
  }

  function aggregateJobs(jobs, { skillAliases } = {}) {
    const canonicalSkill = buildSkillCanonicalizer(skillAliases);
    const months = buildMonthRange(jobs);
    const skillSetOf = (field) => (job) =>
      [...new Set(parseSkillList(job[field]).map(canonicalSkill).filter(Boolean))];

    const categoryDimension = buildDimension(jobs, months, (job) => [categorizeTitle(job.title)], 5);
    // 「その他」は件数順にかかわらずランキング末尾に置く。
    categoryDimension.ranking.sort((a, b) =>
      (a.name === OTHER_CATEGORY ? 1 : 0) - (b.name === OTHER_CATEGORY ? 1 : 0) || b.count - a.count);

    const requiredSkills = buildDimension(jobs, months, skillSetOf("required_skills"), 5);
    const preferredSkills = buildDimension(jobs, months, skillSetOf("preferred_skills"), 5);
    const certifications = buildDimension(jobs, months, (job) => jobCertifications(job), 5);

    const withCertification = jobs.filter((job) => jobCertifications(job).length > 0).length;
    const withRequiredCertification = jobs.filter((job) => splitCertifications(job.required_certifications).length > 0).length;

    return {
      total: jobs.length,
      months,
      categories: categoryDimension,
      skills: { required: requiredSkills, preferred: preferredSkills },
      certifications,
      certificationCoverage: {
        withCertification,
        withRequiredCertification,
        ratio: jobs.length ? withCertification / jobs.length : 0
      }
    };
  }

  return {
    JOB_CATEGORY_RULES,
    OTHER_CATEGORY,
    categorizeTitle,
    normalizeSkillName,
    buildSkillCanonicalizer,
    parseSkillList,
    normalizeCertificationName,
    splitCertifications,
    jobCertifications,
    monthKeyOf,
    buildMonthRange,
    aggregateJobs
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = StatsLogic;
}

/* ================= ブラウザ側（描画・取得） ================= */
if (typeof document !== "undefined") {
  const SERIES_COLORS = ["#25d6a2", "#51a7ff", "#ffd18a", "#ff8fa3", "#b79cff"];
  const BAR_COLORS = { category: "#25d6a2", skill: "#51a7ff", certification: "#ffd18a" };
  const state = { supabase: null, stats: null };

  const els = {
    status: document.querySelector("#statsStatus"),
    totalJobs: document.querySelector("#totalJobs"),
    period: document.querySelector("#statsPeriod"),
    certCoverage: document.querySelector("#certCoverageMetric"),
    skillKinds: document.querySelector("#skillKinds"),
    categoryBars: document.querySelector("#categoryBars"),
    categoryLines: document.querySelector("#categoryLines"),
    categoryNote: document.querySelector("#categoryNote"),
    skillType: document.querySelector("#skillTypeSelect"),
    skillBars: document.querySelector("#skillBars"),
    skillLines: document.querySelector("#skillLines"),
    certSummary: document.querySelector("#certSummary"),
    certBars: document.querySelector("#certBars"),
    certLines: document.querySelector("#certLines")
  };

  document.addEventListener("DOMContentLoaded", () => {
    els.skillType.addEventListener("change", renderSkills);
    loadAndRender().catch(showError);
  });

  async function loadSupabaseConfig() {
    const response = await fetch("supabase-config.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`supabase-config.json を読み込めませんでした (HTTP ${response.status})`);
    const config = await response.json();
    const url = config?.supabase?.url;
    const key = config?.supabase?.key;
    if (!url || !key) throw new Error("supabase.url と supabase.key が必要です");
    return { url: url.replace(/\/$/, ""), key };
  }

  async function supabaseRequest(path) {
    const response = await fetch(`${state.supabase.url}/rest/v1/${path}`, {
      headers: {
        apikey: state.supabase.key,
        authorization: `Bearer ${state.supabase.key}`,
        "content-type": "application/json"
      }
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const detail = body?.message || body?.hint || response.statusText;
      throw new Error(`Supabase ${response.status}: ${detail} (${path})`);
    }
    return body;
  }

  // app.js と同じく200件ずつページングして全件取得する。
  async function fetchAllJobs(onProgress) {
    const columns = "id,title,required_skills,preferred_skills,required_certifications,preferred_certifications,created_at";
    const jobs = [];
    const pageSize = 200;
    for (let offset = 0; ; offset += pageSize) {
      const page = await supabaseRequest(`jobs?select=${columns}&order=id.asc&limit=${pageSize}&offset=${offset}`);
      jobs.push(...page);
      if (onProgress) onProgress(jobs.length);
      if (page.length < pageSize) break;
    }
    return jobs;
  }

  async function loadAndRender() {
    setStatus("集計中… 求人を取得しています。");
    state.supabase = await loadSupabaseConfig();
    const jobs = await fetchAllJobs((count) => setStatus(`集計中… ${count}件取得済み`));
    state.stats = StatsLogic.aggregateJobs(jobs, {
      skillAliases: window.JobParserConfig?.skillAliases || {}
    });
    renderAll();
    setStatus(`集計完了：全${state.stats.total}件（登録日ベース・月単位）`);
  }

  function showError(error) {
    console.error(error);
    els.status.hidden = false;
    els.status.classList.add("is-error");
    els.status.innerHTML = "";
    const message = document.createElement("span");
    message.textContent = `統計データを取得できませんでした：${error.message}`;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "ghost-button compact-button";
    retry.textContent = "再試行";
    retry.addEventListener("click", () => {
      els.status.classList.remove("is-error");
      loadAndRender().catch(showError);
    });
    els.status.append(message, retry);
  }

  function setStatus(message) {
    els.status.hidden = false;
    els.status.classList.remove("is-error");
    els.status.textContent = message;
  }

  function formatMonth(month) {
    const [year, mon] = month.split("-");
    return `${year}/${mon}`;
  }

  function renderAll() {
    const stats = state.stats;
    els.totalJobs.textContent = stats.total.toLocaleString("ja-JP");
    els.period.textContent = stats.months.length
      ? `${formatMonth(stats.months[0])} 〜 ${formatMonth(stats.months[stats.months.length - 1])}`
      : "-";
    const coverage = stats.certificationCoverage;
    els.certCoverage.textContent = stats.total
      ? `${coverage.withCertification}件（${Math.round(coverage.ratio * 100)}%）`
      : "-";
    els.skillKinds.textContent = stats.skills.required.ranking.length.toLocaleString("ja-JP");

    renderBarChart(els.categoryBars, stats.categories.ranking, BAR_COLORS.category, stats.total);
    renderLineChart(els.categoryLines, stats.months, stats.categories.series);
    els.categoryNote.textContent = stats.categories.ranking.length
      ? `職種はタイトルのキーワードで ${StatsLogic.JOB_CATEGORY_RULES.length} カテゴリに丸めています（全${stats.categories.ranking.length}区分・その他を含む）。`
      : "";

    renderSkills();

    els.certSummary.textContent = stats.total
      ? `資格指定あり求人は ${coverage.withCertification} 件（全体の ${Math.round(coverage.ratio * 100)}%）、うち必須指定は ${coverage.withRequiredCertification} 件です。`
      : "データがありません";
    renderBarChart(els.certBars, stats.certifications.ranking.slice(0, 15), BAR_COLORS.certification, stats.total);
    renderLineChart(els.certLines, stats.months, stats.certifications.series);
  }

  function renderSkills() {
    if (!state.stats) return;
    const type = els.skillType.value === "preferred" ? "preferred" : "required";
    const dimension = state.stats.skills[type];
    renderBarChart(els.skillBars, dimension.ranking.slice(0, 15), BAR_COLORS.skill, state.stats.total);
    renderLineChart(els.skillLines, state.stats.months, dimension.series);
  }

  function escapeXml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
    }[ch]));
  }

  function truncateLabel(name, maxLength = 16) {
    return name.length > maxLength ? `${name.slice(0, maxLength - 1)}…` : name;
  }

  // 横棒グラフ（ランキング）。件数ラベルを必ず付ける。
  function renderBarChart(container, items, color, total) {
    container.innerHTML = "";
    if (!items.length) {
      container.classList.add("empty");
      container.textContent = "データがありません";
      return;
    }
    container.classList.remove("empty");
    const width = 760;
    const labelWidth = 200;
    const valueWidth = 92;
    const rowHeight = 30;
    const barHeight = 17;
    const height = items.length * rowHeight + 6;
    const max = Math.max(...items.map((item) => item.count), 1);
    const barArea = width - labelWidth - valueWidth;
    const rows = items.map((item, index) => {
      const y = index * rowHeight + 4;
      const barWidth = Math.max(2, (item.count / max) * barArea);
      const pct = total ? Math.round((item.count / total) * 1000) / 10 : 0;
      return `
        <g>
          <title>${escapeXml(item.name)}：${item.count}件（${pct}%）</title>
          <text class="chart-label" x="${labelWidth - 10}" y="${y + barHeight - 4}" text-anchor="end">${escapeXml(truncateLabel(item.name))}</text>
          <rect x="${labelWidth}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${color}" opacity="${index === 0 ? 1 : 0.82}"></rect>
          <text class="chart-value" x="${labelWidth + barWidth + 8}" y="${y + barHeight - 4}">${item.count}件</text>
        </g>`;
    }).join("");
    container.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="件数ランキング">${rows}</svg>`;
  }

  // 折れ線グラフ（月別推移）。系列ごとに色分けし、各点に件数ラベルを付ける。
  function renderLineChart(container, months, series) {
    container.innerHTML = "";
    const visible = series.filter((item) => item.values.some((value) => value > 0));
    if (!months.length || !visible.length) {
      container.classList.add("empty");
      container.textContent = "データがありません";
      return;
    }
    container.classList.remove("empty");

    const legend = document.createElement("div");
    legend.className = "chart-legend";
    visible.forEach((item, index) => {
      const chip = document.createElement("span");
      chip.className = "legend-item";
      const swatch = document.createElement("i");
      swatch.style.background = SERIES_COLORS[index % SERIES_COLORS.length];
      const label = document.createElement("span");
      label.textContent = item.name;
      chip.append(swatch, label);
      legend.appendChild(chip);
    });
    container.appendChild(legend);

    const width = 760;
    const height = 264;
    const padding = { left: 46, right: 16, top: 22, bottom: 32 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const rawMax = Math.max(...visible.flatMap((item) => item.values), 1);
    const yMax = niceCeil(rawMax);
    const xFor = (index) => months.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (months.length - 1)) * plotWidth;
    const yFor = (value) => padding.top + plotHeight - (value / yMax) * plotHeight;

    const gridSteps = 4;
    let grid = "";
    for (let step = 0; step <= gridSteps; step += 1) {
      const value = (yMax / gridSteps) * step;
      const y = yFor(value);
      grid += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid"></line>`;
      grid += `<text class="chart-axis" x="${padding.left - 8}" y="${y + 4}" text-anchor="end">${Math.round(value)}</text>`;
    }
    const xLabels = months.map((month, index) => {
      if (months.length > 8 && index % Math.ceil(months.length / 8) !== 0) return "";
      return `<text class="chart-axis" x="${xFor(index)}" y="${height - 8}" text-anchor="middle">${formatMonth(month)}</text>`;
    }).join("");

    const lines = visible.map((item, seriesIndex) => {
      const color = SERIES_COLORS[seriesIndex % SERIES_COLORS.length];
      const points = item.values.map((value, index) => [xFor(index), yFor(value), value]);
      const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ");
      const dots = points.map(([x, y, value]) => `
        <circle cx="${x}" cy="${y}" r="3.5" fill="${color}"></circle>
        <text class="chart-point-value" x="${x}" y="${y - 8}" text-anchor="middle" fill="${color}">${value}</text>`).join("");
      return `${months.length > 1 ? `<path d="${path}" fill="none" stroke="${color}" stroke-width="2"></path>` : ""}${dots}`;
    }).join("");

    const svg = document.createElement("div");
    svg.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="月別推移">${grid}${xLabels}${lines}</svg>`;
    container.appendChild(svg);
  }

  function niceCeil(value) {
    if (value <= 5) return 5;
    const digits = Math.pow(10, Math.floor(Math.log10(value)));
    const scaled = value / digits;
    const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
    return nice * digits;
  }
}
