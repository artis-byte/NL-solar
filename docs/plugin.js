const __pluginConfig =  {
  "name": "windy-plugin-knmi-qg-regions",
  "version": "0.2.5",
  "icon": "☀",
  "title": "KNMI Solar Radiation",
  "description": "Overlay KNMI 10 minute irradiance and wind metrics for Dutch regions and stations.",
  "author": "Artis Byte",
  "repository": "https://github.com/artis-byte/NL-solar",
  "desktopUI": "rhpane",
  "mobileUI": "fullscreen",
  "routerPath": "/knmi-solar",
  "private": false,
  "built": 1760182910649,
  "builtReadable": "2025-10-11T11:41:50.649Z",
  "screenshot": "screenshot.jpg"
};

// transformCode: import { map } from '@windy/map';
const { map } = W.map;


/** @returns {void} */
function noop() {}

function run(fn) {
	return fn();
}

function blank_object() {
	return Object.create(null);
}

/**
 * @param {Function[]} fns
 * @returns {void}
 */
function run_all(fns) {
	fns.forEach(run);
}

/**
 * @param {any} thing
 * @returns {thing is Function}
 */
function is_function(thing) {
	return typeof thing === 'function';
}

/** @returns {boolean} */
function safe_not_equal(a, b) {
	return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
}

/** @returns {boolean} */
function is_empty(obj) {
	return Object.keys(obj).length === 0;
}

/**
 * @param {Node} target
 * @param {Node} node
 * @returns {void}
 */
function append(target, node) {
	target.appendChild(node);
}

/**
 * @param {Node} target
 * @param {string} style_sheet_id
 * @param {string} styles
 * @returns {void}
 */
function append_styles(target, style_sheet_id, styles) {
	const append_styles_to = get_root_for_style(target);
	if (!append_styles_to.getElementById(style_sheet_id)) {
		const style = element('style');
		style.id = style_sheet_id;
		style.textContent = styles;
		append_stylesheet(append_styles_to, style);
	}
}

/**
 * @param {Node} node
 * @returns {ShadowRoot | Document}
 */
function get_root_for_style(node) {
	if (!node) return document;
	const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
	if (root && /** @type {ShadowRoot} */ (root).host) {
		return /** @type {ShadowRoot} */ (root);
	}
	return node.ownerDocument;
}

/**
 * @param {ShadowRoot | Document} node
 * @param {HTMLStyleElement} style
 * @returns {CSSStyleSheet}
 */
function append_stylesheet(node, style) {
	append(/** @type {Document} */ (node).head || node, style);
	return style.sheet;
}

/**
 * @param {Node} target
 * @param {Node} node
 * @param {Node} [anchor]
 * @returns {void}
 */
function insert(target, node, anchor) {
	target.insertBefore(node, anchor || null);
}

/**
 * @param {Node} node
 * @returns {void}
 */
function detach(node) {
	if (node.parentNode) {
		node.parentNode.removeChild(node);
	}
}

/**
 * @returns {void} */
function destroy_each(iterations, detaching) {
	for (let i = 0; i < iterations.length; i += 1) {
		if (iterations[i]) iterations[i].d(detaching);
	}
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} name
 * @returns {HTMLElementTagNameMap[K]}
 */
function element(name) {
	return document.createElement(name);
}

/**
 * @param {string} data
 * @returns {Text}
 */
function text(data) {
	return document.createTextNode(data);
}

/**
 * @returns {Text} */
function space() {
	return text(' ');
}

/**
 * @param {EventTarget} node
 * @param {string} event
 * @param {EventListenerOrEventListenerObject} handler
 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
 * @returns {() => void}
 */
function listen(node, event, handler, options) {
	node.addEventListener(event, handler, options);
	return () => node.removeEventListener(event, handler, options);
}

/**
 * @param {Element} node
 * @param {string} attribute
 * @param {string} [value]
 * @returns {void}
 */
function attr(node, attribute, value) {
	if (value == null) node.removeAttribute(attribute);
	else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}

/**
 * @param {Element} element
 * @returns {ChildNode[]}
 */
function children(element) {
	return Array.from(element.childNodes);
}

/**
 * @param {Text} text
 * @param {unknown} data
 * @returns {void}
 */
function set_data(text, data) {
	data = '' + data;
	if (text.data === data) return;
	text.data = /** @type {string} */ (data);
}

/**
 * @returns {void} */
function set_input_value(input, value) {
	input.value = value == null ? '' : value;
}

/**
 * @returns {void} */
function toggle_class(element, name, toggle) {
	// The `!!` is required because an `undefined` flag means flipping the current state.
	element.classList.toggle(name, !!toggle);
}

/**
 * @typedef {Node & {
 * 	claim_order?: number;
 * 	hydrate_init?: true;
 * 	actual_end_child?: NodeEx;
 * 	childNodes: NodeListOf<NodeEx>;
 * }} NodeEx
 */

/** @typedef {ChildNode & NodeEx} ChildNodeEx */

/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

/**
 * @typedef {ChildNodeEx[] & {
 * 	claim_info?: {
 * 		last_index: number;
 * 		total_claimed: number;
 * 	};
 * }} ChildNodeArray
 */

let current_component;

/** @returns {void} */
function set_current_component(component) {
	current_component = component;
}

function get_current_component() {
	if (!current_component) throw new Error('Function called outside component initialization');
	return current_component;
}

/**
 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
 * it can be called from an external module).
 *
 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
 *
 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
 *
 * https://svelte.dev/docs/svelte#onmount
 * @template T
 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
 * @returns {void}
 */
function onMount(fn) {
	get_current_component().$$.on_mount.push(fn);
}

/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * https://svelte.dev/docs/svelte#ondestroy
 * @param {() => any} fn
 * @returns {void}
 */
function onDestroy(fn) {
	get_current_component().$$.on_destroy.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];

let render_callbacks = [];

const flush_callbacks = [];

const resolved_promise = /* @__PURE__ */ Promise.resolve();

let update_scheduled = false;

/** @returns {void} */
function schedule_update() {
	if (!update_scheduled) {
		update_scheduled = true;
		resolved_promise.then(flush);
	}
}

/** @returns {void} */
function add_render_callback(fn) {
	render_callbacks.push(fn);
}

// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();

let flushidx = 0; // Do *not* move this inside the flush() function

/** @returns {void} */
function flush() {
	// Do not reenter flush while dirty components are updated, as this can
	// result in an infinite loop. Instead, let the inner flush handle it.
	// Reentrancy is ok afterwards for bindings etc.
	if (flushidx !== 0) {
		return;
	}
	const saved_component = current_component;
	do {
		// first, call beforeUpdate functions
		// and update components
		try {
			while (flushidx < dirty_components.length) {
				const component = dirty_components[flushidx];
				flushidx++;
				set_current_component(component);
				update(component.$$);
			}
		} catch (e) {
			// reset dirty state to not end up in a deadlocked state and then rethrow
			dirty_components.length = 0;
			flushidx = 0;
			throw e;
		}
		set_current_component(null);
		dirty_components.length = 0;
		flushidx = 0;
		while (binding_callbacks.length) binding_callbacks.pop()();
		// then, once components are updated, call
		// afterUpdate functions. This may cause
		// subsequent updates...
		for (let i = 0; i < render_callbacks.length; i += 1) {
			const callback = render_callbacks[i];
			if (!seen_callbacks.has(callback)) {
				// ...so guard against infinite loops
				seen_callbacks.add(callback);
				callback();
			}
		}
		render_callbacks.length = 0;
	} while (dirty_components.length);
	while (flush_callbacks.length) {
		flush_callbacks.pop()();
	}
	update_scheduled = false;
	seen_callbacks.clear();
	set_current_component(saved_component);
}

/** @returns {void} */
function update($$) {
	if ($$.fragment !== null) {
		$$.update();
		run_all($$.before_update);
		const dirty = $$.dirty;
		$$.dirty = [-1];
		$$.fragment && $$.fragment.p($$.ctx, dirty);
		$$.after_update.forEach(add_render_callback);
	}
}

/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 * @param {Function[]} fns
 * @returns {void}
 */
function flush_render_callbacks(fns) {
	const filtered = [];
	const targets = [];
	render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
	targets.forEach((c) => c());
	render_callbacks = filtered;
}

const outroing = new Set();

/**
 * @param {import('./private.js').Fragment} block
 * @param {0 | 1} [local]
 * @returns {void}
 */
function transition_in(block, local) {
	if (block && block.i) {
		outroing.delete(block);
		block.i(local);
	}
}

/** @typedef {1} INTRO */
/** @typedef {0} OUTRO */
/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

/**
 * @typedef {Object} Outro
 * @property {number} r
 * @property {Function[]} c
 * @property {Object} p
 */

/**
 * @typedef {Object} PendingProgram
 * @property {number} start
 * @property {INTRO|OUTRO} b
 * @property {Outro} [group]
 */

/**
 * @typedef {Object} Program
 * @property {number} a
 * @property {INTRO|OUTRO} b
 * @property {1|-1} d
 * @property {number} duration
 * @property {number} start
 * @property {number} end
 * @property {Outro} [group]
 */

// general each functions:

function ensure_array_like(array_like_or_iterator) {
	return array_like_or_iterator?.length !== undefined
		? array_like_or_iterator
		: Array.from(array_like_or_iterator);
}

/** @returns {void} */
function mount_component(component, target, anchor) {
	const { fragment, after_update } = component.$$;
	fragment && fragment.m(target, anchor);
	// onMount happens before the initial afterUpdate
	add_render_callback(() => {
		const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
		// if the component was destroyed immediately
		// it will update the `$$.on_destroy` reference to `null`.
		// the destructured on_destroy may still reference to the old array
		if (component.$$.on_destroy) {
			component.$$.on_destroy.push(...new_on_destroy);
		} else {
			// Edge case - component was destroyed immediately,
			// most likely as a result of a binding initialising
			run_all(new_on_destroy);
		}
		component.$$.on_mount = [];
	});
	after_update.forEach(add_render_callback);
}

/** @returns {void} */
function destroy_component(component, detaching) {
	const $$ = component.$$;
	if ($$.fragment !== null) {
		flush_render_callbacks($$.after_update);
		run_all($$.on_destroy);
		$$.fragment && $$.fragment.d(detaching);
		// TODO null out other refs, including component.$$ (but need to
		// preserve final state?)
		$$.on_destroy = $$.fragment = null;
		$$.ctx = [];
	}
}

/** @returns {void} */
function make_dirty(component, i) {
	if (component.$$.dirty[0] === -1) {
		dirty_components.push(component);
		schedule_update();
		component.$$.dirty.fill(0);
	}
	component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
}

// TODO: Document the other params
/**
 * @param {SvelteComponent} component
 * @param {import('./public.js').ComponentConstructorOptions} options
 *
 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
 * This will be the `add_css` function from the compiled component.
 *
 * @returns {void}
 */
function init(
	component,
	options,
	instance,
	create_fragment,
	not_equal,
	props,
	append_styles = null,
	dirty = [-1]
) {
	const parent_component = current_component;
	set_current_component(component);
	/** @type {import('./private.js').T$$} */
	const $$ = (component.$$ = {
		fragment: null,
		ctx: [],
		// state
		props,
		update: noop,
		not_equal,
		bound: blank_object(),
		// lifecycle
		on_mount: [],
		on_destroy: [],
		on_disconnect: [],
		before_update: [],
		after_update: [],
		context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
		// everything else
		callbacks: blank_object(),
		dirty,
		skip_bound: false,
		root: options.target || parent_component.$$.root
	});
	append_styles && append_styles($$.root);
	let ready = false;
	$$.ctx = instance
		? instance(component, options.props || {}, (i, ret, ...rest) => {
				const value = rest.length ? rest[0] : ret;
				if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
					if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
					if (ready) make_dirty(component, i);
				}
				return ret;
		  })
		: [];
	$$.update();
	ready = true;
	run_all($$.before_update);
	// `false` as a special case of no DOM component
	$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
	if (options.target) {
		if (options.hydrate) {
			// TODO: what is the correct type here?
			// @ts-expect-error
			const nodes = children(options.target);
			$$.fragment && $$.fragment.l(nodes);
			nodes.forEach(detach);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.c();
		}
		if (options.intro) transition_in(component.$$.fragment);
		mount_component(component, options.target, options.anchor);
		flush();
	}
	set_current_component(parent_component);
}

/**
 * Base class for Svelte components. Used when dev=false.
 *
 * @template {Record<string, any>} [Props=any]
 * @template {Record<string, any>} [Events=any]
 */
class SvelteComponent {
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$ = undefined;
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$set = undefined;

	/** @returns {void} */
	$destroy() {
		destroy_component(this, 1);
		this.$destroy = noop;
	}

	/**
	 * @template {Extract<keyof Events, string>} K
	 * @param {K} type
	 * @param {((e: Events[K]) => void) | null | undefined} callback
	 * @returns {() => void}
	 */
	$on(type, callback) {
		if (!is_function(callback)) {
			return noop;
		}
		const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
		callbacks.push(callback);
		return () => {
			const index = callbacks.indexOf(callback);
			if (index !== -1) callbacks.splice(index, 1);
		};
	}

	/**
	 * @param {Partial<Props>} props
	 * @returns {void}
	 */
	$set(props) {
		if (this.$$set && !is_empty(props)) {
			this.$$.skip_bound = true;
			this.$$set(props);
			this.$$.skip_bound = false;
		}
	}
}

/**
 * @typedef {Object} CustomElementPropDefinition
 * @property {string} [attribute]
 * @property {boolean} [reflect]
 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
 */

// generated during release, do not modify

const PUBLIC_VERSION = '4';

if (typeof window !== 'undefined')
	// @ts-ignore
	(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

/* src\plugin.svelte generated by Svelte v4.2.20 */

function add_css(target) {
	append_styles(target, "svelte-v6ycdy", "section.svelte-v6ycdy.svelte-v6ycdy{padding:0.75em;max-width:360px;font-family:sans-serif;font-size:0.9em;line-height:1.4;color:#1c1c1c}h1.svelte-v6ycdy.svelte-v6ycdy{font-size:1.2em;margin:0 0 0.4em}p.intro.svelte-v6ycdy.svelte-v6ycdy{margin:0 0 0.75em}.mode-buttons.svelte-v6ycdy.svelte-v6ycdy{display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:0.35em;margin-bottom:0.5em}.mode-button.svelte-v6ycdy.svelte-v6ycdy{border:1px solid rgba(35, 35, 35, 0.6);border-radius:6px;padding:0.35em 0.5em;background:rgba(255, 255, 255, 0.85);color:#222;cursor:pointer;font-size:0.85em;text-align:center;transition:background 0.15s ease, color 0.15s ease, border 0.15s ease}.mode-button.svelte-v6ycdy.svelte-v6ycdy:hover{background:rgba(40, 120, 180, 0.12)}.mode-button.selected.svelte-v6ycdy.svelte-v6ycdy{background:#1f6fb2;color:#fff;border-color:#1f6fb2}.filter-group.svelte-v6ycdy.svelte-v6ycdy{margin:0.5em 0 0.75em;display:flex;flex-direction:column;gap:0.35em}.filter-group.svelte-v6ycdy label.svelte-v6ycdy{font-weight:600}.station-input.svelte-v6ycdy.svelte-v6ycdy{padding:0.35em 0.45em;border-radius:4px;border:1px solid rgba(40, 40, 40, 0.35)}.status.svelte-v6ycdy.svelte-v6ycdy{margin:0.75em 0 0}.status.error.svelte-v6ycdy.svelte-v6ycdy{color:#b03a2e}.legend.svelte-v6ycdy.svelte-v6ycdy{margin-top:1em;border-top:1px solid #bcbcbc;padding-top:0.75em;color:#111}.legend-title.svelte-v6ycdy.svelte-v6ycdy{font-weight:600;margin-bottom:0.4em}.legend-row.svelte-v6ycdy.svelte-v6ycdy{display:flex;align-items:center;margin-bottom:0.25em}.legend-swatch.svelte-v6ycdy.svelte-v6ycdy{width:18px;height:12px;margin-right:0.5em;border:1px solid #333333;box-sizing:border-box}.footer.svelte-v6ycdy.svelte-v6ycdy{margin-top:1em;font-size:0.8em;color:#444}a.svelte-v6ycdy.svelte-v6ycdy{color:#0b63c1}");
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[37] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[40] = list[i];
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[43] = list[i];
	return child_ctx;
}

// (539:4) {#each MODES as mode}
function create_each_block_2(ctx) {
	let button;
	let mounted;
	let dispose;

	function click_handler() {
		return /*click_handler*/ ctx[12](/*mode*/ ctx[43]);
	}

	return {
		c() {
			button = element("button");
			button.textContent = `${/*mode*/ ctx[43].label} `;
			attr(button, "type", "button");
			attr(button, "class", "mode-button svelte-v6ycdy");
			toggle_class(button, "selected", /*selectedMode*/ ctx[5] === /*mode*/ ctx[43].id);
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (!mounted) {
				dispose = listen(button, "click", click_handler);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty[0] & /*selectedMode, MODES*/ 288) {
				toggle_class(button, "selected", /*selectedMode*/ ctx[5] === /*mode*/ ctx[43].id);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(button);
			}

			mounted = false;
			dispose();
		}
	};
}

// (549:2) {#if getMode(selectedMode)?.type === 'stations'}
function create_if_block_4(ctx) {
	let div;
	let label;
	let t1;
	let input;
	let t2;
	let datalist;
	let mounted;
	let dispose;
	let each_value_1 = ensure_array_like(/*stationOptions*/ ctx[7]);
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	return {
		c() {
			div = element("div");
			label = element("label");
			label.textContent = "Show station (ID contains)";
			t1 = space();
			input = element("input");
			t2 = space();
			datalist = element("datalist");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(label, "for", "station-filter");
			attr(label, "class", "svelte-v6ycdy");
			attr(input, "id", "station-filter");
			attr(input, "class", "station-input svelte-v6ycdy");
			attr(input, "list", "station-options");
			attr(input, "placeholder", "e.g. 06280");
			input.value = /*stationFilter*/ ctx[6];
			attr(datalist, "id", "station-options");
			attr(div, "class", "filter-group svelte-v6ycdy");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, label);
			append(div, t1);
			append(div, input);
			append(div, t2);
			append(div, datalist);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(datalist, null);
				}
			}

			if (!mounted) {
				dispose = listen(input, "input", /*handleStationFilter*/ ctx[11]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*stationFilter*/ 64 && input.value !== /*stationFilter*/ ctx[6]) {
				input.value = /*stationFilter*/ ctx[6];
			}

			if (dirty[0] & /*stationOptions*/ 128) {
				each_value_1 = ensure_array_like(/*stationOptions*/ ctx[7]);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(datalist, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_1.length;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_each(each_blocks, detaching);
			mounted = false;
			dispose();
		}
	};
}

// (560:8) {#each stationOptions as code}
function create_each_block_1(ctx) {
	let option;
	let option_value_value;

	return {
		c() {
			option = element("option");
			option.__value = option_value_value = /*code*/ ctx[40];
			set_input_value(option, option.__value);
		},
		m(target, anchor) {
			insert(target, option, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*stationOptions*/ 128 && option_value_value !== (option_value_value = /*code*/ ctx[40])) {
				option.__value = option_value_value;
				set_input_value(option, option.__value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(option);
			}
		}
	};
}

// (571:24) 
function create_if_block_3(ctx) {
	let p;
	let t0;
	let t1_value = formatTimestamp(/*lastUpdated*/ ctx[2]) + "";
	let t1;

	return {
		c() {
			p = element("p");
			t0 = text("Last refreshed: ");
			t1 = text(t1_value);
			attr(p, "class", "status svelte-v6ycdy");
		},
		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t0);
			append(p, t1);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*lastUpdated*/ 4 && t1_value !== (t1_value = formatTimestamp(/*lastUpdated*/ ctx[2]) + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (569:25) 
function create_if_block_2(ctx) {
	let p;
	let t;

	return {
		c() {
			p = element("p");
			t = text(/*errorMessage*/ ctx[1]);
			attr(p, "class", "status error svelte-v6ycdy");
		},
		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*errorMessage*/ 2) set_data(t, /*errorMessage*/ ctx[1]);
		},
		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (567:2) {#if loading}
function create_if_block_1(ctx) {
	let p;

	return {
		c() {
			p = element("p");
			p.textContent = "Loading latest data...";
			attr(p, "class", "status svelte-v6ycdy");
		},
		m(target, anchor) {
			insert(target, p, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (575:2) {#if legendStops.length}
function create_if_block(ctx) {
	let div1;
	let div0;
	let t0;

	let t1_value = (/*legendUnits*/ ctx[4]
	? ` (${/*legendUnits*/ ctx[4]})`
	: '') + "";

	let t1;
	let t2;
	let each_value = ensure_array_like(/*legendStops*/ ctx[3]);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			t0 = text("Legend");
			t1 = text(t1_value);
			t2 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div0, "class", "legend-title svelte-v6ycdy");
			attr(div1, "class", "legend svelte-v6ycdy");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, t0);
			append(div0, t1);
			append(div1, t2);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div1, null);
				}
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*legendUnits*/ 16 && t1_value !== (t1_value = (/*legendUnits*/ ctx[4]
			? ` (${/*legendUnits*/ ctx[4]})`
			: '') + "")) set_data(t1, t1_value);

			if (dirty[0] & /*legendStops*/ 8) {
				each_value = ensure_array_like(/*legendStops*/ ctx[3]);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div1, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div1);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

// (578:6) {#each legendStops as item}
function create_each_block(ctx) {
	let div;
	let span0;
	let span0_style_value;
	let t0;
	let span1;
	let t1_value = /*item*/ ctx[37].label + "";
	let t1;
	let t2;

	return {
		c() {
			div = element("div");
			span0 = element("span");
			t0 = space();
			span1 = element("span");
			t1 = text(t1_value);
			t2 = space();
			attr(span0, "class", "legend-swatch svelte-v6ycdy");
			attr(span0, "style", span0_style_value = `background:${/*item*/ ctx[37].color}`);
			attr(div, "class", "legend-row svelte-v6ycdy");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span0);
			append(div, t0);
			append(div, span1);
			append(span1, t1);
			append(div, t2);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*legendStops*/ 8 && span0_style_value !== (span0_style_value = `background:${/*item*/ ctx[37].color}`)) {
				attr(span0, "style", span0_style_value);
			}

			if (dirty[0] & /*legendStops*/ 8 && t1_value !== (t1_value = /*item*/ ctx[37].label + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

function create_fragment(ctx) {
	let section;
	let h1;
	let t1;
	let p0;
	let t3;
	let div;
	let t4;
	let show_if = /*getMode*/ ctx[9](/*selectedMode*/ ctx[5])?.type === 'stations';
	let t5;
	let t6;
	let t7;
	let p1;
	let t8;
	let a0;
	let t9;
	let t10;
	let a1;
	let t11;
	let t12;
	let each_value_2 = ensure_array_like(/*MODES*/ ctx[8]);
	let each_blocks = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	let if_block0 = show_if && create_if_block_4(ctx);

	function select_block_type(ctx, dirty) {
		if (/*loading*/ ctx[0]) return create_if_block_1;
		if (/*errorMessage*/ ctx[1]) return create_if_block_2;
		if (/*lastUpdated*/ ctx[2]) return create_if_block_3;
	}

	let current_block_type = select_block_type(ctx);
	let if_block1 = current_block_type && current_block_type(ctx);
	let if_block2 = /*legendStops*/ ctx[3].length && create_if_block(ctx);

	return {
		c() {
			section = element("section");
			h1 = element("h1");
			h1.textContent = "KNMI Solar & Wind";
			t1 = space();
			p0 = element("p");
			p0.textContent = "Live KNMI 10 minute metrics. Toggle between regional averages and individual stations.";
			t3 = space();
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t4 = space();
			if (if_block0) if_block0.c();
			t5 = space();
			if (if_block1) if_block1.c();
			t6 = space();
			if (if_block2) if_block2.c();
			t7 = space();
			p1 = element("p");
			t8 = text("Sources: ");
			a0 = element("a");
			t9 = text("region feed");
			t10 = text(" ·\r\n    ");
			a1 = element("a");
			t11 = text("station feed");
			t12 = text(". Data refreshes every 10 minutes.");
			attr(h1, "class", "svelte-v6ycdy");
			attr(p0, "class", "intro svelte-v6ycdy");
			attr(div, "class", "mode-buttons svelte-v6ycdy");
			attr(a0, "href", REGION_URL);
			attr(a0, "target", "_blank");
			attr(a0, "rel", "noopener");
			attr(a0, "class", "svelte-v6ycdy");
			attr(a1, "href", STATION_URL);
			attr(a1, "target", "_blank");
			attr(a1, "rel", "noopener");
			attr(a1, "class", "svelte-v6ycdy");
			attr(p1, "class", "footer svelte-v6ycdy");
			attr(section, "class", "svelte-v6ycdy");
		},
		m(target, anchor) {
			insert(target, section, anchor);
			append(section, h1);
			append(section, t1);
			append(section, p0);
			append(section, t3);
			append(section, div);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}

			append(section, t4);
			if (if_block0) if_block0.m(section, null);
			append(section, t5);
			if (if_block1) if_block1.m(section, null);
			append(section, t6);
			if (if_block2) if_block2.m(section, null);
			append(section, t7);
			append(section, p1);
			append(p1, t8);
			append(p1, a0);
			append(a0, t9);
			append(p1, t10);
			append(p1, a1);
			append(a1, t11);
			append(p1, t12);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*selectedMode, MODES, handleModeClick*/ 1312) {
				each_value_2 = ensure_array_like(/*MODES*/ ctx[8]);
				let i;

				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_2(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_2.length;
			}

			if (dirty[0] & /*selectedMode*/ 32) show_if = /*getMode*/ ctx[9](/*selectedMode*/ ctx[5])?.type === 'stations';

			if (show_if) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_4(ctx);
					if_block0.c();
					if_block0.m(section, t5);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
				if_block1.p(ctx, dirty);
			} else {
				if (if_block1) if_block1.d(1);
				if_block1 = current_block_type && current_block_type(ctx);

				if (if_block1) {
					if_block1.c();
					if_block1.m(section, t6);
				}
			}

			if (/*legendStops*/ ctx[3].length) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block(ctx);
					if_block2.c();
					if_block2.m(section, t7);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) {
				detach(section);
			}

			destroy_each(each_blocks, detaching);
			if (if_block0) if_block0.d();

			if (if_block1) {
				if_block1.d();
			}

			if (if_block2) if_block2.d();
		}
	};
}

const REGION_URL = 'https://raw.githubusercontent.com/artis-byte/NL-solar/main/qg_regions.geojson';
const STATION_URL = 'https://raw.githubusercontent.com/artis-byte/NL-solar/main/stations_live.geojson';
const REFRESH_MS = 600_000;

function formatNumber(value) {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 'n/a';
	}

	const abs = Math.abs(value);
	if (abs >= 1000) return value.toFixed(0);
	if (abs >= 100) return value.toFixed(0);
	if (abs >= 10) return value.toFixed(1);
	if (abs >= 1) return value.toFixed(2);
	if (abs === 0) return '0';
	return value.toPrecision(2);
}

function formatTimestamp(ts) {
	if (!ts) {
		return '';
	}

	const date = new Date(ts);

	if (Number.isNaN(date.getTime())) {
		return ts;
	}

	return date.toLocaleString();
}

function instance($$self, $$props, $$invalidate) {
	const COLORS = [
		'#800026',
		'#BD0026',
		'#E31A1C',
		'#FC4E2A',
		'#FD8D3C',
		'#FEB24C',
		'#FED976',
		'#FFEDA0'
	];

	const WIND_THRESHOLDS = [20, 15, 10, 7, 5, 3, 1];

	const MODES = [
		{
			id: 'region-qg',
			label: 'Region irradiance',
			type: 'region',
			metric: 'qg_mean',
			units: 'W/m^2',
			legend: 'qg'
		},
		{
			id: 'region-wind',
			label: 'Region wind speed (10 min avg)',
			type: 'region',
			metric: 'ff_mean',
			units: 'm/s (10 min avg)',
			legend: 'wind'
		},
		{
			id: 'stations-qg',
			label: 'Station irradiance',
			type: 'stations',
			metric: 'qg',
			units: 'W/m^2',
			legend: 'qg'
		},
		{
			id: 'stations-wind',
			label: 'Station wind speed (10 min avg)',
			type: 'stations',
			metric: 'ff',
			units: 'm/s (10 min avg)',
			legend: 'wind'
		}
	];

	let map$1 = null;
	let leafletLib = null;
	let regionLayer = null;
	let stationLayer = null;
	let refreshTimer = null;
	let mapPollTimer = null;
	let loading = false;
	let errorMessage = '';
	let lastUpdated = '';
	let legendStops = [];
	let legendUnits = '';
	let selectedMode = MODES[0].id;
	let regionData = null;
	let stationData = null;
	let metricStats = {};
	let stationFilter = '';
	let stationOptions = [];

	function getMode(id) {
		return MODES.find(mode => mode.id === id);
	}

	function ensureLeaflet() {
		if (!leafletLib && typeof window !== 'undefined') {
			leafletLib = window.L || null;
		}

		return leafletLib;
	}

	function ensureMapAvailable() {
		const current = map;

		if (!current) {
			return false;
		}

		map$1 = current;
		return typeof map$1.addLayer === 'function';
	}

	function recomputeStats(regions, stations) {
		metricStats = {};

		[regions, stations].forEach(geojson => {
			const features = Array.isArray(geojson?.features) ? geojson.features : [];

			for (const feature of features) {
				const props = feature?.properties;
				if (!props) continue;

				for (const [key, value] of Object.entries(props)) {
					if (typeof value === 'number' && Number.isFinite(value)) {
						const stats = metricStats[key] || { min: value, max: value };
						stats.min = Math.min(stats.min, value);
						stats.max = Math.max(stats.max, value);
						metricStats[key] = stats;
					}
				}
			}
		});
	}

	function getThresholds(mode, stats) {
		if (mode.legend === 'qg') {
			return [800, 600, 400, 200, 100, 50, 10];
		}

		if (mode.legend === 'wind') {
			return WIND_THRESHOLDS;
		}

		if (stats && Number.isFinite(stats.min) && Number.isFinite(stats.max)) {
			const steps = COLORS.length - 1;
			const span = stats.max - stats.min;
			if (span <= 0) return [];
			const items = [];

			for (let i = steps; i >= 1; i -= 1) {
				items.push(stats.min + span * i / steps);
			}

			return items;
		}

		return [];
	}

	function colorForValue(value, thresholds) {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			return '#7f7f7f';
		}

		if (!thresholds.length) {
			return COLORS[Math.floor(COLORS.length / 2)];
		}

		for (let i = 0; i < thresholds.length; i += 1) {
			if (value >= thresholds[i]) {
				return COLORS[i];
			}
		}

		return COLORS[COLORS.length - 1];
	}

	function buildLegend(thresholds, mode) {
		const items = [];

		for (let i = 0; i < COLORS.length; i += 1) {
			let label = '';

			if (!thresholds.length) {
				label = i === 0
				? 'Higher values'
				: i === COLORS.length - 1 ? 'Lower values' : '';
			} else if (i === 0) {
				label = `>= ${formatNumber(thresholds[0])}`;
			} else if (i === COLORS.length - 1) {
				label = `< ${formatNumber(thresholds[thresholds.length - 1])}`;
			} else {
				label = `${formatNumber(thresholds[i - 1])} - ${formatNumber(thresholds[i])}`;
			}

			if (label) {
				items.push({
					color: COLORS[i],
					label: mode.units ? `${label} ${mode.units}` : label
				});
			}
		}

		return items;
	}

	function clearRegionLayer() {
		if (regionLayer && ensureLeaflet()) {
			if (map$1 && typeof map$1.removeLayer === 'function') {
				map$1.removeLayer(regionLayer);
			}

			regionLayer = null;
		}
	}

	function clearStationLayer() {
		if (stationLayer && ensureLeaflet()) {
			if (map$1 && typeof map$1.removeLayer === 'function') {
				map$1.removeLayer(stationLayer);
			}

			stationLayer = null;
		}
	}

	function clearAllLayers() {
		clearRegionLayer();
		clearStationLayer();
	}

	function renderRegion(mode) {
		const L = ensureLeaflet();

		if (!L || !ensureMapAvailable() || !regionData) {
			return;
		}

		const stats = metricStats[mode.metric];

		if (!stats) {
			$$invalidate(1, errorMessage = 'Selected region metric is not available in the dataset.');
			clearAllLayers();
			$$invalidate(3, legendStops = []);
			return;
		}

		const thresholds = getThresholds(mode, stats);
		$$invalidate(4, legendUnits = mode.units);
		$$invalidate(3, legendStops = buildLegend(thresholds, mode));
		clearAllLayers();

		regionLayer = L.geoJSON(regionData, {
			style: feature => {
				const value = feature?.properties?.[mode.metric];

				return {
					fillColor: colorForValue(value, thresholds),
					fillOpacity: 0.6,
					weight: 1,
					color: '#333333'
				};
			},
			onEachFeature: (feature, layer) => {
				const props = feature?.properties || {};
				const lines = [];
				const name = props.name || 'Region';
				lines.push(`<strong>${name}</strong>`);
				const irradiance = props.qg_mean;

				if (Number.isFinite(irradiance)) {
					lines.push(`Irradiance: ${formatNumber(irradiance)} W/m^2`);
				}

				const wind = props.ff_mean;

				if (Number.isFinite(wind)) {
					lines.push(`Wind (10 min avg): ${formatNumber(wind)} m/s`);
				}

				if (Number.isFinite(props.estimated_output_mw)) {
					lines.push(`Estimated PV output: ${formatNumber(props.estimated_output_mw)} MW`);
				}

				const popupHtml = lines.join('<br>');
				layer.bindPopup(popupHtml);

				layer.bindTooltip(popupHtml, {
					permanent: true,
					direction: 'center',
					className: 'region-tooltip'
				});
			}
		}).addTo(map$1);
	}

	function renderStations(mode) {
		const L = ensureLeaflet();

		if (!L || !ensureMapAvailable() || !stationData) {
			return;
		}

		const stats = metricStats[mode.metric];

		if (!stats) {
			$$invalidate(1, errorMessage = 'Station dataset does not include the selected metric.');
			clearAllLayers();
			$$invalidate(3, legendStops = []);
			return;
		}

		const thresholds = getThresholds(mode, stats);
		$$invalidate(4, legendUnits = mode.units);
		$$invalidate(3, legendStops = buildLegend(thresholds, mode));
		clearAllLayers();
		stationLayer = L.layerGroup();

		const features = Array.isArray(stationData?.features)
		? stationData.features
		: [];

		const filter = stationFilter.trim().toLowerCase();

		for (const feature of features) {
			const props = feature?.properties || {};
			const coords = feature?.geometry?.coordinates;

			if (!Array.isArray(coords) || coords.length < 2) {
				continue;
			}

			const stationId = String(props.station ?? '');

			if (filter && !stationId.toLowerCase().includes(filter)) {
				continue;
			}

			const lat = coords[1];
			const lon = coords[0];
			const value = props[mode.metric];
			const color = colorForValue(value, thresholds);
			const radius = filter ? 8 : 6;

			const marker = L.circleMarker([lat, lon], {
				radius,
				color: '#1c1c1c',
				weight: 1,
				fillColor: color,
				fillOpacity: 0.85
			});

			const tooltip = [
				`<strong>Station ${stationId}</strong>`,
				`Irradiance: ${formatNumber(props.qg)} W/m^2`,
				`Wind (10 min avg): ${formatNumber(props.ff)} m/s`
			].join('<br>');

			marker.bindTooltip(tooltip, {
				permanent: true,
				direction: 'top',
				className: 'station-tooltip'
			});

			marker.addTo(stationLayer);
		}

		stationLayer.addTo(map$1);
	}

	function renderCurrentMode() {
		const mode = getMode(selectedMode);

		if (!mode) {
			return;
		}

		$$invalidate(1, errorMessage = '');

		if (mode.type === 'region') {
			renderRegion(mode);
		} else {
			renderStations(mode);
		}
	}

	async function refreshData() {
		$$invalidate(0, loading = true);
		$$invalidate(1, errorMessage = '');

		try {
			const [regionResp, stationResp] = await Promise.all([
				fetch(`${REGION_URL}?t=${Date.now()}`, { cache: 'no-store' }),
				fetch(`${STATION_URL}?t=${Date.now()}`, { cache: 'no-store' })
			]);

			if (!regionResp.ok) {
				throw new Error(`Failed to fetch region data (${regionResp.status})`);
			}

			if (!stationResp.ok) {
				throw new Error(`Failed to fetch station data (${stationResp.status})`);
			}

			regionData = await regionResp.json();
			stationData = await stationResp.json();
			recomputeStats(regionData, stationData);
			$$invalidate(7, stationOptions = Array.from(new Set((stationData?.features || []).map(feature => feature?.properties?.station).filter(code => code !== undefined && code !== null).map(code => String(code)))).sort((a, b) => a.localeCompare(b)));
			$$invalidate(2, lastUpdated = new Date().toISOString());
			renderCurrentMode();
		} catch(err) {
			console.error('Failed to refresh KNMI data', err);
			$$invalidate(1, errorMessage = err?.message || String(err));
			clearAllLayers();
			$$invalidate(3, legendStops = []);
		} finally {
			$$invalidate(0, loading = false);
		}
	}

	function handleModeClick(id) {
		if (selectedMode === id) {
			return;
		}

		$$invalidate(5, selectedMode = id);
		renderCurrentMode();
	}

	function handleStationFilter(event) {
		$$invalidate(6, stationFilter = event.currentTarget.value);

		if (getMode(selectedMode)?.type === 'stations') {
			renderCurrentMode();
		}
	}

	onMount(() => {
		ensureLeaflet();
		ensureMapAvailable();
		refreshData();
		refreshTimer = setInterval(refreshData, REFRESH_MS);

		mapPollTimer = setInterval(
			() => {
				if (!map$1 && ensureMapAvailable()) {
					renderCurrentMode();
				}
			},
			1000
		);
	});

	onDestroy(() => {
		if (refreshTimer) {
			clearInterval(refreshTimer);
			refreshTimer = null;
		}

		if (mapPollTimer) {
			clearInterval(mapPollTimer);
			mapPollTimer = null;
		}

		clearAllLayers();
	});

	const click_handler = mode => handleModeClick(mode.id);

	return [
		loading,
		errorMessage,
		lastUpdated,
		legendStops,
		legendUnits,
		selectedMode,
		stationFilter,
		stationOptions,
		MODES,
		getMode,
		handleModeClick,
		handleStationFilter,
		click_handler
	];
}

class Plugin extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {}, add_css, [-1, -1]);
	}
}


// transformCode: Export statement was modified
export { __pluginConfig, Plugin as default };
//# sourceMappingURL=plugin.js.map
