# @foresteam/proactive
A frontend library, similar to React (though was intended to be more like Vue)

I tried to replicate popular frontend frameworks, as for experiment.

It uses components and composition for its base

## Accessor (aka ref)
Something simillar to Vue's computed/refs. These are basically objects with the following properties:
### Accessor
* **value** - the mutable variable
* **onChange** - a callback, when we need to do something upon a mutation
### Getter
Actually the same Accessor, but immutable and only accepts get() method in its constructor
### Accessorify
Transforms values to accessors, and keeps accessors as they were. The idea is to accept values and refs to values as props in the same time.

## Component
Typical component has the following structure:
* component-name/
	* ComponentName.ts
	* ComponentName.css

Components MUST have ONE root node.

There are basically two ways to render components:
* Wrapping them inside Renderer() and using them like common DOM nodes.
	* Does not support advanced features like passing functions/refs etc.
	* Though it does support recursive parsing (component inside another component), this might be not that well tested yet
	* May misparse something sometimes (pass string instead of boolean, for example)
	* Some tagnames just won't work/occupied, so you have to choose them carefully
* Using their .render() function. More flexible and less buggy, yet not that fancy

Components have a single **slot** tag, that should be (if present) written exactly this way (see examples below):
```html
<slot></slot>
```
It is a pseudo-tag, that Renderer() will write inner HTML instead of. If it is not present, it will append to the end of the component
### Example
**components/titled-section/TitledSection.ts**
```typescript
import { type IAccessor, Accessorify } from '@foresteam/proactive';
import { Component, useStyle, type VNode, type ComponentProps } from '@foresteam/proactive';

export interface Props extends ComponentProps {
	title: boolean | IAccessor<boolean>;
}

export const TitledSection = ({ title: title, ...props }: Props): VNode => {
	const title = Accessorify(title);

	const self = {
		exports: {
			// actually nonsense, but here we export accessors to the VNode
			title
		},
		...Component(/*html*/
			`
				<section class="titled">
					<h1 ref="header">${title.value}</h1>
					<slot></slot>
				</section>
			`,
			TitledSection.name,
			props
		)
	};

	// here you write uses
	// pushes refs to CSS via vars
	useCssVars(self, {
		paddingTop: Accessor('10px')
	});
	const refs = {
		header: Accessor<HTMLElement | undefined>(undefined)
	};
	// pulls DOM nodes to refs
	useRefs(self, refs);

	useOnMounted(self, root => {
		console.log(root);
		header.value.addEventListener('click', () => header.value.innerHTML = 'another header!');
	});

	return self;
};

//styles
// stylesheet doesn't have to wear the same name as the component, actually
// there can be many shylesheets, or none at all
// although they should be imported and used the following way for VScopes and CSSVars to work
import style from './TitledSection.sass?inline';
useStyle(style, TitledSection.name);
```
**components/titled-section/TitledSection.sass**
```scss
// __vscope is a pseudo-selector substituted with node UUID in runtime, so it provides scoped styling to some extent
.__vscope
	// vcss is a pseudo-function, substituted with a var in runtime. The name of its argument is the same as of JS var
	padding-top: vcss(paddingTop)
```
**App.ts**
```typescript
import { TitledSection } from './components/titled-section/TitledSection';
import { Getter } from '@foresteam/proactive';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app)
	throw new Error();

const mount = () => app.innerHTML = Renderer(/*html*/
	`
		<titled-section title="Title!">Some text inside "slot" pseudo-tag</titled-section>
		${TitledSection({ title: 'Another title!' }).render()}
	`,
	{
		'titled-section': TitledSection as TComponent,
	}
);

// here we can define some variables that we need

mount();
```