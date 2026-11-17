#!/usr/bin/env python3
# tiny chess engine, 120-square board
import sys, os, json, urllib.request
RS = {i for i in range(120) if 1 < i % 12 < 10 and 1 < i // 12 < 10}
KN = [25, 23, 14, 10, -10, -14, -23, -25]
KG = [12, 1, -12, -1, 11, 13, -11, -13]
OR = [12, 1, -12, -1]
DG = [11, 13, -11, -13]
VAL = [0, 100, 325, 335, 500, 975, 0]

# piece square tables (white, from a1=rank0)
PST = {
 1: [0,0,0,0,0,0,0,0,
     50,50,50,50,50,50,50,50,
     10,10,20,30,30,20,10,10,
     5,5,10,25,25,10,5,5,
     0,0,0,20,20,0,0,0,
     5,-5,-10,0,0,-10,-5,5,
     5,10,10,-20,-20,10,10,5,
     0,0,0,0,0,0,0,0],
 2: [-50,-40,-30,-30,-30,-30,-40,-50,
     -40,-20,0,0,0,0,-20,-40,
     -30,0,10,15,15,10,0,-30,
     -30,5,15,20,20,15,5,-30,
     -30,0,15,20,20,15,0,-30,
     -30,5,10,15,15,10,5,-30,
     -40,-20,0,5,5,0,-20,-40,
     -50,-40,-30,-30,-30,-30,-40,-50],
 3: [-20,-10,-10,-10,-10,-10,-10,-20,
     -10,0,0,0,0,0,0,-10,
     -10,0,5,10,10,5,0,-10,
     -10,5,5,10,10,5,5,-10,
     -10,0,10,10,10,10,0,-10,
     -10,10,10,10,10,10,10,-10,
     -10,5,0,0,0,0,5,-10,
     -20,-10,-10,-10,-10,-10,-10,-20],
 4: [0,0,0,0,0,0,0,0,
     5,10,10,10,10,10,10,5,
     -5,0,0,0,0,0,0,-5,
     -5,0,0,0,0,0,0,-5,
     -5,0,0,0,0,0,0,-5,
     -5,0,0,0,0,0,0,-5,
     -5,0,0,0,0,0,0,-5,
     0,0,0,5,5,0,0,0],
 5: [-20,-10,-10,-5,-5,-10,-10,-20,
     -10,0,0,0,0,0,0,-10,
     -10,0,5,5,5,5,0,-10,
     -5,0,5,5,5,5,0,-5,
     0,0,5,5,5,5,0,-5,
     -10,5,5,5,5,5,0,-10,
     -10,0,5,0,0,0,0,-10,
     -20,-10,-10,-5,-5,-10,-10,-20],
 6: [-30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -20,-30,-30,-40,-40,-30,-30,-20,
     -10,-20,-20,-20,-20,-20,-20,-10,
     20,20,0,0,0,0,20,20,
     20,30,10,0,0,10,30,20],
}
B = [0] * 120
T = 1
C = 15
E = 0
NOD = 0
KIL = [[0, 0] for _ in range(64)]
HIS = [[0] * 120 for _ in range(120)]
TT = {}

def sq(r, f):
    return (r + 2) * 12 + f + 2

def parse(fen):
    global B, T, C, E
    B = [0] * 120
    part = fen.split()
    r = 7
    f = 0
    for ch in part[0]:
        if ch == '/':
            r -= 1; f = 0
        elif ch.isdigit():
            f += int(ch)
        else:
            low = ch.lower()
            t = 'pnbrqk'.index(low) + 1
            B[sq(r, f)] = t if ch.isupper() else -t
            f += 1
    T = 1 if part[1] == 'w' else -1
    C = 0
    cr = part[2]
    if 'K' in cr: C |= 1
    if 'Q' in cr: C |= 2
    if 'k' in cr: C |= 4
    if 'q' in cr: C |= 8
    E = 0 if part[3] == '-' else sq(int(part[3][1]) - 1, ord(part[3][0]) - 97)

def uci(m):
    f = m & 127; t = (m >> 7) & 127; pr = (m >> 14) & 15
    s = chr(95 + f % 12) + str(f // 12 - 1) + chr(95 + t % 12) + str(t // 12 - 1)
    return s + ('nbrq'[pr - 2] if pr else '')

def gen():
    ms = []
    for f in RS:
        p = B[f]
        if p * T <= 0: continue
        a = abs(p)
        if a == 1:
            one = f + 12 * T
            if one in RS and not B[one]:
                if one // 12 == (9 if T > 0 else 2):
                    for pr in (5, 4, 3, 2): ms.append(f | one << 7 | pr << 14)
                else:
                    ms.append(f | one << 7)
                    two = f + 24 * T
                    if f // 12 == (3 if T > 0 else 8) and not B[two]: ms.append(f | two << 7 | 2 << 18)
            for d in (-1, 1):
                t = one + d
                if t in RS and B[t] * T < 0:
                    if t // 12 == (9 if T > 0 else 2):
                        for pr in (5, 4, 3, 2): ms.append(f | t << 7 | pr << 14)
                    else:
                        ms.append(f | t << 7 | 1 << 18)
                elif t == E and E:
                    ms.append(f | t << 7 | 4 << 18)
        elif a == 6:
            for d in KG:
                t = f + d
                if t in RS and B[t] * T <= 0: ms.append(f | t << 7 | (1 << 18 if B[t] else 0))
        else:
            for d in (KN if a == 2 else OR + DG if a == 5 else OR if a == 4 else DG):
                t = f + d
                while t in RS:
                    v = B[t]
                    if v * T < 0:
                        ms.append(f | t << 7 | 1 << 18); break
                    if v: break
                    ms.append(f | t << 7)
                    if a == 2: break
                    t += d
    # castling
    if T > 0:
        if C & 1 and not B[sq(0,5)] and not B[sq(0,6)] and B[sq(0,7)] == 4:
            ms.append(sq(0,4) | sq(0,6) << 7 | 8 << 18)
        if C & 2 and not B[sq(0,3)] and not B[sq(0,2)] and not B[sq(0,1)] and B[sq(0,0)] == 4:
            ms.append(sq(0,4) | sq(0,2) << 7 | 8 << 18)
    else:
        if C & 4 and not B[sq(7,5)] and not B[sq(7,6)] and B[sq(7,7)] == -4:
            ms.append(sq(7,4) | sq(7,6) << 7 | 8 << 18)
        if C & 8 and not B[sq(7,3)] and not B[sq(7,2)] and not B[sq(7,1)] and B[sq(7,0)] == -4:
            ms.append(sq(7,4) | sq(7,2) << 7 | 8 << 18)
    return ms

def att(s, by):
    # is square s attacked by side `by`
    for d in KN:
        t = s + d
        if t in RS and B[t] == by * 2: return True
    for d in KG:
        t = s + d
        if t in RS and B[t] == by * 6: return True
    pw = -12 * by
    for d in (-1, 1):
        t = s + pw + d
        if t in RS and B[t] == by * 1: return True
    for d in OR + DG:
        t = s + d
        while t in RS:
            v = B[t]
            if v:
                if v * by > 0:
                    a = abs(v)
                    if a == 5 or (a == 4 and d in OR) or (a == 3 and d in DG): return True
                break
            t += d
    return False

def king(side):
    for i in RS:
        if B[i] == side * 6: return i
    return -1

def chk(side):
    k = king(side)
    return k >= 0 and att(k, -side)

def mk(m):
    global T, C, E
    f = m & 127; t = (m >> 7) & 127; pr = (m >> 14) & 15; fl = (m >> 18) & 15
    p = B[f]; cap = B[t]
    u = (cap, C, E)
    if fl == 4: B[t - 12 * T] = 0
    B[t] = p if not pr else (pr if p > 0 else -pr)
    B[f] = 0
    if abs(p) == 6 and abs(t - f) == 2:
        if t > f: c = f + 3; c2 = f + 1
        else: c = f - 4; c2 = f - 1
        B[c2] = B[c]; B[c] = 0
    if abs(p) == 6: C &= ~(3 if p > 0 else 12)
    if f == sq(0, 0) or t == sq(0, 0): C &= ~2
    if f == sq(0, 7) or t == sq(0, 7): C &= ~1
    if f == sq(7, 0) or t == sq(7, 0): C &= ~8
    if f == sq(7, 7) or t == sq(7, 7): C &= ~4
    E = f + 12 * T if fl == 2 else 0
    T = -T
    return u

def umk(m, u):
    global T, C, E
    f = m & 127; t = (m >> 7) & 127; pr = (m >> 14) & 15; fl = (m >> 18) & 15
    T = -T
    p = B[t]
    if pr: p = p // abs(p)
    B[f] = p; B[t] = u[0]
    C = u[1]; E = u[2]
    if fl == 4: B[t - 12 * T] = -T
    if abs(p) == 6 and abs(t - f) == 2:
        if t > f: c = f + 3; c2 = f + 1
        else: c = f - 4; c2 = f - 1
        B[c] = B[c2]; B[c2] = 0

def mkck(m):
    f = m & 127; t = (m >> 7) & 127
    if (m >> 18) & 15 == 8 and (att(f, -T) or att((f + t) // 2, -T)): return None
    u = mk(m)
    if chk(-T): umk(m, u); return None
    return u

def legal():
    out = []
    for m in gen():
        u = mkck(m)
        if u is None: continue
        out.append(m); umk(m, u)
    return out

def ev():
    s = 0; bw = 0; bb = 0
    for i in RS:
        v = B[i]
        if v:
            a = abs(v)
            if v > 0: s += VAL[a] + PST[a][(i // 12 - 2) * 8 + i % 12 - 2]
            else:
                s -= VAL[a] + PST[a][(9 - i // 12) * 8 + i % 12 - 2]
            if a == 3:
                bw += v > 0; bb += v < 0
    if bw > 1: s += 25
    if bb > 1: s -= 25
    return s * T

def qs(alpha, beta):
    global NOD
    NOD += 1
    s = ev()
    if s >= beta: return beta
    if s > alpha: alpha = s
    for m in mvvs(gen()):
        if not (m >> 18) & 15: continue
        u = mkck(m)
        if u is None: continue
        v = -qs(-beta, -alpha)
        umk(m, u)
        if v >= beta: return beta
        if v > alpha: alpha = v
    return alpha

def mvvs(ms):
    sc = []
    for m in ms:
        t = (m >> 7) & 127; fl = (m >> 18) & 15
        f = m & 127
        if fl & 7:
            sc.append((VAL[abs(B[t]) if B[t] else 1] * 10 - VAL[abs(B[f])], m))
        else:
            sc.append((KIL[0][0] == m and 900 or 0, m))
    sc.sort(reverse=True)
    return [m for _, m in sc]

def ab(d, alpha, beta, ply):
    global NOD
    NOD += 1
    key = (tuple(B), T, C, E)
    e = TT.get(key)
    if e and e[0] >= d:
        if e[2] == 0: return e[1]
        if e[2] == 1 and e[1] <= alpha: return alpha
        if e[2] == 2 and e[1] >= beta: return beta
    ms = gen()
    best = -99999; bm = 0; fl = 1
    if e: bm = e[3]
    if not ms: return -9999 + ply if chk(T) else 0
    ms = mvvs(ms)
    if bm:
        for i, m in enumerate(ms):
            if m == bm: ms.insert(0, ms.pop(i)); break
    for m in ms:
        u = mkck(m)
        if u is None: continue
        if d > 1: v = -ab(d - 1, -beta, -alpha, ply + 1)
        else: v = -qs(-beta, -alpha)
        umk(m, u)
        if v > best:
            best = v; bm = m
        if best > alpha:
            alpha = best; fl = 0
        if alpha >= beta:
            if not (m >> 18) & 15:
                if KIL[0][0] != m: KIL[1][0] = KIL[0][0]; KIL[0][0] = m
            break
    TT[key] = (d, best, fl, bm)
    return best

def pick(fen, nodes=60000, maxd=9):
    global NOD, TT, KIL, HIS
    parse(fen)
    ms = legal()
    if not ms: return None
    if len(ms) == 1: return uci(ms[0])
    NOD = 0
    TT = {}; KIL = [[0, 0] for _ in range(64)]
    best = ms[0]
    for d in range(1, maxd + 1):
        b = -99999; bmv = 0
        for m in mvvs(ms):
            u = mk(m)
            v = -ab(d - 1, -99999, -b, 0) if d > 1 else -qs(-99999, 99999)
            umk(m, u)
            if v > b: b = v; bmv = m
        if bmv: best = bmv
        if NOD > nodes: break
    return uci(best)
