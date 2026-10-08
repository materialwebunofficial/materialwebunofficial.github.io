package android.view
class MotionEvent(val classification:Int,val actionMasked:Int) {
 companion object {const val CLASSIFICATION_TWO_FINGER_SWIPE=3;const val CLASSIFICATION_PINCH=5;const val CLASSIFICATION_AMBIGUOUS_GESTURE=1;const val CLASSIFICATION_DEEP_PRESS=2;const val ACTION_DOWN=0;const val ACTION_UP=1}
}
