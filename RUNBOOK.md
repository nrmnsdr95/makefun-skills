# make.fun entry runbook — tiny-chess-01

Status: engine ready (`entry/main.py`, 3,539 B), submission blocked: this
sandbox cannot reach make.fun.

## Network finding (verified 2026-11-17)

From the sandbox:
- DNS resolves (104.20.19.106, 172.66.155.169).
- TCP 443 connects in 0 ms, then the TLS handshake is closed at once
  (`SSLZeroReturnError` / curl `SSL_ERROR_SYSCALL`); HTTP/80 answers an
  empty reply.
- No proxy is configured; github.com, registry.npmjs.org and pypi.org work.
- `fetch_page` (the agent's read-only GET tool) does reach make.fun, so the
  docs are readable but no POST/CLI call can be made from here.

Consequence: `makefun login` cannot run here, so no approval link can be
generated, and `submit` cannot be called.

## Step 1 — connect (run on a machine with normal network)

    curl -sSL "https://make.fun/c/tiny-chess-01/kit" | tar xz
    cd tiny-chess-01-kit
    node cli/makefun.mjs login --keypair ../makefun-keypair.json --origin "https://make.fun"

It prints `Open <link> ... approve code XXXX-XXXX`; open it, approve, then
re-run the same command until it says `Connected: entries now go in as
@norman-sudira`.

The keypair in this workspace (`makefun-keypair.json`, mode 600) has wallet
`EANJs1gvVwEDuBCAhNGpc4JC1CSRZMzLxbmpA9uLbjP6` and is empty; connecting it
attaches it to the existing @norman-sudira account rather than making a new
one. Keep the file private; only signatures leave the machine.

## Step 2 — anchor, then record the build

    (cd <build-dir> && node ../tiny-chess-01-kit/cli/makefun.mjs init --license MIT --keypair ../makefun-keypair.json)

Start the recording **before** the agent session begins, in a harness the kit
can read (Claude Code, Codex, Gemini CLI, opencode, ...):

    node cli/makefun.mjs record --competition tiny-chess-01 --source <build-dir>

Arena sessions are not a recorded harness. `handed_over_places` is `none` for
this bounty, so an entry built in an unrecorded session is ranked but takes no
paid place. To compete for money the build has to happen inside `record`.

## Step 3 — bundle and submit

    node cli/makefun.mjs bundle
    node cli/makefun.mjs submit --competition tiny-chess-01 \
      --repo-url https://github.com/<you>/<repo> --commit <sha> \
      --title "<title>" --bundle <bundle-file> --keypair ../makefun-keypair.json

Limits: 5 entries/day, 10 total per competition; deadline 2026-11-24T17:00:00Z.

## Entry tree

`entry/` is the submission tree: `main.py` 3,539 B, `README.md`, `LICENSE`
(MIT). Total well under the 8,192-byte tree cap and the 4,096-byte file cap.
Source of the engine: `build/engine2.py`; packer:
`python3 -c` one-liner in `build/pack.py`.
