export interface IAccessorArgs<T> {
	get: (this: IAccessor<T>) => T;
	set: (this: IAccessor<T>, newValue: T) => boolean;
}
export interface INAccessorArgs {
	get: undefined;
	set: undefined;
}
export interface IAccessor<T> {
	value: T;
	onChange: (callback: (value: T) => unknown) => void;
	removeListener: (callback: (value: T) => unknown) => void;
}

export const Accessor = <T>(value: T, actions?: IAccessorArgs<T> | INAccessorArgs): IAccessor<T> => {
	const listeners: Parameters<IAccessor<T>['onChange']>[0][] = [];
	const o: IAccessor<T> = {
		value,
		onChange: (callback: (value: T) => unknown) => listeners.push(callback),
		removeListener: () => undefined
	};

	let { get: _get, set: _set } = actions ?? {};
	_get ??= function () { return o.value; };
	_set ??= (newValue) => !!(o.value = newValue) || true;

	const get = () => (_get as IAccessorArgs<T>['get']).call(o);
	const set = (newValue: T) => {
		listeners.forEach(l => l(newValue));
		return !!(_set as IAccessorArgs<T>['set']).call(o, newValue);
	};

	const self = new Proxy(o, {
		get: (_, p) => p == 'value' ? get() : o[p as keyof IAccessor<T>],
		set: (_, __, newValue) => set(newValue)
	}) as unknown as IAccessor<T>;

	return self;
};

export const Accessorify = <T>(value: T): T extends IAccessor<infer A> ? IAccessor<A> : IAccessor<T> => {
	if (value instanceof Proxy)
		return value as T extends IAccessor<infer A> ? IAccessor<A> : IAccessor<T>;
	return Accessor(value) as T extends IAccessor<infer A> ? IAccessor<A> : IAccessor<T>;
};

export const Getter = <T>(get: () => T): IAccessor<T> => Accessor(get(), { get, set: () => false });