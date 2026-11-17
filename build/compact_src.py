import os,json,zlib,base64
N=[25,23,14,10,-10,-14,-23,-25]
K=[12,1,-12,-1,11,13,-11,-13]
O=[12,1,-12,-1]
D=[11,13,-11,-13]
V=[0,100,320,330,500,900,0]
S={i for i in range(120)if 1<i%12<10 and 1<i//12<10}
Q=zlib.decompress(base64.b85decode(PB))
P=[None]+[[c-128 for c in Q[i:i+64]]for i in range(0,384,64)]
KE=[c-128 for c in Q[384:448]]
B=[0]*120
T=1
C=15
E=0
ND=0
TT={}
KL=[[0,0]for _ in range(80)]
def q(r,f):return(r+2)*12+f+2
def load(g):
 global B,T,C,E
 B=[0]*120
 g=g.split()
 r=7
 f=0
 for c in g[0]:
  if c=='/':r-=1;f=0
  elif c<':':f+=int(c)
  else:B[q(r,f)]=('pnbrqk'.index(c.lower())+1)*(1 if c<"a" else -1);f+=1
 T=1 if g[1]=='w'else-1
 C=sum(1<<i for i in range(4)if'KQkq'[i]in g[2])
 E=0 if g[3]=='-'else q(int(g[3][1])-1,ord(g[3][0])-97)
def uci(m):
 f=m&127
 t=m>>7&127
 p=m>>14&15
 return chr(95+f%12)+str(f//12-1)+chr(95+t%12)+str(t//12-1)+('nbrq'[p-2]if p else'')
def gen():
 M=[]
 for f in S:
  p=B[f]
  if p*T<1:continue
  a=abs(p)
  if a==1:
   o=f+12*T
   if o in S and not B[o]:
    if o//12==(9 if T>0 else 2):
     for z in(5,4,3,2):M.append(f|o<<7|z<<14)
    else:
     M.append(f|o<<7)
     w=f+24*T
     if f//12==(3 if T>0 else 8)and not B[w]:M.append(f|w<<7|2<<18)
   for d in(-1,1):
    t=o+d
    if t in S and B[t]*T<0:
     if t//12==(9 if T>0 else 2):
      for z in(5,4,3,2):M.append(f|t<<7|z<<14)
     else:M.append(f|t<<7|1<<18)
    elif t==E and E:M.append(f|t<<7|4<<18)
  elif a==6:
   for d in K:
    t=f+d
    if t in S and B[t]*T<1:M.append(f|t<<7|(1<<18 if B[t]else 0))
  else:
   for d in(N if a==2 else O+D if a==5 else O if a==4 else D):
    t=f+d
    while t in S:
     v=B[t]
     if v*T<0:M.append(f|t<<7|1<<18);break
     if v:break
     M.append(f|t<<7)
     if a==2:break
     t+=d
 if T>0:
  if C&1 and not B[q(0,5)]and not B[q(0,6)]and B[q(0,7)]==4:M.append(q(0,4)|q(0,6)<<7|8<<18)
  if C&2 and not B[q(0,3)]and not B[q(0,2)]and not B[q(0,1)]and B[q(0,0)]==4:M.append(q(0,4)|q(0,2)<<7|8<<18)
 else:
  if C&4 and not B[q(7,5)]and not B[q(7,6)]and B[q(7,7)]==-4:M.append(q(7,4)|q(7,6)<<7|8<<18)
  if C&8 and not B[q(7,3)]and not B[q(7,2)]and not B[q(7,1)]and B[q(7,0)]==-4:M.append(q(7,4)|q(7,2)<<7|8<<18)
 return M
def at(s,y):
 for d in N:
  t=s+d
  if t in S and B[t]==y*2:return 1
 for d in K:
  t=s+d
  if t in S and B[t]==y*6:return 1
 for d in(-1,1):
  t=s-12*y+d
  if t in S and B[t]==y:return 1
 for d in O+D:
  t=s+d
  while t in S:
   v=B[t]
   if v:
    if v*y>0:
     a=abs(v)
     if a==5 or a==4and d in O or a==3and d in D:return 1
    break
   t+=d
 return 0
def mk(m):
 global T,C,E
 f=m&127
 t=m>>7&127
 z=m>>14&15
 k=m>>18&15
 if k==8 and(at(f,-T)or at((f+t)//2,-T)):return
 x=B[f]
 u=(B[t],C,E)
 if k==4:B[t-12*T]=0
 B[t]=z*(1 if x>0 else-1)if z else x
 B[f]=0
 if abs(x)==6:
  C&=~(3 if x>0 else 12)
  if abs(t-f)==2:
   a=f+3 if t>f else f-4
   b=a-2 if t>f else a+2
   B[b]=B[a]
   B[a]=0
 if f in Z:C&=~Z[f]
 if t in Z:C&=~Z[t]
 E=f+12*T if k==2 else 0
 T=-T
 if at(KG[8]if 0 else king(-T),T):
  um(m,u)
  return
 return u
