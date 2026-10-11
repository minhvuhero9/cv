/**
 * Everything the renderer needs to draw one customer. The skull size lives in the hair
 * init (HairStyleInit.head) because the hair grows on it; the rest of the face and body
 * are described here so every customer can have a different build, not just a recolour.
 */

export type EyeStyle = 'bean' | 'dot' | 'big' | 'narrow' | 'lashes' | 'droopy' | 'beady';
export type BrowStyle = 'normal' | 'thick' | 'thin' | 'bushy' | 'uni' | 'arched' | 'angled';
export type NoseStyle = 'hook' | 'button' | 'big' | 'long' | 'wide' | 'pointy' | 'snub';
export type JawStyle = 'oval' | 'square' | 'round' | 'pointed' | 'heart' | 'wide' | 'long';
/** Default expression when nothing is happening (mood 'neutral'). */
export type RestMouth = 'smile' | 'flat' | 'smirk' | 'pout' | 'frown' | 'grin' | 'open' | 'tight';
export type Teeth = 'gap' | 'buck' | 'gold' | 'braces';
export type Cheeks = 'blush' | 'chubby' | 'hollow' | 'dimples';
export type MustacheStyle = 'walrus' | 'pencil' | 'handlebar' | 'long';
export type BeardStyle = 'full' | 'goatee' | 'long' | 'stubble';

export interface FaceSpec {
  eyes?: EyeStyle;
  /** Half distance between the eyes (default 32, scaled with the head). */
  eyeGap?: number;
  /** Move the eyes down (+) or up (−), px. */
  eyeY?: number;
  /** Eyeshadow colour. */
  shadow?: string;
  brows?: BrowStyle;
  browColor?: string;
  nose?: NoseStyle;
  jaw?: JawStyle;
  /** Lower face length vs. the skull (1 = default). */
  chin?: number;
  rest?: RestMouth;
  /** Mouth width multiplier. */
  mouthW?: number;
  /** Lipstick colour. */
  lips?: string;
  teeth?: Teeth;
  cheeks?: Cheeks;
  /** Ear size multiplier, and shape. */
  ears?: number;
  earShape?: 'round' | 'jug' | 'small';
  mustache?: MustacheStyle;
  beard?: BeardStyle;
  facialHair?: string;
  mole?: boolean;
  scar?: boolean;
  bandaid?: boolean;
  sweat?: boolean;
  eyeBags?: boolean;
  foreheadLines?: boolean;
  sticker?: 'heart' | 'star';
  toothpick?: boolean;
  /** Face mask pulled down under the chin. */
  chinMask?: string;
  tattoo?: boolean;
}

export type Collar =
  | 'tee'
  | 'shirt'
  | 'polo'
  | 'suit'
  | 'blouse'
  | 'gi'
  | 'tank'
  | 'hoodie'
  | 'jacket'
  | 'uniform'
  | 'aodai'
  | 'cardigan'
  | 'hawaii'
  | 'pajama'
  | 'collar';
export type Idle = 'still' | 'breathe' | 'bounce' | 'sway' | 'nod' | 'jitter' | 'tap';

export interface BodySpec {
  /** Width of the shoulders / cape (1 = default). */
  shoulders?: number;
  /** Neck thickness multiplier. */
  neck?: number;
  /** 0..1 belly under the cape. */
  belly?: number;
  /** Shoulder line moves down (+, slumped) or up (−, hunched/raised). */
  shoulderY?: number;
  collar?: Collar;
  idle?: Idle;
}

export type Prop = 'helmet' | 'phoneStick' | 'schoolBag' | 'briefcase' | 'fan' | 'ringLight' | 'moneyFan' | 'cane' | 'phone' | 'clipboard';

export interface CustomerLook {
  skin: string;
  skinShade: string;
  hairColor: string;
  hairShade: string;
  shirt: string;
  /** Second outfit colour (collar trim, lapels, scarf…). */
  trim?: string;
  glasses?: boolean | 'round' | 'thick';
  sunglasses?: boolean | 'small' | 'onHead';
  /** Old flags kept for compatibility: mustache → walrus, beard → full. */
  mustache?: boolean;
  beard?: boolean;
  earring?: boolean | 'both' | 'hoop';
  chain?: boolean | 'thick';
  wrinkles?: boolean;
  headband?: string;
  tie?: string;
  bowTie?: string;
  necklace?: boolean;
  freckles?: boolean;
  /** Worn on the head over the hair. */
  hat?: 'bow' | 'curlers' | 'catEars' | 'headset' | 'headphones' | 'crown';
  bluetooth?: boolean;
  pen?: boolean;
  badge?: boolean;
  redScarf?: boolean;
  /** Something they hold or keep next to the chair. */
  prop?: Prop;
  species?: 'human' | 'dog';
  face?: FaceSpec;
  body?: BodySpec;
}
