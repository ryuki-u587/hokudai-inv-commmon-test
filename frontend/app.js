const API_BASE = "https://hokudai-inv-commmon-test.onrender.com/"; // 必要に応じて変更

const schemeSelect = document.getElementById("schemeSelect");
const subjectsDiv = document.getElementById("subjects");
const convertBtn = document.getElementById("convertBtn");
const resultDiv = document.getElementById("result");


let schemes = {}; // key -> { max_total, subjects: { subj: {points, base} } }

async function fetchSchemes() {
    const res = await fetch(`${API_BASE}/schemes`);
    const data = await res.json();
    schemes = {};
    data.schemes.forEach(s => { schemes[s.key] = s; });


    schemeSelect.innerHTML = Object.keys(schemes)
        .map(k => `<option value="${k}">${k}</option>`)
        .join("");


    renderSubjects();
}


function renderSubjects() {
    const key = schemeSelect.value;
    const scheme = schemes[key];
    if (!scheme) return;
    const html = [`<div class="badge">最大合計 ${scheme.max_total} 点</div>`];
    Object.entries(scheme.subjects).forEach(([subj, def]) => {
        html.push(`
            <div class="subject">
                <h3>${subj} <span class="badge">換算 ${def.points} 点 / 満点 ${def.base}</span></h3>
                <div class="grid">
                    <div>
                        <label>${subj} 実得点</label>
                        <input type="number" min="0" max="${def.base}" step="1" value="0" id="score_${subj}">
                    </div>
                    <div>
                        <label>${subj} 満点（必要なら変更）</label>
                        <input type="number" min="1" step="1" value="${def.base}" id="base_${subj}">
                    </div>
                </div>
            </div>
        `);
    });
    subjectsDiv.innerHTML = html.join("");
}


async function convert() {
const key = schemeSelect.value;
const scheme = schemes[key];
const scores = {}; const bases = {};


for (const subj of Object.keys(scheme.subjects)) {
const s = parseFloat(document.getElementById(`score_${subj}`).value || "0");
const b = parseInt(document.getElementById(`base_${subj}`).value || scheme.subjects[subj].base, 10);
scores[subj] = isNaN(s) ? 0 : s;
if (b !== scheme.subjects[subj].base) bases[subj] = b;
}


const payload = { scheme_key: key, scores, bases: Object.keys(bases).length ? bases : undefined };
const res = await fetch(`${API_BASE}/convert`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload)
});


if (!res.ok) {
const err = await res.json().catch(() => ({}));
alert("換算に失敗しました: " + (err.detail || res.status));
return;
}
const data = await res.json();
showResult(data);
}


function showResult(data) {
const lines = Object.entries(data.breakdown)
.map(([subj, v]) => `<li>${subj}: <strong>${v}</strong> 点</li>`)
.join("");
resultDiv.innerHTML = `
<h2>換算結果</h2>
<p style="font-size:28px;margin:8px 0 0;">合計 <strong>${data.total}</strong> / ${data.max_total} 点</p>
<ul class="breakdown">${lines}</ul>
`;
resultDiv.classList.remove("hidden");
}


schemeSelect.addEventListener("change", renderSubjects);
convertBtn.addEventListener("click", convert);


fetchSchemes().catch(err => alert("初期化に失敗しました: " + err));
