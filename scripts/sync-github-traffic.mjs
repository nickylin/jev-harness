#!/usr/bin/env node
/**
 * Sync the last 14 days of GitHub traffic into a private Notion database.
 *
 * Required env:
 *   TRAFFIC_GITHUB_TOKEN  PAT with classic `repo` scope
 *                         (or fine-grained Administration: Read)
 *   NOTION_TOKEN          Notion internal integration token
 *
 * Optional env:
 *   NOTION_DATABASE_ID    defaults to the private GitHub Traffic Stats DB
 *   GITHUB_REPOSITORY     owner/name, defaults to this repo
 */

const NOTION_VERSION = "2022-06-28";
const DEFAULT_DATABASE_ID = "60406e8634d5498ea0dbf4d2786a78bd";
const DEFAULT_REPO = "nickylin/jev-harness";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name, fallback) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

async function readJson(response, label) {
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    const hint = hintForError(label, response.status);
    const message = body.message || body.code || text || response.statusText;
    throw new Error(`${label} failed (${response.status}): ${message}${hint}`);
  }
  return body;
}

function hintForError(label, status) {
  if (label.startsWith("GitHub") && status === 403) {
    return " — TRAFFIC_GITHUB_TOKEN needs classic `repo` scope, or a fine-grained token with Administration: Read on this repository.";
  }
  if (label.startsWith("Notion") && (status === 401 || status === 403)) {
    return " — check NOTION_TOKEN, then connect the integration to the GitHub Traffic Stats database (... → Connections).";
  }
  if (label.startsWith("Notion") && status === 404) {
    return " — open the database and add the integration under ... → Connections.";
  }
  return "";
}

async function githubGet(token, path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "jev-harness-traffic-sync",
    },
  });
  return readJson(response, `GitHub ${path}`);
}

async function notionRequest(token, method, path, body) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return readJson(response, `Notion ${method} ${path}`);
}

function dayKey(timestamp) {
  return String(timestamp).slice(0, 10);
}

function mergeDaily(views, clones) {
  const days = new Map();

  for (const row of views.views ?? []) {
    const date = dayKey(row.timestamp);
    days.set(date, {
      date,
      views: row.count ?? 0,
      uniques: row.uniques ?? 0,
      clones: 0,
      cloneUniques: 0,
    });
  }

  for (const row of clones.clones ?? []) {
    const date = dayKey(row.timestamp);
    const current = days.get(date) ?? {
      date,
      views: 0,
      uniques: 0,
      clones: 0,
      cloneUniques: 0,
    };
    current.clones = row.count ?? 0;
    current.cloneUniques = row.uniques ?? 0;
    days.set(date, current);
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function formatReferrers(referrers) {
  if (!Array.isArray(referrers) || referrers.length === 0) {
    return "近14天: 无公开来源";
  }
  return `近14天: ${referrers
    .slice(0, 5)
    .map((item) => `${item.referrer} (${item.count})`)
    .join(", ")}`;
}

function titleFor(date, repo) {
  return `${date} · ${repo.split("/")[1] ?? repo}`;
}

function notionProperties(repo, day, referrers) {
  return {
    Name: {
      title: [{ type: "text", text: { content: titleFor(day.date, repo) } }],
    },
    日期: { date: { start: day.date } },
    仓库: { rich_text: [{ type: "text", text: { content: repo } }] },
    "页面访问量 (PV)": { number: day.views },
    "独立访客 (UV)": { number: day.uniques },
    克隆次数: { number: day.clones },
    独立克隆者: { number: day.cloneUniques },
    来源: { rich_text: [{ type: "text", text: { content: referrers } }] },
  };
}

async function listExistingPages(notionToken, databaseId, repo) {
  const byDate = new Map();
  let cursor;

  do {
    const payload = {
      page_size: 100,
      filter: {
        property: "仓库",
        rich_text: { equals: repo },
      },
    };
    if (cursor) {
      payload.start_cursor = cursor;
    }
    const page = await notionRequest(
      notionToken,
      "POST",
      `/databases/${databaseId}/query`,
      payload,
    );
    for (const result of page.results ?? []) {
      const start = result.properties?.日期?.date?.start;
      if (start) {
        byDate.set(dayKey(start), result.id);
      }
    }
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);

  return byDate;
}

async function upsertDay(notionToken, databaseId, repo, day, referrers, existingId) {
  const properties = notionProperties(repo, day, referrers);
  if (existingId) {
    await notionRequest(notionToken, "PATCH", `/pages/${existingId}`, {
      properties,
    });
    return "updated";
  }
  await notionRequest(notionToken, "POST", "/pages", {
    parent: { database_id: databaseId },
    properties,
  });
  return "created";
}

async function main() {
  const githubToken = requiredEnv("TRAFFIC_GITHUB_TOKEN");
  const notionToken = requiredEnv("NOTION_TOKEN");
  const databaseId = optionalEnv("NOTION_DATABASE_ID", DEFAULT_DATABASE_ID);
  const repo = optionalEnv("GITHUB_REPOSITORY", DEFAULT_REPO);
  const [owner, name] = repo.split("/");

  if (!owner || !name) {
    throw new Error(`GITHUB_REPOSITORY must look like owner/name, got: ${repo}`);
  }

  const [views, clones, referrers] = await Promise.all([
    githubGet(githubToken, `/repos/${owner}/${name}/traffic/views`),
    githubGet(githubToken, `/repos/${owner}/${name}/traffic/clones`),
    githubGet(githubToken, `/repos/${owner}/${name}/traffic/popular/referrers`),
  ]);

  const days = mergeDaily(views, clones);
  const referrerText = formatReferrers(referrers);
  const existing = await listExistingPages(notionToken, databaseId, repo);

  let created = 0;
  let updated = 0;

  for (const day of days) {
    const action = await upsertDay(
      notionToken,
      databaseId,
      repo,
      day,
      referrerText,
      existing.get(day.date),
    );
    if (action === "created") {
      created += 1;
    } else {
      updated += 1;
    }
    console.log(
      `${action} ${day.date}: pv=${day.views} uv=${day.uniques} clones=${day.clones}`,
    );
  }

  if (days.length === 0) {
    console.log("GitHub returned no traffic rows for the last 14 days.");
  }

  console.log(
    `Done. ${created} created, ${updated} updated. Views total=${views.count ?? 0}, uniques=${views.uniques ?? 0}.`,
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
