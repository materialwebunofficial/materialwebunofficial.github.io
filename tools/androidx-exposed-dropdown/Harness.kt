package androidx.compose.material3
fun main(args:Array<String>){
 val records=mutableListOf<String>();val density=object:Density{}
 if(args[0]=="position"){
  for(window in listOf(IntSize(390,700),IntSize(840,900),IntSize(200,180)))
  for(point in listOf(IntOffset(-50,-20),IntOffset(0,0),IntOffset(8,48),IntOffset(300,580),IntOffset(370,690),IntOffset(150,200),IntOffset(20,20)))
  for(width in listOf(112,320,400))for(height in listOf(48,240,800))for(rtl in listOf(false,true))for(insets in listOf(0,24))for(margin in listOf(0,48,60)){
   val anchor=IntRect(point,IntSize(96,56));val size=IntSize(width,height)
   val provider=ExposedDropdownMenuPositionProvider(density,insets,verticalMargin=margin)
   val result=provider.calculatePosition(anchor,window,if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr,size);val origin=provider.transformOrigin
   records.add("{\"input\":{\"anchor\":{\"left\":${anchor.left},\"top\":${anchor.top},\"right\":${anchor.right},\"bottom\":${anchor.bottom}},\"windowSize\":{\"width\":${window.width},\"height\":${window.height}},\"size\":{\"width\":$width,\"height\":$height},\"rtl\":$rtl,\"topWindowInsets\":$insets,\"verticalMargin\":$margin},\"x\":${result.x},\"y\":${result.y},\"origin\":{\"x\":${origin.pivotFractionX},\"y\":${origin.pivotFractionY}}}")
  }
 }else{
  val anchors=listOf<Rect?>(null,Rect(0f,-80f,100f,-20f),Rect(0f,-20f,100f,30f),Rect(10f,48f,120f,104f),Rect(10f,199.25f,120f,255.5f),Rect(10f,199.75f,120f,256.5f),Rect(0f,640f,100f,700f),Rect(0f,720f,100f,780f))
  for(window in listOf(IntRect(0,0,390,700),IntRect(0,24,390,400),IntRect(20,80,420,160)))for(anchor in anchors)for(margin in listOf(0,48,60)){
   val inputAnchor=if(anchor==null)"null" else "{\"left\":${anchor.left},\"top\":${anchor.top},\"right\":${anchor.right},\"bottom\":${anchor.bottom}}"
   records.add("{\"input\":{\"windowBounds\":{\"left\":${window.left},\"top\":${window.top},\"right\":${window.right},\"bottom\":${window.bottom}},\"anchor\":$inputAnchor,\"verticalMargin\":$margin},\"height\":${referenceHeight(window,anchor,margin)}}")
  }
 }
 println(records.joinToString(prefix="[",postfix="]"))
}
