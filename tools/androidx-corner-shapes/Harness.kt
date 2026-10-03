package androidx.compose.foundation.shape

data class UnitValue(val unit:String,val value:Float){
    fun corner():CornerSize=when(unit){"px"->CornerSize(value);"dp"->CornerSize(value.dp);else->sourcePercent(value)}
    fun json()="{\"unit\":\"$unit\",\"value\":${value.json()}}"
}
fun Float.json():String=when {
    isNaN()->"\"NaN\""
    this==Float.POSITIVE_INFINITY->"\"Infinity\""
    this==Float.NEGATIVE_INFINITY->"\"-Infinity\""
    else->toDouble().toString()
}
fun Rect.json()="{\"left\":${left.json()},\"top\":${top.json()},\"right\":${right.json()},\"bottom\":${bottom.json()}}"
fun CornerRadius.json()="[${x.json()},${y.json()}]"
fun Offset.json()="[${x.json()},${y.json()}]"
fun main(){
    fun px(v:Float)=UnitValue("px",v)
    fun dp(v:Float)=UnitValue("dp",v)
    fun pct(v:Float)=UnitValue("percent",v)
    val profiles=listOf(
        List(4){px(0f)},List(4){px(8f)},List(4){dp(8.25f)},List(4){pct(50f)},
        listOf(px(3f),px(20f),px(7f),px(0f)),listOf(dp(13.3f),pct(75f),px(29.25f),dp(0f)),
        listOf(px(140f),px(40f),px(20f),px(170f)),listOf(px(140f),px(140f),px(0f),px(0f)),
        listOf(px(-1f),px(12f),px(0f),px(5f)),listOf(pct(-1f),pct(50f),px(0f),px(1f)),
        List(4){px(Float.MAX_VALUE)},listOf(px(Float.NaN),px(2f),px(0f),px(0f)),
        listOf(px(Float.POSITIVE_INFINITY),px(8f),px(0f),px(0f)),
        listOf(pct(.5f),pct(99.5f),pct(50f),pct(0f)),listOf(px(-0f),px(2f),px(0f),px(0f))
    )
    val sizes=listOf(Size(0f,0f),Size(0f,64f),Size(64f,0f),Size(1f,1f),Size(17f,65f),
        Size(65f,17f),Size(64f,64f),Size(203f,21f),Size(21f,203f),Size(99.5f,33.25f))
    val output=mutableListOf<String>()
    for(kind in listOf("rounded","cut","absolute-rounded","absolute-cut","rectangle","circle")){
        val variants=if(kind in listOf("rectangle","circle"))listOf(List(4){pct(50f)})else profiles
        for(corners in variants)for(size in sizes)for(density in listOf(0f,1f,1.25f,3f))for(rtl in listOf(false,true)){
            val absolute=kind.startsWith("absolute")
            val type = if (kind.contains("cut")) "cut" else if (kind=="rectangle") "rectangle" else "rounded"
            val descriptor="{\"type\":\"$type\",\"absolute\":$absolute,\"corners\":${corners.joinToString(prefix="[",postfix="]"){it.json()}}}"
            val input="{\"shape\":$descriptor,\"width\":${size.width.json()},\"height\":${size.height.json()},\"density\":${density.json()},\"rtl\":$rtl,\"kind\":\"$kind\"}"
            try {
                val shape:Shape=when(kind){
                    "rectangle"->RectangleShape;"circle"->CircleShape
                    else->{val c=corners.map{it.corner()};when(kind){
                        "rounded"->RoundedCornerShape(c[0],c[1],c[2],c[3])
                        "cut"->CutCornerShape(c[0],c[1],c[2],c[3])
                        "absolute-rounded"->AbsoluteRoundedCornerShape(c[0],c[1],c[2],c[3])
                        else->AbsoluteCutCornerShape(c[0],c[1],c[2],c[3])
                    }}
                }
                val outline=shape.createOutline(size,if(rtl)LayoutDirection.Rtl else LayoutDirection.Ltr,TestDensity(density))
                val raw=when(outline){
                    is Outline.Rectangle->"{\"type\":\"rectangle\",\"bounds\":${outline.rect.json()}}"
                    is Outline.Rounded->{val r=outline.roundRect;"{\"type\":\"rounded\",\"bounds\":${Rect(r.left,r.top,r.right,r.bottom).json()},\"radii\":[${listOf(r.topLeftCornerRadius,r.topRightCornerRadius,r.bottomRightCornerRadius,r.bottomLeftCornerRadius).joinToString{it.json()}}]}"}
                    is Outline.Generic->{check(outline.path.closed);"{\"type\":\"generic\",\"bounds\":${size.toRect().json()},\"points\":${outline.path.points.joinToString(prefix="[",postfix="]"){it.json()}}}"}
                }
                val points=if(outline is Outline.Rounded){
                    val queries=listOf(Offset(0f,0f),Offset(size.width,size.height),Offset(-1f,0f),
                        Offset(size.width/2f,size.height/2f),Offset(size.width*.125f,size.height*.125f),
                        Offset(size.width*.875f,size.height*.125f),Offset(size.width*.875f,size.height*.875f),
                        Offset(size.width*.125f,size.height*.875f),Offset(size.width-1f,size.height-1f))
                    queries.joinToString(prefix="[",postfix="]"){"{\"point\":${it.json()},\"inside\":${it in outline.roundRect}}"}
                }else "[]"
                output.add("{\"input\":$input,\"outline\":$raw,\"points\":$points}")
            }catch(e:IllegalArgumentException){output.add("{\"input\":$input,\"error\":true}")}
        }
    }
    print(output.joinToString(prefix="[",postfix="]"))
}
