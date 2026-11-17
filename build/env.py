import json,sys,time
from http.server import BaseHTTPRequestHandler,HTTPServer
import chess

DEPTH=int(sys.argv[2]) if len(sys.argv)>2 else 2
VAL=[0,100,320,330,500,900,0]
PST={1:[0,0,0,0,0,0,0,0]+[5]*8+[1]*16+[0]*8,2:[-5]*8+[0]*8+[1]*8+[2]*8+[2]*8+[1]*8+[0]*8+[-5]*8}
def ev(b):
    s=0
    for sq,p in b.piece_map().items():
        v=VAL[p.piece_type]
        s+= v if p.color else -v
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
        if v>best: best=v; bm=m
    return bm

class G:
    def __init__(self):
        self.n=0
        self.b=None
        self.done=False
    def start(self):
        self.n+=1
        self.b=chess.Board()
        self.bmoves=[]
        # house plays black if we are white etc: we are white on odd games
        self.our_white=(self.n%2==1)
        self.over=False
        self.result=None
        self.reason=''
        if not self.our_white:
            self.house_move()
        if self.over: self.finish()
    def house_move(self):
        t=time.time()
        m=choose(self.b,DEPTH)
        self.b.push(m); self.bmoves.append(m.uci())
        self.check_end()
    def check_end(self):
        b=self.b
        if b.is_checkmate(): self.over=True; self.result='0-1' if b.turn else '1-0'; self.reason='mate'
        elif b.is_stalemate(): self.over=True; self.result='1/2-1/2'; self.reason='stalemate'
        elif b.is_insufficient_material(): self.over=True; self.result='1/2-1/2'; self.reason='material'
        elif len(self.bmoves)>=200:
            self.over=True
            sc=sum((1 if p.color else -1)*[0,1,3,3,5,9][p.piece_type] for p in b.piece_map().values())
            self.result='1-0' if sc>=5 else '0-1' if sc<=-5 else '1/2-1/2'; self.reason='plycap'
    def payload(self):
        b=self.b
        out={"game":self.n,"games":8,"opponent":DEPTH,"opponent_name":f"depth-{DEPTH}",
             "colour":"white" if self.our_white else "black",
             "opening":{"id":"t","name":"test","moves":[]},
             "start_fen":chess.STARTING_FEN,"moves":self.bmoves,"fen":b.fen(),
             "plies":len(self.bmoves),"last_move":self.bmoves[-1] if self.bmoves else None,
             "status":"over" if self.over else "your_move",
             "legal_moves":[m.uci() for m in b.legal_moves],
             "move_limit_ms":10000,"max_plies":200}
        if self.over:
            out["result"]=self.result
            out["outcome"]="win" if (self.result=="1-0")==self.our_white and self.result!="1/2-1/2" else ("draw" if self.result=="1/2-1/2" else "loss")
            out["reason"]=self.reason
        return out
    def finish(self):
        self.done=True

GAMES=G()
STATS={"wins":0,"draws":0,"losses":0}

class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def send(self,obj):
        d=json.dumps(obj).encode()
        self.send_response(200); self.send_header('Content-Type','application/json')
        self.send_header('Content-Length',str(len(d))); self.end_headers(); self.wfile.write(d)
    def do_POST(self):
        n=int(self.headers.get('Content-Length',0))
        body=self.rfile.read(n) or b'{}'
        try: req=json.loads(body)
        except Exception: req={}
        g=GAMES
        if self.path=='/game':
            if g.done:
                self.send({"status":"done","games":g.n,"wins":STATS["wins"],"draws":STATS["draws"],"losses":STATS["losses"]}); return
            if g.b is None or g.over:
                if g.b is not None and g.over:
                    r=g.payload()
                    o=r["outcome"]; STATS["wins" if o=="win" else "draws" if o=="draw" else "losses"]+=1
                    if g.n>=int(sys.argv[3]) if len(sys.argv)>3 else False: pass
                g.start()
                if g.over:
                    self.send(g.payload())
                    return
            self.send(g.payload()); return
        if self.path=='/move':
            mv=req.get('move')
            try:
                g.b.push_uci(mv)
            except Exception as e:
                self.send_response(400); self.end_headers(); return
            g.bmoves.append(mv)
            g.check_end()
            if not g.over: g.house_move()
            if g.over:
                r=g.payload(); o=r["outcome"]; STATS["wins" if o=="win" else "draws" if o=="draw" else "losses"]+=1
                self.send(r); return
            self.send(g.payload()); return
        if self.path=='/resign':
            g.over=True; g.result='1-0' if not g.our_white else '0-1'; g.reason='resign'
            r=g.payload(); STATS["losses"]+=1
            self.send(r); return
        self.send_response(404); self.end_headers()

port=int(sys.argv[1])
HTTPServer(('0.0.0.0',port),H).serve_forever()
