const API = (() => {
    if (window.NUMER_API) return String(window.NUMER_API).replace(/\/$/, "");
    const origin = window.location.origin;
    if (/localhost:3000|127\.0\.0\.1:3000/.test(origin)) return origin;
    if (typeof location !== "undefined" && /onrender\.com$/i.test(location.hostname)) return origin;
    return origin;
})();

const _ND = window.NUMEROLOGY_DATA || {};
const {
    TITLE_MAP = {},
    TL_KEYWORD = {},
    TL_COLOR = {},
    TL_DESC = {},
    DEEP_MAP = {},
    MOON_MAP = {},
    P_DETAIL = {},
    C_DETAIL = {},
    QUESTIONS = {},
    GROWTH_DATA = {},
    YEAR_STRATEGY = {},
    MONTHLY_KEYWORDS = {},
    MONTHLY_DESC = {},
    DAY_ADVICE = {},
    DAILY_TIPS = {},
    getZodiacInfo = function(){ return {n:'미지', i:'✨', t:''}; }
} = _ND;

// 토큰은 기기에 유지(앱·탭을 닫아도 재로그인 불필요). 서버에서 무효화(401) 시에만 제거.
const authStorage = window.localStorage;
const TOKEN_KEY = "token";

// 동적 로드 시 DOMContentLoaded가 이미 지났을 수 있으므로 즉시 실행
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkAuth);
} else {
    checkAuth();
}

function showToast(message, type = "warn", duration = 2200) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 260);
    }, duration);
}

async function checkAuth() {
    let token = null;
    try {
        token = authStorage.getItem(TOKEN_KEY);
        if (!token && window.sessionStorage.getItem(TOKEN_KEY)) {
            token = window.sessionStorage.getItem(TOKEN_KEY);
            authStorage.setItem(TOKEN_KEY, token);
            window.sessionStorage.removeItem(TOKEN_KEY);
        }
    } catch (e) {
        // fallback if storage access is blocked
        console.warn("storage access failed", e);
    }
    const loginView = document.getElementById("loginView");
    const container = document.querySelector(".container");
    const setAuthView = (isLoggedIn) => {
        if (isLoggedIn) {
            loginView.style.display = "none";
            container.style.display = "block";
        } else {
            loginView.style.display = "block";
            container.style.display = "none";
        }
    };

    if (!token) {
        setAuthView(false);
        return;
    }

    if (token === "local-fallback-token") {
        authStorage.removeItem(TOKEN_KEY);
        try {
            window.sessionStorage.removeItem(TOKEN_KEY);
        } catch (e2) { /* ignore */ }
        showToast("로그인 방식이 변경되었습니다. 서버 비밀번호로 다시 로그인해주세요.", "warn", 3200);
        setAuthView(false);
        return;
    }

    if (navigator.onLine) {
        try {
            const res = await fetch(API + "/check-auth", {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.status === 401) {
                showToast("비밀번호가 변경되어 다시 로그인해주세요.", "error", 2800);
                authStorage.removeItem(TOKEN_KEY);
                window.sessionStorage.removeItem(TOKEN_KEY);
                setAuthView(false);
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (data.token) {
                authStorage.setItem(TOKEN_KEY, data.token);
            }
        } catch (e) {
            console.log("서버 응답 없음, 현재 세션 유지");
        }
    }

    setAuthView(true);
}

async function login() {
    const password = document.getElementById("password").value;

    try {
        const res = await fetch(API + "/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        if (res.ok) {
            const data = await res.json();
            authStorage.setItem(TOKEN_KEY, data.token);
            showToast("인증 성공!", "success");
            location.reload();
        } else {
            showToast("비밀번호가 틀렸습니다.", "error");
        }
    } catch (e) {
        console.error("Login fetch error:", e);
        showToast("서버에 연결할 수 없습니다. 네트워크 확인 후 다시 시도해주세요.", "error", 3200);
    }
}

// 버튼 클릭 이벤트 리스너 (보안 체크)
document.getElementById("btnRun").addEventListener("click", function () {
    const token = authStorage.getItem(TOKEN_KEY);
    if (token) {
        startAnalysis();
    } else {
        showToast("로그인이 필요합니다.", "warn");
        document.querySelector(".container").style.display = "none";
        document.getElementById("loginView").style.display = "block";
    }
});

function getNameScore(name) {
    let soulSum = 0;
    let consSum = 0;
    const allDigits = new Set();
    const isH = /[ㄱ-ㅎ|가-힣]/.test(name);
    const hc = { "ㄱ": 1, "ㄴ": 2, "ㄷ": 3, "ㄹ": 4, "ㅁ": 5, "ㅂ": 6, "ㅅ": 7, "ㅇ": 8, "ㅈ": 9, "ㅊ": 1, "ㅋ": 2, "ㅌ": 3, "ㅍ": 4, "ㅎ": 5 };
    const hv = { "ㅏ": 1, "ㅐ": 2, "ㅑ": 2, "ㅒ": 3, "ㅓ": 3, "ㅔ": 4, "ㅕ": 4, "ㅖ": 5, "ㅗ": 5, "ㅘ": 6, "ㅙ": 7, "ㅚ": 8, "ㅛ": 6, "ㅜ": 7, "ㅝ": 8, "ㅞ": 9, "ㅟ": 1, "ㅠ": 8, "ㅡ": 9, "ㅢ": 1, "ㅣ": 1 };
    const enVal = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9, S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8 };
    if (isH) {
        for (const char of name) {
            const code = char.charCodeAt(0) - 44032;
            if (code < 0 || code > 11171) continue;
            const cho = Math.floor(code / 588);
            const jung = Math.floor((code % 588) / 28);
            const jong = code % 28;
            const choList = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
            const jungList = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
            const jongList = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
            const choChar = choList[cho];
            const nCho = { "ㄲ": "ㄱ", "ㄸ": "ㄷ", "ㅃ": "ㅂ", "ㅆ": "ㅅ", "ㅉ": "ㅈ" }[choChar] || choChar;
            const choVal = hc[nCho] || 0;
            consSum += choVal;
            if (choVal > 0) allDigits.add(choVal);
            const jungVal = hv[jungList[jung]] || 0;
            soulSum += jungVal;
            if (jungVal > 0) allDigits.add(jungVal);
            if (jong > 0) {
                const jChar = jongList[jong].substring(0, 1);
                const nJ = { "ㄲ": "ㄱ", "ㄸ": "ㄷ", "ㅃ": "ㅂ", "ㅆ": "ㅅ", "ㅉ": "ㅈ" }[jChar] || jChar;
                const jVal = hc[nJ] || 0;
                consSum += jVal;
                if (jVal > 0) allDigits.add(jVal);
            }
        }
    } else {
        for (const c of name.toUpperCase().replace(/[^A-Z]/g, "")) {
            const val = enVal[c] || 0;
            if (["A", "E", "I", "O", "U"].includes(c)) {
                soulSum += val;
            } else {
                consSum += val;
            }
            if (val > 0) allDigits.add(val);
        }
    }
    return { soulSum, consSum, allDigits };
}

function reduceToSingle(n, allowM = true) {
    let r = n;
    while (r > 9) {
        if (allowM && (r === 11 || r === 22 || r === 33)) return r;
        r = String(r).split("").reduce((a, b) => Number(a) + Number(b), 0);
    }
    return r;
}

/** 인생 4단계 펼침 설명에서 '심층분석리포트' 제목(및 그 이후)만 제거 */
function stripDeepReportSection(html) {
    if (!html || typeof html !== "string") return "";
    const needles = ["심층분석리포트", "심층 분석 리포트", "심층진단리포트", "심층 진단 리포트"];
    let pos = -1;
    for (const n of needles) {
        const i = html.indexOf(n);
        if (i !== -1 && (pos === -1 || i < pos)) pos = i;
    }
    if (pos === -1) return html;
    let s = html.slice(0, pos);
    s = s.replace(/<[^>]*$/, "").trimEnd();
    s = s.replace(/(?:<br\s*\/?>|\s)+$/i, "");
    return s;
}

function initAccordion() {
    document.querySelectorAll(".accordion-header,.cycle-header-acc").forEach(h => {
        h.onclick = function () {
            this.parentElement.classList.toggle("active");
        };
    });
}

function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function getMonthlyEnergyDesc(num) {
    const n = Number(num);
    if (!Number.isFinite(n)) return "";
    if (MONTHLY_DESC[n]) return MONTHLY_DESC[n];
    const mod = n % 9 === 0 ? 9 : n % 9;
    if (MONTHLY_DESC[mod]) return MONTHLY_DESC[mod];
    return DEEP_MAP[n] || DEEP_MAP[mod] || "";
}

function renderTimeline(mr_r, dr_r, py, curYear, curM) {
    const yearData = [];
    for (let i = 0; i < 10; i++) {
        const yr = curYear + i;
        const ySum = String(yr).split("").reduce((a, b) => Number(a) + Number(b), 0);
        const yRed = reduceToSingle(ySum, true);
        const num = reduceToSingle(yRed + mr_r + dr_r, true);
        yearData.push({ year: yr, num });
    }

    const cur = yearData[0];
    setHtml("currentBanner", `
        <div style="flex:1">
            <div style="font-size:0.68rem;color:var(--muted);margin-bottom:3px;">현재 흐름</div>
            <div style="font-size:0.95rem;font-weight:bold;">
                <span style="color:var(--accent);font-size:1.1rem;font-weight:900;">${curYear}년</span>
                &nbsp;·&nbsp; ${cur.num}번
                <strong style="color:var(--teal)">${TITLE_MAP[cur.num] || ""}</strong>
            </div>
        </div>
        <div style="font-size:3rem;font-weight:900;color:rgba(163,102,255,0.2);line-height:1;">${cur.num}</div>
    `);

    const chartEl = document.getElementById("chartInner");
    chartEl.innerHTML = "";
    yearData.forEach(({ year, num }) => {
        const isCurrent = year === curYear;
        const isTurning = num === 1 && year !== curYear;
        const displayNum = num > 9 ? (num === 11 ? 8 : 9) : num;
        const hPx = Math.round((displayNum / 11) * 110) + 16;
        const color = TL_COLOR[num] || "#555";
        const barBg = isCurrent ? color : isTurning ? "var(--gold)" : "#2a2f3e";

        const col = document.createElement("div");
        col.className = `bar-col${isCurrent ? " current" : ""}${isTurning ? " turning" : ""}`;
        col.innerHTML = `
            <div class="bar-energy">${num}</div>
            <div class="bar-keyword">${TL_KEYWORD[num] || ""}</div>
            <div class="bar-body" style="height:${hPx}px;background:${barBg};"></div>
            <div class="bar-year">${String(year).slice(2)}'</div>
        `;
        chartEl.appendChild(col);
    });

    const cardsEl = document.getElementById("yearCards");
    cardsEl.innerHTML = "";
    yearData.forEach(({ year, num }) => {
        const isCurrent = year === curYear;
        const isTurning = num === 1 && year !== curYear;
        const color = TL_COLOR[num] || "#aaa";
        const card = document.createElement("div");
        card.className = `year-card${isCurrent ? " current" : ""}${isTurning ? " turning" : ""}`;
        card.innerHTML = `
            ${isCurrent ? '<span class="yc-badge now">NOW</span>' : ""}
            ${isTurning ? '<span class="yc-badge turn">전환점</span>' : ""}
            <span class="yc-year">${year}</span>
            <span class="yc-num" style="color:${color}">${num}</span>
            <span class="yc-keyword" style="color:${color}">${TL_KEYWORD[num] || ""}</span>
            <span class="yc-desc">${TL_DESC[num] || ""}</span>
        `;
        cardsEl.appendChild(card);
    });

    const turning = yearData.find(d => d.num === 1 && d.year !== curYear);
    const peak = yearData.reduce((a, b) => {
        const av = a.num > 9 ? (a.num === 11 ? 8 : 9) : a.num;
        const bv = b.num > 9 ? (b.num === 11 ? 8 : 9) : b.num;
        return bv > av ? b : a;
    });
    let html = "<strong>📍 10년 타임라인 핵심 인사이트</strong><br><br>";
    if (turning) html += `🔄 <strong>다음 전환점:</strong> <span style="color:var(--gold)">${turning.year}년</span> — 새로운 9년 주기가 시작됩니다. 삶의 방향이 재설정되는 시기입니다.<br><br>`;
    html += `⚡ <strong>에너지 정점:</strong> <span style="color:var(--teal)">${peak.year}년 (${peak.num}번 · ${TITLE_MAP[peak.num] || ""})</span> — 이 시기에 가장 강력한 성취 에너지가 흐릅니다.<br><br>`;
    html += `💡 <strong>지금(${curYear}):</strong> ${TL_DESC[cur.num] || ""}`;
    setHtml("insightBox", html);
}

function startAnalysis() {
    const nameRaw = document.getElementById("inputName").value.trim();
    const name = nameRaw || "무명";
    // Ensure data is loaded and valid
    if (!window.NUMEROLOGY_DATA || typeof TITLE_MAP === "undefined" || typeof GROWTH_DATA === "undefined" || Object.keys(GROWTH_DATA).length === 0) {
        showToast("데이터가 완전히 로드되지 않았습니다. 새로고침(F5) 후 다시 시도해주세요.", "warn", 3000);
        return;
    }
    const dateStr = document.getElementById("inputBirth").value;
    if (!dateStr) {
        showToast("생년월일을 먼저 선택해주세요.", "warn");
        document.getElementById("inputBirth").focus();
        return;
    }
    const [y, m, d] = dateStr.split("-").map(Number);
    document.getElementById("v-birth-display").innerText = `(${y}년 ${m}월 ${d}일)`;

    const z = getZodiacInfo(m, d);
    document.getElementById("v-zodiac-name").innerText = `${z.i} ${z.n}`;
    document.getElementById("v-zodiac-desc").innerText = z.t;

    const yr_r = reduceToSingle(String(y).split("").reduce((a, b) => Number(a) + Number(b), 0), true);
    const mr_r = reduceToSingle(m, true);
    const dr_r = reduceToSingle(d, true);

    const lpS = yr_r + mr_r + dr_r;
    const lp = reduceToSingle(lpS, true);
    const mnS = mr_r + dr_r;
    const mn = reduceToSingle(mnS, true);
    const sc = getNameScore(name);
    const su = reduceToSingle(sc.soulSum, true);
    const ps = reduceToSingle(sc.consSum, true);
    const dt = reduceToSingle(sc.soulSum + sc.consSum, true);
    const mt = reduceToSingle(lp + dt, true);

    document.getElementById("v-lp").innerText = `${lp}(${lpS})`;
    document.getElementById("v-mn").innerText = `${mn}(${mnS})`;

    const hasName = nameRaw.length > 0;
    const nameCardsEl = document.getElementById("nameNumberCards");
    if (nameCardsEl) nameCardsEl.style.display = hasName ? "contents" : "none";

    if (hasName) {
        document.getElementById("v-dt").innerText = dt;
        document.getElementById("v-su").innerText = su;
        document.getElementById("v-ps").innerText = ps;
        document.getElementById("v-mt").innerText = mt;
    }

    const coreItems = [
        { k: "인생여정수", v: lp },
        { k: "문 넘버", v: mn },
        ...(hasName ? [
            { k: "혼의 수", v: su },
            { k: "성격수", v: ps },
            { k: "완성수", v: mt },
            { k: "운명수", v: dt }
        ] : [])
    ];
    setHtml("coreDescArea", coreItems.map(i => {
        const desc = i.k === "문 넘버" ? (MOON_MAP[i.v] || "") : (DEEP_MAP[i.v] || "");
        return `
            <div class="accordion">
                <div class="accordion-header"><h4>✦ ${i.k} ${i.v}번 분석</h4></div>
                <div class="accordion-content">
                    <span class="q-text">Q. ${QUESTIONS[i.k]}</span>
                    <div class="desc-content">${desc}</div>
                </div>
            </div>`;
    }).join(""));

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const curD = now.getDate();
    const curY_r = reduceToSingle(String(curY).split("").reduce((a, b) => Number(a) + Number(b), 0), true);
    const pyS = curY_r + mr_r + dr_r;
    const py = reduceToSingle(pyS, true);
    const pmS = py + curM;
    const pm = reduceToSingle(pmS, true);
    const pdS = pm + curD;
    const pd = reduceToSingle(pdS, true);

    document.getElementById("v-py").innerText = `${py}(${pyS})`;
    document.getElementById("v-pm").innerText = `${pm}(${pmS})`;
    document.getElementById("v-pd").innerText = `${pd}(${pdS})`;

    setHtml("flowDescArea", [{ k: "올해의 수", v: py }, { k: "이번 달의 수", v: pm }, { k: "오늘의 수", v: pd }]
        .map(i => `<div class="accordion"><div class="accordion-header"><h4>✦ ${i.k} ${i.v}번 흐름</h4></div><div class="accordion-content"><span class="q-text">Q. ${QUESTIONS[i.k]}</span><div class="desc-content">${DEEP_MAP[i.v] || ""}</div></div></div>`)
        .join(""));

    const lpV = (lp === 11 ? 2 : (lp === 22 ? 4 : (lp === 33 ? 6 : lp)));
    const age1 = 36 - lpV;
    const userAgeForCycle = curY - y;
    const curMajorIdx = userAgeForCycle <= age1 ? 0 : (userAgeForCycle <= age1 + 27 ? 1 : 2);
    const majorCards = [
        { label: "제1주기 (월)", num: mr_r, range: `0~${age1}세` },
        { label: "제2주기 (일)", num: dr_r, range: `${age1+1}~${age1+27}세` },
        { label: "제3주기 (년)", num: yr_r, range: `${age1+28}세~` }
    ];
    setHtml("mainCycleGrid", majorCards.map((mc, i) => `
        <div class="cycle-mini-card ${i === curMajorIdx ? 'cycle-mini-active' : ''}">
            <span>${mc.label}</span>
            <strong>${mc.num}</strong>
            <div class="cycle-mini-range">${mc.range}</div>
        </div>`).join(""));
    setHtml("mainCycleArea", [{ t: "첫 번째 주기", a: `0~${age1}세`, v: mr_r, q: "인생의 전반기, 어떤 씨앗을 뿌려야 하는가?" }, { t: "두 번째 주기", a: `${age1 + 1}~${age1 + 27}세`, v: dr_r, q: "인생의 중반기, 어떤 꽃을 피워야 하는가?" }, { t: "세 번째 주기", a: `${age1 + 28}세~`, v: yr_r, q: "인생의 후반기, 어떤 열매를 거두어야 하는가?" }]
        .map((c, i) => `<div class="accordion"><div class="accordion-header"><h4>✦ ${c.t} ${c.v}번 (${c.a})${i === curMajorIdx ? ' <span class="major-now-badge">현재</span>' : ''}</h4></div><div class="accordion-content"><span class="q-text">Q. ${c.q}</span><div class="desc-content">${DEEP_MAP[c.v] || ""}</div></div></div>`)
        .join(""));

    const p1 = reduceToSingle(mr_r + dr_r, true);
    const p2 = reduceToSingle(dr_r + yr_r, true);
    const p3 = reduceToSingle(p1 + p2, true);
    const p4 = reduceToSingle(mr_r + yr_r, true);
    const c1 = reduceToSingle(Math.abs(mr_r - dr_r), true);
    const c2 = reduceToSingle(Math.abs(dr_r - yr_r), true);
    const c3 = reduceToSingle(Math.abs(c1 - c2), true);
    const c4 = reduceToSingle(Math.abs(mr_r - yr_r), true);
    const cyData = [{ s: "1단계", a: `0~${age1}`, p: p1, c: c1 }, { s: "2단계", a: `${age1 + 1}~${age1 + 9}`, p: p2, c: c2 }, { s: "3단계", a: `${age1 + 10}~${age1 + 18}`, p: p3, c: c3 }, { s: "4단계", a: `${age1 + 19}~`, p: p4, c: c4 }];

    // ── 현재 단계 계산 ──
    const userAge = curY - y;
    let curStageIdx = 3;
    if (userAge <= age1) curStageIdx = 0;
    else if (userAge <= age1 + 9) curStageIdx = 1;
    else if (userAge <= age1 + 18) curStageIdx = 2;

    setHtml("tableBody", cyData.map((c, i) => `
        <tr class="${i === curStageIdx ? "stage-current-row" : ""}">
            <td>${c.s}</td>
            <td>${c.a}</td>
            <td class="p-num">${c.p}</td>
            <td class="c-num">${c.c}</td>
        </tr>
    `).join(""));
    const pHtml = (p) => stripDeepReportSection(P_DETAIL[p] || "");
    const cHtml = (c) => stripDeepReportSection(C_DETAIL[c] || "");
    setHtml("cycleArea", cyData.map((c, i) => `<div class="cycle-block"><div class="cycle-header-acc"><div class="cy-hd-left"><span class="cy-hd-stage">${c.s} (${c.a}세)</span><span class="cy-hd-age">${TITLE_MAP[c.p] || ""}${i === curStageIdx ? ' <span class="major-now-badge">현재</span>' : ""}</span></div><div class="cy-hd-badges"><span class="cy-badge-p">P${c.p}</span><span class="cy-badge-c">C${c.c}</span></div></div><div class="cycle-content-acc"><div class="cy-info-row"><span class="cycle-label-p">📍 환경 ${c.p}번</span></div><div class="cycle-text"><div class="pdetail-inner">${pHtml(c.p)}</div></div><div class="cy-info-row"><span class="cycle-label-c">🎯 과제 ${c.c}번</span></div><div class="cycle-text"><div class="pdetail-inner">${cHtml(c.c)}</div></div></div></div>`).join(""));
    const stageSeasons = ["봄 · 씨앗기", "여름 · 성장기", "가을 · 결실기", "겨울 · 완성기"];

    // ── 프로그레스 바 ──
    setHtml("stageProgressBar", `<div class="stage-progress-wrap">
        <div class="stage-progress-bar">
            ${cyData.map((c, i) => `
                <div class="stage-step ${i === curStageIdx ? 'active' : i < curStageIdx ? 'done' : ''}">
                    <div class="step-dot">${i < curStageIdx ? '✓' : (i === curStageIdx ? '◉' : String(i + 1))}</div>
                    <div class="step-label">${c.s}<br>${stageSeasons[i]}</div>
                </div>
                ${i < 3 ? `<div class="step-line-wrap"><div class="step-line ${i < curStageIdx ? 'done' : ''}"></div></div>` : ''}
            `).join("")}
        </div>
        <div class="stage-progress-msg">
            현재 당신은 <strong style="color:var(--gold);">${curStageIdx + 1}단계 — ${stageSeasons[curStageIdx]}</strong>를 지나고 있습니다
            <span style="color:var(--muted);font-size:0.72rem;margin-left:5px;">(${cyData[curStageIdx].a}세)</span>
        </div>
    </div>`);

    const cs = YEAR_STRATEGY[py] || YEAR_STRATEGY[1];
    setHtml("yearHighlightArea", `<div class="card" style="border:1px solid var(--accent);background:linear-gradient(145deg,rgba(163,102,255,0.12),rgba(20,184,166,0.08));padding:14px 16px;margin-top:20px;margin-bottom:16px;border-radius:12px;position:relative;overflow:hidden;"><div style="position:absolute;top:-6px;right:8px;font-size:3.5rem;color:rgba(163,102,255,0.08);font-weight:bold;line-height:1;">${py}</div><div style="font-size:0.72rem;color:var(--teal);font-weight:700;margin-bottom:4px;">🌟 ${curY}년 메인 테마</div><div style="font-size:1.1rem;font-weight:bold;color:var(--text);margin-bottom:8px;">${py}번. ${TITLE_MAP[py]}</div><p style="font-size:0.84rem;color:#ccc;line-height:1.55;position:relative;z-index:1;margin:0;"><b style="color:var(--gold);">목표:</b> ${cs.goal}<br><b style="color:var(--gold);">전략:</b> ${cs.action}</p></div>`);

    renderTimeline(mr_r, dr_r, py, curY, curM);

    const turningPoints = [];
    for (let age = 15; age <= 85; age++) {
        const checkYear = y + age;
        const ySum = String(checkYear).split("").reduce((a, b) => Number(a) + Number(b), 0);
        const yRed = reduceToSingle(ySum, true);
        const checkPy = reduceToSingle(yRed + mr_r + dr_r, true);
        if (checkPy === 1) turningPoints.push({ age, year: checkYear });
    }
    const upcoming = turningPoints.find(p => p.year >= curY) || turningPoints[0];
    if (upcoming) {
        setHtml("turningPointArea", `<div class="card" style="border:1px solid var(--gold);background:rgba(251,197,49,0.04);padding:10px 14px;border-radius:10px;"><div style="font-size:0.75rem;color:var(--gold);font-weight:700;margin-bottom:4px;">🚀 가장 가까운 인생 전환점</div><p style="font-size:0.84rem;line-height:1.55;color:var(--text);margin:0;">다음 변화는 <strong style="color:var(--accent);">${upcoming.year}년 (${upcoming.age}세)</strong>에 찾아옵니다. 새로운 9년 주기가 시작되는 이 시기, 인생의 중요한 결단과 환경 변화가 일어납니다.</p></div>`);
    }

    const monthlyGrid = document.getElementById("monthlyForecastGrid");
    if (monthlyGrid) {
        const monthlyCards = [];
        for (let mo = 1; mo <= 12; mo++) {
            const pm2 = reduceToSingle(py + mo, true);
            const isCurrentMonth = (mo === curM);
            const kw = MONTHLY_KEYWORDS[pm2] || (MONTHLY_KEYWORDS[(pm2 % 9 === 0) ? 9 : pm2 % 9] || "흐름");
            monthlyCards.push(`<div class="card" style="padding:10px 2px;${isCurrentMonth ? "border:1px solid var(--teal);background:rgba(20,184,166,0.1);" : "border:1px solid #222;"}"><span style="font-size:0.65rem;color:${isCurrentMonth ? "var(--teal)" : "var(--muted)"}">${mo}월</span><strong style="font-size:1.1rem;display:block;margin:2px 0;color:var(--accent);">${pm2}</strong><span style="font-size:0.6rem;color:#ccc;">${kw}</span></div>`);
        }
        monthlyGrid.innerHTML = monthlyCards.join("");
    }

    const monthlyDescEl = document.getElementById("monthlyDescArea");
    if (monthlyDescEl) {
        const monthRows = [];
        for (let mo = 1; mo <= 12; mo++) {
            const pm2 = reduceToSingle(py + mo, true);
            const kw = MONTHLY_KEYWORDS[pm2] || (MONTHLY_KEYWORDS[(pm2 % 9 === 0) ? 9 : pm2 % 9] || "흐름");
            const desc = getMonthlyEnergyDesc(pm2);
            monthRows.push(`<div class="accordion"><div class="accordion-header"><h4>✦ ${mo}월 — ${pm2}번 월별 흐름</h4></div><div class="accordion-content"><span class="q-text">핵심 키워드: ${kw}</span><div class="desc-content">${desc}</div></div></div>`);
        }
        setHtml("monthlyDescArea", monthRows.join(""));
    }

    const weeklyTableBody = document.getElementById("weeklyTableBody");
    if (weeklyTableBody) {
        const weekRows = [];
        for (let i = 0; i < 7; i++) {
            const td = new Date();
            td.setDate(now.getDate() + i);
            const tM = td.getMonth() + 1;
            const tD = td.getDate();
            const tPm = reduceToSingle(py + tM);
            const tPd = reduceToSingle(tPm + tD, true);
            const adv = DAY_ADVICE[tPd] || { status: "평온", desc: "차분하게 에너지를 비축하세요." };
            let ss = "";
            if (tPd === 4 || tPd === 9) ss = "color:var(--red);font-weight:bold;";
            if (tPd === 1 || tPd === 8) ss = "color:var(--gold);font-weight:bold;";
            if (tPd === 11 || tPd === 22) ss = "color:var(--accent);font-weight:bold;";
            weekRows.push(`<tr><td style="font-size:0.85rem;">${tM}/${tD}</td><td class="p-num" style="font-size:1rem;color:var(--gold);">${tPd}</td><td style="${ss}">${adv.status}</td><td style="text-align:left;font-size:0.85rem;line-height:1.4;">${adv.desc}</td></tr>`);
        }
        weeklyTableBody.innerHTML = weekRows.join("");
    }

    const tip = DAILY_TIPS[pd] || DAILY_TIPS[1];
    document.getElementById("luckAction").innerText = tip.a;
    document.getElementById("luckCaution").innerText = tip.c;


    document.getElementById("resultView").style.display = "block";
    document.getElementById("finalDownloadBtn").style.display = "flex";
    initAccordion();
}

async function downloadPDF() {
    const resultView = document.getElementById("resultView");
    if (resultView.style.display === "none") {
        showToast('"나의 라이프코드 확인하기"를 먼저 실행해주세요.', "warn", 2600);
        return;
    }

    const { jsPDF } = window.jspdf;
    const btn = document.getElementById("finalDownloadBtn");
    btn.style.display = "none";
    const element = document.querySelector(".container");

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#090a10",
            scrollY: -window.scrollY,
            windowHeight: element.scrollHeight
        });

        const imgData = canvas.toDataURL("image/png");
        const tmp = new jsPDF("p", "mm", "a4");
        const imgProps = tmp.getImageProperties(imgData);
        const pageWidth = tmp.internal.pageSize.getWidth();
        const imgHeight = (imgProps.height * pageWidth) / imgProps.width;
        const fileName = `라이프코드_분석리포트_${new Date().toLocaleDateString()}.pdf`;

        const longPdf = new jsPDF("p", "mm", [pageWidth, imgHeight]);
        longPdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
        longPdf.save(fileName);
        showToast("PDF로 저장되었습니다.", "success", 2600);
    } catch (error) {
        console.error("PDF 생성 실패:", error);
        showToast("PDF 생성 중 오류가 발생했습니다.", "error", 2800);
    } finally {
        btn.style.display = "flex";
    }
}

if ("serviceWorker" in navigator) {
    let swReloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (swReloading) return;
        swReloading = true;
        window.location.reload();
    });

    const pingSwUpdate = () => {
        navigator.serviceWorker.getRegistration().then((reg) => {
            if (reg) reg.update().catch(() => {});
        });
    };
    window.addEventListener("online", () => {
        pingSwUpdate();
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && navigator.onLine) {
            pingSwUpdate();
        }
    });

    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").then((reg) => {
            console.log("서비스 워커 등록 성공!", reg);
            reg.update().catch(() => {});
            reg.addEventListener("updatefound", () => {
                const nw = reg.installing;
                if (!nw) return;
                nw.addEventListener("statechange", () => {
                    if (nw.state === "installed" && navigator.serviceWorker.controller) {
                        showToast("새 버전 적용 중…", "success", 1400);
                    }
                });
            });
        }).catch((err) => {
            console.log("서비스 워커 등록 실패", err);
        });
    });
}

let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBanner = document.createElement("div");
    installBanner.style = "position:fixed; top:0; left:0; width:100%; background:var(--accent); color:white; padding:15px; text-align:center; z-index:10000; cursor:pointer; font-weight:bold;";
    installBanner.innerHTML = "✨ 편리한 이용을 위해 '라이프코드 앱'으로 저장하기 (클릭)";
    document.body.appendChild(installBanner);
    installBanner.addEventListener("click", () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            installBanner.remove();
        });
    });
});
