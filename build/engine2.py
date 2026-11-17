import json,os,zlib,base64
from urllib.request import Request,urlopen
N=[25,23,14,10,-10,-14,-23,-25]
K=[12,1,-12,-1,11,13,-11,-13]
O=[12,1,-12,-1]
D=[11,13,-11,-13]
V=[0,100,320,330,500,900,0]
S={i for i in range(120)if 1<i%12<10 and 1<i//12<10}
Z={33:1,26:2,117:4,110:8}
Q=zlib.decompress(base64.b64decode(b'eNqFUKsSAzEI/MNoNBqNicFgMDGYM9Gn+4VdktxMKzpdwYbHbhLMNl4HETlnRrjHdSGilYngXc20oxwiaB+ZNWKAGkllQmwxRhizj8zhzFZcedWdMQdToUcnuiC67VTNy121bnJHHgDyWEC9xlwf3fMO333vO+3/uCRlBZ/ev+8H8NPN3Q6r7zr6a+7RMVFrhM/8YKkTs6gs6FomVpozzGIm9iAwaVwvgB1r7V/B877nJ586l5658UJ7A7Np1hA='))
P=[None]+[[c-128 for c in Q[i:i+64]]for i in range(0,384,64)]
KE=[c-128 for c in Q[384:]]
B=[0]*120
KD=[30,114]
T=1
C=15
E=0
ND=0
LM=1<<30
AB=0
TT={}
KL=[[0,0]for _ in range(99)]
HI=[[0]*120 for _ in range(120)]
def q(r,f):return(r+2)*12+f+2
def load(g):
 global B,T,C,E,KD
 B=[0]*120
 g=g.split()
 r=7
 f=0
 for c in g[0]:
  if c=='/':r-=1;f=0
  elif c<':':f+=int(c)
  else:B[q(r,f)]=('pnbrqk'.index(c.lower())+1)*(1 if c<'a'else-1);f+=1
 KD=[i for i in S if B[i]==6]+[i for i in S if B[i]==-6]
 KD=KD[:1]+KD[-1:]
 T=1 if g[1]=='w'else-1
 C=sum(1<<i for i in range(4)if'KQkq'[i]in g[2])
 E=0 if g[3]=='-'else q(int(g[3][1])-1,ord(g[3][0])-97)
def uci(m):
 f=m&127
 t=m>>7&127
 z=m>>14&15
 return chr(95+f%12)+str(f//12-1)+chr(95+t%12)+str(t//12-1)+('nbrq'[z-2]if z else'')
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
  if C&1 and not B[31]and not B[32]and B[33]==4:M.append(q(0,4)|q(0,6)<<7|8<<18)
  if C&2 and not B[29]and not B[28]and not B[27]and B[26]==4:M.append(q(0,4)|q(0,2)<<7|8<<18)
 else:
  if C&4 and not B[115]and not B[116]and B[117]==-4:M.append(q(7,4)|q(7,6)<<7|8<<18)
  if C&8 and not B[113]and not B[112]and not B[111]and B[110]==-4:M.append(q(7,4)|q(7,2)<<7|8<<18)
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
     if a==5 or a==4 and d in O or a==3 and d in D:return 1
    break
   t+=d
 return 0
def ck():return at(KD[T<0],-T)
def um(m,u):
 global T,C,E
 f=m&127
 t=m>>7&127
 z=m>>14&15
 k=m>>18&15
 T=-T
 x=B[t]
 B[f]=x if not z else(1 if x>0 else-1)
 B[t]=u[0]
 C=u[1]
 E=u[2]
 if k==4:B[t-12*T]=-T
 if abs(B[f])==6:
  KD[B[f]<0]=f
  if abs(t-f)==2:
   b=f+1 if t>f else f-1
   B[f+3 if t>f else f-4]=B[b]
   B[b]=0
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
  KD[x<0]=t
  C&=~(3 if x>0 else 12)
  if abs(t-f)==2:
   b=f+1 if t>f else f-1
   B[b]=B[f+3 if t>f else f-4]
   B[f+3 if t>f else f-4]=0
 if f in Z:C&=~Z[f]
 if t in Z:C&=~Z[t]
 E=f+12*T if k==2 else 0
 T=-T
 if at(KD[T>0],T):um(m,u);return
 return u
def lg():
 o=[]
 for m in gen():
  u=mk(m)
  if u is None:continue
  o.append(m)
  um(m,u)
 return o
def ev():
 s=0
 b=0
 n=0
 for i in S:
  v=B[i]
  if v:
   n+=1
   a=abs(v)
   j=(i//12-2)*8+i%12-2
   s+=V[a]+P[a][j]if v>0 else-V[a]-P[a][j^56]
   if a==3:b+=1 if v>0 else-1
 if b>1:s+=25
 elif b<-1:s-=25
 if n<15:s+=KE[(KD[0]//12-2)*8+KD[0]%12-2]-KE[(KD[1]//12-2)*8+KD[1]%12-2]
 return s*T
def mv(ms,bm,pl):
 o=[]
 for m in ms:
  v=B[m>>7&127]
  s=99*V[abs(v)]-V[abs(B[m&127])]if v else KL[pl][0]==m and 900 or KL[pl][1]==m and 800 or HI[m&127][m>>7&127]
  if m==bm:s+=99999
  o.append((s,m))
 o.sort(reverse=True)
 return[z for s,z in o]
def qs(a,b):
 global ND
 ND+=1
 s=ev()
 if s>=b:return b
 if s>a:a=s
 for m in mv(gen(),0,0):
  if m>>18&15:
   u=mk(m)
   if u is None:continue
   v=-qs(-b,-a)
   um(m,u)
   if v>=b:return b
   if v>a:a=v
 return a
def ab(d,a,b,pl):
 global ND,AB,T,E
 if d<1:return qs(a,b)
 ND+=1
 if ND>LM:AB=1;return 0
 k=(tuple(B),T,C,E)
 e=TT.get(k)
 if e and e[0]>=d:
  if e[2]<1:return e[1]
  if e[2]==1 and e[1]<=a:return a
  if e[2]==2 and e[1]>=b:return b
 bm=e[3]if e else 0
 if d>2 and pl<8 and not ck() and ev()>=b-60:
  T=-T;E=0
  v=-ab(d-3,-b,-b+1,pl+1)
  T=-T
  if v>=b:return b
 ms=gen()
 if not ms:return-9999+pl if ck()else 0
 a0=a
 sc=-99999
 c=0
 for m in mv(ms,bm,pl):
  u=mk(m)
  if u is None:continue
  r=1 if c>3 and d>2 and not m>>18&15 else 0
  v=-ab(d-1-r,-b,-a,pl+1)
  if v>a and r:v=-ab(d-1,-b,-a,pl+1)
  um(m,u)
  c+=1
  if v>sc:sc=v;bm=m
  if sc>a:
   a=sc
   if a>=b:
    if not m>>18&15:
     if KL[pl][0]!=m:KL[pl][1]=KL[pl][0]
     KL[pl][0]=m
     HI[m&127][m>>7&127]+=d
    TT[k]=(d,sc,2,bm)
    return sc
 TT[k]=(d,sc,0 if sc>a0 else 1,bm)
 return sc
def best(g,nd=70000,hs=None):
 global ND,TT,KL,HI,LM,AB
 load(g)
 ms=lg()
 if not ms:return
 if len(ms)<2:return uci(ms[0])
 ND=0
 LM=nd
 AB=0
 TT={}
 KL=[[0,0]for _ in range(99)]
 HI=[[0]*120 for _ in range(120)]
 bm=c=ms[0]
 for d in range(1,12):
  sc=-99999
  for m in mv(ms,bm,0):
   u=mk(m)
   if u is None:continue
   v=-ab(d-1,-99999,-sc,0)
   um(m,u)
   if v>sc:sc=v;c=m
  if AB:break
  bm=c
  if ND>nd:break
 if hs:
  for m in mv(ms,bm,0):
   if m==bm:continue
   u=mk(m)
   if u is None:continue
   r=(tuple(B),T,C,E)
   um(m,u)
   if hs.get(r,0)<2:bm=m;break
 return uci(bm)
def post(p,d):
 r=Request(os.environ['MAKEFUN_ENV_URL'].rstrip('/')+p,json.dumps(d).encode(),{'Content-Type':'application/json'})
 return json.load(urlopen(r,timeout=9))
def main():
 g=post('/game',{})
 while g.get('status')!='done':
  g=post('/move',{'game':g['game'],'move':best(g['fen'])})if g.get('status')=='your_move'else post('/game',{})
if __name__=='__main__':main()
