

export class MultiArray<A = any> /* implements Array<A> */ {
	private storage = [[]] as A[][]

	constructor(private maxWidth: number, ...items: A[]) {
		this.push(...items)
	}

	push(...items: A[]) {
		for (const a of items) {
			if (this.rowIsFull()) this.addNextRow()
			this.lastRow.push(a)
		}
	}

	slice(start = 0, end = [...this].length) {
		return [...this].slice(start, end)
	}

	multiSlice(start = 0, end = [...this].length) {
		return new MultiArray(this.maxWidth, ...this.slice(start, end))
	}

	forEach(callback: (value: A, index: number, array: A[]) => void, thisArg?: any) {
		[...this].forEach(callback, thisArg)
	}

	some(predicate: (value: A, index: number, array: A[]) => unknown, thisArg?: any) {
		return [...this].some(predicate, thisArg)
	}

	join(): string
	join(colSeparator: string): string
	join(colSeparator: string, rowSeparator: string): string
	join(colSeparator = ",", rowSeparator = "\n") {
		return this.storage.map(x => x.join(colSeparator)).join(rowSeparator)
	}

	map<U>(callback: (value: A, index: number, array: A[]) => U, thisArg?: any) {
		return [...this].map(callback, thisArg)
	}

	multiMap<U>(callback: (value: A, index: number, array: A[]) => U, thisArg?: any) {
		return new MultiArray(this.maxWidth, ...this.map(callback, thisArg))
	}

	find<S extends A>(predicate: (value: A, index: number, array: A[]) => value is S, thisArg?: any): S | undefined
	find(predicate: (value: A, index: number, array: A[]) => unknown, thisArg?: any): A | undefined
	find(predicate: (...args: any) => any, thisArg?: any) {
		return [...this].find(predicate)
	}

	filter<S extends A>(predicate: (value: A, index: number, array: A[]) => value is S, thisArg?: any): A[]
	filter(predicate: (value: A, index: number, array: A[]) => unknown, thisArg?: any): A[]
	filter(predicate: (...args: any) => any, thisArg?: any) {
		return [...this].filter(predicate)
	}

	[Symbol.iterator]() {
		return this.storage.flat().values()
	}

	get data() {
		return this.storage
	}

	private get lastRow() {
		return this.storage.at(-1)!
	}

	private rowIsFull() {
		return this.lastRow.length == this.maxWidth
	}

	private addNextRow() {
		this.storage.push([])
	}
}