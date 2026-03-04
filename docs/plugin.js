const __pluginConfig =  {
  "name": "windy-plugin-knmi-qg-regions",
  "version": "3.6.0",
  "icon": "☀",
  "title": "KNMI Solar Radiation",
  "description": "Overlay KNMI 10 minute irradiance and wind metrics for Dutch regions and stations.",
  "author": "Artis Byte",
  "repository": "https://github.com/artis-byte/NL-solar",
  "desktopUI": "rhpane",
  "mobileUI": "fullscreen",
  "routerPath": "/knmi-solar",
  "private": false,
  "built": 1772609356846,
  "builtReadable": "2026-03-04T07:29:16.846Z",
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

/** @returns {number} */
function to_number(value) {
	return value === '' ? null : +value;
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

/* src/plugin.svelte generated by Svelte v4.2.20 */

function add_css(target) {
	append_styles(target, "svelte-7fls9h", "section.svelte-7fls9h.svelte-7fls9h{padding:0.75em;font-family:system-ui, sans-serif;color:#222}h1.svelte-7fls9h.svelte-7fls9h{font-size:1.1em;margin:0 0 0.5em}.status.svelte-7fls9h.svelte-7fls9h{margin:0.5em 0;font-size:0.95em}.error.svelte-7fls9h.svelte-7fls9h{color:#b00020}.controls.svelte-7fls9h.svelte-7fls9h{display:flex;flex-direction:column;gap:0.5em;margin-bottom:0.75em}.control-row.svelte-7fls9h.svelte-7fls9h{display:flex;align-items:center;gap:0.5em;flex-wrap:wrap}.control-row.svelte-7fls9h label.svelte-7fls9h{font-weight:600;font-size:0.85em}.toggle.svelte-7fls9h.svelte-7fls9h{display:inline-flex;gap:0.35em}.toggle.svelte-7fls9h button.svelte-7fls9h{padding:0.25em 0.6em;border:1px solid #888;border-radius:4px;background:#f7f7f7;cursor:pointer;font-size:0.85em}.toggle.svelte-7fls9h button.selected.svelte-7fls9h{background:#1f78b4;color:#fff;border-color:#1f78b4}select.svelte-7fls9h.svelte-7fls9h{padding:0.25em 0.4em;font-size:0.85em}.timeline.svelte-7fls9h.svelte-7fls9h{margin-top:0.5em}.timeline.svelte-7fls9h input[type='range'].svelte-7fls9h{width:100%}.timestamp.svelte-7fls9h.svelte-7fls9h{display:flex;justify-content:space-between;font-size:0.8em;font-weight:600;margin-top:0.2em}.hint.svelte-7fls9h.svelte-7fls9h{font-size:0.75em;color:#555;margin-top:0.35em}");
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[56] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[56] = list[i];
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[56] = list[i];
	return child_ctx;
}

// (723:2) {:else}
function create_else_block(ctx) {
	let div5;
	let div1;
	let label0;
	let t1;
	let div0;
	let t2;
	let div3;
	let label1;
	let t4;
	let div2;
	let t5;
	let div4;
	let label2;
	let t7;
	let select;
	let t8;
	let span0;
	let t9;

	let t10_value = (/*previousTimeISO*/ ctx[9]
	? /*formatShortTime*/ ctx[14](/*previousTimeISO*/ ctx[9])
	: 'n/a') + "";

	let t10;
	let t11;
	let div7;
	let input;
	let input_max_value;
	let t12;
	let div6;
	let span1;
	let t13_value = /*formatLongTime*/ ctx[13](/*currentTimeISO*/ ctx[6]) + "";
	let t13;
	let t14;
	let span2;
	let t15_value = /*timeline*/ ctx[1].length + "";
	let t15;
	let t16;
	let t17;
	let p;
	let t18;
	let t19;
	let t20;
	let mounted;
	let dispose;
	let each_value_2 = ensure_array_like(/*VIEW_OPTIONS*/ ctx[11]);
	let each_blocks_2 = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	let each_value_1 = ensure_array_like(/*METRIC_OPTIONS*/ ctx[12]);
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	let each_value = ensure_array_like(/*DELTA_OPTIONS*/ ctx[10]);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			div5 = element("div");
			div1 = element("div");
			label0 = element("label");
			label0.textContent = "View";
			t1 = space();
			div0 = element("div");

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].c();
			}

			t2 = space();
			div3 = element("div");
			label1 = element("label");
			label1.textContent = "Metric";
			t4 = space();
			div2 = element("div");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t5 = space();
			div4 = element("div");
			label2 = element("label");
			label2.textContent = "Change window";
			t7 = space();
			select = element("select");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t8 = space();
			span0 = element("span");
			t9 = text("Comparing to ");
			t10 = text(t10_value);
			t11 = space();
			div7 = element("div");
			input = element("input");
			t12 = space();
			div6 = element("div");
			span1 = element("span");
			t13 = text(t13_value);
			t14 = space();
			span2 = element("span");
			t15 = text(t15_value);
			t16 = text(" obs");
			t17 = space();
			p = element("p");
			t18 = text("Drag the slider to explore the last ");
			t19 = text(/*timespanMinutes*/ ctx[8]);
			t20 = text(" minutes of KNMI observations.");
			attr(label0, "class", "svelte-7fls9h");
			attr(div0, "class", "toggle svelte-7fls9h");
			attr(div1, "class", "control-row svelte-7fls9h");
			attr(label1, "class", "svelte-7fls9h");
			attr(div2, "class", "toggle svelte-7fls9h");
			attr(div3, "class", "control-row svelte-7fls9h");
			attr(label2, "class", "svelte-7fls9h");
			attr(select, "class", "svelte-7fls9h");
			attr(span0, "class", "hint svelte-7fls9h");
			attr(div4, "class", "control-row svelte-7fls9h");
			attr(div5, "class", "controls svelte-7fls9h");
			attr(input, "type", "range");
			attr(input, "min", "0");
			attr(input, "max", input_max_value = Math.max(0, /*timeline*/ ctx[1].length - 1));
			attr(input, "class", "svelte-7fls9h");
			attr(div6, "class", "timestamp svelte-7fls9h");
			attr(div7, "class", "timeline svelte-7fls9h");
			attr(p, "class", "hint svelte-7fls9h");
		},
		m(target, anchor) {
			insert(target, div5, anchor);
			append(div5, div1);
			append(div1, label0);
			append(div1, t1);
			append(div1, div0);

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				if (each_blocks_2[i]) {
					each_blocks_2[i].m(div0, null);
				}
			}

			append(div5, t2);
			append(div5, div3);
			append(div3, label1);
			append(div3, t4);
			append(div3, div2);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				if (each_blocks_1[i]) {
					each_blocks_1[i].m(div2, null);
				}
			}

			append(div5, t5);
			append(div5, div4);
			append(div4, label2);
			append(div4, t7);
			append(div4, select);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(select, null);
				}
			}

			append(div4, t8);
			append(div4, span0);
			append(span0, t9);
			append(span0, t10);
			insert(target, t11, anchor);
			insert(target, div7, anchor);
			append(div7, input);
			set_input_value(input, /*currentIndex*/ ctx[2]);
			append(div7, t12);
			append(div7, div6);
			append(div6, span1);
			append(span1, t13);
			append(div6, t14);
			append(div6, span2);
			append(span2, t15);
			append(span2, t16);
			insert(target, t17, anchor);
			insert(target, p, anchor);
			append(p, t18);
			append(p, t19);
			append(p, t20);

			if (!mounted) {
				dispose = [
					listen(select, "change", /*change_handler*/ ctx[18]),
					listen(input, "change", /*input_change_input_handler*/ ctx[19]),
					listen(input, "input", /*input_change_input_handler*/ ctx[19])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*selectedView, VIEW_OPTIONS*/ 2056) {
				each_value_2 = ensure_array_like(/*VIEW_OPTIONS*/ ctx[11]);
				let i;

				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks_2[i]) {
						each_blocks_2[i].p(child_ctx, dirty);
					} else {
						each_blocks_2[i] = create_each_block_2(child_ctx);
						each_blocks_2[i].c();
						each_blocks_2[i].m(div0, null);
					}
				}

				for (; i < each_blocks_2.length; i += 1) {
					each_blocks_2[i].d(1);
				}

				each_blocks_2.length = each_value_2.length;
			}

			if (dirty[0] & /*selectedMetric, METRIC_OPTIONS*/ 4112) {
				each_value_1 = ensure_array_like(/*METRIC_OPTIONS*/ ctx[12]);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(div2, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (dirty[0] & /*DELTA_OPTIONS, selectedDelta*/ 1056) {
				each_value = ensure_array_like(/*DELTA_OPTIONS*/ ctx[10]);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(select, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty[0] & /*previousTimeISO*/ 512 && t10_value !== (t10_value = (/*previousTimeISO*/ ctx[9]
			? /*formatShortTime*/ ctx[14](/*previousTimeISO*/ ctx[9])
			: 'n/a') + "")) set_data(t10, t10_value);

			if (dirty[0] & /*timeline*/ 2 && input_max_value !== (input_max_value = Math.max(0, /*timeline*/ ctx[1].length - 1))) {
				attr(input, "max", input_max_value);
			}

			if (dirty[0] & /*currentIndex*/ 4) {
				set_input_value(input, /*currentIndex*/ ctx[2]);
			}

			if (dirty[0] & /*currentTimeISO*/ 64 && t13_value !== (t13_value = /*formatLongTime*/ ctx[13](/*currentTimeISO*/ ctx[6]) + "")) set_data(t13, t13_value);
			if (dirty[0] & /*timeline*/ 2 && t15_value !== (t15_value = /*timeline*/ ctx[1].length + "")) set_data(t15, t15_value);
			if (dirty[0] & /*timespanMinutes*/ 256) set_data(t19, /*timespanMinutes*/ ctx[8]);
		},
		d(detaching) {
			if (detaching) {
				detach(div5);
				detach(t11);
				detach(div7);
				detach(t17);
				detach(p);
			}

			destroy_each(each_blocks_2, detaching);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (721:29) 
function create_if_block_2(ctx) {
	let p;

	return {
		c() {
			p = element("p");
			p.textContent = "No historical points available.";
			attr(p, "class", "status svelte-7fls9h");
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

// (719:25) 
function create_if_block_1(ctx) {
	let p;
	let t;

	return {
		c() {
			p = element("p");
			t = text(/*errorMessage*/ ctx[7]);
			attr(p, "class", "status error svelte-7fls9h");
		},
		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*errorMessage*/ 128) set_data(t, /*errorMessage*/ ctx[7]);
		},
		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (717:2) {#if loading}
function create_if_block(ctx) {
	let p;

	return {
		c() {
			p = element("p");
			p.textContent = "Loading observations...";
			attr(p, "class", "status svelte-7fls9h");
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

// (728:10) {#each VIEW_OPTIONS as option}
function create_each_block_2(ctx) {
	let button;
	let mounted;
	let dispose;

	function click_handler() {
		return /*click_handler*/ ctx[16](/*option*/ ctx[56]);
	}

	return {
		c() {
			button = element("button");
			button.textContent = `${/*option*/ ctx[56].label} `;
			attr(button, "class", "svelte-7fls9h");
			toggle_class(button, "selected", /*selectedView*/ ctx[3] === /*option*/ ctx[56].value);
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

			if (dirty[0] & /*selectedView, VIEW_OPTIONS*/ 2056) {
				toggle_class(button, "selected", /*selectedView*/ ctx[3] === /*option*/ ctx[56].value);
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

// (741:10) {#each METRIC_OPTIONS as option}
function create_each_block_1(ctx) {
	let button;
	let mounted;
	let dispose;

	function click_handler_1() {
		return /*click_handler_1*/ ctx[17](/*option*/ ctx[56]);
	}

	return {
		c() {
			button = element("button");
			button.textContent = `${/*option*/ ctx[56].label} `;
			attr(button, "class", "svelte-7fls9h");
			toggle_class(button, "selected", /*selectedMetric*/ ctx[4] === /*option*/ ctx[56].value);
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (!mounted) {
				dispose = listen(button, "click", click_handler_1);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty[0] & /*selectedMetric, METRIC_OPTIONS*/ 4112) {
				toggle_class(button, "selected", /*selectedMetric*/ ctx[4] === /*option*/ ctx[56].value);
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

// (754:10) {#each DELTA_OPTIONS as option}
function create_each_block(ctx) {
	let option_1;
	let t0_value = /*option*/ ctx[56] + "";
	let t0;
	let t1;
	let option_1_selected_value;

	return {
		c() {
			option_1 = element("option");
			t0 = text(t0_value);
			t1 = text(" minutes\n            ");
			option_1.__value = /*option*/ ctx[56];
			set_input_value(option_1, option_1.__value);
			option_1.selected = option_1_selected_value = /*option*/ ctx[56] === /*selectedDelta*/ ctx[5];
		},
		m(target, anchor) {
			insert(target, option_1, anchor);
			append(option_1, t0);
			append(option_1, t1);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*selectedDelta*/ 32 && option_1_selected_value !== (option_1_selected_value = /*option*/ ctx[56] === /*selectedDelta*/ ctx[5])) {
				option_1.selected = option_1_selected_value;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(option_1);
			}
		}
	};
}

function create_fragment(ctx) {
	let section;
	let h1;
	let t1;

	function select_block_type(ctx, dirty) {
		if (/*loading*/ ctx[0]) return create_if_block;
		if (/*errorMessage*/ ctx[7]) return create_if_block_1;
		if (!/*timeline*/ ctx[1].length) return create_if_block_2;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			section = element("section");
			h1 = element("h1");
			h1.textContent = "KNMI Wind & Radiation Timeline";
			t1 = space();
			if_block.c();
			attr(h1, "class", "svelte-7fls9h");
			attr(section, "class", "svelte-7fls9h");
		},
		m(target, anchor) {
			insert(target, section, anchor);
			append(section, h1);
			append(section, t1);
			if_block.m(section, null);
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(section, null);
				}
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) {
				detach(section);
			}

			if_block.d();
		}
	};
}

const REGION_HISTORY_URL = 'https://raw.githubusercontent.com/artis-byte/NL-solar/main/qg_regions_history.geojson';
const STATION_HISTORY_URL = 'https://raw.githubusercontent.com/artis-byte/NL-solar/main/knmi_station_data/station_metrics_history.geojson';
const REFRESH_INTERVAL = 120_000;
const DELTA_TOLERANCE_MINUTES = 5;
const NO_VALUE = '--';

function instance($$self, $$props, $$invalidate) {
	let currentTimeISO;
	let previousTimeISO;
	let timespanMinutes;
	const DELTA_OPTIONS = [10, 30, 60];

	const VIEW_OPTIONS = [
		{ value: 'regions', label: 'Regions' },
		{ value: 'stations', label: 'Stations' }
	];

	const METRIC_OPTIONS = [
		{
			value: 'radiation',
			label: 'Radiation (W/m^2)'
		},
		{ value: 'wind', label: 'Wind Speed (m/s)' }
	];

	const REGION_HISTORY_COLUMNS = [
		{
			key: 'qg_mean',
			label: 'Radiation (W/m^2)',
			decimals: 0,
			suffix: ' W/m^2',
			includeDelta: true
		},
		{
			key: 'wind_speed_mean',
			label: 'Wind (m/s)',
			decimals: 1,
			suffix: ' m/s',
			includeDelta: true
		},
		{
			key: 'wind_direction_mean',
			label: 'Direction (deg)',
			decimals: 0,
			suffix: ' deg',
			includeDelta: false
		}
	];

	const STATION_HISTORY_COLUMNS = [
		{
			key: 'qg',
			label: 'Radiation (W/m^2)',
			decimals: 0,
			suffix: ' W/m^2',
			includeDelta: true
		},
		{
			key: 'ff',
			label: 'Wind (m/s)',
			decimals: 1,
			suffix: ' m/s',
			includeDelta: true
		},
		{
			key: 'dd',
			label: 'Direction (deg)',
			decimals: 0,
			suffix: ' deg',
			includeDelta: false
		}
	];

	let loading = true;
	let errorMessage = '';
	let refreshTimer = null;
	let mapPollTimer = null;
	let mapInstance = null;
	let leafletLib = null;
	let regionLayer = null;
	let stationLayer = null;
	let timeline = [];
	let timelineDates = [];
	let timelineIndex = new Map();
	let currentIndex = 0;
	let selectedView = 'regions';
	let selectedMetric = 'radiation';
	let selectedDelta = DELTA_OPTIONS[0];
	let regionsIndex = new Map();
	let stationsIndex = new Map();

	const getLeaflet = () => {
		if (!leafletLib && typeof window !== 'undefined') {
			leafletLib = window.L || null;
		}

		return leafletLib;
	};

	const ensureMap = () => {
		if (mapInstance) {
			return true;
		}

		const candidate = map;

		if (!candidate) {
			return false;
		}

		mapInstance = candidate;
		return typeof mapInstance.addLayer === 'function';
	};

	const scheduleMapPoll = () => {
		if (mapPollTimer) {
			return;
		}

		mapPollTimer = setInterval(
			() => {
				if (ensureMap()) {
					clearInterval(mapPollTimer);
					mapPollTimer = null;
					updateMap();
				}
			},
			500
		);
	};

	const fetchJSON = async url => {
		const response = await fetch(`${url}?t=${Date.now()}`);

		if (!response.ok) {
			throw new Error(`Failed to fetch ${url}: ${response.status}`);
		}

		return response.json();
	};

	const getRadiationColor = value => {
		if (value == null) return '#f7f7f7';

		return value > 800
		? '#800026'
		: value > 600
			? '#BD0026'
			: value > 400
				? '#E31A1C'
				: value > 200
					? '#FC4E2A'
					: value > 100
						? '#FD8D3C'
						: value > 50
							? '#FEB24C'
							: value > 10 ? '#FED976' : '#FFEDA0';
	};

	const getWindColor = value => {
		if (value == null) return '#f7fbff';

		return value > 20
		? '#084081'
		: value > 15
			? '#0868ac'
			: value > 12
				? '#2b8cbe'
				: value > 9
					? '#4eb3d3'
					: value > 6
						? '#7bccc4'
						: value > 4
							? '#a8ddb5'
							: value > 2
								? '#ccebc5'
								: value > 1 ? '#e0f3db' : '#f7fcfd';
	};

	const formatNumber = (value, decimals = 1, suffix = '') => {
		if (value == null || Number.isNaN(value)) return NO_VALUE;
		return `${Number(value).toFixed(decimals)}${suffix}`;
	};

	const formatSignedNumber = (value, decimals = 1, suffix = '') => {
		if (value == null || Number.isNaN(value)) return NO_VALUE;
		const sign = value > 0 ? '+' : value < 0 ? '-' : '';
		return `${sign}${Math.abs(Number(value)).toFixed(decimals)}${suffix}`;
	};

	const formatLongTime = iso => iso
	? new Date(iso).toLocaleString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			day: '2-digit',
			month: 'short'
		})
	: NO_VALUE;

	const formatShortTime = iso => iso
	? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
	: NO_VALUE;

	const getRecentHistoryEntries = (historyMap, limit = 5) => {
		if (!historyMap || !historyMap.size) return [];
		const entries = Array.from(historyMap.values());
		return entries.slice(-limit).reverse();
	};

	const getTrend = (currentValue, previousValue) => {
		if (currentValue == null || previousValue == null) return null;
		const current = Number(currentValue);
		const previous = Number(previousValue);
		if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
		return current - previous;
	};

	const formatDeltaValue = (currentValue, previousValue, decimals = 1, suffix = '') => {
		const trend = getTrend(currentValue, previousValue);
		if (trend == null) return NO_VALUE;
		return formatSignedNumber(trend, decimals, suffix);
	};

	const renderHistoryTable = (historyMap, columns, limit = 5) => {
		const entries = getRecentHistoryEntries(historyMap, limit);
		if (!entries.length) return '';

		const header = columns.map(column => {
			const deltaLabel = column.includeDelta
			? `<th>${column.deltaLabel || '&Delta;'}</th>`
			: '';

			return `<th>${column.label}</th>${deltaLabel}`;
		}).join('');

		const rows = entries.map((entry, index) => {
			const cells = columns.map(column => formatNumber(entry?.[column.key], column.decimals ?? 1, column.suffix ?? ''));
			const previous = entries[index + 1] || null;
			let cellHtml = '';

			columns.forEach((column, idx) => {
				cellHtml += `<td>${cells[idx]}</td>`;

				if (column.includeDelta) {
					const delta = previous
					? formatDeltaValue(entry?.[column.key], previous?.[column.key], column.deltaDecimals ?? column.decimals ?? 1, column.suffix ?? '')
					: NO_VALUE;

					cellHtml += `<td>${delta}</td>`;
				}
			});

			return `<tr><td>${formatLongTime(entry?.observation_time)}</td>${cellHtml}</tr>`;
		}).join('');

		return `
      <div class="history-block">
        <h4>Last ${entries.length} observations</h4>
        <table class="history-table">
          <thead>
            <tr>
              <th>Observed</th>${header}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
	};

	const buildRegionTooltip = (name, entry, historyMap) => {
		const historyEntries = getRecentHistoryEntries(historyMap, 2);
		const previous = historyEntries.length > 1 ? historyEntries[1] : null;
		const radTrend = getTrend(entry?.qg_mean, previous?.qg_mean);
		const windTrend = getTrend(entry?.wind_speed_mean, previous?.wind_speed_mean);

		const radDelta = radTrend == null
		? NO_VALUE
		: formatSignedNumber(radTrend, 0, ' W/m^2');

		const windDelta = windTrend == null
		? NO_VALUE
		: formatSignedNumber(windTrend, 1, ' m/s');

		const radTrendClass = radTrend == null
		? ''
		: radTrend > 0
			? 'delta-positive'
			: radTrend < 0 ? 'delta-negative' : 'delta-neutral';

		const windTrendClass = windTrend == null
		? ''
		: windTrend > 0
			? 'delta-positive'
			: windTrend < 0 ? 'delta-negative' : 'delta-neutral';

		const previousStamp = (previous?.observation_time)
		? ` vs ${formatShortTime(previous.observation_time)}`
		: '';

		return `
      <div class="map-tooltip">
        <div class="map-tooltip-title">${name || 'Region'}</div>
        <div>Rad: ${formatNumber(entry?.qg_mean, 0, ' W/m^2')} <span class="delta ${radTrendClass}">${radDelta}</span></div>
        <div>Wind: ${formatNumber(entry?.wind_speed_mean, 1, ' m/s')} <span class="delta ${windTrendClass}">${windDelta}</span></div>
        <div class="map-tooltip-time">${formatShortTime(entry?.observation_time)}${previousStamp}</div>
      </div>
    `;
	};

	const buildStationTooltip = (stationId, entry, historyMap) => {
		const historyEntries = getRecentHistoryEntries(historyMap, 2);
		const previous = historyEntries.length > 1 ? historyEntries[1] : null;
		const radTrend = getTrend(entry?.qg, previous?.qg);
		const windTrend = getTrend(entry?.ff, previous?.ff);

		const radDelta = radTrend == null
		? NO_VALUE
		: formatSignedNumber(radTrend, 0, ' W/m^2');

		const windDelta = windTrend == null
		? NO_VALUE
		: formatSignedNumber(windTrend, 1, ' m/s');

		const radTrendClass = radTrend == null
		? ''
		: radTrend > 0
			? 'delta-positive'
			: radTrend < 0 ? 'delta-negative' : 'delta-neutral';

		const windTrendClass = windTrend == null
		? ''
		: windTrend > 0
			? 'delta-positive'
			: windTrend < 0 ? 'delta-negative' : 'delta-neutral';

		const previousStamp = (previous?.observation_time)
		? ` vs ${formatShortTime(previous.observation_time)}`
		: '';

		return `
      <div class="map-tooltip">
        <div class="map-tooltip-title">Station ${stationId}</div>
        <div>Rad: ${formatNumber(entry?.qg, 0, ' W/m^2')} <span class="delta ${radTrendClass}">${radDelta}</span></div>
        <div>Wind: ${formatNumber(entry?.ff, 1, ' m/s')} <span class="delta ${windTrendClass}">${windDelta}</span></div>
        <div class="map-tooltip-time">${formatShortTime(entry?.observation_time)}${previousStamp}</div>
      </div>
    `;
	};

	const prepareIndex = (collection, keyProp) => {
		const index = new Map();

		if (!collection?.features) {
			return index;
		}

		for (const feature of collection.features) {
			const key = feature?.properties?.[keyProp];
			if (!key) continue;
			const history = new Map();
			const entries = feature.properties.history || [];

			for (const entry of entries) {
				if (entry?.observation_time) {
					history.set(entry.observation_time, entry);
				}
			}

			index.set(key, {
				geometry: feature.geometry
				? JSON.parse(JSON.stringify(feature.geometry))
				: null,
				history
			});
		}

		return index;
	};

	const buildTimeline = () => {
		const times = new Set();
		regionsIndex.forEach(({ history }) => history.forEach((_, t) => times.add(t)));
		stationsIndex.forEach(({ history }) => history.forEach((_, t) => times.add(t)));
		const sorted = Array.from(times).sort((a, b) => new Date(a) - new Date(b));
		$$invalidate(1, timeline = sorted);
		$$invalidate(15, timelineDates = timeline.map(t => new Date(t)));
		timelineIndex = new Map(timeline.map((t, idx) => [t, idx]));
		$$invalidate(2, currentIndex = timeline.length ? timeline.length - 1 : 0);
	};

	const findPreviousTime = (currentTime, minutes) => {
		if (!currentTime || !timelineIndex.has(currentTime)) return null;
		const currentIdx = timelineIndex.get(currentTime);
		const currentDate = timelineDates[currentIdx];

		for (let i = currentIdx - 1; i >= 0; i -= 1) {
			const diffMins = (currentDate - timelineDates[i]) / 60000;

			if (diffMins >= minutes - 0.01) {
				return timeline[i];
			}
		}

		return null;
	};

	const computeDelta = (historyMap, currentTime, metricKey, minutes) => {
		if (!historyMap || !currentTime) return null;
		const previousTime = findPreviousTime(currentTime, minutes);
		if (!previousTime) return null;
		const current = historyMap.get(currentTime);
		const previous = historyMap.get(previousTime);
		if (!current || !previous) return null;
		const currentDate = new Date(currentTime);
		const previousDate = new Date(previousTime);
		const gapMinutes = Math.abs((currentDate - previousDate) / 60000);

		if (gapMinutes > minutes + DELTA_TOLERANCE_MINUTES) {
			return null;
		}

		const currentValue = current[metricKey];
		const previousValue = previous[metricKey];
		if (currentValue == null || previousValue == null) return null;

		return {
			delta: currentValue - previousValue,
			previousTime,
			previousValue
		};
	};

	const buildRegionPopup = (name, entry, historyMap, currentTime) => {
		const deltaMinutes = selectedDelta;
		const radiationDelta = computeDelta(historyMap, currentTime, 'qg_mean', deltaMinutes);
		const windDelta = computeDelta(historyMap, currentTime, 'wind_speed_mean', deltaMinutes);

		const radiationChange = radiationDelta
		? `${formatSignedNumber(radiationDelta.delta, 0, ' W/m^2')}${radiationDelta.previousTime
			? ' (vs ' + formatShortTime(radiationDelta.previousTime) + ')'
			: ''}`
		: NO_VALUE;

		const windChange = windDelta
		? `${formatSignedNumber(windDelta.delta, 1, ' m/s')}${windDelta.previousTime
			? ' (vs ' + formatShortTime(windDelta.previousTime) + ')'
			: ''}`
		: NO_VALUE;

		const historyTable = renderHistoryTable(historyMap, REGION_HISTORY_COLUMNS);

		const stationsLine = entry?.stations_count != null
		? `<p>Stations contributing: ${entry.stations_count}</p>`
		: '';

		const outputLine = entry?.estimated_output_mw != null
		? `<p>Est. PV output: ${formatNumber(entry.estimated_output_mw, 1, ' MW')}</p>`
		: '';

		return `
      <div class="popup">
        <h3>${name}</h3>
        <p><strong>Radiation</strong>: ${formatNumber(entry?.qg_mean, 0, ' W/m^2')}<br>
           &#916;${deltaMinutes} min: ${radiationChange}</p>
        <p><strong>Wind</strong>: ${formatNumber(entry?.wind_speed_mean, 1, ' m/s')} @ ${formatNumber(entry?.wind_direction_mean, 0, ' deg')}<br>
           &#916;${deltaMinutes} min: ${windChange}</p>
        ${stationsLine}
        ${outputLine}
        ${historyTable}
      </div>
    `;
	};

	const buildStationPopup = (stationId, entry, historyMap, currentTime) => {
		const deltaMinutes = selectedDelta;
		const radiationDelta = computeDelta(historyMap, currentTime, 'qg', deltaMinutes);
		const windDelta = computeDelta(historyMap, currentTime, 'ff', deltaMinutes);

		const radiationChange = radiationDelta
		? `${formatSignedNumber(radiationDelta.delta, 0, ' W/m^2')}${radiationDelta.previousTime
			? ' (vs ' + formatShortTime(radiationDelta.previousTime) + ')'
			: ''}`
		: NO_VALUE;

		const windChange = windDelta
		? `${formatSignedNumber(windDelta.delta, 1, ' m/s')}${windDelta.previousTime
			? ' (vs ' + formatShortTime(windDelta.previousTime) + ')'
			: ''}`
		: NO_VALUE;

		const historyTable = renderHistoryTable(historyMap, STATION_HISTORY_COLUMNS);

		const sourceLine = (entry?.source_filename)
		? `<p>Source: ${entry.source_filename}</p>`
		: '';

		return `
      <div class="popup">
        <h3>Station ${stationId}</h3>
        <p><strong>Radiation</strong>: ${formatNumber(entry?.qg, 0, ' W/m^2')}<br>
           &#916;${deltaMinutes} min: ${radiationChange}</p>
        <p><strong>Wind</strong>: ${formatNumber(entry?.ff, 1, ' m/s')} @ ${formatNumber(entry?.dd, 0, ' deg')}<br>
           &#916;${deltaMinutes} min: ${windChange}</p>
        ${sourceLine}
        ${historyTable}
      </div>
    `;
	};

	const clearLayer = layerRef => {
		if (!layerRef || !ensureMap()) {
			return null;
		}

		if (mapInstance.hasLayer(layerRef)) {
			mapInstance.removeLayer(layerRef);
		}

		return null;
	};

	const drawRegionLayer = currentTime => {
		if (!ensureMap() || !currentTime) {
			scheduleMapPoll();
			return;
		}

		const L = getLeaflet();
		if (!L) return;
		const features = [];

		regionsIndex.forEach(({ geometry, history }, name) => {
			const entry = history.get(currentTime);
			if (!entry || !geometry) return;

			features.push({
				type: 'Feature',
				geometry,
				properties: { name, ...entry },
				history
			});
		});

		if (!features.length) {
			regionLayer = clearLayer(regionLayer);
			return;
		}

		const collection = { type: 'FeatureCollection', features };
		regionLayer = clearLayer(regionLayer);

		regionLayer = L.geoJSON(collection, {
			style: feature => {
				const entry = feature.properties;

				const value = selectedMetric === 'wind'
				? entry?.wind_speed_mean
				: entry?.qg_mean;

				const color = selectedMetric === 'wind'
				? getWindColor(value)
				: getRadiationColor(value);

				return {
					fillColor: color,
					fillOpacity: 0.65,
					weight: 1,
					color: '#333'
				};
			},
			onEachFeature: (feature, layer) => {
				layer.bindPopup(buildRegionPopup(feature.properties?.name, feature.properties, feature.history, currentTime));

				layer.bindTooltip(buildRegionTooltip(feature.properties?.name, feature.properties, feature.history), {
					permanent: true,
					direction: 'center',
					className: 'region-label',
					sticky: false
				});
			}
		}).addTo(mapInstance);
	};

	const drawStationLayer = currentTime => {
		if (!ensureMap() || !currentTime) {
			scheduleMapPoll();
			return;
		}

		const L = getLeaflet();
		if (!L) return;
		stationLayer = clearLayer(stationLayer);
		stationLayer = L.layerGroup().addTo(mapInstance);

		stationsIndex.forEach(({ geometry, history }, stationId) => {
			if (!geometry || geometry.type !== 'Point') return;
			const entry = history.get(currentTime);
			if (!entry) return;
			const [lon, lat] = geometry.coordinates;
			const value = selectedMetric === 'wind' ? entry.ff : entry.qg;

			const color = selectedMetric === 'wind'
			? getWindColor(value)
			: getRadiationColor(value);

			const marker = L.circleMarker([lat, lon], {
				radius: 5,
				color,
				fillColor: color,
				fillOpacity: 0.9,
				weight: 1
			});

			marker.bindPopup(buildStationPopup(stationId, entry, history, currentTime));

			marker.bindTooltip(buildStationTooltip(stationId, entry, history), {
				permanent: true,
				direction: 'top',
				className: 'station-label',
				offset: [0, -8]
			});

			marker.addTo(stationLayer);
		});
	};

	const updateMap = () => {
		if (loading || !timeline.length) {
			return;
		}

		if (!ensureMap()) {
			scheduleMapPoll();
			return;
		}

		const currentTime = timeline[currentIndex];

		if (!currentTime) {
			return;
		}

		if (selectedView === 'regions') {
			stationLayer = clearLayer(stationLayer);
			drawRegionLayer(currentTime);
		} else {
			regionLayer = clearLayer(regionLayer);
			drawStationLayer(currentTime);
		}
	};

	const loadData = async () => {
		$$invalidate(0, loading = true);
		$$invalidate(7, errorMessage = '');

		try {
			const [regions, stations] = await Promise.all([fetchJSON(REGION_HISTORY_URL), fetchJSON(STATION_HISTORY_URL)]);
			regionsIndex = prepareIndex(regions, 'name');
			stationsIndex = prepareIndex(stations, 'station');
			buildTimeline();
		} catch(err) {
			console.error(err);
			$$invalidate(7, errorMessage = err?.message || 'Failed to load KNMI history.');
		} finally {
			$$invalidate(0, loading = false);
			updateMap();
		}
	};

	onMount(() => {
		loadData();
		refreshTimer = setInterval(loadData, REFRESH_INTERVAL);

		if (!ensureMap()) {
			scheduleMapPoll();
		}
	});

	onDestroy(() => {
		if (refreshTimer) clearInterval(refreshTimer);
		if (mapPollTimer) clearInterval(mapPollTimer);
		regionLayer = clearLayer(regionLayer);
		stationLayer = clearLayer(stationLayer);
	});

	const click_handler = option => {
		$$invalidate(3, selectedView = option.value);
	};

	const click_handler_1 = option => {
		$$invalidate(4, selectedMetric = option.value);
	};

	const change_handler = event => {
		$$invalidate(5, selectedDelta = Number(event.target.value));
	};

	function input_change_input_handler() {
		currentIndex = to_number(this.value);
		$$invalidate(2, currentIndex);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*loading, timeline, selectedView, selectedMetric, selectedDelta, currentIndex*/ 63) {
			{
				if (!loading && timeline.length) {
					timeline[currentIndex];
					updateMap();
				}
			}
		}

		if ($$self.$$.dirty[0] & /*timeline, currentIndex*/ 6) {
			$$invalidate(6, currentTimeISO = timeline.length ? timeline[currentIndex] : null);
		}

		if ($$self.$$.dirty[0] & /*currentTimeISO, selectedDelta*/ 96) {
			$$invalidate(9, previousTimeISO = currentTimeISO
			? findPreviousTime(currentTimeISO, selectedDelta)
			: null);
		}

		if ($$self.$$.dirty[0] & /*timelineDates, timeline*/ 32770) {
			$$invalidate(8, timespanMinutes = timelineDates.length >= 2
			? Math.round((timelineDates[timelineDates.length - 1] - timelineDates[0]) / 60000)
			: timeline.length ? 10 : 0);
		}
	};

	return [
		loading,
		timeline,
		currentIndex,
		selectedView,
		selectedMetric,
		selectedDelta,
		currentTimeISO,
		errorMessage,
		timespanMinutes,
		previousTimeISO,
		DELTA_OPTIONS,
		VIEW_OPTIONS,
		METRIC_OPTIONS,
		formatLongTime,
		formatShortTime,
		timelineDates,
		click_handler,
		click_handler_1,
		change_handler,
		input_change_input_handler
	];
}

class Plugin extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {}, add_css, [-1, -1, -1]);
	}
}


// transformCode: Export statement was modified
export { __pluginConfig, Plugin as default };
//# sourceMappingURL=plugin.js.map
