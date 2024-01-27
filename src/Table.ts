import type { keys, Holders, ANSIString } from "./types"
import { MultiArray } from "./MultiArray"

type VF<A> =
	| A[][]
	| Map<keys, A[]>
	| Map<keys, A>[]
	| Map<keys, Map<keys, A>>
type RVF<A> =
	| A[][]
	| { [K: keys]: A[] }
	| { [K: keys]: A }[]
	| { [K: keys]: { [L: keys]: A } }
type tableableData<Cell, Form extends VF<Cell>> =
	Form extends Cell[][] ? Cell[][] :
	Form extends Map<
		infer K extends keyof any,
		Cell[]
	> ? { [k in K]: Cell[] } :
	Form extends Map<
		infer K extends keyof any,
		Cell
	>[] ? { [k in K]: Cell }[] :
	Form extends Map<
		infer K extends keyof any,
		Map<infer L extends keyof any, Cell>
	> ? { [k in K]: { [l in L]: Cell } } :
	RVF<Cell>
type TableCell = [Content: string, Index: number]

import { ANSI } from "./ANSI"

export class Table<
	Cell,
	Form extends VF<Cell> = VF<Cell>
> {
	/** Holds the table's data */
	private container: Form

	// Division properties
	private topDivider = "="
	private sideDivider = " || "
	private midDivider = " | "
	private leftBorder = "| "

	// Row properties
	private rowAnsi = new Map<number, ANSIString>()
	private overrideColAtRow = new Map<number, ANSIString>()
	private defaultRowAnsi = ANSI.defaultForeground
	private rowDividers = new Set<number>()

	// Col properties
	private colAnsi = new Map<number, ANSIString>()
	private overrideRowAtCol = new Map<number, ANSIString>()
	private defaultColAnsi = ANSI.defaultBackground
	private colDividers = new Set<number>()

	// Cell properties
	private cellAnsiOverride = new Map<`${number},${number}`, ANSIString>()
	private consoleTableAnsi = new Map<`${number},${number}`, ANSIString>()
	private cellValueOverride = new Map<Cell, ANSIString>()

	constructor(data: Form & VF<Cell>)
	constructor(data: Form & VF<Cell>, asConsoleTable: boolean)
	constructor(data: Form & VF<Cell>, private asConsoleTable = false) {
		for (let a of data.values())
			for (let b of a.values())
				assert(!toStringSameAsObject(b), "Element does not have a uniquely defined toString method")
		this.container = data
	}

	/** Returns a number that indicates what happened:
	 * 
	 * * `0`: value was not set at position
	 * * `1`: value was set at position
	 * * `2`: position was updated to value
	 */
	set(row: keys, col: keys, value: Cell) {
		try {
			let update = 1, rowExists: boolean

			if (isMap(this.container)) {
				rowExists = this.container.has(row)

				if (holdsMap(this.container)) { // Map<Map>
					if (!rowExists) this.container.set(row, new Map<keys, Cell>())
					// ^if row doesn't exist, add it as a new map
					else if (this.container.get(row)!.has(col))
						update = 2 // if [row,col] exists, set return value to updated

					this.container.get(row)!.set(col, value)
				} else { // Map<Array>

					if (!rowExists) this.container.set(row, Array(this.numCols))
					else if (col in this.container.get(row)!)
						update = 2
					else while (!(col in this.container.get(row)!)) this.container.get(row)!.push(null as Cell)

					this.container.get(row)![<number>col] = value
				}
			} else {

				rowExists = row in this.container

				if (holdsMap(this.container)) { // Array<Map>
					if (!rowExists)
						while (!(row in this.container))
							this.container.push(new Map())
					else if (this.container[<number>row].has(col))
						update = 2
					this.container[<number>row].set(col, value)
				} else { // Array<Array>
					if (!rowExists)
						while (!(row in this.container))
							this.container.push(Array(this.numCols))
					else if (col in this.container[<number>row])
						update = 2
					else while (!(col in this.container[<number>row])) this.container[<number>row].push(null as Cell)
					this.container[<number>row][<number>col] = value
				}
			}
			return update
		} catch (e) {
			console.error(e)
			return 0
		}
	}

	/** Gets and returns an item at a position [row, col] or undefined if no entry exists */
	get(row: keys, col: keys): Cell | undefined {
		if (isMap(this.container)) {
			if (holdsMap(this.container))
				return this.container.get(row)?.get(col)
			return this.container.get(row)?.at(<number>col)
		}
		if (holdsMap(this.container))
			return this.container.at(<number>row)?.get(col)
		return this.container.at(<number>row)?.at(<number>col)
	}

	get2dAccessors(): [keys, keys[]][] {
		if (isMap(this.container)) {
			if (holdsMap(this.container))
				return this.rowLabels.map(x => [x, this.colLabels]) // this.container is Map<keys, Map<keys, A>>
			return this.rowLabels.map(x => [x, [...Array(this.numCols)].map((_, i) => i)]) // this.container is Map<keys, A[]>
		}
		if (holdsMap(this.container))
			return this.container.map((_, i) => [i, this.colLabels]) // this.container is Map<keys, A>[]
		return this.container.map((_, i) => [i, [...Array(this.numCols)].map((_, j) => j)]) // this.container is A[][]
	}

	getTableArray() {
		return this.get2dAccessors()
			.map(([row, container], rI) => container.map((col, cI) => {
				const gotten = this.get(row, col)

				if (this.asConsoleTable) {
					const t = typeof gotten
					switch (t) {
						case "number":
						case "boolean":
							this.consoleTableAnsi.set(`${rI + 1},${cI + 1}`, ANSI.yellow.FG)
							break
						case "string":
							this.consoleTableAnsi.set(`${rI + 1},${cI + 1}`, ANSI.green.FG)
							break

					}
				}

				return gotten?.toString() ?? ""
			}))
	}

	setSideDivider(div: string) {
		this.sideDivider = div
		return this
	}

	setMidDivider(div: string) {
		this.midDivider = div
		return this
	}

	setTopDivider(div: string) {
		this.topDivider = div
		return this
	}

	/** This border will be mirrored on the right side */
	setLeftBorder(border: string) {
		this.leftBorder = border
		return this
	}

	addDividerAfterColumns(...indexes: number[]) {
		for (let i of indexes) this.colDividers.add(i)
		return this
	}

	addDividerAfterRows(...indexes: number[]) {
		for (let i of indexes) this.rowDividers.add(i)
		return this
	}

	//~ ANSI Methods

	setRowAnsiCodes(...entries: [ANSIString, ...number[]][]) {
		for (let [v, ...n] of entries)
			for (let k of n)
				this.rowAnsi.set(k, v)
		return this
	}
	/** Input should be ~~`\x1b[`~~`this`~~`m`~~ part of the ansi code */
	setColAnsiCodes(...entries: [ANSIString, ...number[]][]) {
		for (let [v, ...n] of entries)
			for (let k of n)
				this.colAnsi.set(k, v)
		return this
	}

	setRowAnsiOverridesAtCol(...entries: [ANSIString, ...number[]][]) {
		for (let [v, ...n] of entries)
			for (let k of n)
				this.overrideRowAtCol.set(k, v)
		return this
	}

	setColAnsiOverridesAtRow(...entries: [ANSIString, ...number[]][]) {
		for (let [v, ...n] of entries)
			for (let k of n)
				this.overrideColAtRow.set(k, v)
		return this
	}

	setCellAnsiOverrides(...entries: [ANSIString, ...`${number},${number}`[]][]) {
		for (let [v, ...n] of entries)
			for (let k of n)
				this.cellAnsiOverride.set(k, v)
		return this
	}

	private getAnsiAt(row: number, col: number) {
		if (this.cellAnsiOverride.has(`${row},${col}`)) return this.cellAnsiOverride.get(`${row},${col}`)!
		const rowCode = this.overrideRowAtCol.get(col) ?? this.rowAnsi.get(row) ?? this.defaultRowAnsi
		const colCode = this.overrideColAtRow.get(row) ?? this.colAnsi.get(col) ?? this.defaultColAnsi
		if (this.asConsoleTable &&
			this.consoleTableAnsi.has(`${row},${col}`) &&
			rowCode == this.defaultRowAnsi &&
			colCode == this.defaultColAnsi)
			return this.consoleTableAnsi.get(`${row},${col}`)
		return rowCode + colCode
	}

	colorize() {
		const { numCols } = this
		const colColorGenerator = (function* () {
			while (true) {
				for (let i = 41; i <= 46; i++)
					yield i
				for (let i = 101; i <= 106; i++)
					yield i
			}
		})()
		const codes = [] as [ANSIString, ...number[]][]
		const black = ANSI(30)
		const white = ANSI(37)
		for (let i = 1; i <= numCols; i++) {
			const val = colColorGenerator.next().value
			codes.push([ANSI(val), i])
			switch (val) {
				case 44:
				case 45:
					this.overrideRowAtCol.set(i, white)
					break
				default:
					this.overrideRowAtCol.set(i, black)
					break
			}
		}
		this.setColAnsiCodes(...codes)
		return this
	}

	asMarkdownTable() {

		return this.toString().replace(ANSI.regex, "")
	}

	private cellFormatter(cellString: string, colWidth: number) {
		const cellLenWithAnsi = cellString.length
		const cellLenWithoutAnsi = cellString.replace(ANSI.regex, "").length
		const cellLenWithOnlyAnsi = cellLenWithAnsi - cellLenWithoutAnsi

		const appended = cellString + " ".repeat(colWidth)
		const sliced = appended.slice(0, colWidth + cellLenWithOnlyAnsi)
		if (sliced.length < cellLenWithAnsi)
			throw new Error()
		return sliced
	}

	private dividerLengths(span: number, index: number) {
		if (span == 0) return 0

		const { midDivider: { length: mLen }, sideDivider: { length: sLen } } = this
		const arr: number[] = []
		for (let i = index - span; i < index; i++) {
			if (this.colDividers.has(i)) arr.push(sLen)
			else arr.push(mLen)
		}
		return arr.reduce((tot, cur) => tot + cur)
	}

	private columnJoiner(cells: TableCell[], rowIndex = 0) {
		return cells.reduce((str, [cellText, dividerIndex]) => {
			const compile = (content: string, divider: string = "") =>
				`${this.getAnsiAt(rowIndex, dividerIndex)}${content}${ANSI.reset}${divider}`

			if (dividerIndex < this.numCols) { // if cell is not the last column in a row

				if (this.colDividers.has(dividerIndex)) // if this column should be followed by a bigger divider
					return str + compile(cellText, this.sideDivider) // return combined result with bigger divider

				return str + compile(cellText, this.midDivider) // return combined result with standard divider
			}

			return str + compile(cellText) // return combined result
		}, "")
	}

	get numRows() { return isMap(this.container) ? this.container.size : this.container.length }

	get numCols() {
		if (holdsMap(this.container))
			return this.colLabels.length
		return Math.max(...[...this.container.values()].map(x => x.length))
	}

	get rowLabels() {
		if (!isMap(this.container)) return []
		return [...this.container.keys()]
	}

	get colLabels() {
		if (!holdsMap(this.container)) return [] // if columns are not a map, return empty array
		const set = new Set<keys>() // do not store repeats
		for (const a of this.container.values()) // for each value in the container
			[...a.keys()].forEach(x => set.add(x)) // ^^add each of its keys to the set
		return Array.from(set) // return the set as an array
	}

	get rowsHaveLabels() { return this.rowLabels.length != 0 }

	get colsHaveLabels() { return this.colLabels.length != 0 }

	get storageType() { return `${isMap(this.container) ? "Map" : "Array"}<${holdsMap(this.container) ? "Map" : "Array"}>` }

	get rawData() { return this.container }

	get tableableData(): tableableData<Cell, Form> {
		if (isMap(this.container)) {
			if (holdsMap(this.container)) {
				this.container
				return Object.fromEntries(
					[...<Map<keys, Map<keys, Cell>>>this.container].map(([key, map]) => [key,
						Object.fromEntries([...map])])
				) as unknown as Table<Cell, Form>["tableableData"]
			}
			this.container
			return Object.fromEntries([...<Map<keys, Cell[]>>this.container]) as unknown as Table<Cell, Form>["tableableData"]
		}
		if (holdsMap(this.container))
			return this.container.map(x => Object.fromEntries([...x])) as unknown as Table<Cell, Form>["tableableData"]
		return this.container as unknown as Table<Cell, Form>["tableableData"]
	}

	private get rightBorder() { return this.leftBorder.split("").reverse().join("") }

	static pivotArray<B>(arr: B[][]) {
		const numRows = arr.length
		const numCols = arr[0].length

		// Create a new array with the transposed dimensions
		const result: B[][] = Array.from({ length: numCols }, () =>
			Array.from({ length: numRows })
		)

		// Fill the new array with the transposed values
		for (let row = 0; row < numRows; row++) {
			for (let col = 0; col < numCols; col++) {
				result[col][row] = arr[row][col]
			}
		}

		return result
	}

	static from2dObject<T extends keys, U extends keys, A>(obj: { [K in T]: { [L in U]: A } }) {
		const topEntries = new Map<keys, { [L in U]: A }>(Object.entries(obj))
		const innerEntries = new Map([...topEntries].map(([x, o]) => [x, new Map(Object.entries(o) as [keys, A][])]))
		return new Table(innerEntries)
	}

	/** Creates a subgrid of tables */
	static subgrid(width: number, ...tables: Table<any>[]) {
		const mArr = new MultiArray(width, ...tables).multiMap(x => x.toString())
		// const raw = [["a\nb\nc", "d\ne\nf\ng"], ["h\ni\nj"]] satisfies `${string}\n${string}`[][] as `${string}\n${string}`[][]
		const transformed = transformArray(mArr.data)
		// console.log("transformed", transformed.map(x => x.map(y => y.map(z => z.replace(ANSI.regex, "")))))

		// [
		// 	[ [ 'a', 'd' ], [ 'b', 'e' ], [ 'c', 'f' ], [ '', 'g' ] ],
		// 	[ [ 'h' ], [ 'i' ], [ 'j' ], [ '' ] ]
		// ]
		// \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/
		// [
		// 	[ 'a', 'd' ], [ 'b', 'e' ], [ 'c', 'f' ], [ '', 'g' ],
		// 	[ 'h' ], [ 'i' ], [ 'j' ], [ '' ]
		// ]

		const mod = transformed.reduce((obj, cur) => {
			obj.indx.push(obj.indx.reduce((t, c) => t + c, 0) + cur.length)
			obj.sto.push(...cur)
			return obj
		}, { sto: [], indx: [] } as { sto: string[][], indx: number[] })
		// console.log(mod)
		return new Table(mod.sto).addDividerAfterRows(...mod.indx.slice(0, -1)).setMidDivider(" =|= ").setLeftBorder("|= ")


		function appendToMax(array: string[], max: number, width = 0) {
			while (array.length < max)
				array.push(" ".repeat(width))

			return array
		}

		function transformArray(arr: string[][]) {
			// Determine the maximum length of the input strings
			const maxLength = Math.max(...arr.flatMap(x => x.map(y => y.split('\n').length)))
			const pivotMap = arr.map(x => Table.pivotArray(x.map(y => appendToMax(y.split("\n"), maxLength, 0))))
			while (pivotMap.at(-1)!.at(-1)!.join("") == "") pivotMap.at(-1)!.pop()
			return pivotMap
		}

	}

	copy() {
		return new Table<Cell>(this.container)
			// Dividers
			.setTopDivider(this.topDivider)
			.setSideDivider(this.sideDivider)
			.setMidDivider(this.midDivider)
			.setLeftBorder(this.leftBorder)
			.addDividerAfterColumns(...this.colDividers)
			// Rows
			.setRowAnsiCodes(...mapper(this.rowAnsi))
			.setColAnsiOverridesAtRow(...mapper(this.overrideColAtRow))
			// Cols
			.setColAnsiCodes(...mapper(this.colAnsi))
			.setRowAnsiOverridesAtCol(...mapper(this.overrideRowAtCol))
			// Cells
			.setCellAnsiOverrides(...mapper(this.cellAnsiOverride))

		function mapper<K, V>(map: Map<K, V>) {
			const nMap = new Map<V, K[]>()
			for (const [k, v] of map) {
				if (nMap.has(v)) nMap.get(v)!.push(k)
				else nMap.set(v, [k])
			}
			return [...nMap].map(([v, k]) => [v, ...k] as [V, ...K[]])
		}
	}

	toString() {
		const { rowLabels, colLabels, rowsHaveLabels, colsHaveLabels } = this

		const dataTable = this.getTableArray()
		const pivotArr = Table.pivotArray(dataTable)
		const columnWidths = pivotArr.map(
			(col, colIndex, colArray) =>
				(!colsHaveLabels ? col : [...col, colLabels[colIndex].toString()])
					.map(x => x.replace(ANSI.regex, ""))
					.reduce(
						(max, { length }, row) =>
							(max < length && colArray[colIndex + 1]?.[row] != "&") ? length : max,
						0)
		)

		type reductionTuple = [TableCell[], string, number]
		const finalArray = (() => {
			while (true) try {
				return dataTable.map((x, rIndex) => {
					const cells: TableCell[] = [...x, ""].reduce(([accumulator, last, span], current, i, a): reductionTuple => {
						if (a.length == i + 1 || current != "&") {
							const colWidthIndexes = [...Array(span + 1)].map((_, j) => i - j - 1)
							const colWidths = colWidthIndexes.map(j => columnWidths[j])
							const cellWidth = i == 0 ? 0 : colWidths.reduce((tot, cur) => tot + cur)
							const formatted = (() => {
								try { return this.cellFormatter(last, cellWidth + this.dividerLengths(span, i)) }
								catch (e) { throw colWidthIndexes }
							})()
							if (formatted != "") accumulator.push([formatted, i])
							return [accumulator, current, 0]
						}

						return [accumulator, last, span + 1]

					}, [[], "", 0] as reductionTuple)[0]

					return (rowsHaveLabels ? "" : this.leftBorder) + this.columnJoiner(cells, rIndex + 1) + this.rightBorder
				})
			} catch (e) {
				for (let i of (e as number[]))
					columnWidths[i]++
			}
		})()

		let rowLabelWidth = 0, rowLabelSeparator = ""
		if (rowsHaveLabels) {
			const stringLabels = rowLabels.map(x => String(x))
			rowLabelWidth = stringLabels.reduce((max, { length }) => length > max ? length : max, 0)
			rowLabelSeparator = this.sideDivider
			for (let i in rowLabels) {
				const formattedCell = this.cellFormatter(stringLabels[i], rowLabelWidth)
				const ansiCode = this.getAnsiAt(Number(i) + 1, 0)
				const fullCell = `${this.leftBorder}${ansiCode}${formattedCell}${ANSI.reset}${this.sideDivider}`
				finalArray[i] = fullCell + finalArray[i]
			}
		}

		if (colsHaveLabels) {
			const formattedLabels = colLabels.map((x, i) => this.cellFormatter(String(x), columnWidths[i]))
			// ^Makes sure each item is the same width as each of its corresponding columns
			const headerCells = formattedLabels.map((x, i) => [x, i + 1] as TableCell)
			// ^Creates TableCell items for each header
			const joinedLabels = this.columnJoiner(headerCells)

			const topLeftCorner = !!rowLabelWidth ?
				this.topDivider.repeat(rowLabelWidth) + this.sideDivider :
				""
			const preHeaderUnderline = this.columnJoiner(
				headerCells.map(([{ length }, i]) => [this.topDivider.repeat(length), i] as TableCell))
			const tableHeaderUnderline = this.leftBorder + topLeftCorner + preHeaderUnderline + this.rightBorder

			finalArray.unshift(this.leftBorder +
				"-".repeat(rowLabelWidth) + rowLabelSeparator + joinedLabels +
				this.rightBorder,
				tableHeaderUnderline)
			// tableHeaderUnderline
		}

		const tableWidth = finalArray[0].replace(ANSI.regex, "").length - 2 * this.leftBorder.length
		for (const R of Array.from(this.rowDividers).sort().reverse())
			finalArray.splice(R, 0, this.leftBorder + this.topDivider.repeat(tableWidth) + this.rightBorder)

		finalArray

		return finalArray.join("\x1b[0m\n") + "\x1b[0m"
	}

}

function isMap<A>(c: Holders<Holders<A>>): c is Map<keys, Holders<A>> {
	// function isMap<A>(c: Holders<Holders<A>>): c is Map<keys, Array<A>> | Map<keys, Map<keys, A>>/* Map<keys, Array<A> | Map<keys, A>> */ {
	return c instanceof Map
}

function holdsMap<A>(c: Holders<Holders<A>>): c is Holders<Map<keys, A>> {
	// function holdsMap<A>(c: Holders<Holders<A>>): c is Map<keys, Map<keys, A>> | Array<Map<keys, A>> {
	return [...c.values()][0] instanceof Map
}

export function toStringSameAsObject(obj: any) {
	return Object.prototype.toString == Object.getPrototypeOf(obj).toString
}

function assert(val: unknown, msg = ""): asserts val {
	if (!val) throw new Error(msg)
}