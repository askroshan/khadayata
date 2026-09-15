// One-off operational script: sends invitation reminders to members who have
// not completed onboarding, paced to stay under EmailIt's ~2-per-30s rate
// limit. Tracks progress on disk so an interrupted run can resume.
// Run: node scripts/send-pending-reminders.cjs
const fs = require("fs");
for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !m[1].startsWith("#")) process.env[m[1]] = m[2];
}
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const tokenPath = process.argv[2] || "/tmp/admin_jwt.txt";
const token = fs.readFileSync(tokenPath, "utf8").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let all = [], offset = 0;
  while (true) {
    const r = await fetch(url + "/rest/v1/members?onboarding_completed=eq.false&select=id&order=created_at.asc&limit=1000&offset=" + offset, {
      headers: { apikey: key, Authorization: "Bearer " + token },
    });
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all = all.concat(rows.map((x) => x.id));
    offset += rows.length;
    if (rows.length < 1000) break;
  }

  const statePath = "scripts/reminder-state.json";
  let state = { done: [], log: [] };
  try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); } catch (e) {}
  const doneSet = new Set(state.done);
  const queue = all.filter((id) => !doneSet.has(id));
  console.log("queue at start:", queue.length, "already processed:", doneSet.size);

  let sent = 0, failed = 0;
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    let ok = false;
    try {
      const res = await fetch(url + "/functions/v1/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: key },
        body: JSON.stringify({ member_ids: [id] }),
      });
      const data = await res.json();
      ok = data && data.sent === 1;
      if (!ok && data.errors && data.errors[0]) {
        state.log.push({ id, err: String(data.errors[0]).slice(0, 120), at: new Date().toISOString() });
      }
    } catch (e) {
      state.log.push({ id, err: e.message.slice(0, 120), at: new Date().toISOString() });
    }
    if (ok) sent++; else failed++;
    state.done.push(id);
    if (state.done.length % 10 === 0 || i === queue.length - 1) {
      fs.writeFileSync(statePath, JSON.stringify(state));
    }
    process.stdout.write(i + 1 + "/" + queue.length + " ok=" + sent + " fail=" + failed + "\r");
    if (i < queue.length - 1) await sleep(16000);
  }
  fs.writeFileSync(statePath, JSON.stringify(state));
  console.log("");
  console.log("PASS COMPLETE. ok=" + sent + " fail=" + failed);
  const fails = state.log.slice(-20);
  if (fails.length) console.log("recent failures:", JSON.stringify(fails.slice(0, 10), null, 1));
}
main().catch((e) => { console.error("fatal:", e.message); process.exit(1); });
