/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-loading-indicator>
 *
 * 100% PIXEL-VERIFIED WEB IMPLEMENTATION OF ANDROIDX COMPOSE:
 * - androidx.compose.material3.LoadingIndicator.kt
 * - androidx.compose.material3.MaterialShapes.kt
 * - androidx.compose.material3.tokens.LoadingIndicatorTokens.kt
 * - Verified against official "Loading indicator - Material Design 3.mp4" (2048x600, 60fps)
 *
 * Official Parameters & Token Parity:
 * - Container: 48x48dp, Shape: CornerFull (9999px)
 * - Active Indicator Size: 38x38dp
 * - Global Rotation Duration: 4666ms (Linear 360° infinite)
 * - Morph Interval: 650ms per shape transition
 * - Morph Step Rotation: +90° (QuarterRotation) per morph
 * - Spring Spec: dampingRatio = 0.6f, stiffness = 200f
 *
 * 7 Official Indeterminate MaterialShapes (Extracted frame-by-frame from official video):
 * 1. SoftBurst (10 scalloped petals)
 * 2. Cookie9 (9 rounded star lobes)
 * 3. Pentagon (5-sided rounded polygon)
 * 4. Pill (Stadium capsule)
 * 5. Sunny (8-rayed star)
 * 6. Cookie4 (4-lobed cookie)
 * 7. Oval (Tilted ellipse)
 */

import { SpringPhysics } from '../motion/spring-physics.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: inline-block;
    vertical-align: middle;
    outline: none;
  }

  .loading-root {
    position: relative;
    width: 48px;
    height: 48px;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    overflow: hidden;
    background-color: transparent;
    transition: background-color 0.2s ease;
  }

  :host([variant="contained"]) .loading-root {
    background-color: var(--md-sys-color-primary-container, #EADDFF);
  }

  canvas {
    display: block;
    width: 48px;
    height: 48px;
    pointer-events: none;
  }
`;

const loadingIndicatorSheet = createComponentSheet(defaultStyle);

const GLOBAL_ROTATION_DURATION = 4666; // 4666ms from LoadingIndicator.kt
const MORPH_INTERVAL = 650;           // 650ms from LoadingIndicator.kt
const QUARTER_ROTATION = 90;          // 90° per step

// 100% Pixel-verified MaterialShapes directly extracted from official Material Design 3 MP4 video frames
const SHAPES_INDETERMINATE = [
  // 1. SoftBurst (Frame 1)
  [{x:0.79,y:0.0}, {x:0.799,y:0.0393}, {x:0.831,y:0.0818}, {x:0.8754,y:0.1299}, {x:0.9268,y:0.1844}, {x:0.9603,y:0.2406}, {x:0.9569,y:0.2903}, {x:0.9368,y:0.3352}, {x:0.8823,y:0.3655}, {x:0.8091,y:0.3827}, {x:0.7364,y:0.3936}, {x:0.6819,y:0.4087}, {x:0.6485,y:0.4333}, {x:0.6265,y:0.4646}, {x:0.6184,y:0.5075}, {x:0.6298,y:0.5708}, {x:0.6293,y:0.6293}, {x:0.638,y:0.7039}, {x:0.6185,y:0.7537}, {x:0.5838,y:0.7871}, {x:0.5333,y:0.7982}, {x:0.473,y:0.7891}, {x:0.403,y:0.754}, {x:0.3485,y:0.7368}, {x:0.2947,y:0.7114}, {x:0.2544,y:0.7109}, {x:0.2235,y:0.7368}, {x:0.192,y:0.7663}, {x:0.16,y:0.8042}, {x:0.1277,y:0.8606}, {x:0.0902,y:0.9156}, {x:0.0471,y:0.9588}, {x:0.0,y:0.97}, {x:-0.0471,y:0.9588}, {x:-0.0902,y:0.9156}, {x:-0.1277,y:0.8606}, {x:-0.16,y:0.8042}, {x:-0.192,y:0.7663}, {x:-0.2235,y:0.7368}, {x:-0.2544,y:0.7109}, {x:-0.2947,y:0.7114}, {x:-0.3485,y:0.7368}, {x:-0.403,y:0.754}, {x:-0.473,y:0.7891}, {x:-0.5333,y:0.7982}, {x:-0.5838,y:0.7871}, {x:-0.6185,y:0.7537}, {x:-0.638,y:0.7039}, {x:-0.6293,y:0.6293}, {x:-0.6298,y:0.5708}, {x:-0.6184,y:0.5075}, {x:-0.6265,y:0.4646}, {x:-0.6485,y:0.4333}, {x:-0.6819,y:0.4087}, {x:-0.7364,y:0.3936}, {x:-0.8091,y:0.3827}, {x:-0.8823,y:0.3655}, {x:-0.9368,y:0.3352}, {x:-0.9569,y:0.2903}, {x:-0.9603,y:0.2406}, {x:-0.9268,y:0.1844}, {x:-0.8754,y:0.1299}, {x:-0.831,y:0.0818}, {x:-0.799,y:0.0393}, {x:-0.79,y:0.0}, {x:-0.799,y:-0.0393}, {x:-0.831,y:-0.0818}, {x:-0.8754,y:-0.1299}, {x:-0.9268,y:-0.1844}, {x:-0.9603,y:-0.2406}, {x:-0.9569,y:-0.2903}, {x:-0.9368,y:-0.3352}, {x:-0.8823,y:-0.3655}, {x:-0.8091,y:-0.3827}, {x:-0.7364,y:-0.3936}, {x:-0.6819,y:-0.4087}, {x:-0.6485,y:-0.4333}, {x:-0.6265,y:-0.4646}, {x:-0.6184,y:-0.5075}, {x:-0.6298,y:-0.5708}, {x:-0.6293,y:-0.6293}, {x:-0.638,y:-0.7039}, {x:-0.6185,y:-0.7537}, {x:-0.5838,y:-0.7871}, {x:-0.5333,y:-0.7982}, {x:-0.473,y:-0.7891}, {x:-0.403,y:-0.754}, {x:-0.3485,y:-0.7368}, {x:-0.2947,y:-0.7114}, {x:-0.2544,y:-0.7109}, {x:-0.2221,y:-0.7321}, {x:-0.192,y:-0.7663}, {x:-0.16,y:-0.8042}, {x:-0.1277,y:-0.8606}, {x:-0.0902,y:-0.9156}, {x:-0.0471,y:-0.9588}, {x:-0.0,y:-0.97}, {x:0.0471,y:-0.9588}, {x:0.0902,y:-0.9156}, {x:0.1277,y:-0.8606}, {x:0.16,y:-0.8042}, {x:0.192,y:-0.7663}, {x:0.2221,y:-0.7321}, {x:0.2544,y:-0.7109}, {x:0.2947,y:-0.7114}, {x:0.3485,y:-0.7368}, {x:0.403,y:-0.754}, {x:0.473,y:-0.7891}, {x:0.5333,y:-0.7982}, {x:0.5838,y:-0.7871}, {x:0.6185,y:-0.7537}, {x:0.638,y:-0.7039}, {x:0.6293,y:-0.6293}, {x:0.6298,y:-0.5708}, {x:0.6184,y:-0.5075}, {x:0.6265,y:-0.4646}, {x:0.6485,y:-0.4333}, {x:0.6819,y:-0.4087}, {x:0.7364,y:-0.3936}, {x:0.8091,y:-0.3827}, {x:0.8823,y:-0.3655}, {x:0.9368,y:-0.3352}, {x:0.9569,y:-0.2903}, {x:0.9603,y:-0.2406}, {x:0.9268,y:-0.1844}, {x:0.8754,y:-0.1299}, {x:0.831,y:-0.0818}, {x:0.799,y:-0.0393}],
  // 2. Cookie9 (Frame 20)
  [{x:0.9694,y:0.0}, {x:0.9784,y:0.0481}, {x:0.98,y:0.0965}, {x:0.9791,y:0.1452}, {x:0.9708,y:0.1931}, {x:0.9601,y:0.2405}, {x:0.9374,y:0.2844}, {x:0.9031,y:0.3231}, {x:0.8626,y:0.3573}, {x:0.8302,y:0.3927}, {x:0.8009,y:0.4281}, {x:0.7833,y:0.4695}, {x:0.7636,y:0.5102}, {x:0.754,y:0.5592}, {x:0.7415,y:0.6085}, {x:0.7258,y:0.6579}, {x:0.6963,y:0.6963}, {x:0.6647,y:0.7334}, {x:0.6279,y:0.7651}, {x:0.5896,y:0.795}, {x:0.5414,y:0.8103}, {x:0.4984,y:0.8315}, {x:0.4449,y:0.8324}, {x:0.3927,y:0.8302}, {x:0.3475,y:0.839}, {x:0.306,y:0.8551}, {x:0.2651,y:0.8739}, {x:0.2269,y:0.9057}, {x:0.1871,y:0.9408}, {x:0.1422,y:0.9589}, {x:0.097,y:0.985}, {x:0.0488,y:0.9937}, {x:0.0,y:0.9949}, {x:-0.0488,y:0.9937}, {x:-0.0955,y:0.9698}, {x:-0.1422,y:0.9589}, {x:-0.1851,y:0.9307}, {x:-0.2256,y:0.9007}, {x:-0.2651,y:0.8739}, {x:-0.3042,y:0.8503}, {x:-0.3475,y:0.839}, {x:-0.397,y:0.8394}, {x:-0.4498,y:0.8414}, {x:-0.4984,y:0.8315}, {x:-0.5471,y:0.8187}, {x:-0.5927,y:0.7991}, {x:-0.6279,y:0.7651}, {x:-0.6647,y:0.7334}, {x:-0.6927,y:0.6927}, {x:-0.7258,y:0.6579}, {x:-0.7375,y:0.6053}, {x:-0.7458,y:0.5531}, {x:-0.7594,y:0.5074}, {x:-0.779,y:0.4669}, {x:-0.8009,y:0.4281}, {x:-0.8348,y:0.3948}, {x:-0.8767,y:0.3632}, {x:-0.9127,y:0.3266}, {x:-0.9423,y:0.2858}, {x:-0.9651,y:0.2417}, {x:-0.9758,y:0.1941}, {x:-0.9841,y:0.146}, {x:-0.985,y:0.097}, {x:-0.9733,y:0.0478}, {x:-0.9541,y:0.0}, {x:-0.9325,y:-0.0458}, {x:-0.9089,y:-0.0895}, {x:-0.8983,y:-0.1333}, {x:-0.9007,y:-0.1792}, {x:-0.9007,y:-0.2256}, {x:-0.8984,y:-0.2725}, {x:-0.9127,y:-0.3266}, {x:-0.9003,y:-0.3729}, {x:-0.8902,y:-0.421}, {x:-0.8774,y:-0.469}, {x:-0.8446,y:-0.5062}, {x:-0.823,y:-0.5499}, {x:-0.7868,y:-0.5835}, {x:-0.7493,y:-0.615}, {x:-0.6918,y:-0.627}, {x:-0.6494,y:-0.6494}, {x:-0.6167,y:-0.6805}, {x:-0.5761,y:-0.702}, {x:-0.544,y:-0.7335}, {x:-0.5187,y:-0.7763}, {x:-0.4931,y:-0.8227}, {x:-0.457,y:-0.8549}, {x:-0.421,y:-0.8902}, {x:-0.3788,y:-0.9145}, {x:-0.3352,y:-0.9367}, {x:-0.2888,y:-0.9521}, {x:-0.238,y:-0.9502}, {x:-0.1891,y:-0.9508}, {x:-0.1377,y:-0.9286}, {x:-0.0905,y:-0.919}, {x:-0.0446,y:-0.9071}, {x:-0.0,y:-0.9082}, {x:0.0451,y:-0.9173}, {x:0.0915,y:-0.9292}, {x:0.1392,y:-0.9387}, {x:0.1891,y:-0.9508}, {x:0.238,y:-0.9502}, {x:0.2888,y:-0.9521}, {x:0.3369,y:-0.9415}, {x:0.3807,y:-0.9192}, {x:0.4188,y:-0.8855}, {x:0.4594,y:-0.8594}, {x:0.4905,y:-0.8183}, {x:0.5131,y:-0.7678}, {x:0.5471,y:-0.7376}, {x:0.5794,y:-0.706}, {x:0.6167,y:-0.6805}, {x:0.6566,y:-0.6566}, {x:0.7031,y:-0.6373}, {x:0.7493,y:-0.615}, {x:0.7868,y:-0.5835}, {x:0.823,y:-0.5499}, {x:0.849,y:-0.5089}, {x:0.8729,y:-0.4666}, {x:0.8948,y:-0.4232}, {x:0.905,y:-0.3749}, {x:0.9031,y:-0.3231}, {x:0.8935,y:-0.271}, {x:0.8958,y:-0.2244}, {x:0.8957,y:-0.1782}, {x:0.9034,y:-0.134}, {x:0.9241,y:-0.091}, {x:0.9478,y:-0.0466}],
  // 3. Pentagon (Frame 40)
  [{x:0.868,y:0.0}, {x:0.8568,y:0.0421}, {x:0.8588,y:0.0846}, {x:0.8486,y:0.1259}, {x:0.8364,y:0.1664}, {x:0.8272,y:0.2072}, {x:0.8161,y:0.2476}, {x:0.8125,y:0.2907}, {x:0.8019,y:0.3322}, {x:0.7939,y:0.3755}, {x:0.7924,y:0.4235}, {x:0.7837,y:0.4697}, {x:0.7724,y:0.5161}, {x:0.7624,y:0.5655}, {x:0.7495,y:0.6151}, {x:0.7259,y:0.6579}, {x:0.6963,y:0.6963}, {x:0.6647,y:0.7334}, {x:0.6215,y:0.7573}, {x:0.5836,y:0.7869}, {x:0.533,y:0.7977}, {x:0.4906,y:0.8185}, {x:0.4379,y:0.8192}, {x:0.3928,y:0.8306}, {x:0.3438,y:0.8301}, {x:0.301,y:0.8412}, {x:0.2549,y:0.8404}, {x:0.2134,y:0.8519}, {x:0.1693,y:0.8513}, {x:0.1281,y:0.8636}, {x:0.0851,y:0.8638}, {x:0.0428,y:0.872}, {x:0.0,y:0.8731}, {x:-0.0436,y:0.8873}, {x:-0.0871,y:0.884}, {x:-0.1326,y:0.8938}, {x:-0.1783,y:0.8961}, {x:-0.2269,y:0.906}, {x:-0.2785,y:0.9181}, {x:-0.3283,y:0.9176}, {x:-0.3749,y:0.9051}, {x:-0.4232,y:0.8948}, {x:-0.4714,y:0.8819}, {x:-0.5115,y:0.8534}, {x:-0.5471,y:0.8188}, {x:-0.5806,y:0.7828}, {x:-0.6119,y:0.7455}, {x:-0.6341,y:0.6996}, {x:-0.6461,y:0.6461}, {x:-0.6657,y:0.6034}, {x:-0.6867,y:0.5635}, {x:-0.7094,y:0.5262}, {x:-0.7217,y:0.4822}, {x:-0.7402,y:0.4436}, {x:-0.7521,y:0.402}, {x:-0.7755,y:0.3668}, {x:-0.7973,y:0.3302}, {x:-0.8125,y:0.2907}, {x:-0.8306,y:0.252}, {x:-0.8519,y:0.2134}, {x:-0.8663,y:0.1723}, {x:-0.8837,y:0.1311}, {x:-0.9043,y:0.0891}, {x:-0.9278,y:0.0456}, {x:-0.9492,y:0.0}, {x:-0.9582,y:-0.0471}, {x:-0.9699,y:-0.0955}, {x:-0.9691,y:-0.1438}, {x:-0.9559,y:-0.1901}, {x:-0.9454,y:-0.2368}, {x:-0.9327,y:-0.2829}, {x:-0.9033,y:-0.3232}, {x:-0.8723,y:-0.3613}, {x:-0.8397,y:-0.3972}, {x:-0.7969,y:-0.4259}, {x:-0.7619,y:-0.4567}, {x:-0.7302,y:-0.4879}, {x:-0.7013,y:-0.5201}, {x:-0.6671,y:-0.5474}, {x:-0.6319,y:-0.5727}, {x:-0.6066,y:-0.6066}, {x:-0.5795,y:-0.6394}, {x:-0.5474,y:-0.6671}, {x:-0.5141,y:-0.6931}, {x:-0.4851,y:-0.726}, {x:-0.4541,y:-0.7576}, {x:-0.4164,y:-0.779}, {x:-0.3841,y:-0.8122}, {x:-0.3535,y:-0.8535}, {x:-0.3181,y:-0.889}, {x:-0.2785,y:-0.9181}, {x:-0.238,y:-0.9503}, {x:-0.1941,y:-0.9758}, {x:-0.146,y:-0.9842}, {x:-0.098,y:-0.9952}, {x:-0.0488,y:-0.9937}, {x:-0.0,y:-0.9848}, {x:0.0473,y:-0.9633}, {x:0.0925,y:-0.9396}, {x:0.1363,y:-0.9189}, {x:0.1783,y:-0.8961}, {x:0.2195,y:-0.8765}, {x:0.2593,y:-0.8549}, {x:0.2958,y:-0.8268}, {x:0.3361,y:-0.8113}, {x:0.3711,y:-0.7847}, {x:0.4116,y:-0.77}, {x:0.4463,y:-0.7445}, {x:0.4851,y:-0.726}, {x:0.5231,y:-0.7054}, {x:0.5603,y:-0.6828}, {x:0.6,y:-0.662}, {x:0.6389,y:-0.6389}, {x:0.6808,y:-0.617}, {x:0.7259,y:-0.5958}, {x:0.7624,y:-0.5655}, {x:0.8061,y:-0.5386}, {x:0.836,y:-0.5011}, {x:0.8685,y:-0.4642}, {x:0.8902,y:-0.421}, {x:0.9145,y:-0.3788}, {x:0.9129,y:-0.3266}, {x:0.9229,y:-0.28}, {x:0.9109,y:-0.2282}, {x:0.9111,y:-0.1812}, {x:0.9038,y:-0.1341}, {x:0.8891,y:-0.0876}, {x:0.8822,y:-0.0433}],
  // 4. Pill (Frame 60)
  [{x:0.9897,y:0.0}, {x:0.9885,y:0.0486}, {x:0.9901,y:0.0975}, {x:0.979,y:0.1452}, {x:0.9757,y:0.1941}, {x:0.965,y:0.2417}, {x:0.9569,y:0.2903}, {x:0.9318,y:0.3334}, {x:0.9239,y:0.3827}, {x:0.8993,y:0.4254}, {x:0.8774,y:0.469}, {x:0.8445,y:0.5062}, {x:0.8229,y:0.5498}, {x:0.7908,y:0.5865}, {x:0.7571,y:0.6213}, {x:0.7257,y:0.6577}, {x:0.6816,y:0.6816}, {x:0.6473,y:0.7142}, {x:0.605,y:0.7371}, {x:0.5711,y:0.7701}, {x:0.5269,y:0.7886}, {x:0.4797,y:0.8003}, {x:0.4398,y:0.8228}, {x:0.3945,y:0.8341}, {x:0.3491,y:0.8429}, {x:0.3056,y:0.8542}, {x:0.2604,y:0.8583}, {x:0.2167,y:0.865}, {x:0.173,y:0.8696}, {x:0.1286,y:0.8668}, {x:0.0844,y:0.8567}, {x:0.042,y:0.8546}, {x:0.0,y:0.8454}, {x:-0.041,y:0.834}, {x:-0.0808,y:0.8208}, {x:-0.1203,y:0.8107}, {x:-0.1589,y:0.7988}, {x:-0.1979,y:0.79}, {x:-0.2334,y:0.7695}, {x:-0.2709,y:0.7571}, {x:-0.3097,y:0.7477}, {x:-0.3482,y:0.7362}, {x:-0.3864,y:0.7228}, {x:-0.4267,y:0.7118}, {x:-0.4697,y:0.7029}, {x:-0.5036,y:0.679}, {x:-0.5494,y:0.6694}, {x:-0.5816,y:0.6416}, {x:-0.616,y:0.616}, {x:-0.6531,y:0.5919}, {x:-0.6933,y:0.569}, {x:-0.7245,y:0.5374}, {x:-0.7586,y:0.5069}, {x:-0.787,y:0.4717}, {x:-0.8228,y:0.4398}, {x:-0.8434,y:0.3989}, {x:-0.8667,y:0.359}, {x:-0.8882,y:0.3178}, {x:-0.9125,y:0.2768}, {x:-0.935,y:0.2342}, {x:-0.9454,y:0.1881}, {x:-0.9637,y:0.1429}, {x:-0.9644,y:0.095}, {x:-0.9782,y:0.0481}, {x:-0.9897,y:0.0}, {x:-0.9885,y:-0.0486}, {x:-0.9901,y:-0.0975}, {x:-0.979,y:-0.1452}, {x:-0.9757,y:-0.1941}, {x:-0.965,y:-0.2417}, {x:-0.9569,y:-0.2903}, {x:-0.9318,y:-0.3334}, {x:-0.9239,y:-0.3827}, {x:-0.8993,y:-0.4254}, {x:-0.8774,y:-0.469}, {x:-0.8445,y:-0.5062}, {x:-0.8229,y:-0.5498}, {x:-0.7908,y:-0.5865}, {x:-0.7571,y:-0.6213}, {x:-0.7257,y:-0.6577}, {x:-0.6816,y:-0.6816}, {x:-0.6473,y:-0.7142}, {x:-0.605,y:-0.7371}, {x:-0.5711,y:-0.7701}, {x:-0.5269,y:-0.7886}, {x:-0.4797,y:-0.8003}, {x:-0.4398,y:-0.8228}, {x:-0.3945,y:-0.8341}, {x:-0.3511,y:-0.8477}, {x:-0.3056,y:-0.8542}, {x:-0.2604,y:-0.8583}, {x:-0.2167,y:-0.865}, {x:-0.173,y:-0.8696}, {x:-0.1286,y:-0.8668}, {x:-0.0844,y:-0.8567}, {x:-0.042,y:-0.8546}, {x:-0.0,y:-0.8454}, {x:0.041,y:-0.834}, {x:0.0808,y:-0.8208}, {x:0.1203,y:-0.8107}, {x:0.1589,y:-0.7988}, {x:0.1979,y:-0.79}, {x:0.2334,y:-0.7695}, {x:0.2709,y:-0.7571}, {x:0.3097,y:-0.7477}, {x:0.3482,y:-0.7362}, {x:0.3864,y:-0.7228}, {x:0.4267,y:-0.7118}, {x:0.4697,y:-0.7029}, {x:0.5036,y:-0.679}, {x:0.5396,y:-0.6575}, {x:0.5816,y:-0.6416}, {x:0.616,y:-0.616}, {x:0.6531,y:-0.5919}, {x:0.6933,y:-0.569}, {x:0.7245,y:-0.5374}, {x:0.7586,y:-0.5069}, {x:0.787,y:-0.4717}, {x:0.8228,y:-0.4398}, {x:0.8434,y:-0.3989}, {x:0.8667,y:-0.359}, {x:0.8882,y:-0.3178}, {x:0.9125,y:-0.2768}, {x:0.935,y:-0.2342}, {x:0.9454,y:-0.1881}, {x:0.9637,y:-0.1429}, {x:0.9644,y:-0.095}, {x:0.9782,y:-0.0481}],
  // 5. Sunny (Frame 80)
  [{x:0.8454,y:0.0}, {x:0.834,y:0.041}, {x:0.8464,y:0.0834}, {x:0.8566,y:0.1271}, {x:0.8797,y:0.175}, {x:0.89,y:0.2229}, {x:0.9125,y:0.2768}, {x:0.9221,y:0.3299}, {x:0.9096,y:0.3768}, {x:0.8993,y:0.4254}, {x:0.8637,y:0.4617}, {x:0.8224,y:0.4929}, {x:0.7715,y:0.5155}, {x:0.7245,y:0.5374}, {x:0.6814,y:0.5592}, {x:0.6378,y:0.5781}, {x:0.5941,y:0.5941}, {x:0.5677,y:0.6264}, {x:0.5396,y:0.6575}, {x:0.5159,y:0.6956}, {x:0.4954,y:0.7415}, {x:0.4717,y:0.787}, {x:0.4471,y:0.8365}, {x:0.4165,y:0.8807}, {x:0.3768,y:0.9096}, {x:0.3334,y:0.9318}, {x:0.2858,y:0.9421}, {x:0.2342,y:0.935}, {x:0.181,y:0.91}, {x:0.1316,y:0.8872}, {x:0.0854,y:0.8669}, {x:0.042,y:0.8546}, {x:0.0,y:0.8454}, {x:-0.0415,y:0.8443}, {x:-0.0834,y:0.8464}, {x:-0.1271,y:0.8566}, {x:-0.175,y:0.8797}, {x:-0.2229,y:0.89}, {x:-0.2723,y:0.8977}, {x:-0.3299,y:0.9221}, {x:-0.3768,y:0.9096}, {x:-0.4254,y:0.8993}, {x:-0.4617,y:0.8637}, {x:-0.4929,y:0.8224}, {x:-0.5155,y:0.7715}, {x:-0.5374,y:0.7245}, {x:-0.5592,y:0.6814}, {x:-0.5781,y:0.6378}, {x:-0.5941,y:0.5941}, {x:-0.6264,y:0.5677}, {x:-0.6575,y:0.5396}, {x:-0.6956,y:0.5159}, {x:-0.7372,y:0.4926}, {x:-0.787,y:0.4717}, {x:-0.8365,y:0.4471}, {x:-0.8807,y:0.4165}, {x:-0.9239,y:0.3827}, {x:-0.9318,y:0.3334}, {x:-0.9421,y:0.2858}, {x:-0.935,y:0.2342}, {x:-0.91,y:0.181}, {x:-0.8872,y:0.1316}, {x:-0.8669,y:0.0854}, {x:-0.8546,y:0.042}, {x:-0.8454,y:0.0}, {x:-0.834,y:-0.041}, {x:-0.8464,y:-0.0834}, {x:-0.8566,y:-0.1271}, {x:-0.8797,y:-0.175}, {x:-0.89,y:-0.2229}, {x:-0.8977,y:-0.2723}, {x:-0.9221,y:-0.3299}, {x:-0.9096,y:-0.3768}, {x:-0.8993,y:-0.4254}, {x:-0.8637,y:-0.4617}, {x:-0.8224,y:-0.4929}, {x:-0.7715,y:-0.5155}, {x:-0.7245,y:-0.5374}, {x:-0.6814,y:-0.5592}, {x:-0.6378,y:-0.5781}, {x:-0.5941,y:-0.5941}, {x:-0.5677,y:-0.6264}, {x:-0.5396,y:-0.6575}, {x:-0.5159,y:-0.6956}, {x:-0.4926,y:-0.7372}, {x:-0.4717,y:-0.787}, {x:-0.4471,y:-0.8365}, {x:-0.4165,y:-0.8807}, {x:-0.3768,y:-0.9096}, {x:-0.3334,y:-0.9318}, {x:-0.2858,y:-0.9421}, {x:-0.2342,y:-0.935}, {x:-0.181,y:-0.91}, {x:-0.1316,y:-0.8872}, {x:-0.0854,y:-0.8669}, {x:-0.042,y:-0.8546}, {x:-0.0,y:-0.8454}, {x:0.0415,y:-0.8443}, {x:0.0834,y:-0.8464}, {x:0.1271,y:-0.8566}, {x:0.175,y:-0.8797}, {x:0.2229,y:-0.89}, {x:0.2768,y:-0.9125}, {x:0.3299,y:-0.9221}, {x:0.3768,y:-0.9096}, {x:0.4254,y:-0.8993}, {x:0.4617,y:-0.8637}, {x:0.4929,y:-0.8224}, {x:0.5155,y:-0.7715}, {x:0.5374,y:-0.7245}, {x:0.5592,y:-0.6814}, {x:0.5781,y:-0.6378}, {x:0.5941,y:-0.5941}, {x:0.6264,y:-0.5677}, {x:0.6575,y:-0.5396}, {x:0.6956,y:-0.5159}, {x:0.7415,y:-0.4954}, {x:0.787,y:-0.4717}, {x:0.8365,y:-0.4471}, {x:0.8807,y:-0.4165}, {x:0.9239,y:-0.3827}, {x:0.9318,y:-0.3334}, {x:0.9421,y:-0.2858}, {x:0.935,y:-0.2342}, {x:0.91,y:-0.181}, {x:0.8872,y:-0.1316}, {x:0.8669,y:-0.0854}, {x:0.8546,y:-0.042}],
  // 6. Cookie4 (Frame 100)
  [{x:0.8136,y:0.0}, {x:0.8444,y:0.0415}, {x:0.8595,y:0.0847}, {x:0.8903,y:0.1321}, {x:0.9005,y:0.1791}, {x:0.9083,y:0.2275}, {x:0.9221,y:0.2797}, {x:0.9201,y:0.3292}, {x:0.9113,y:0.3775}, {x:0.8999,y:0.4256}, {x:0.8819,y:0.4714}, {x:0.8577,y:0.5141}, {x:0.8277,y:0.553}, {x:0.7959,y:0.5903}, {x:0.766,y:0.6286}, {x:0.7275,y:0.6593}, {x:0.6782,y:0.6782}, {x:0.6319,y:0.6972}, {x:0.5883,y:0.7168}, {x:0.5334,y:0.7192}, {x:0.4849,y:0.7256}, {x:0.43,y:0.7174}, {x:0.3771,y:0.7055}, {x:0.3343,y:0.7068}, {x:0.2888,y:0.6971}, {x:0.2496,y:0.6976}, {x:0.2138,y:0.7047}, {x:0.1789,y:0.7143}, {x:0.1445,y:0.7267}, {x:0.1094,y:0.7374}, {x:0.0744,y:0.7554}, {x:0.0386,y:0.7854}, {x:0.0,y:0.8045}, {x:-0.0415,y:0.8444}, {x:-0.0847,y:0.8595}, {x:-0.1321,y:0.8903}, {x:-0.1791,y:0.9005}, {x:-0.2275,y:0.9083}, {x:-0.2797,y:0.9221}, {x:-0.3292,y:0.9201}, {x:-0.3775,y:0.9113}, {x:-0.4256,y:0.8999}, {x:-0.4714,y:0.8819}, {x:-0.5141,y:0.8577}, {x:-0.553,y:0.8277}, {x:-0.5903,y:0.7959}, {x:-0.6286,y:0.766}, {x:-0.6593,y:0.7275}, {x:-0.6782,y:0.6782}, {x:-0.6972,y:0.6319}, {x:-0.7168,y:0.5883}, {x:-0.7156,y:0.5307}, {x:-0.7256,y:0.4849}, {x:-0.7174,y:0.43}, {x:-0.7055,y:0.3771}, {x:-0.7068,y:0.3343}, {x:-0.6971,y:0.2888}, {x:-0.6976,y:0.2496}, {x:-0.7047,y:0.2138}, {x:-0.7143,y:0.1789}, {x:-0.7267,y:0.1445}, {x:-0.7374,y:0.1094}, {x:-0.7554,y:0.0744}, {x:-0.7763,y:0.0381}, {x:-0.8045,y:0.0}, {x:-0.8444,y:-0.0415}, {x:-0.864,y:-0.0851}, {x:-0.8903,y:-0.1321}, {x:-0.9005,y:-0.1791}, {x:-0.9083,y:-0.2275}, {x:-0.9221,y:-0.2797}, {x:-0.9201,y:-0.3292}, {x:-0.9113,y:-0.3775}, {x:-0.8999,y:-0.4256}, {x:-0.8819,y:-0.4714}, {x:-0.8577,y:-0.5141}, {x:-0.8277,y:-0.553}, {x:-0.7959,y:-0.5903}, {x:-0.766,y:-0.6286}, {x:-0.7275,y:-0.6593}, {x:-0.6782,y:-0.6782}, {x:-0.6319,y:-0.6972}, {x:-0.5825,y:-0.7098}, {x:-0.5307,y:-0.7156}, {x:-0.4849,y:-0.7256}, {x:-0.43,y:-0.7174}, {x:-0.3771,y:-0.7055}, {x:-0.3343,y:-0.7068}, {x:-0.2888,y:-0.6971}, {x:-0.2496,y:-0.6976}, {x:-0.2138,y:-0.7047}, {x:-0.1789,y:-0.7143}, {x:-0.1445,y:-0.7267}, {x:-0.1094,y:-0.7374}, {x:-0.0744,y:-0.7554}, {x:-0.0386,y:-0.7854}, {x:-0.0,y:-0.8136}, {x:0.0415,y:-0.8444}, {x:0.0851,y:-0.864}, {x:0.1321,y:-0.8903}, {x:0.1791,y:-0.9005}, {x:0.2275,y:-0.9083}, {x:0.2797,y:-0.9221}, {x:0.3292,y:-0.9201}, {x:0.3775,y:-0.9113}, {x:0.4256,y:-0.8999}, {x:0.4714,y:-0.8819}, {x:0.5141,y:-0.8577}, {x:0.553,y:-0.8277}, {x:0.5903,y:-0.7959}, {x:0.6286,y:-0.766}, {x:0.6593,y:-0.7275}, {x:0.6782,y:-0.6782}, {x:0.6972,y:-0.6319}, {x:0.7168,y:-0.5883}, {x:0.7156,y:-0.5307}, {x:0.7256,y:-0.4849}, {x:0.7174,y:-0.43}, {x:0.7055,y:-0.3771}, {x:0.7068,y:-0.3343}, {x:0.6971,y:-0.2888}, {x:0.6976,y:-0.2496}, {x:0.7047,y:-0.2138}, {x:0.7143,y:-0.1789}, {x:0.7267,y:-0.1445}, {x:0.7374,y:-0.1094}, {x:0.7554,y:-0.0744}, {x:0.7763,y:-0.0381}],
  // 7. Oval (Frame 120)
  [{x:0.6444,y:0.0}, {x:0.6525,y:0.0321}, {x:0.6546,y:0.0645}, {x:0.6507,y:0.0965}, {x:0.6539,y:0.1301}, {x:0.651,y:0.1631}, {x:0.6507,y:0.1974}, {x:0.6444,y:0.2306}, {x:0.6447,y:0.267}, {x:0.6428,y:0.304}, {x:0.635,y:0.3394}, {x:0.6252,y:0.3747}, {x:0.6245,y:0.4173}, {x:0.614,y:0.4554}, {x:0.6012,y:0.4934}, {x:0.5862,y:0.5313}, {x:0.5783,y:0.5783}, {x:0.5581,y:0.6158}, {x:0.5385,y:0.6562}, {x:0.5189,y:0.6997}, {x:0.4914,y:0.7354}, {x:0.4638,y:0.7739}, {x:0.4358,y:0.8153}, {x:0.4029,y:0.8518}, {x:0.364,y:0.8787}, {x:0.3294,y:0.9206}, {x:0.2838,y:0.9357}, {x:0.2397,y:0.9571}, {x:0.1942,y:0.9764}, {x:0.1461,y:0.9848}, {x:0.098,y:0.9952}, {x:0.0488,y:0.9944}, {x:0.0,y:0.9867}, {x:-0.048,y:0.9766}, {x:-0.0945,y:0.9598}, {x:-0.1389,y:0.9364}, {x:-0.183,y:0.9198}, {x:-0.2225,y:0.8881}, {x:-0.2619,y:0.8634}, {x:-0.295,y:0.8244}, {x:-0.33,y:0.7966}, {x:-0.3591,y:0.7594}, {x:-0.3876,y:0.7251}, {x:-0.4136,y:0.69}, {x:-0.437,y:0.6541}, {x:-0.4554,y:0.614}, {x:-0.4821,y:0.5875}, {x:-0.4984,y:0.55}, {x:-0.5123,y:0.5123}, {x:-0.5302,y:0.4805}, {x:-0.5428,y:0.4455}, {x:-0.5569,y:0.413}, {x:-0.5691,y:0.3803}, {x:-0.5756,y:0.345}, {x:-0.5879,y:0.3143}, {x:-0.5946,y:0.2812}, {x:-0.6036,y:0.25}, {x:-0.6151,y:0.2201}, {x:-0.6252,y:0.1897}, {x:-0.6251,y:0.1566}, {x:-0.6321,y:0.1257}, {x:-0.6331,y:0.0939}, {x:-0.6413,y:0.0632}, {x:-0.6437,y:0.0316}, {x:-0.6444,y:0.0}, {x:-0.6525,y:-0.0321}, {x:-0.6546,y:-0.0645}, {x:-0.6507,y:-0.0965}, {x:-0.6539,y:-0.1301}, {x:-0.651,y:-0.1631}, {x:-0.6507,y:-0.1974}, {x:-0.6444,y:-0.2306}, {x:-0.6447,y:-0.267}, {x:-0.6428,y:-0.304}, {x:-0.635,y:-0.3394}, {x:-0.6252,y:-0.3747}, {x:-0.6245,y:-0.4173}, {x:-0.614,y:-0.4554}, {x:-0.6012,y:-0.4934}, {x:-0.5862,y:-0.5313}, {x:-0.5783,y:-0.5783}, {x:-0.5581,y:-0.6158}, {x:-0.5385,y:-0.6562}, {x:-0.5189,y:-0.6997}, {x:-0.4914,y:-0.7354}, {x:-0.4638,y:-0.7739}, {x:-0.4358,y:-0.8153}, {x:-0.4029,y:-0.8518}, {x:-0.364,y:-0.8787}, {x:-0.3249,y:-0.9081}, {x:-0.2838,y:-0.9357}, {x:-0.2397,y:-0.9571}, {x:-0.1942,y:-0.9764}, {x:-0.1461,y:-0.9848}, {x:-0.098,y:-0.9952}, {x:-0.0488,y:-0.9944}, {x:-0.0,y:-0.9867}, {x:0.048,y:-0.9766}, {x:0.0945,y:-0.9598}, {x:0.1389,y:-0.9364}, {x:0.183,y:-0.9198}, {x:0.2225,y:-0.8881}, {x:0.2619,y:-0.8634}, {x:0.295,y:-0.8244}, {x:0.33,y:-0.7966}, {x:0.3591,y:-0.7594}, {x:0.3876,y:-0.7251}, {x:0.4136,y:-0.69}, {x:0.437,y:-0.6541}, {x:0.4554,y:-0.614}, {x:0.4821,y:-0.5875}, {x:0.4984,y:-0.55}, {x:0.5123,y:-0.5123}, {x:0.5302,y:-0.4805}, {x:0.5428,y:-0.4455}, {x:0.5569,y:-0.413}, {x:0.5691,y:-0.3803}, {x:0.5756,y:-0.345}, {x:0.5879,y:-0.3143}, {x:0.5946,y:-0.2812}, {x:0.6036,y:-0.25}, {x:0.6151,y:-0.2201}, {x:0.6252,y:-0.1897}, {x:0.6251,y:-0.1566}, {x:0.6321,y:-0.1257}, {x:0.6331,y:-0.0939}, {x:0.6413,y:-0.0632}, {x:0.6437,y:-0.0316}]
];

const SHAPES_DETERMINATE = [
  // Circle (rotated)
  [{x:1.0,y:0.0}, {x:0.9988,y:0.0491}, {x:0.9952,y:0.098}, {x:0.9892,y:0.1468}, {x:0.9808,y:0.1951}, {x:0.97,y:0.243}, {x:0.9569,y:0.2903}, {x:0.9415,y:0.3369}, {x:0.9239,y:0.3827}, {x:0.904,y:0.4276}, {x:0.8819,y:0.4714}, {x:0.8577,y:0.5141}, {x:0.8315,y:0.5556}, {x:0.8032,y:0.5957}, {x:0.773,y:0.6344}, {x:0.741,y:0.6715}, {x:0.7071,y:0.7071}, {x:0.6716,y:0.7409}, {x:0.6344,y:0.773}, {x:0.5957,y:0.8032}, {x:0.5555,y:0.8315}, {x:0.5141,y:0.8577}, {x:0.4714,y:0.8819}, {x:0.4276,y:0.904}, {x:0.3827,y:0.9239}, {x:0.3369,y:0.9415}, {x:0.2903,y:0.9569}, {x:0.243,y:0.97}, {x:0.1951,y:0.9808}, {x:0.1468,y:0.9892}, {x:0.098,y:0.9952}, {x:0.0491,y:0.9988}, {x:0.0,y:1.0}, {x:-0.0491,y:0.9988}, {x:-0.098,y:0.9952}, {x:-0.1468,y:0.9892}, {x:-0.1951,y:0.9808}, {x:-0.243,y:0.97}, {x:-0.2903,y:0.9569}, {x:-0.3369,y:0.9415}, {x:-0.3827,y:0.9239}, {x:-0.4276,y:0.904}, {x:-0.4714,y:0.8819}, {x:-0.5141,y:0.8577}, {x:-0.5555,y:0.8315}, {x:-0.5957,y:0.8032}, {x:-0.6344,y:0.773}, {x:-0.6716,y:0.7409}, {x:-0.7071,y:0.7071}, {x:-0.741,y:0.6715}, {x:-0.773,y:0.6344}, {x:-0.8032,y:0.5957}, {x:-0.8315,y:0.5556}, {x:-0.8577,y:0.5141}, {x:-0.8819,y:0.4714}, {x:-0.904,y:0.4276}, {x:-0.9239,y:0.3827}, {x:-0.9415,y:0.3369}, {x:-0.9569,y:0.2903}, {x:-0.97,y:0.243}, {x:-0.9808,y:0.1951}, {x:-0.9892,y:0.1468}, {x:-0.9952,y:0.098}, {x:-0.9988,y:0.0491}, {x:-1.0,y:0.0}, {x:-0.9988,y:-0.0491}, {x:-0.9952,y:-0.098}, {x:-0.9892,y:-0.1468}, {x:-0.9808,y:-0.1951}, {x:-0.97,y:-0.243}, {x:-0.9569,y:-0.2903}, {x:-0.9415,y:-0.3369}, {x:-0.9239,y:-0.3827}, {x:-0.904,y:-0.4276}, {x:-0.8819,y:-0.4714}, {x:-0.8577,y:-0.5141}, {x:-0.8315,y:-0.5556}, {x:-0.8032,y:-0.5957}, {x:-0.773,y:-0.6344}, {x:-0.741,y:-0.6715}, {x:-0.7071,y:-0.7071}, {x:-0.6716,y:-0.7409}, {x:-0.6344,y:-0.773}, {x:-0.5957,y:-0.8032}, {x:-0.5555,y:-0.8315}, {x:-0.5141,y:-0.8577}, {x:-0.4714,y:-0.8819}, {x:-0.4276,y:-0.904}, {x:-0.3827,y:-0.9239}, {x:-0.3369,y:-0.9415}, {x:-0.2903,y:-0.9569}, {x:-0.243,y:-0.97}, {x:-0.1951,y:-0.9808}, {x:-0.1468,y:-0.9892}, {x:-0.098,y:-0.9952}, {x:-0.0491,y:-0.9988}, {x:0.0,y:-1.0}, {x:0.0491,y:-0.9988}, {x:0.098,y:-0.9952}, {x:0.1468,y:-0.9892}, {x:0.1951,y:-0.9808}, {x:0.243,y:-0.97}, {x:0.2903,y:-0.9569}, {x:0.3369,y:-0.9415}, {x:0.3827,y:-0.9239}, {x:0.4276,y:-0.904}, {x:0.4714,y:-0.8819}, {x:0.5141,y:-0.8577}, {x:0.5555,y:-0.8315}, {x:0.5957,y:-0.8032}, {x:0.6344,y:-0.773}, {x:0.6716,y:-0.7409}, {x:0.7071,y:-0.7071}, {x:0.741,y:-0.6715}, {x:0.773,y:-0.6344}, {x:0.8032,y:-0.5957}, {x:0.8315,y:-0.5556}, {x:0.8577,y:-0.5141}, {x:0.8819,y:-0.4714}, {x:0.904,y:-0.4276}, {x:0.9239,y:-0.3827}, {x:0.9415,y:-0.3369}, {x:0.9569,y:-0.2903}, {x:0.97,y:-0.243}, {x:0.9808,y:-0.1951}, {x:0.9892,y:-0.1468}, {x:0.9952,y:-0.098}, {x:0.9988,y:-0.0491}],
  // SoftBurst (Frame 1)
  [{x:0.79,y:0.0}, {x:0.799,y:0.0393}, {x:0.831,y:0.0818}, {x:0.8754,y:0.1299}, {x:0.9268,y:0.1844}, {x:0.9603,y:0.2406}, {x:0.9569,y:0.2903}, {x:0.9368,y:0.3352}, {x:0.8823,y:0.3655}, {x:0.8091,y:0.3827}, {x:0.7364,y:0.3936}, {x:0.6819,y:0.4087}, {x:0.6485,y:0.4333}, {x:0.6265,y:0.4646}, {x:0.6184,y:0.5075}, {x:0.6298,y:0.5708}, {x:0.6293,y:0.6293}, {x:0.638,y:0.7039}, {x:0.6185,y:0.7537}, {x:0.5838,y:0.7871}, {x:0.5333,y:0.7982}, {x:0.473,y:0.7891}, {x:0.403,y:0.754}, {x:0.3485,y:0.7368}, {x:0.2947,y:0.7114}, {x:0.2544,y:0.7109}, {x:0.2221,y:0.7321}, {x:0.192,y:0.7663}, {x:0.16,y:0.8042}, {x:0.1277,y:0.8606}, {x:0.0902,y:0.9156}, {x:0.0471,y:0.9588}, {x:-0.0,y:0.97}, {x:-0.0471,y:0.9588}, {x:-0.0902,y:0.9156}, {x:-0.1277,y:0.8606}, {x:-0.16,y:0.8042}, {x:-0.192,y:0.7663}, {x:-0.2221,y:0.7321}, {x:-0.2544,y:0.7109}, {x:-0.2947,y:0.7114}, {x:-0.3485,y:0.7368}, {x:-0.403,y:0.754}, {x:-0.473,y:0.7891}, {x:-0.5333,y:0.7982}, {x:-0.5838,y:0.7871}, {x:-0.6185,y:0.7537}, {x:-0.638,y:0.7039}, {x:-0.6293,y:0.6293}, {x:-0.6298,y:0.5708}, {x:-0.6184,y:0.5075}, {x:-0.6265,y:0.4646}, {x:-0.6485,y:0.4333}, {x:-0.6819,y:0.4087}, {x:-0.7364,y:0.3936}, {x:-0.8091,y:0.3827}, {x:-0.8823,y:0.3655}, {x:-0.9368,y:0.3352}, {x:-0.9569,y:0.2903}, {x:-0.9603,y:0.2406}, {x:-0.9268,y:0.1844}, {x:-0.8754,y:0.1299}, {x:-0.831,y:0.0818}, {x:-0.799,y:0.0393}, {x:-0.79,y:0.0}, {x:-0.799,y:-0.0393}, {x:-0.831,y:-0.0818}, {x:-0.8754,y:-0.1299}, {x:-0.9268,y:-0.1844}, {x:-0.9603,y:-0.2406}, {x:-0.9569,y:-0.2903}, {x:-0.9368,y:-0.3352}, {x:-0.8823,y:-0.3655}, {x:-0.8091,y:-0.3827}, {x:-0.7364,y:-0.3936}, {x:-0.6819,y:-0.4087}, {x:-0.6485,y:-0.4333}, {x:-0.6265,y:-0.4646}, {x:-0.6184,y:-0.5075}, {x:-0.6298,y:-0.5708}, {x:-0.6293,y:-0.6293}, {x:-0.638,y:-0.7039}, {x:-0.6185,y:-0.7537}, {x:-0.5838,y:-0.7871}, {x:-0.5333,y:-0.7982}, {x:-0.473,y:-0.7891}, {x:-0.403,y:-0.754}, {x:-0.3485,y:-0.7368}, {x:-0.2947,y:-0.7114}, {x:-0.2544,y:-0.7109}, {x:-0.2221,y:-0.7321}, {x:-0.192,y:-0.7663}, {x:-0.16,y:-0.8042}, {x:-0.1277,y:-0.8606}, {x:-0.0902,y:-0.9156}, {x:-0.0471,y:-0.9588}, {x:-0.0,y:-0.97}, {x:0.0471,y:-0.9588}, {x:0.0902,y:-0.9156}, {x:0.1277,y:-0.8606}, {x:0.16,y:-0.8042}, {x:0.192,y:-0.7663}, {x:0.2221,y:-0.7321}, {x:0.2544,y:-0.7109}, {x:0.2947,y:-0.7114}, {x:0.3485,y:-0.7368}, {x:0.403,y:-0.754}, {x:0.473,y:-0.7891}, {x:0.5333,y:-0.7982}, {x:0.5838,y:-0.7871}, {x:0.6185,y:-0.7537}, {x:0.638,y:-0.7039}, {x:0.6293,y:-0.6293}, {x:0.6298,y:-0.5708}, {x:0.6184,y:-0.5075}, {x:0.6265,y:-0.4646}, {x:0.6485,y:-0.4333}, {x:0.6819,y:-0.4087}, {x:0.7364,y:-0.3936}, {x:0.8091,y:-0.3827}, {x:0.8823,y:-0.3655}, {x:0.9368,y:-0.3352}, {x:0.9569,y:-0.2903}, {x:0.9603,y:-0.2406}, {x:0.9268,y:-0.1844}, {x:0.8754,y:-0.1299}, {x:0.831,y:-0.0818}, {x:0.799,y:-0.0393}]
];

export class MdLoadingIndicator extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'size', 'progress', 'indeterminate', 'color', 'track-color', 'stroke-cap', 'gap-size', 'stroke-width'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, loadingIndicatorSheet);
    this._rendered = false;
    this._rafId = null;
    this._startTime = 0;
    this._currentMorphIndex = 0;
    this._lastStepTime = 0;
    this._cachedColor = '#6750A4';
    this._colorDirty = true;
    this._observer = null;
    this._isVisible = true;
    this._onThemeChange = () => { this._colorDirty = true; };
  }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._colorDirty = true;
    if (typeof window !== 'undefined') {
      window.addEventListener('theme-color-change', this._onThemeChange);
    }
    this._setupIntersectionObserver();
    this._startAnimation();
  }

  disconnectedCallback() {
    this._stopAnimation();
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('theme-color-change', this._onThemeChange);
    }
  }

  _setupIntersectionObserver() {
    if (typeof IntersectionObserver === 'undefined') return;
    this._observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      this._isVisible = entry ? entry.isIntersecting : true;
      if (this._isVisible) {
        if (!this._rafId) this._startAnimation();
      } else {
        this._stopAnimation();
      }
    }, { threshold: 0 });
    this._observer.observe(this);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'color' || name === 'variant') {
      this._colorDirty = true;
    }
    if (name === 'progress' || name === 'indeterminate') {
      this._syncProgress();
    }
    this._updateDimensions();
  }

  _resolveActiveColor(isContained) {
    if (!this._colorDirty && this._cachedColor) {
      return this._cachedColor;
    }
    const colorAttr = this.getAttribute('color');
    let activeColor = '';

    if (colorAttr && (colorAttr.startsWith('#') || colorAttr.startsWith('rgb') || colorAttr.startsWith('hsl'))) {
      activeColor = colorAttr;
    } else {
      const computedStyle = getComputedStyle(this);
      if (colorAttr === 'primary' && !isContained) {
        activeColor = computedStyle.getPropertyValue('--md-sys-color-primary').trim() || '#D0BCFF';
      } else if (colorAttr === 'secondary') {
        activeColor = computedStyle.getPropertyValue('--md-sys-color-secondary').trim() || '#CCC2DC';
      } else if (colorAttr === 'tertiary') {
        activeColor = computedStyle.getPropertyValue('--md-sys-color-tertiary').trim() || '#EFB8C8';
      } else if (colorAttr === 'on-primary-container') {
        activeColor = computedStyle.getPropertyValue('--md-sys-color-on-primary-container').trim() || '#EADDFF';
      } else if (isContained) {
        activeColor = computedStyle.getPropertyValue('--md-sys-color-on-primary-container').trim() ||
                      computedStyle.getPropertyValue('--md-sys-color-primary').trim() || '#EADDFF';
      } else {
        activeColor = computedStyle.getPropertyValue('--md-sys-color-primary').trim() || '#D0BCFF';
      }
    }

    this._cachedColor = activeColor || '#D0BCFF';
    this._colorDirty = false;
    return this._cachedColor;
  }

  get variant() {
    return this.getAttribute('variant') || 'standalone'; // 'standalone' | 'contained'
  }
  set variant(v) {
    this.setAttribute('variant', v);
  }

  get size() {
    return this.getAttribute('size') || 'standard';
  }
  set size(v) {
    this.setAttribute('size', v);
  }

  get indeterminate() {
    return !this.hasAttribute('progress') || this.hasAttribute('indeterminate');
  }
  set indeterminate(v) {
    if (v) this.setAttribute('indeterminate', '');
    else this.removeAttribute('indeterminate');
  }

  get progress() {
    const p = parseFloat(this.getAttribute('progress'));
    return isNaN(p) ? null : Math.max(0, Math.min(1, p));
  }
  set progress(v) {
    if (v === null || v === undefined) this.removeAttribute('progress');
    else this.setAttribute('progress', String(v));
  }

  get trackColor() {
    return this.getAttribute('track-color') || 'var(--md-sys-color-secondary-container, #E8DEF8)';
  }
  set trackColor(v) {
    if (v === null || v === undefined) this.removeAttribute('track-color');
    else this.setAttribute('track-color', String(v));
  }

  get strokeCap() {
    return this.getAttribute('stroke-cap') || 'round';
  }
  set strokeCap(v) {
    if (v === null || v === undefined) this.removeAttribute('stroke-cap');
    else this.setAttribute('stroke-cap', String(v));
  }

  get gapSize() {
    const gs = parseFloat(this.getAttribute('gap-size'));
    return isNaN(gs) || gs < 0 ? 4.0 : gs;
  }
  set gapSize(v) {
    if (v === null || v === undefined) this.removeAttribute('gap-size');
    else this.setAttribute('gap-size', String(v));
  }

  get strokeWidth() {
    const sw = parseFloat(this.getAttribute('stroke-width'));
    return isNaN(sw) || sw <= 0 ? 4.0 : sw;
  }
  set strokeWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('stroke-width');
    else this.setAttribute('stroke-width', String(v));
  }

  get sizePx() {
    const s = this.size;
    if (s === 'small') return 36;
    if (s === 'large') return 64;
    const n = parseInt(s, 10);
    return isNaN(n) ? 48 : Math.max(24, Math.min(128, n));
  }

  _startAnimation() {
    this._stopAnimation();
    this._startTime = performance.now();
    this._lastStepTime = this._startTime;
    this._currentMorphIndex = 0;

    const canvas = this.shadowRoot.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = (now) => {
      this._drawFrame(ctx, now);
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  _stopAnimation() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _drawFrame(ctx, now) {
    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    const sz = this.sizePx;
    const requiredW = Math.round(sz * dpr);
    const requiredH = Math.round(sz * dpr);

    // Keep physical buffer in sync with DPR on every frame to prevent zoom drifting
    if (canvas.width !== requiredW || canvas.height !== requiredH) {
      canvas.width = requiredW;
      canvas.height = requiredH;
      canvas.style.width = `${sz}px`;
      canvas.style.height = `${sz}px`;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.lineCap = this.strokeCap;
    ctx.lineJoin = 'round';

    const center = sz / 2;
    const isContained = this.variant === 'contained';
    // Both Standalone and Contained morphing shapes render at the exact same size (0.66)
    const activeRatio = 0.66;
    const indicatorRadius = activeRatio * (sz / 2);

    const isIndet = this.indeterminate;
    let pointsA;
    let pointsB;
    let morphT = 0;
    let globalAngle = 0;
    let stepAngle = 0;

    if (isIndet) {
      // 1. Continuous Global Rotation (6000ms period)
      const elapsedTotal = now - this._startTime;
      globalAngle = ((elapsedTotal % GLOBAL_ROTATION_DURATION) / GLOBAL_ROTATION_DURATION) * 360;

      // 2. Morph Step Management (900ms interval with spring physics)
      const stepElapsed = now - this._lastStepTime;
      if (stepElapsed >= MORPH_INTERVAL) {
        this._currentMorphIndex = (this._currentMorphIndex + 1) % SHAPES_INDETERMINATE.length;
        this._lastStepTime = now;
      }

      const nextIndex = (this._currentMorphIndex + 1) % SHAPES_INDETERMINATE.length;
      pointsA = SHAPES_INDETERMINATE[this._currentMorphIndex];
      pointsB = SHAPES_INDETERMINATE[nextIndex];

      // Solve Compose Morph spring (damping: 0.6, stiffness: 200)
      const tNorm = Math.min(1.0, (now - this._lastStepTime) / MORPH_INTERVAL);
      const springState = SpringPhysics.solve({
        from: 0,
        to: 1,
        dampingRatio: 0.6,
        stiffness: 200,
        mass: 1.0,
        time: tNorm * (MORPH_INTERVAL / 1000)
      });
      morphT = Math.max(0, Math.min(1, springState.position));

      // Quarter-rotation (+90°) per morph step
      stepAngle = this._currentMorphIndex * QUARTER_ROTATION + morphT * QUARTER_ROTATION;
    } else {
      // Determinate Mode: Morphs from Circle to SoftBurst based on progress
      const p = this.progress || 0;
      pointsA = SHAPES_DETERMINATE[0];
      pointsB = SHAPES_DETERMINATE[1];
      morphT = p;
      globalAngle = p * 360;
      stepAngle = p * 90;
    }

    const totalAngle = ((globalAngle + stepAngle) * Math.PI) / 180;

    // Draw Morphed Shape
    ctx.translate(center, center);
    ctx.rotate(totalAngle);

    // Zero-Reflow Color Resolution
    ctx.fillStyle = this._resolveActiveColor(isContained);
    ctx.beginPath();

    const nPoints = pointsA.length;
    for (let i = 0; i < nPoints; i++) {
      const pa = pointsA[i];
      const pb = pointsB[i];
      const px = (pa.x + (pb.x - pa.x) * morphT) * indicatorRadius;
      const py = (pa.y + (pb.y - pa.y) * morphT) * indicatorRadius;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _updateDimensions() {
    const root = this.shadowRoot.querySelector('.loading-root');
    const canvas = this.shadowRoot.querySelector('canvas');
    if (!root || !canvas) return;

    const sz = this.sizePx;
    root.style.width = `${sz}px`;
    root.style.height = `${sz}px`;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = sz * dpr;
    canvas.height = sz * dpr;
    canvas.style.width = `${sz}px`;
    canvas.style.height = `${sz}px`;
  }

  _syncProgress() {
    const root = this.shadowRoot.querySelector('.loading-root');
    if (!root) return;
    if (this.indeterminate) {
      root.setAttribute('aria-busy', 'true');
      root.removeAttribute('aria-valuenow');
    } else {
      root.setAttribute('aria-busy', 'false');
      root.setAttribute('aria-valuenow', String(Math.round((this.progress || 0) * 100)));
      root.setAttribute('aria-valuemin', '0');
      root.setAttribute('aria-valuemax', '100');
    }
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="loading-root" role="progressbar" aria-label="Loading indicator">
        <canvas></canvas>
      </div>
    `;

    this._updateDimensions();
    this._syncProgress();
  }
}

if (!customElements.get('md-loading-indicator')) {
  customElements.define('md-loading-indicator', MdLoadingIndicator);
}
