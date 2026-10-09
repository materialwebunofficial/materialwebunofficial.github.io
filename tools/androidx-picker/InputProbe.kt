// Appended to the original private Material3 transformation/state file.
private fun json(text:String):String=buildString {
    append('"');text.forEach { char ->
        when(char){'"'->append("\\\"");'\\'->append("\\\\");'\n'->append("\\n");'\r'->append("\\r");'\t'->append("\\t");else->if(char.code<32||char.code>126)append("\\u"+char.code.toString(16).padStart(4,'0'))else append(char)}
    };append('"')
}
fun main(){
    val records=mutableListOf<String>()
    val texts=listOf("","0","1","2","9","12","23","24","59","60","99","100","x","-1",".5","١٢","５","𝟟","۰۷","\n")
    for(is24 in listOf(false,true))for(hour in listOf(0,7,12,19,23))for(unit in listOf(TimePickerSelectionMode.Hour,TimePickerSelectionMode.Minute))for(a11y in listOf(false,true))for(before in listOf("","0","07","12","17","19","59","99")){
        val selections=((0..before.length).map{it to it}+listOf(0 to before.length,before.length to 0)).distinct()
        for((start,end)in selections)for(insert in texts){
            val state=TimePickerStateImpl(hour,17,is24);state.selection=unit
            val override=Ref<Boolean>();override.value=true;var errors=0
            val error=object:TimeInputErrorHandler{override fun onError(){errors++}}
            val buffer=TextFieldBuffer(TextFieldCharSequence(before,TextRange(start,end)))
            buffer.replace(minOf(start,end),maxOf(start,end),insert)
            buffer.selection=TextRange(minOf(start,end)+insert.length)
            val proposed=buffer.toString();val proposedSelection=buffer.selection
            with(TimeInputTransformation(unit,state,override,a11y,error)){buffer.transformInput()}
            records.add("{\"is24\":"+is24+",\"hour\":"+hour+",\"minute\":17,\"unit\":"+json(unit.toString())+",\"a11y\":"+a11y+",\"before\":"+json(before)+",\"start\":"+start+",\"end\":"+end+",\"insert\":"+json(insert)+",\"proposed\":"+json(proposed)+",\"proposedStart\":"+proposedSelection.start+",\"proposedEnd\":"+proposedSelection.end+",\"result\":{\"text\":"+json(buffer.toString())+",\"start\":"+buffer.selection.start+",\"end\":"+buffer.selection.end+",\"hour\":"+state.hour+",\"minute\":"+state.minute+",\"hourInput\":"+state.hourInput+",\"minuteInput\":"+state.minuteInput+",\"selection\":"+json(state.selection.toString())+",\"hourValid\":"+state.isHourInputValid+",\"minuteValid\":"+state.isMinuteInputValid+",\"userOverride\":"+override.value+",\"errors\":"+errors+"}}")
        }
    }
    // JVM Char.isDigit/toIntOrNull boundaries, including rejection of surrogate
    // digits by the original Char-based filter. This is a platform Unicode host.
    val digits=(0..0xffff).filter{it.toChar().isDigit()}.map{code->"["+code+","+code.toChar().toString().toIntOrNull()+"]"}
    val tokens="{\"width\":"+TimeInputTokens.TimeFieldContainerWidth+",\"height\":"+TimeInputTokens.TimeFieldContainerHeight+",\"shape\":"+json(TimeInputTokens.TimeFieldContainerShape)+",\"font\":"+json(TimeInputTokens.TimeFieldLabelTextFont)+",\"supportFont\":"+json(TimeInputTokens.TimeFieldSupportingTextFont)+",\"supportTop\":"+SupportLabelTop+"}"
    println("{\"records\":"+records.joinToString(prefix="[",postfix="]")+",\"digits\":"+digits.joinToString(prefix="[",postfix="]")+",\"tokens\":"+tokens+"}")
}
