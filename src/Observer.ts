export const observingCallbacks: { [id: string]: (((node: HTMLElement) => void) | undefined)[] | undefined } = {};

const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations)
		if (mutation.addedNodes.length > 0) {
			for (const id in observingCallbacks)
				for (const child of Array.from(document.getElementsByClassName(id))) {
					observingCallbacks[id]?.forEach(f => f?.(child as HTMLElement));
					observingCallbacks[id] = [];
				}
		}
});
observer.observe(document.body, { childList: true, subtree: true });