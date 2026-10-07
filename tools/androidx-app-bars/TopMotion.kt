package androidx.compose.material3
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutLinearInEasing
fun main(){
 val alpha=TopTitleAlphaEasing
 val fractions=listOf(-.1f,0f,1e-10f,1e-8f,1e-6f)+List(1025){it/1024f}+listOf(1.1f)
 println(fractions.joinToString(prefix="[",postfix="]"){p->"{\"fraction\":$p,\"alpha\":${alpha.transform(p)},\"color\":${FastOutLinearInEasing.transform(p)}}"})
}
