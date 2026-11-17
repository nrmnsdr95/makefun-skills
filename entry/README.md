# tiny-chess-01 entry — 4 KB Python chess engine

`main.py` is a complete chess engine in 3,539 bytes (limit: 4,096). It is a
single file: a zlib-compressed payload and the two-line loader that unpacks it,
which the bounty rules allow ("a compressed payload with the code that unpacks
it").

Engine: 10x12 mailbox move generator (perft-verified against python-chess on the
standard suites), alpha-beta with transposition table, killer/history move
ordering, late-move reductions, null-move pruning, quiescence search over
captures and promotions, and an evaluation of material, piece-square terms,
bishop pair and an endgame king table. Play is deterministic: a fixed node
budget per move, no clock, no randomness.

It speaks the bounty env protocol at `MAKEFUN_ENV_URL`: `POST /game`,
`POST /move`, `POST /resign`, and exits when every game is over.

Build: `main.py` is generated from `engine source -> zlib.compress -> base85`.

License: MIT (see LICENSE).
