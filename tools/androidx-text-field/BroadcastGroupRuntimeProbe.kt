package androidx.compose.animation.core

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tooling.AnimateValueAsStateToolingHandle
import androidx.compose.runtime.*
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.colorspace.ColorSpaces
import kotlinx.coroutines.*
import java.util.IdentityHashMap

private fun vectorJson(vector:AnimationVector)= (0 until vector.size).joinToString(",","[","]"){vector[it].toString()}
private fun jobJson(job:Job?)=if(job==null)"null" else "{\"active\":${job.isActive},\"cancelled\":${job.isCancelled},\"completed\":${job.isCompleted}}"

@Suppress("UNCHECKED_CAST")
fun main(){
 val rows=mutableListOf<String>();val names=listOf("width","container","border")
 for(scheme in listOf("expressive","standard"))for(scenario in listOf("finish","finish-restart","cancel-sibling","spawn-sibling","cancel-all","forget-unused")){
  val host=BroadcastClockHost();val scope=CoroutineScope(SupervisorJob()+host.dispatcher+host.frameClock);val composition=Composition(scope)
  val targets=mutableListOf(0,0,0);lateinit var states:List<State<Any>>;val finished=mutableListOf<String>();var time=0L;var hook=false
  val stiffness=if(scheme=="expressive")800f else 1400f;val damping=if(scheme=="expressive").6f else .9f
  fun handle(i:Int)=states[i] as AnimateValueAsStateToolingHandle<Any,AnimationVector>
  fun job(i:Int):Job? {val field=states[i]::class.java.getDeclaredField("job");field.isAccessible=true;return field.get(states[i]) as Job?}
  fun remembered(i:Int):RememberedCoroutineScope {val field=states[i]::class.java.getDeclaredField("coroutineScope");field.isAccessible=true;return field.get(states[i]) as RememberedCoroutineScope}
  fun values()=names.indices.joinToString(",","{","}"){i->"\"${names[i]}\":${vectorJson(handle(i).animatable.typeConverter.convertToVector(states[i].value))}"}
  fun snapshot(event:String,action:String="null",write:Boolean=false){
   val fields=if(write)"\"values\":${values()}" else "\"fields\":"+names.indices.joinToString(",","{","}"){i->val anim=handle(i).animatable;"\"${names[i]}\":{\"value\":${vectorJson(anim.typeConverter.convertToVector(states[i].value))},\"velocity\":${vectorJson(anim.velocityVector)},\"target\":${vectorJson(anim.typeConverter.convertToVector(anim.targetValue))},\"running\":${anim.isRunning},\"job\":${jobJson(job(i))}}"}
   rows.add("{\"scheme\":\"$scheme\",\"scenario\":\"$scenario\",\"time\":$time,\"event\":\"$event\",\"action\":$action,$fields,\"frames\":${host.pendingFrames},\"finished\":[${finished.joinToString(","){"\"$it\""}}]}")
  }
  lateinit var commit:()->Unit
  fun finish(i:Int){finished.add(names[i]);snapshot("finish:${names[i]}");if(scenario=="finish-restart"&&i==1&&!hook){hook=true;targets[0]=0;targets[2]=0;commit();snapshot("finish-restart","{\"targets\":[0,1,0]}")}}
  fun color(index:Int)=if(index==0)Color(.5f,.01f,-.04f,1f,ColorSpaces.Oklab)else Color(.95f,.4f,-.4f,.3f,ColorSpaces.Oklab)
  commit={states=composition.commit{listOf(
   animateDpAsState(Dp(if(targets[0]==0)1f else 2f),SpringSpec<Dp>(damping,stiffness),label="width",finishedListener={finish(0)}) as State<Any>,
   animateColorAsState(color(targets[1]),SpringSpec<Color>(1f,3800f),label="container",finishedListener={finish(1)}) as State<Any>,
   animateColorAsState(color(targets[2]),SpringSpec<Color>(1f,3800f),label="border",finishedListener={finish(2)}) as State<Any>
  )}}
  commit();val contextField=RememberedCoroutineScope::class.java.getDeclaredField("_coroutineContext").also{it.isAccessible=true}
  for(i in names.indices)check(contextField.get(remembered(i))==null)
  val delegates=IdentityHashMap<Any,String>()
  for(i in names.indices){val anim=handle(i).animatable;val field=anim::class.java.getDeclaredField("internalState").also{it.isAccessible=true};val animationState=field.get(anim);val delegate=animationState::class.java.getDeclaredField("value\$delegate").also{it.isAccessible=true}.get(animationState);delegates[delegate]=names[i]}
  StateWriteObserver.write={state,_->val name=delegates[state];if(name!=null){snapshot("write:$name",write=true);if(name=="container"&&time==64L&&!hook){when(scenario){
   "cancel-sibling"->{hook=true;remembered(2).onForgotten()}
   "spawn-sibling"->{hook=true;targets[2]=1;commit()}
  }}}}
  snapshot("initial")
  if(scenario=="forget-unused"){
   composition.dispose();snapshot("forget-unused","{\"cancel\":true}");for(i in names.indices)check((contextField.get(remembered(i)) as kotlin.coroutines.CoroutineContext)[Job]==null)
   host.pump();snapshot("forget-unused-pump");scope.cancel();StateWriteObserver.write=null;continue
  }
  targets[0]=1;targets[1]=1;targets[2]=if(scenario=="spawn-sibling")0 else 1;commit();snapshot("start","{\"targets\":[${targets.joinToString(",")} ]}")
  for(i in names.indices){val context=remembered(i).coroutineContext;check(context[MonotonicFrameClock]===host.frameClock);check(context[Job]!==scope.coroutineContext[Job])}
  host.pump();snapshot("start-pump")
  for(frame in 16L..512L step 16L){
   time=frame;host.frame(frame*1_000_000L);snapshot("frame-delivery");host.pump();snapshot("frame-pump")
   if(frame==64L&&scenario=="cancel-all"){composition.dispose();snapshot("cancel-all","{\"cancel\":true}");host.pump();snapshot("cancel-all-pump")}
   time=frame+8;snapshot("between-frames")
  }
  time=520;composition.dispose();scope.cancel();snapshot("scope-cancel","{\"cancel\":true}");host.pump();snapshot("scope-cancel-pump");check(host.pendingFrames==0)
  StateWriteObserver.write=null
 }
 println(rows.joinToString(",","[","]"))
}
