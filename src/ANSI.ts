import { ANSIString } from "./types"


// base
interface _ANSI {
	readonly reset: ANSIString<0>
	readonly regex: RegExp
	readonly defaultForeground: ANSIString<39>
	readonly defaultBackground: ANSIString<49>
}

type NamedANSIColor<
	T extends number,
	F extends number = 3,
	B extends number = 4
> = { readonly FG: ANSIString<`${F}${T}`>, readonly BG: ANSIString<`${B}${T}`> }

// colors
interface _ANSIColors {
	readonly black: NamedANSIColor<0>
	readonly red: NamedANSIColor<1>
	readonly green: NamedANSIColor<2>
	readonly yellow: NamedANSIColor<3>
	readonly blue: NamedANSIColor<4>
	readonly magenta: NamedANSIColor<5>
	readonly cyan: NamedANSIColor<6>
	readonly white: NamedANSIColor<7>
	readonly brightBlack: NamedANSIColor<0, 9, 10>
	readonly brightRed: NamedANSIColor<1, 9, 10>
	readonly brightGreen: NamedANSIColor<2, 9, 10>
	readonly brightYellow: NamedANSIColor<3, 9, 10>
	readonly brightBlue: NamedANSIColor<4, 9, 10>
	readonly brightMagenta: NamedANSIColor<5, 9, 10>
	readonly brightCyan: NamedANSIColor<6, 9, 10>
	readonly brightWhite: NamedANSIColor<7, 9, 10>
}


interface ANSIPrime extends _ANSI, _ANSIColors { }

const nac = <
	O extends number, F extends 3 | 9, B extends 4 | 10
>(ones: O, fg: F, bg: B) =>
	({ FG: `\x1b[${fg}${ones}m` as const, BG: `\x1b[${bg}${ones}m` as const }) as NamedANSIColor<O, F, B>

class ProtoANSI extends Function implements ANSIPrime {
	readonly defaultForeground = "\x1b[39m" as const
	readonly defaultBackground = "\x1b[49m" as const
	readonly reset = "\x1b[0m" as const
	readonly regex = (/\x1b\[((?:\d+;)*?\d+)m/g)
	black = nac(0, 3, 4)
	red = nac(1, 3, 4)
	green = nac(2, 3, 4)
	yellow = nac(3, 3, 4)
	blue = nac(4, 3, 4)
	magenta = nac(5, 3, 4)
	cyan = nac(6, 3, 4)
	white = nac(7, 3, 4)
	brightBlack = nac(0, 9, 10)
	brightRed = nac(1, 9, 10)
	brightGreen = nac(2, 9, 10)
	brightYellow = nac(3, 9, 10)
	brightBlue = nac(4, 9, 10)
	brightMagenta = nac(5, 9, 10)
	brightCyan = nac(6, 9, 10)
	brightWhite = nac(7, 9, 10)

	constructor() {
		super("value", "return `\x1b[${value}m`")
	}

}

interface ANSI extends ANSIPrime {
	<T extends string | number>(value: T extends ANSIString ? never : T): ANSIString<T>
	new(): any
}

export const ANSI = new ProtoANSI() as ANSI
