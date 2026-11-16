// Gera assets/stats.svg: estatísticas do GitHub no estilo "Propriedades do Sistema" do Windows 98.
// Roda no GitHub Actions (usa GITHUB_TOKEN). Sem token, aceita um JSON de exemplo: node stats.mjs exemplo.json
import { readFileSync, writeFileSync } from "node:fs";

const USER = process.env.STATS_USER || "mateuszebendo";
const OUT = new URL("../assets/stats.svg", import.meta.url);

const QUERY = `query($login: String!) {
  user(login: $login) {
    followers { totalCount }
    pullRequests { totalCount }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, privacy: PUBLIC) {
      totalCount
      nodes {
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      contributionCalendar { totalContributions }
    }
  }
}`;

async function load() {
  if (process.argv[2]) return JSON.parse(readFileSync(process.argv[2], "utf8"));
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { login: USER } }),
  });
  const json = await res.json();
  if (!json.data?.user) throw new Error("Resposta inesperada: " + JSON.stringify(json));
  return json.data.user;
}

const u = await load();
const repos = u.repositories.nodes;
const stars = repos.reduce((n, r) => n + r.stargazerCount, 0);

const langs = new Map();
for (const r of repos)
  for (const { size, node } of r.languages.edges) {
    const l = langs.get(node.name) || { size: 0, color: node.color || "#808080" };
    l.size += size;
    langs.set(node.name, l);
  }
const total = [...langs.values()].reduce((n, l) => n + l.size, 0) || 1;
const top = [...langs.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 6)
  .map(([name, l]) => ({ name, color: l.color, pct: (l.size / total) * 100 }));

const fmt = (n) => n.toLocaleString("pt-BR");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

const UI = `font-family="'MS Sans Serif','Microsoft Sans Serif',Tahoma,Verdana,Arial,sans-serif"`;
const W = 840, H = 300;
const bevel = (x, y, w, h, raised = true) => {
  const [a, b] = raised ? ["#fff", "#000"] : ["#808080", "#fff"];
  return `<path d="M${x} ${y + h} V${y} H${x + w}" fill="none" stroke="${a}" stroke-width="1.5"/>` +
    `<path d="M${x} ${y + h} H${x + w} V${y}" fill="none" stroke="${b}" stroke-width="1.5"/>`;
};
const btn = (x, kind) => `<g transform="translate(${x},8)"><rect width="16" height="14" fill="#c0c0c0"/>${bevel(0, 0, 16, 14)}${{
  min: '<rect x="4" y="9" width="6" height="2" fill="#000"/>',
  max: '<rect x="3.5" y="2.5" width="9" height="8" fill="none" stroke="#000"/><rect x="3.5" y="2.5" width="9" height="2" fill="#000"/>',
  x: '<path d="M4 3 L12 11 M12 3 L4 11" stroke="#000" stroke-width="1.8"/>',
}[kind]}</g>`;
// caixa de grupo com rótulo, como nos diálogos do Windows
const group = (x, y, w, h, label) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#808080"/>` +
  `<rect x="${x + 1}" y="${y + 1}" width="${w}" height="${h}" fill="none" stroke="#fff"/>` +
  `<rect x="${x + 8}" y="${y - 7}" width="${label.length * 6.6 + 10}" height="14" fill="#c0c0c0"/>` +
  `<text x="${x + 13}" y="${y + 4}" ${UI} font-size="12" fill="#000">${esc(label)}</text>`;

let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
s += `<defs><linearGradient id="t" x1="0" x2="1"><stop offset="0" stop-color="#000080"/><stop offset="1" stop-color="#1084d0"/></linearGradient></defs>`;
s += `<rect width="${W}" height="${H}" fill="#c0c0c0"/>`;
s += `<path d="M1 ${H - 1} V1 H${W - 1}" fill="none" stroke="#dfdfdf" stroke-width="2"/><path d="M1 ${H - 1} H${W - 1} V1" fill="none" stroke="#000" stroke-width="2"/>`;
s += `<rect x="4" y="4" width="${W - 8}" height="22" fill="url(#t)"/>`;
// ícone do computador
s += `<g transform="translate(9,8)"><rect x="1" y="0" width="14" height="10" fill="#c0c0c0" stroke="#000"/><rect x="3" y="2" width="10" height="6" fill="#008080"/><rect x="3" y="11" width="10" height="3" fill="#c0c0c0" stroke="#000"/></g>`;
s += `<text x="30" y="20" ${UI} font-size="13" font-weight="bold" fill="#fff">Propriedades do Sistema — Estatísticas do GitHub</text>`;
s += btn(W - 58, "min") + btn(W - 40, "max") + btn(W - 20, "x");

// abas
s += `<path d="M12 62 V40 H92 V62" fill="#c0c0c0" stroke="none"/>${bevel(12, 40, 80, 22)}`;
s += `<text x="52" y="56" text-anchor="middle" ${UI} font-size="12">Geral</text>`;
s += `<rect x="94" y="44" width="96" height="18" fill="#c0c0c0"/>${bevel(94, 44, 96, 18)}`;
s += `<text x="142" y="58" text-anchor="middle" ${UI} font-size="12" fill="#404040">Desempenho</text>`;
s += `<rect x="12" y="62" width="${W - 24}" height="${H - 108}" fill="#c0c0c0"/>`;
s += `<path d="M12 ${H - 46} V62 H12 M92 62 H${W - 12}" fill="none" stroke="#fff" stroke-width="1.5"/>`;
s += `<path d="M12 ${H - 46} H${W - 12} V62" fill="none" stroke="#000" stroke-width="1.5"/>`;

// grupo da esquerda: números
const L = [
  ["Usuário", "@" + USER],
  ["Repositórios públicos", fmt(u.repositories.totalCount)],
  ["Estrelas recebidas", fmt(stars)],
  ["Seguidores", fmt(u.followers.totalCount)],
  ["Commits no último ano", fmt(u.contributionsCollection.totalCommitContributions)],
  ["Pull requests", fmt(u.pullRequests.totalCount)],
  ["Contribuições no último ano", fmt(u.contributionsCollection.contributionCalendar.totalContributions)],
];
s += group(26, 84, 360, 158, "Sistema");
// monitorzinho
s += `<g transform="translate(42,104)"><rect width="56" height="44" fill="#c0c0c0" stroke="#000"/><rect x="5" y="5" width="46" height="32" fill="#008080"/>` +
  `<rect x="18" y="44" width="20" height="6" fill="#c0c0c0" stroke="#000"/><rect x="8" y="50" width="40" height="5" fill="#c0c0c0" stroke="#000"/></g>`;
L.forEach(([k, v], i) => {
  const y = 106 + i * 19;
  s += `<text x="114" y="${y}" ${UI} font-size="12" fill="#000">${esc(k)}:</text>`;
  s += `<text x="374" y="${y}" text-anchor="end" ${UI} font-size="12" font-weight="bold" fill="#000080">${esc(v)}</text>`;
});

// grupo da direita: linguagens em barras de progresso segmentadas
s += group(402, 84, 412, 158, "Linguagens mais usadas");
top.forEach((l, i) => {
  const y = 102 + i * 22;
  s += `<text x="416" y="${y + 12}" ${UI} font-size="12" fill="#000">${esc(l.name)}</text>`;
  const bx = 524, bw = 220;
  s += `<rect x="${bx}" y="${y}" width="${bw}" height="16" fill="#fff"/>${bevel(bx, y, bw, 16, false)}`;
  const blocks = Math.max(1, Math.round((l.pct / 100) * 26));
  for (let b = 0; b < blocks; b++) s += `<rect x="${bx + 3 + b * 8.3}" y="${y + 3}" width="6.5" height="10" fill="${l.color}"/>`;
  s += `<text x="802" y="${y + 12}" text-anchor="end" ${UI} font-size="12" fill="#000">${l.pct.toFixed(1).replace(".", ",")}%</text>`;
});

// botões OK / Cancelar e status
const okBtn = (x, label) => `<rect x="${x}" y="${H - 38}" width="80" height="24" fill="#c0c0c0"/>${bevel(x, H - 38, 80, 24)}` +
  `<text x="${x + 40}" y="${H - 21}" text-anchor="middle" ${UI} font-size="12">${label}</text>`;
s += `<text x="16" y="${H - 21}" ${UI} font-size="11" fill="#404040">Atualizado em ${hoje} · só repositórios públicos</text>`;
s += okBtn(W - 184, "OK") + okBtn(W - 96, "Cancelar");
s += `<rect x="${W - 181}" y="${H - 35}" width="74" height="18" fill="none" stroke="#000" stroke-dasharray="1 1"/>`;
s += `</svg>`;

writeFileSync(OUT, s);
console.log("stats.svg gerado:", top.map((l) => l.name).join(", "));
