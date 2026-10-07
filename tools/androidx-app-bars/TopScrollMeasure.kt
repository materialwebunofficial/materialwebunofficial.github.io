package topappbaroracle
import androidx.compose.material3.TopAppBarMeasurePolicy
import androidx.compose.material3.Slot
import androidx.compose.material3.Scope
import androidx.compose.material3.Host
import androidx.compose.material3.Constraints
import androidx.compose.material3.Arrangement
import androidx.compose.material3.Alignment
import androidx.compose.material3.Dp
import androidx.compose.material3.Pads
import androidx.compose.material3.Placeable
import androidx.compose.material3.IntOffset
import androidx.compose.material3.placeRoot

// Calls the independently prepared unchanged measure policy and Placeable host.
// Leaf inputs are explicit premeasured default title Box/nav/actions dimensions.
fun sourceMeasureRow(offset:Float,titleHeight:Int,minimum:Int,maximum:Int):String {
 Host.rtl=false;Host.boxes.clear();Host.sizes.clear()
 val c=Constraints(400,400,minimum,maximum)
 val slots=listOf(Slot("navigationIcon",4,0,null),Slot("title",108,titleHeight,20),Slot("actionIcons",4,0,null))
 val policy=TopAppBarMeasurePolicy({offset},Arrangement.Center,Alignment.Start,0,Dp(64f),Pads(listOf(0f,0f,0f,0f)))
 val result=with(policy){with(Scope){measure(slots,c)}}
 val root=Placeable("row",result,c)
 with(Placeable.PlacementScope(0,IntOffset.Zero)){placeRoot(root)}
 measuredRowHeight=root.height
 val title=Host.boxes.getValue("title")
 return "{\"height\":${root.height},\"title\":${title.json()}}"
}
