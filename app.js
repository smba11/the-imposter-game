const screen = document.getElementById("screen");

const GAME_CATEGORIES = {
  "🦁 Animals": ["Lion","Elephant","Penguin","Dolphin","Eagle","Tiger","Giraffe","Zebra","Kangaroo","Panda"],
  "🍎 Fruits": ["Apple","Banana","Orange","Strawberry","Grape","Watermelon","Pineapple","Mango","Kiwi","Blueberry"],
  "🌍 Countries": ["France","Japan","Brazil","Australia","Mexico","Canada","India","Egypt","Italy","Germany"],
  "🍕 Food": ["Pizza","Burger","Sushi","Taco","Pasta","Salad","Sandwich","Steak","Soup","Donut"],
  "⚽ Sports": ["Football","Basketball","Tennis","Baseball","Hockey","Volleyball","Swimming","Golf","Boxing","Cricket"]
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

const state = {
  players: [],
  alive: [],
  eliminated: [],
  round: 1,
  cycle: 1,
  category: null,
  word: null,
  imposter: null,
  revealIndex: 0,
  votes: {}
};

function render(html) {
  screen.innerHTML = html;
}

/* ---------- SETUP ---------- */

function setupScreen() {
  const pills = state.players.map(p => `<span class="pill">👤 ${esc(p)}</span>`).join("");

  render(`
<div class="term">
Add players (min 2), then start.

Rules:
• 1 Imposter 🕵️
• Everyone else sees the word
• Vote players out
• Tie = no elimination
• Final 2 with imposter = imposter wins
</div>

<div class="row">
  <input id="name" class="input" placeholder="Player name" />
  <button id="add" class="btn">➕ Add</button>
  <button id="start" class="btn" ${state.players.length < 2 ? "disabled" : ""}>🚀 Start</button>
  <button id="reset" class="btn">🧹 Reset</button>
</div>

<div style="margin-top:10px">
<b>Players:</b><br/>
${pills || "None"}
</div>
  `);

  const name = document.getElementById("name");
  name.focus();

  document.getElementById("add").onclick = () => {
    const n = name.value.trim();
    if (!n || state.players.includes(n)) return;
    state.players.push(n);
    name.value = "";
    setupScreen();
  };

  document.getElementById("start").onclick = startRound;
  document.getElementById("reset").onclick = () => {
    Object.assign(state, { players: [], round: 1 });
    setupScreen();
  };
}

/* ---------- ROUND ---------- */

function startRound() {
  state.category = pick(Object.keys(GAME_CATEGORIES));
  state.word = pick(GAME_CATEGORIES[state.category]);
  state.imposter = pick(state.players);
  state.alive = [...state.players];
  state.eliminated = [];
  state.cycle = 1;
  state.votes = {};
  state.revealIndex = 0;
  renderReveal();
}

/* ---------- REVEAL ---------- */

function renderReveal() {
  const p = state.alive[state.revealIndex];
  render(`
<div class="term">
📱 PASS PHONE

Player: ${p} (${state.revealIndex + 1}/${state.alive.length})
Category: ${state.category}
</div>

<div class="row">
  <button class="btn" id="reveal">👀 Reveal</button>
</div>
  `);

  document.getElementById("reveal").onclick = () => renderRole(p);
}

function renderRole(p) {
  const imp = p === state.imposter;
  render(`
<div class="term">
${imp ? "🕵️ YOU ARE THE IMPOSTER" : "✅ YOU ARE NOT THE IMPOSTER"}

Category: ${state.category}
${imp ? "Secret Word: ???" : "Secret Word: " + state.word}
</div>

<div class="row">
  <button class="btn" id="hide">🙈 Hide & Pass</button>
</div>
  `);

  document.getElementById("hide").onclick = () => {
    state.revealIndex++;
    state.revealIndex >= state.alive.length ? discussionScreen() : renderReveal();
  };
}

/* ---------- DISCUSSION ---------- */

function discussionScreen() {
  render(`
<div class="term">
💬 DISCUSSION

Give 1-word clues.
Cycle ${state.cycle}
</div>

<div class="row">
  <button class="btn" id="vote">🗳️ Vote</button>
</div>
  `);

  document.getElementById("vote").onclick = votingScreen;
}

/* ---------- VOTING ---------- */

function votingScreen() {
  const voter = state.alive.find(p => !(p in state.votes));
  if (!voter) return resultsScreen();

  render(`
<div class="term">
🗳️ VOTING

Voter: ${voter}
</div>

<div class="row">
${state.alive.filter(p => p !== voter)
  .map(p => `<button class="btn voteBox" data-p="${p}">${p}</button>`).join("")}
</div>
  `);

  document.querySelectorAll(".voteBox").forEach(b => {
    b.onclick = () => {
      state.votes[voter] = b.dataset.p;
      votingScreen();
    };
  });
}

/* ---------- RESULTS ---------- */

function resultsScreen() {
  const tally = {};
  Object.values(state.votes).forEach(v => tally[v] = (tally[v] || 0) + 1);

  let top = -1;
  let topPlayers = [];

  for (const [name, count] of Object.entries(tally)) {
    if (count > top) {
      top = count;
      topPlayers = [name];
    } else if (count === top) {
      topPlayers.push(name);
    }
  }

  // 🔒 TIE = SKIP
  if (topPlayers.length > 1) {
    state.votes = {};
    state.cycle++;
    return discussionScreen();
  }

  const eliminated = topPlayers[0];
  state.alive = state.alive.filter(p => p !== eliminated);
  state.eliminated.push(eliminated);

  if (eliminated === state.imposter) {
    return endScreen("🎯 GROUP WINS! Imposter eliminated.");
  }

  if (state.alive.length === 2 && state.alive.includes(state.imposter)) {
    return endScreen("🕵️ IMPOSTER WINS! Final 2.");
  }

  state.votes = {};
  state.cycle++;
  discussionScreen();
}

/* ---------- END ---------- */

function endScreen(msg) {
  render(`
<div class="term">
${msg}

Secret Word: ${state.word}
Imposter: ${state.imposter}
Eliminated: ${state.eliminated.join(", ")}
</div>

<div class="row">
  <button class="btn" id="again">🔁 New Round</button>
  <button class="btn" id="reset">🧹 Reset</button>
</div>
  `);

  document.getElementById("again").onclick = startRound;
  document.getElementById("reset").onclick = setupScreen;
}

setupScreen();
