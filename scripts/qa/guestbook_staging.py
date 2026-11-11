"""Run the handoff batch against a dedicated staging deployment and an empty published test event.

Requires Python 3.9+ and Playwright Chromium in a separate QA environment.
Pass the staging Guestbook URL, the test Supabase origin and the deployed revision.
Sign into the moderator window when it opens. No service key or credential file is required.
Start with a fresh ten-minute submission window. The runner prints one report to stdout.
"""

import argparse
import json
import sys
from time import monotonic
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit
from uuid import UUID, uuid4

from playwright.sync_api import expect, sync_playwright


def check(actual, expected, step):
    if actual != expected:
        raise ValueError(f"{step}: expected {expected!r}, got {actual!r}")


def make_notes(event_id, tag):
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    notes = []
    for number in range(1001):
        note_id = str(uuid4())
        created = start + timedelta(seconds=number // 7)
        name = f"{tag} guest {number}" + (" Iris" if number in (81, 82) else "")
        message = f"Memory {note_id}" + (" orchid" if number in (521, 733, 890) else "")
        notes.append(dict(id=note_id, event_id=event_id, name=name, message=message,
                          status="approved", created_at=created.isoformat()))
    return sorted(notes, key=lambda row: (row["created_at"], row["id"]))


def archive_test(page, notes):
    cards = page.locator("article.archive-note > p")
    nav = page.get_by_role("navigation", name="Guestbook pages")
    expect(page.get_by_text("1,001 messages in the archive", exact=True)).to_be_visible()
    for order, ordered in [("Newest", notes[::-1]), ("Oldest", notes)]:
        page.get_by_role("button", name=order, exact=True).click()
        for offset in range(0, len(ordered), 10):
            if offset:
                nav.get_by_role("button", name="Next", exact=True).click()
            expect(cards).to_have_text([row["message"] for row in ordered[offset:offset + 10]])
        expect(nav.get_by_role("button", name="Next", exact=True)).to_be_disabled()
    search = page.get_by_role("searchbox")
    for term, field in [("Iris", "name"), ("orchid", "message")]:
        matches = [row["message"] for row in notes if term in row[field]]
        search.fill(term)
        expect(cards).to_have_text(matches)
        expect(page.get_by_role("status")).to_contain_text(f"{len(matches)} messages found")
    search.fill("")
    page.get_by_role("button", name="Newest", exact=True).click()
    expect(cards).to_have_text([row["message"] for row in notes[::-1][:10]])
    return "1,001 unique IDs in exact order both ways, 101 pages each, last page 1, search counts 2 and 3"


def submit_test(guest, site, event_id, tag, read_run):
    def submit(name, message):
        response = guest.request.post(f"{site}/api/messages", data={
            "eventId": event_id, "name": name, "message": message
        }, max_redirects=0)
        return response.status

    for name, message in [(f"{tag} submission invalid", " "), (f"{tag} submission invalid", "x" * 501)]:
        check(submit(name, message), 400, "invalid message")
    for i, expected in enumerate([200, 200, 200, 429], 1):
        check(submit(f"{tag} submission {i}", f"Moderation sample {i}"), expected, f"POST {i}")
    expected = [(f"{tag} submission {i}", "pending") for i in (1, 2, 3)]
    check(sorted((r["name"], r["status"]) for r in read_run()), expected, "persisted submissions")
    return "400 for both invalid submissions, then 200/200/200/429, exactly three pending rows"


def wait_for_guest_subscription(page, url, event_id):
    # Subscribe before moderation so a slow socket handshake cannot hide an approval.
    joined = False

    def observe(socket):
        def on_frame(frame):
            nonlocal joined
            if isinstance(frame, str):
                message = json.loads(frame)
                if isinstance(message, list) and len(message) == 5:
                    _, _, topic, event, payload = message
                    if topic == f"realtime:messages-changes:{event_id}" and event == "phx_reply":
                        joined = payload.get("status") == "ok"
        socket.on("framereceived", on_frame)

    page.on("websocket", observe)
    page.goto(url)
    expect(page.get_by_text("1,001 messages in the archive", exact=True)).to_be_visible()
    deadline = monotonic() + 20
    while not joined and monotonic() < deadline:
        page.wait_for_timeout(100)
    if not joined:
        raise RuntimeError("Guest did not join the private message channel")


def moderation_test(admin, guest, guest_url, event_id, tag, read_run):
    wait_for_guest_subscription(guest, guest_url, event_id)
    # The dashboard loads its queue on mount.
    admin.reload()
    selector = admin.locator("#event-select")
    if selector.count():
        selector.select_option(event_id)
    for i, action in [(2, "Reject"), (1, "Approve")]:
        name = f"{tag} submission {i}"
        row = admin.get_by_role("listitem").filter(has=admin.get_by_text(name, exact=True))
        row.get_by_role("button", name=action, exact=True).click()
        expect(row).to_have_count(0)
    check(sorted((r["name"], r["status"]) for r in read_run()),
          [(f"{tag} submission {i}", s) for i, s in enumerate(["approved", "rejected", "pending"], 1)],
          "moderated rows")
    expect(guest.get_by_text("1,002 messages in the archive", exact=True)).to_be_visible(timeout=20000)
    # Reading position is preserved when an approval would displace a note.
    updated = guest.get_by_role("button", name="Show updated page")
    if updated.is_visible():
        updated.click()
    expect(guest.get_by_text(f"{tag} submission 1", exact=True)).to_have_count(1)
    guest.get_by_role("searchbox").fill(f"{tag} submission")
    expect(guest.get_by_role("status")).to_contain_text("1 message found")
    expect(guest.locator(".archive-sign")).to_have_text([f"{tag} submission 1"])
    return "approved row visible once without reload, rejected and pending rows hidden, count 1,002"


def run(args, report):
    guest_url = urlsplit(args.guestbook)
    parts = guest_url.path.strip("/").split("/")
    if (guest_url.scheme != "https" or guest_url.username or guest_url.query or guest_url.fragment
            or len(parts) != 3 or parts[0] != "events" or parts[2] != "guestbook"):
        raise ValueError("Supply the hosted HTTPS /events/<disposable-event>/guestbook URL")
    db_url = urlsplit(args.supabase)
    if db_url.scheme != "https" or db_url.username or db_url.path.strip("/") or db_url.query or db_url.fragment:
        raise ValueError("Supply the isolated test project's HTTPS origin")
    site = f"https://{guest_url.netloc}"
    db = f"https://{db_url.netloc}/rest/v1"
    tag = "QA-" + uuid4().hex
    report["fixture"] = tag
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        mod = browser.new_context(locale="en-US")
        public = browser.new_context(locale="en-US")
        admin, guest = mod.new_page(), public.new_page()
        # Observe each browser's actual read to verify the app/project/event binding before seeding.
        def reads_messages(request):
            return request.method == "GET" and urlsplit(request.url).path == "/rest/v1/messages"

        with guest.expect_request(reads_messages) as guest_read:
            guest.goto(args.guestbook)
        req = guest_read.value
        check(urlsplit(guest.url).netloc, guest_url.netloc, "guest app host")
        check(req.url.split("?")[0], db + "/messages", "guest database")
        event_filter = parse_qs(urlsplit(req.url).query)["event_id"][0]
        if not event_filter.startswith("eq."):
            raise ValueError("Guest read lacks an event filter")
        event_id = str(UUID(event_filter[3:]))
        report["event_id"] = event_id

        print("Sign into the staging moderator window.", file=sys.stderr)
        with admin.expect_request(reads_messages, timeout=180000) as mod_read:
            admin.goto(site + "/admin")
            admin.bring_to_front()
        check(mod_read.value.url.split("?")[0], db + "/messages", "moderator database")
        check(urlsplit(admin.url).netloc, guest_url.netloc, "moderator app host")
        headers = {k: v for k, v in mod_read.value.all_headers().items() if k in ("authorization", "apikey")}

        def rest(method, table, params, data=None):
            try:
                response = mod.request.fetch(db + "/" + table, method=method, headers=headers,
                                             params=params, data=data, max_redirects=0)
            except Exception:
                raise RuntimeError(f"Could not reach {table} for {method}") from None
            if not response.ok:
                raise RuntimeError(f"{method} {table} returned HTTP {response.status}")
            return response

        event = {"event_id": "eq." + event_id}
        run_filter = dict(event, name="like." + tag + "*")

        def submitted_rows():
            filters = dict(event, name=f"like.{tag} submission*", select="name,status")
            return rest("GET", "messages", filters).json()

        check(rest("GET", "messages", dict(event, select="id", limit="1")).json(), [], "empty staging event")

        def record(key, callback):
            try:
                report[key] = {"status": "PASS", "actual": callback()}
                return True
            except Exception as error:
                report[key] = {"status": "FAIL", "actual": str(error)}
                return False

        notes = make_notes(event_id, tag)
        print(f"Staging fixture {tag}, event {event_id}", file=sys.stderr, flush=True)
        try:
            for offset in range(0, len(notes), 200):
                rest("POST", "messages", {}, notes[offset:offset + 200])
            guest.reload()
            record("archive", lambda: archive_test(guest, notes))
            if record("submissions", lambda: submit_test(public, site, event_id, tag, submitted_rows)):
                guest.close()
                guest = public.new_page()
                guest.bring_to_front()
                record("moderation", lambda: moderation_test(
                    admin, guest, args.guestbook, event_id, tag, submitted_rows))
        finally:
            rest("DELETE", "messages", run_filter)
            check(rest("GET", "messages", dict(run_filter, select="id", limit="1")).json(), [], "cleanup")
            report["cleanup"] = "Removed this run's rows"
        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("guestbook", help="Disposable staging Guestbook URL")
    parser.add_argument("supabase", help="Test Supabase project origin")
    parser.add_argument("revision", help="Revision deployed to staging")
    args = parser.parse_args()
    report = dict(target=args.guestbook, project=args.supabase, revision=args.revision,
                  started=datetime.now(timezone.utc).isoformat())
    for key in ["archive", "submissions", "moderation"]:
        report[key] = {"status": "BLOCKED"}
    try:
        run(args, report)
    except Exception as error:
        report["error"] = str(error)
    print(json.dumps(report, indent=2))
    raise SystemExit(int("error" in report or any(report[k]["status"] != "PASS" for k in
                                                    ("archive", "submissions", "moderation"))))
