package androidx.compose.animation.core

import androidx.compose.ui.unit.*
import kotlinx.coroutines.Job

fun main(args:Array<String>){
 val dom=args.firstOrNull()=="dom"
 val configurations=if(dom)listOf(15.0 to 15.0) else listOf(15.0 to 15.0,30.0061 to 17.513,0.000001 to 300000.0,3000000.0 to 0.00001)
 val middleWavelength=if(dom)15.0061 else 30.0061
 val lateVertices=if(dom)10.0 else 11.0
 val sameFloatWavelength=if(dom)15.0061000001 else 30.0061000001
 val rows=mutableListOf<String>()
 for(type in listOf("linear","circular"))for(config in configurations){
  val clock=PulseClock();val line=LinearOwner(config.first.dp,config.second.dp);val circle=CircularOwner(config.first.dp,config.second.dp,0f)
  var wavelength=config.first;var speed=config.second;var amplitude=0f;var vertices=9
  val jobs=mutableMapOf<Job,Int>();var previous:Job?=null
  fun record(action:String,number:Double=0.0){
   when(action){
    "attach"->if(type=="linear")line.attach(clock) else {circle.attach(clock);if(dom)circle.cache(9)} // explicit initial web draw/cache trigger
    "detach"->if(type=="linear")line.detach() else circle.detach()
    "frame"->clock.frame((number*1000000).toLong())
    "wavelength"->{wavelength=number;if(type=="linear")line.wavelength=number.dp else circle.wavelength=number.dp}
    "speed"->{speed=number;if(type=="linear")line.waveSpeed=number.dp else circle.waveSpeed=number.dp}
    "amplitude"->{amplitude=number.toFloat();if(type=="circular")circle.amplitude=amplitude}
    "cache"->{vertices=number.toInt();if(type=="circular")circle.cache(vertices)}
   }
   val value=if(type=="linear")line.value else circle.value;val active=if(type=="linear")line.active else circle.active
   val current=if(type=="linear")line.offsetAnimationJob else circle.offsetAnimationJob
   val identity=if(current==null)0 else jobs.getOrPut(current){jobs.size+1}
   val changed=current!==previous;val cancelled=changed&&previous?.isCancelled==true
   if(action=="speed"&&number==200000.0){check(changed&&cancelled)}
   if(action=="wavelength"&&number==sameFloatWavelength){check(!changed)}
   if(action=="detach"){check(!active&&clock.pendingCount==0)}
   rows.add("{\"type\":\"$type\",\"initialWavelength\":${config.first},\"initialSpeed\":${config.second},\"action\":\"$action\",\"number\":$number,\"value\":$value,\"active\":$active,\"job\":$identity,\"changed\":$changed,\"previousCancelled\":$cancelled,\"pending\":${clock.pendingCount},\"wavelength\":$wavelength,\"speed\":$speed,\"amplitude\":$amplitude,\"vertices\":$vertices}")
   previous=current
  }
  record("attach");record("cache",9.0)
  for(time in listOf(16.0,32.0,115.0,123.125,263.0))record("frame",time)
  record("amplitude",1.0);record("cache",9.0)
  for(time in listOf(279.0,395.125,603.0))record("frame",time)
  record("speed",100000.0);record("frame",619.0);record("frame",638.0)
  record("speed",200000.0);record("frame",654.0);record("frame",672.0)
  record("wavelength",middleWavelength);record("speed",middleWavelength);record("cache",7.0)
  for(time in listOf(700.0,716.0,849.125,1697.0))record("frame",time)
  record("cache",lateVertices);record("frame",1997.0)
  record("amplitude",0.0);record("cache",lateVertices);record("frame",2297.0)
  record("amplitude",1.0);record("cache",lateVertices);record("frame",2397.0);record("frame",2597.0)
  record("detach");check(clock.pendingCount==0)
  record("frame",2897.0);record("attach");record("cache",9.0);record("frame",2913.0);record("frame",3047.0)
  record("speed",0.0);record("frame",3147.0);record("speed",-1.0);record("frame",3247.0)
  record("speed",17.513);record("frame",3303.0);record("frame",3597.0)
  record("wavelength",sameFloatWavelength);record("cache",9.0);record("frame",3613.0);record("frame",3967.0)
  record("detach");check(clock.pendingCount==0)
 }
 println(rows.joinToString(prefix="[",postfix="]"))
}
