import { type TComponent, type ComponentProps } from './Component.js';

export const Renderer = (vhtml: string, components: { [key: string]: TComponent}): string => {
	const vdom = new DOMParser().parseFromString(vhtml, 'text/html');
	vhtml = vdom.documentElement.outerHTML;
	for (const [name, component] of Object.entries(components))
		for (const el of Array.from(vdom.getElementsByTagName(name)) as HTMLElement[]) {
			const content = el.innerHTML;
			const checkBool = (v: string) => (['false', 'true'].includes(v) ? v == 'true' : v);
			const instance = component(Object.assign({}, ...Array.from(el.attributes).map(a => ({ [a.name]: checkBool(a.value) }))) as ComponentProps);
			const hasSlot = instance.node.value.innerHTML.indexOf('<slot></slot>') >= 0;
			instance.node.value.innerHTML = hasSlot ? instance.node.value.innerHTML.replace('<slot></slot>', content) : instance.node.value.innerHTML + content;
			vhtml = vhtml.replace(el.outerHTML, instance.render());
		}
	return vhtml;
};