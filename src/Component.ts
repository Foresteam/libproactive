import { v4 as uuidv4 } from 'uuid';
import md5 from 'blueimp-md5';
import { type IAccessor, Accessor } from './Accessor.js';
import { observingCallbacks } from './Observer.js';

// export interface StyleProps {
// 	override?: boolean;
// 	[k: string]: any;
// }
/** Applies the scope to last stylesheet loaded */
export const applyScope = (styles: string, scope: string): void => {
	const style = document.createElement('style');
	const sts = styles.split('\n');
	for (const l in sts) {
		const s = sts[l];
		if (s.indexOf('{') < 0) {
			// replace css var-funcs
			for (let [match] of [...s.matchAll(/vcss\(.*?\)/g)]) {
				match = match.replaceAll('\'', '');
				sts[l] = sts[l].replace(match, `var(--${CSS_VAR_PREFIX}${match.substring(5, match.length - 1)})`);
			}
			continue;
		}
		sts[l] = s.replaceAll('__vscope', scope);
	}
	const css = sts.join('\n');
	for (const existing of Array.from(document.getElementsByTagName('style')))
		if (existing.innerHTML == css) {
			style.remove();
			return;
		}
	style.innerHTML = css;
	document.head.appendChild(style);
};
export const useStyle = async (styles: string, uname?: string, scope?: false | string) => {
	if (scope !== false && (scope || uname))
		applyScope(styles, scope ?? genScope(uname as string));
};

export const getHash = (s: string) => {
	let hash = 0,
		i, chr;
	if (s.length === 0) return hash;
	for (i = 0; i < s.length; i++) {
		chr = s.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

export const genUUID = () => '_u_' + uuidv4();
export const genScope = (uname: string) => '_s_' + md5(uname);

export interface VNode {
	/** The unique identifier of the root node of the component */
	uuid: string;
	/** The rendered node itself */
	render: () => string;
	toString: () => string;
	/** VNode */
	node: IAccessor<HTMLElement>;
	/** Component real node getter */
	isMounted: () => boolean;
	exports?: { [key: string]: IAccessor<unknown>; };
}
export interface ComponentParams {
	/** The unique identifier for the root node of the component */
	uuid?: string;
	/** Style scope. Unset to use UUID, set to false to disable */
	scope?: false | string;
}
export interface ComponentProps {
	class?: string | Record<string, boolean> | string[];
	style?: string | Record<string, unknown> | string[];
}
export type TComponent = (props: ComponentProps) => VNode;
/** 
 * @param html The rendered node itself
 * @param uname Component typename
*/
export const Component = (html: string, uname: string, props: ComponentProps = {}, { uuid, scope }: ComponentParams = {}): VNode => {
	if (!uuid)
		uuid = genUUID();
	const _vnode = new DOMParser().parseFromString(html, 'text/html').body.firstChild as (HTMLElement | undefined);
	if (!_vnode)
		throw new Error('Failed to parse vnode: empty');
	const node = Accessor(_vnode as HTMLElement);
	if (scope !== false) {
		scope ??= genScope(uname);
		node.value.classList.add(scope);
	}
	
	node.value.classList.add(uuid);
	if (props.class)
		if (typeof (props.class) == 'string')
			for (const clss of (props.class as string).split(' '))
				node.value.classList.add(clss);
		else if ((props.class as string[])[0])
			for (const clss of props.class as string[])
				node.value.classList.add(clss);
		else
			for (const [clss, enable] of Object.entries(props.class))
				node.value.classList.toggle(clss, enable);
	if (props.style)
		if (typeof (props.style) == 'string')
			node.value.setAttribute('style', props.style as string);
		else if ((props.style as string[])[0])
			node.value.setAttribute('style', (props.style as string[]).join('; '));
		else
			for (const [style, value] of Object.entries(props.style as Record<string, unknown>))
				if (Object.keys(node.value.style).includes(style))
					(node.value.style as unknown as { [key: string]: unknown })[style] = value;

	const vnode: VNode = {
		node: node,
		render: () => node.value.outerHTML,
		toString() { return this.render(); },
		uuid,
		isMounted: () => node.value != _vnode
	};
	useOnMounted(vnode, domNode => node.value = domNode);
	return vnode;
};

export const CSS_VAR_PREFIX = '__vcss_';
export const useCssVars = (vnode: VNode, vars: { [key: string]: IAccessor<string>; }): void => {
	for (const [varname, accessor] of Object.entries(vars)) {
		const apply = (value: string) =>
			vnode.node.value.style.setProperty(`--${CSS_VAR_PREFIX}${varname}`, value);
		accessor.onChange(value => apply(value as string));
		apply(accessor.value as string);
	}
};
export const useRefs = (vnode: VNode, refs: { [key: string]: IAccessor<HTMLElement | undefined>; }): void => useOnMounted(vnode, domNode => {
	for (const [ref, accessor] of Object.entries(refs)) {
		const el = domNode.querySelector(`*[ref="${ref}"]`) as HTMLElement || undefined;
		accessor.value = el;
		el?.removeAttribute('ref');
	}
});

export const useOnMounted = (vnode: VNode, callback: (node: HTMLElement) => unknown): void => {
	if (!observingCallbacks[vnode.uuid])
		observingCallbacks[vnode.uuid] = [];
	observingCallbacks[vnode.uuid]?.push(callback);
};