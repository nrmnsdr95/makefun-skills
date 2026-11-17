import sys,os,time
os.environ.setdefault('MAKEFUN_ENV_URL','http://x')
sys.path.insert(0,'build')
import os as _o
M=__import__(_o.environ.get("ENG","main_compact"))
import chess
VAL=[0,100,320,330,500,900,0]
def ev(b):
    s=0
    for sq,p in b.piece_map().items():
        v=VAL[p.piece_type]; s+= v if p.color else -v
    return s if b.turn else -s
def neg(b,d,a,beta):
    if d==0: return ev(b)
    ms=list(b.legal_moves)
    if not ms: return -9999 if b.is_check() else 0
    for m in ms:
        b.push(m); v=-neg(b,d-1,-beta,-a); b.pop()
        if v>a: a=v
        if a>=beta: break
    return a
def choose(b,d):
    ms=list(b.legal_moves); best=-99999; bm=None
    for m in ms:
        b.push(m); v=-neg(b,d-1,-99999,99999); b.pop()
        if v>=best: best=v; bm=m
    return bm
def play(depth,nodes,gid,our_white):
    b=chess.Board()
    # small book to vary games
    for k in range(4 if gid%2 else 0):
        b.push(list(b.legal_moves)[ (gid*7+k*3) % b.legal_moves.count() ])
    while len(b.move_stack)<200 and not b.is_game_over(claim_draw=True):
        if (b.turn==chess.WHITE)==our_white:
            mv=M.best(b.fen(),nodes)
            try: b.push_uci(mv)
            except Exception: return ('ILLEGAL '+str(mv))
        else:
            b.push(choose(b,depth))
    r=b.result(claim_draw=True) if b.is_game_over(claim_draw=True) else None
    if r is None:
        sc=sum((1 if p.color else -1)*[0,1,3,3,5,9][p.piece_type] for p in b.piece_map().values())
        r='1-0' if sc>=5 else '0-1' if sc<=-5 else '1/2-1/2'
    w = (r=='1-0')==our_white if r!='1/2-1/2' else None
    return ('W' if w else 'D' if w is None else 'L')
if __name__=='__main__':
    depth=int(sys.argv[1]); nodes=int(sys.argv[2]); n=int(sys.argv[3])
    res=[]
    for i in range(n):
        t=time.time(); r=play(depth,nodes,i,i%2==0); res.append(r)
        print(f"game{i} vs depth-{depth} our_white={i%2==0}: {r} ({time.time()-t:.0f}s)",flush=True)
    print("summary",depth,nodes,"".join(res))
