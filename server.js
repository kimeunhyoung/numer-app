const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();
const app = express();
app.set("trust proxy", 1);

// 주소창이나 링크 오타로 `//create-invite` 처럼 이중 슬래시가 들어오면 Express가 라우트를 못 찾음 → `/...` 로 리다이렉트
app.use((req, res, next) => {
    const u = req.originalUrl || req.url || "";
    const qIdx = u.indexOf("?");
    const pathPart = qIdx === -1 ? u : u.slice(0, qIdx);
    const query = qIdx === -1 ? "" : u.slice(qIdx);
    if (pathPart.startsWith("//")) {
        const normalized = pathPart.replace(/^\/+/, "/");
        return res.redirect(301, normalized + query);
    }
    next();
});

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

const SECRET = process.env.JWT_SECRET || "dev-change-me-secret";
let CURRENT_PASSWORD = process.env.APP_PASSWORD || "888";

/** 설치 앱·브라우저 세션용 JWT 수명. 무효화는 APP_PASSWORD 변경(지문 불일치) 또는 JWT_SECRET 변경 시. (QR 초대 2시간과 무관; env AUTH_TOKEN_EXPIRES 로 조절 가능) */
const AUTH_TOKEN_EXPIRES = process.env.AUTH_TOKEN_EXPIRES || "3650d";

/** APP_PASSWORD가 바뀌면 값이 달라져, 온라인 check-auth 시 기존 JWT는 401 처리됨 */
function passwordFingerprint() {
    return crypto
        .createHash("sha256")
        .update(`pw:${String(CURRENT_PASSWORD)}|secret:${String(SECRET)}`, "utf8")
        .digest("hex");
}
/**
 * QR에 들어가는 /enter 링크는 create-invite 요청의 Host로 만듦 → numer-app으로 열면 numer-app URL이 박힘(env에 남은 numerology 주소 무시).
 * PUBLIC_QR_BASE_URL이 있으면 그것만 최우선(커스텀 도메인).
 * APP_BASE_URL: 로그·기타용 fallback, QR에는 직접 쓰지 않음.
 */
const PORT = Number(process.env.PORT || 3000);
const APP_BASE_URL = (
    process.env.PUBLIC_QR_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.APP_BASE_URL ||
    `http://127.0.0.1:${PORT}`
).replace(/\/$/, "");
let oneTimeKeys = new Map();

/** QR·초대 링크의 origin: 실제로 주소창에 친 호스트와 동일하게 (Render 프록시 헤더 반영) */
function publicOriginForInvite(req) {
    if (process.env.PUBLIC_QR_BASE_URL) {
        return String(process.env.PUBLIC_QR_BASE_URL).replace(/\/$/, "");
    }
    const rawProto = req.get("x-forwarded-proto") || req.protocol || "https";
    const proto = String(rawProto).split(",")[0].trim() || "https";
    const rawHost = req.get("x-forwarded-host") || req.get("host") || "";
    const host = String(rawHost).split(",")[0].trim();
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
    return APP_BASE_URL;
}

// 1. QR 생성 페이지 (선생님 전용)
app.get("/create-invite", (req, res) => {
    const inviteKey = Math.random().toString(36).substring(2, 15);
    const expireAt = Date.now() + 2 * 60 * 60 * 1000;
    oneTimeKeys.set(inviteKey, expireAt);
    setTimeout(() => oneTimeKeys.delete(inviteKey), 2 * 60 * 60 * 1000);

    const inviteLink = `${publicOriginForInvite(req)}/enter?key=${inviteKey}`;

    res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>QR 생성</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            <style>
                body { background: #090a10; color: white; font-family: sans-serif; 
                       display: flex; flex-direction: column; align-items: center; 
                       justify-content: center; min-height: 100vh; padding: 20px; }
                .box { background: #161a25; border: 1px solid #333; border-radius: 20px; 
                       padding: 30px; text-align: center; max-width: 400px; width: 100%; }
                h2 { color: #a366ff; margin-bottom: 5px; }
                .qr-wrap { background: white; padding: 15px; border-radius: 12px; 
                           display: inline-block; margin: 20px 0; }
                .timer { font-size: 1.2rem; color: #fbc531; font-weight: bold; margin: 10px 0; }
                .link { font-size: 0.7rem; color: #8b949e; word-break: break-all; 
                        background: #0d1117; padding: 10px; border-radius: 8px; margin-top: 10px; }
                .btn { background: #a366ff; color: white; border: none; padding: 12px 24px; 
                       border-radius: 10px; cursor: pointer; font-size: 1rem; 
                       margin-top: 15px; width: 100%; }
            </style>
        </head>
        <body>
            <div class="box">
                <h2>✦ 라이프코드 QR</h2>
                <p style="color:#8b949e;font-size:0.85rem;">아래 QR을 고객에게 보여주세요</p>
                <div class="qr-wrap">
                    <div id="qrcode"></div>
                </div>
                <div class="timer" id="timer">⏳ 유효시간: 02:00:00</div>
                <div class="link">${inviteLink}</div>
                <button class="btn" onclick="location.href='/create-invite'">🔄 새 QR 생성</button>
            </div>
            <script>
                new QRCode(document.getElementById("qrcode"), {
                    text: "${inviteLink}",
                    width: 200,
                    height: 200,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                });

                let remain = 2 * 60 * 60;
                function updateTimer() {
                    if (remain <= 0) {
                        document.getElementById("timer").innerHTML = "❌ 만료됨";
                        return;
                    }
                    const h = String(Math.floor(remain / 3600)).padStart(2, '0');
                    const m = String(Math.floor((remain % 3600) / 60)).padStart(2, '0');
                    const s = String(remain % 60).padStart(2, '0');
                    document.getElementById("timer").innerHTML = "⏳ 유효시간: " + h + ":" + m + ":" + s;
                    remain--;
                }
                updateTimer();
                setInterval(updateTimer, 1000);
            </script>
        </body>
        </html>
    `);
});

// 2. QR 접속 처리
app.get("/enter", (req, res) => {
    const userKey = req.query.key;
    const expireAt = oneTimeKeys.get(userKey);

    if (!expireAt || Date.now() > expireAt) {
        oneTimeKeys.delete(userKey);
        return res.status(403).send(`
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>접근 불가</title>
                <style>
                    body { background: #090a10; color: white; font-family: sans-serif;
                           display: flex; align-items: center; justify-content: center; 
                           min-height: 100vh; text-align: center; padding: 20px; }
                    .box { background: #161a25; border: 1px solid #ff7b72; 
                           border-radius: 20px; padding: 40px; max-width: 350px; }
                    h2 { color: #ff7b72; font-size: 2rem; margin-bottom: 10px; }
                    p { color: #8b949e; font-size: 0.9rem; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="box">
                    <h2>❌</h2>
                    <h3 style="color:#ff7b72;">접근이 제한된 페이지입니다</h3>
                    <p>QR코드가 만료되었거나<br>유효하지 않은 링크입니다.<br><br>
                    상담사에게 새 QR코드를 요청하세요.</p>
                </div>
            </body>
            </html>
        `);
    }

    res.sendFile(path.join(__dirname, "index.html"));
});

// 3. 루트 직접 접속 차단
app.get("/", (req, res) => {
    res.status(403).send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>접근 불가</title>
            <style>
                body { background: #090a10; color: white; font-family: sans-serif;
                       display: flex; align-items: center; justify-content: center; 
                       min-height: 100vh; text-align: center; padding: 20px; }
                .box { background: #161a25; border: 1px solid #ff7b72; 
                       border-radius: 20px; padding: 40px; max-width: 350px; }
                h3 { color: #ff7b72; }
                p { color: #8b949e; font-size: 0.9rem; line-height: 1.6; }
            </style>
        </head>
        <body>
            <div class="box">
                <h2>❌</h2>
                <h3>접근이 제한된 페이지입니다</h3>
                <p>상담사에게 QR코드를 요청하세요.</p>
            </div>
        </body>
        </html>
    `);
});

// 4. 로그인
app.post("/login", (req, res) => {
    const { password } = req.body;
    if (password === CURRENT_PASSWORD) {
        const token = jwt.sign(
            { auth: true, pw: passwordFingerprint() },
            SECRET,
            { expiresIn: AUTH_TOKEN_EXPIRES }
        );
        return res.json({ token });
    }
    res.status(401).json({ error: "Unauthorized" });
});

// 5. 토큰 유효성 검사 + 자동 갱신
app.get("/check-auth", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        const decoded = jwt.verify(token, SECRET);
        const currentFp = passwordFingerprint();
        if (!decoded.pw || decoded.pw !== currentFp) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // 유효하면 새 토큰 발급 (지문 최신 유지·만료 롤링, 비번 변경 전까지 재로그인 최소화)
        const newToken = jwt.sign(
            { auth: true, pw: currentFp },
            SECRET,
            { expiresIn: AUTH_TOKEN_EXPIRES }
        );
        res.json({ valid: true, token: newToken });
    } catch (e) {
        res.status(401).json({ error: "Unauthorized" });
    }
});

app.listen(PORT, () => {
    console.log(`서버 실행 중 - 포트 ${PORT}`);
    if (!process.env.JWT_SECRET) {
        console.warn("경고: JWT_SECRET이 설정되지 않아 개발용 기본값을 사용 중입니다.");
    }
    console.log(`2시간 제한 QR 생성: ${APP_BASE_URL}/create-invite  | 로컬: http://localhost:${PORT}/create-invite`);
});