import json,sys,random
from http.server import BaseHTTPRequestHandler,HTTPServer
import chess
NG=int(sys.argv[2]) if len(sys.argv)>2 else 2
random.seed(7)
st={"n":0,"b":None,"over":False,"res":None,"white":True,"done":False,"w":0,"d":0,"l":0,"plyof":8}
def endchk():
    b=st["b"]
    if b.is_checkmate(): st["over"]=True; st["res"]='0-1' if b.turn else '1-0'; return 'mate'
    if b.is_stalemate(): st["over"]=True; st["res"]='1/2-1/2'; return 'stalemate'
    if b.is_insufficient_material(): st["over"]=True; st["res"]='1/2-1/2'; return 'material'
    if b.ply()>=200:
        st["over"]=True
        sc=sum((1 if p.color else -1)*[0,1,3,3,5,9][p.piece_type] for p in b.piece_map().values())
        st["res"]='1-0' if sc>=5 else '0-1' if sc<=-5 else '1/2-1/2'; return 'plycap'
    return ''
def start():
    st["n"]+=1; st["b"]=chess.Board(); st["over"]=False; st["res"]=None; st["white"]=(st["n"]%2==1)
    for _ in range(st["plyof"]):
        st["b"].push(random.choice(list(st["b"].legal_moves)))
    endchk()
    if not st["over"] and not st["white"]:
        st["b"].push(random.choice(list(st["b"].legal_moves))); endchk()
def payload():
    b=st["b"]; o={"game":st["n"],"games":NG,"opponent":0,"opponent_name":"random",
      "colour":"white" if st["white"] else "black",
      "opening":{"id":"o%d"%st["n"],"name":"test","moves":[m.uci() for m in b.move_stack[:st["plyof"]]]},
      "start_fen":chess.STARTING_FEN,"moves":[m.uci() for m in b.move_stack],"fen":b.fen(),
      "plies":b.ply(),"last_move":b.move_stack[-1].uci() if b.move_stack else None,
      "status":"over" if st["over"] else "your_move","legal_moves":[m.uci() for m in b.legal_moves],
      "move_limit_ms":10000,"max_plies":200}
    if st["over"]:
        o["result"]=st["res"]; o["outcome"]="draw" if st["res"]=="1/2-1/2" else ("win" if (st["res"]=="1-0")==st["white"] else "loss")
        o["reason"]="end"; o["next_game"]=st["n"]+1
    return o
def tally():
    o=payload()["outcome"]
    print("GAME",st["n"],st["res"],o,"plies",st["b"].ply(),flush=True); st["w"]+=o=="win"; st["d"]+=o=="draw"; st["l"]+=o=="loss"
class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def j(self,o,code=200):
        d=json.dumps(o).encode(); self.send_response(code)
        self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(d)))
        self.end_headers(); self.wfile.write(d)
    def do_POST(self):
        n=int(self.headers.get('Content-Length',0)); body=self.rfile.read(n) or b'{}'
        try: req=json.loads(body)
        except Exception: req={}
        if self.path=='/game':
            if st["done"]:
                return self.j({"status":"done","games":st["n"],"wins":st["w"],"draws":st["d"],"losses":st["l"]})
            if st["b"] is not None and st["over"]:
                tally()
                if st["n"]>=NG:
                    st["done"]=True
                    return self.j({"status":"done","games":st["n"],"wins":st["w"],"draws":st["d"],"losses":st["l"]})
            if st["b"] is None or st["over"]:
                start()
            return self.j(payload())
        if self.path=='/move':
            if req.get("game")!=st["n"] or st["over"]:
                return self.j({"error":"not in play"},400)
            try: st["b"].push_uci(req["move"])
            except Exception:
                print("ILLEGAL",req,flush=True); return self.j({"error":"illegal"},400)
            print("our",req["move"],flush=True)
            if endchk():
                return self.j(payload())
            st["b"].push(random.choice(list(st["b"].legal_moves))); endchk()
            return self.j(payload())
        if self.path=='/resign':
            st["over"]=True; st["res"]='1-0' if not st["white"] else '0-1'; return self.j(payload())
        self.j({"error":"nf"},404)
HTTPServer(('0.0.0.0',int(sys.argv[1])),H).serve_forever()
