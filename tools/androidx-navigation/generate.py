from pathlib import Path
import hashlib,json,os,subprocess
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
CACHE=ROOT/'research/navigation-generator';CACHE.mkdir(exist_ok=True)
RUNTIME=ROOT/'research/kotlin-runtime'
source=ROOT/'test/fixtures/androidx/navigation/NavigationItem.kt'
text=source.read_text(encoding='utf-8-sig')
digest=hashlib.sha256(source.read_bytes()).hexdigest()
manifest_path=HERE/'sources.json'
if manifest_path.exists() and json.loads(manifest_path.read_text(encoding='utf-8-sig'))['NavigationItem.kt']['sha256']!=digest:
 raise RuntimeError('Pinned NavigationItem.kt source hash changed')
def extract(prefix):
 start=text.index(prefix);opening=text.index('{',start);depth=1;i=opening+1
 while depth:
  if text[i]=='{':depth+=1
  elif text[i]=='}':depth-=1
  i+=1
 return text[start:i]
policy=extract('private class AnimatedMeasurePolicy').replace('private class AnimatedMeasurePolicy','class AnimatedMeasurePolicy',1)
placement=extract('private fun MeasureScope.placeAnimatedLabelAndIcon')
(CACHE/'Policy.kt').write_text('package androidx.compose.material3\nimport kotlin.math.max\nimport kotlin.math.roundToInt\n'+policy+'\n'+placement+'\n',encoding='utf8')
classpath=str(RUNTIME/'stdlib.jar')
subprocess.run(['java','-cp',str(RUNTIME/'*'),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect',
 '-classpath',classpath,'-jvm-target','1.8','-d',str(CACHE/'oracle.jar'),str(CACHE/'Policy.kt'),str(HERE/'Harness.kt')],check=True)
result=subprocess.run(['java','-cp',str(CACHE/'oracle.jar')+os.pathsep+classpath,'androidx.compose.material3.HarnessKt'],capture_output=True,text=True,check=True)
cases=json.loads(result.stdout)
(ROOT/'test/fixtures/androidx/navigation-rail/geometry-oracle.json').write_text(json.dumps(cases,separators=(',',':'))+'\n',encoding='utf8')
manifest_path.write_text(json.dumps({'NavigationItem.kt':{'sha256':digest,'revision':'a095da93f8e98dea8748ceed79ea8427aade245f'}},indent=2)+'\n',encoding='utf8')
print(f'Generated {len(cases)} Kotlin AnimatedMeasurePolicy/placement cases.')
