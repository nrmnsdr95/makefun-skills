import zlib,base64
src=open('build/engine2.py','rb').read()
c=zlib.compress(src,9)
out=b"import zlib,base64\nexec(zlib.decompress(base64.b85decode(" + repr(base64.b85encode(c)).encode() + b")))\n"
open('entry/main.py','wb').write(out)
print(len(out))
