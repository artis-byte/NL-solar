const __pluginConfig =  {
  "name": "windy-plugin-knmi-qg-regions",
  "version": "3.10.0",
  "icon": "☀",
  "title": "KNMI Solar Radiation",
  "description": "Overlay KNMI 10 minute irradiance and wind metrics for Dutch regions and stations.",
  "author": "Artis Byte",
  "repository": "https://github.com/artis-byte/NL-solar",
  "desktopUI": "rhpane",
  "mobileUI": "fullscreen",
  "routerPath": "/knmi-solar",
  "private": false,
  "built": 1792574851523,
  "builtReadable": "2026-10-21T09:27:31.523Z",
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
	append_styles(target, "svelte-1nu95pe", "section.svelte-1nu95pe.svelte-1nu95pe{padding:0.75em;font-family:system-ui, sans-serif;color:#222}h1.svelte-1nu95pe.svelte-1nu95pe{font-size:1.1em;margin:0 0 0.5em}.status.svelte-1nu95pe.svelte-1nu95pe{margin:0.5em 0;font-size:0.95em}.error.svelte-1nu95pe.svelte-1nu95pe{color:#b00020}.controls.svelte-1nu95pe.svelte-1nu95pe{display:flex;flex-direction:column;gap:0.5em;margin-bottom:0.75em}.control-row.svelte-1nu95pe.svelte-1nu95pe{display:flex;align-items:center;gap:0.5em;flex-wrap:wrap}.control-row.svelte-1nu95pe label.svelte-1nu95pe{font-weight:600;font-size:0.85em}.toggle.svelte-1nu95pe.svelte-1nu95pe{display:inline-flex;gap:0.35em}.toggle.svelte-1nu95pe button.svelte-1nu95pe{padding:0.25em 0.6em;border:1px solid #888;border-radius:4px;background:#f7f7f7;cursor:pointer;font-size:0.85em}.toggle.svelte-1nu95pe button.selected.svelte-1nu95pe{background:#1f78b4;color:#fff;border-color:#1f78b4}select.svelte-1nu95pe.svelte-1nu95pe{padding:0.25em 0.4em;font-size:0.85em}.timeline.svelte-1nu95pe.svelte-1nu95pe{margin-top:0.5em}.timeline.svelte-1nu95pe input[type='range'].svelte-1nu95pe{width:100%}.timestamp.svelte-1nu95pe.svelte-1nu95pe{display:flex;justify-content:space-between;font-size:0.8em;font-weight:600;margin-top:0.2em}.hint.svelte-1nu95pe.svelte-1nu95pe{font-size:0.75em;color:#555;margin-top:0.35em}.hint.stale.svelte-1nu95pe.svelte-1nu95pe{color:#b00020;font-weight:600}.check.svelte-1nu95pe.svelte-1nu95pe{font-weight:400 !important;display:inline-flex;align-items:center;gap:0.25em}.link.svelte-1nu95pe.svelte-1nu95pe{background:none;border:none;padding:0;color:#1f78b4;text-decoration:underline;cursor:pointer;font-size:1em}");
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[67] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[67] = list[i];
	return child_ctx;
}

// (668:2) {:else}
function create_else_block(ctx) {
	let div4;
	let div0;
	let label0;
	let t1;
	let label1;
	let input0;
	let t2;
	let t3;
	let label2;
	let input1;
	let t4;
	let t5;
	let div2;
	let label3;
	let t7;
	let div1;
	let t8;
	let div3;
	let label4;
	let t10;
	let select;
	let t11;
	let span0;
	let t12;

	let t13_value = (/*previousTimeISO*/ ctx[13]
	? /*formatShortTime*/ ctx[18](/*previousTimeISO*/ ctx[13])
	: 'n/a') + "";

	let t13;
	let t14;
	let div6;
	let input2;
	let input2_max_value;
	let t15;
	let div5;
	let span1;
	let t16_value = /*formatLongTime*/ ctx[17](/*currentTimeISO*/ ctx[7]) + "";
	let t16;
	let t17;
	let span2;
	let t18_value = /*timeline*/ ctx[1].length + "";
	let t18;
	let t19;
	let t20;
	let p0;
	let t21;
	let t22_value = /*formatShortTime*/ ctx[18](/*latestTimeISO*/ ctx[8]) + "";
	let t22;
	let t23;
	let t24;
	let t25;
	let t26;
	let p1;
	let t27;
	let t28;
	let t29;

	let t30_value = (/*lastFetchedAt*/ ctx[11]
	? `, last checked ${/*formatShortTime*/ ctx[18](new Date(/*lastFetchedAt*/ ctx[11]).toISOString())}`
	: '') + "";

	let t30;
	let t31;
	let mounted;
	let dispose;
	let each_value_1 = ensure_array_like(/*METRIC_OPTIONS*/ ctx[16]);
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	let each_value = ensure_array_like(/*DELTA_OPTIONS*/ ctx[15]);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	let if_block = !/*followLatest*/ ctx[10] && create_if_block_3(ctx);

	return {
		c() {
			div4 = element("div");
			div0 = element("div");
			label0 = element("label");
			label0.textContent = "Show";
			t1 = space();
			label1 = element("label");
			input0 = element("input");
			t2 = text(" Regions");
			t3 = space();
			label2 = element("label");
			input1 = element("input");
			t4 = text(" Stations");
			t5 = space();
			div2 = element("div");
			label3 = element("label");
			label3.textContent = "Metric";
			t7 = space();
			div1 = element("div");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t8 = space();
			div3 = element("div");
			label4 = element("label");
			label4.textContent = "Change window";
			t10 = space();
			select = element("select");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t11 = space();
			span0 = element("span");
			t12 = text("vs ");
			t13 = text(t13_value);
			t14 = space();
			div6 = element("div");
			input2 = element("input");
			t15 = space();
			div5 = element("div");
			span1 = element("span");
			t16 = text(t16_value);
			t17 = space();
			span2 = element("span");
			t18 = text(t18_value);
			t19 = text(" obs");
			t20 = space();
			p0 = element("p");
			t21 = text("Latest KNMI obs ");
			t22 = text(t22_value);
			t23 = text(" (");
			t24 = text(/*dataAgeMinutes*/ ctx[14]);
			t25 = text(" min ago)");
			if (if_block) if_block.c();
			t26 = space();
			p1 = element("p");
			t27 = text("Drag slider to explore last ");
			t28 = text(/*timespanMinutes*/ ctx[12]);
			t29 = text(" min. Auto-refreshes every minute");
			t30 = text(t30_value);
			t31 = text(".");
			attr(label0, "class", "svelte-1nu95pe");
			attr(input0, "type", "checkbox");
			attr(label1, "class", "check svelte-1nu95pe");
			attr(input1, "type", "checkbox");
			attr(label2, "class", "check svelte-1nu95pe");
			attr(div0, "class", "control-row svelte-1nu95pe");
			attr(label3, "class", "svelte-1nu95pe");
			attr(div1, "class", "toggle svelte-1nu95pe");
			attr(div2, "class", "control-row svelte-1nu95pe");
			attr(label4, "class", "svelte-1nu95pe");
			attr(select, "class", "svelte-1nu95pe");
			attr(span0, "class", "hint svelte-1nu95pe");
			attr(div3, "class", "control-row svelte-1nu95pe");
			attr(div4, "class", "controls svelte-1nu95pe");
			attr(input2, "type", "range");
			attr(input2, "min", "0");
			attr(input2, "max", input2_max_value = Math.max(0, /*timeline*/ ctx[1].length - 1));
			attr(input2, "class", "svelte-1nu95pe");
			attr(div5, "class", "timestamp svelte-1nu95pe");
			attr(div6, "class", "timeline svelte-1nu95pe");
			attr(p0, "class", "hint svelte-1nu95pe");
			toggle_class(p0, "stale", /*dataAgeMinutes*/ ctx[14] != null && /*dataAgeMinutes*/ ctx[14] > 30);
			attr(p1, "class", "hint svelte-1nu95pe");
		},
		m(target, anchor) {
			insert(target, div4, anchor);
			append(div4, div0);
			append(div0, label0);
			append(div0, t1);
			append(div0, label1);
			append(label1, input0);
			input0.checked = /*showRegions*/ ctx[3];
			append(label1, t2);
			append(div0, t3);
			append(div0, label2);
			append(label2, input1);
			input1.checked = /*showStations*/ ctx[4];
			append(label2, t4);
			append(div4, t5);
			append(div4, div2);
			append(div2, label3);
			append(div2, t7);
			append(div2, div1);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				if (each_blocks_1[i]) {
					each_blocks_1[i].m(div1, null);
				}
			}

			append(div4, t8);
			append(div4, div3);
			append(div3, label4);
			append(div3, t10);
			append(div3, select);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(select, null);
				}
			}

			append(div3, t11);
			append(div3, span0);
			append(span0, t12);
			append(span0, t13);
			insert(target, t14, anchor);
			insert(target, div6, anchor);
			append(div6, input2);
			set_input_value(input2, /*currentIndex*/ ctx[2]);
			append(div6, t15);
			append(div6, div5);
			append(div5, span1);
			append(span1, t16);
			append(div5, t17);
			append(div5, span2);
			append(span2, t18);
			append(span2, t19);
			insert(target, t20, anchor);
			insert(target, p0, anchor);
			append(p0, t21);
			append(p0, t22);
			append(p0, t23);
			append(p0, t24);
			append(p0, t25);
			if (if_block) if_block.m(p0, null);
			insert(target, t26, anchor);
			insert(target, p1, anchor);
			append(p1, t27);
			append(p1, t28);
			append(p1, t29);
			append(p1, t30);
			append(p1, t31);

			if (!mounted) {
				dispose = [
					listen(input0, "change", /*input0_change_handler*/ ctx[21]),
					listen(input1, "change", /*input1_change_handler*/ ctx[22]),
					listen(select, "change", /*change_handler*/ ctx[24]),
					listen(input2, "change", /*input2_change_input_handler*/ ctx[25]),
					listen(input2, "input", /*input2_change_input_handler*/ ctx[25]),
					listen(input2, "input", /*input_handler*/ ctx[26])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*showRegions*/ 8) {
				input0.checked = /*showRegions*/ ctx[3];
			}

			if (dirty[0] & /*showStations*/ 16) {
				input1.checked = /*showStations*/ ctx[4];
			}

			if (dirty[0] & /*selectedMetric, METRIC_OPTIONS*/ 65568) {
				each_value_1 = ensure_array_like(/*METRIC_OPTIONS*/ ctx[16]);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(div1, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (dirty[0] & /*DELTA_OPTIONS, selectedDelta*/ 32832) {
				each_value = ensure_array_like(/*DELTA_OPTIONS*/ ctx[15]);
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

			if (dirty[0] & /*previousTimeISO*/ 8192 && t13_value !== (t13_value = (/*previousTimeISO*/ ctx[13]
			? /*formatShortTime*/ ctx[18](/*previousTimeISO*/ ctx[13])
			: 'n/a') + "")) set_data(t13, t13_value);

			if (dirty[0] & /*timeline*/ 2 && input2_max_value !== (input2_max_value = Math.max(0, /*timeline*/ ctx[1].length - 1))) {
				attr(input2, "max", input2_max_value);
			}

			if (dirty[0] & /*currentIndex*/ 4) {
				set_input_value(input2, /*currentIndex*/ ctx[2]);
			}

			if (dirty[0] & /*currentTimeISO*/ 128 && t16_value !== (t16_value = /*formatLongTime*/ ctx[17](/*currentTimeISO*/ ctx[7]) + "")) set_data(t16, t16_value);
			if (dirty[0] & /*timeline*/ 2 && t18_value !== (t18_value = /*timeline*/ ctx[1].length + "")) set_data(t18, t18_value);
			if (dirty[0] & /*latestTimeISO*/ 256 && t22_value !== (t22_value = /*formatShortTime*/ ctx[18](/*latestTimeISO*/ ctx[8]) + "")) set_data(t22, t22_value);
			if (dirty[0] & /*dataAgeMinutes*/ 16384) set_data(t24, /*dataAgeMinutes*/ ctx[14]);

			if (!/*followLatest*/ ctx[10]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_3(ctx);
					if_block.c();
					if_block.m(p0, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty[0] & /*dataAgeMinutes*/ 16384) {
				toggle_class(p0, "stale", /*dataAgeMinutes*/ ctx[14] != null && /*dataAgeMinutes*/ ctx[14] > 30);
			}

			if (dirty[0] & /*timespanMinutes*/ 4096) set_data(t28, /*timespanMinutes*/ ctx[12]);

			if (dirty[0] & /*lastFetchedAt*/ 2048 && t30_value !== (t30_value = (/*lastFetchedAt*/ ctx[11]
			? `, last checked ${/*formatShortTime*/ ctx[18](new Date(/*lastFetchedAt*/ ctx[11]).toISOString())}`
			: '') + "")) set_data(t30, t30_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div4);
				detach(t14);
				detach(div6);
				detach(t20);
				detach(p0);
				detach(t26);
				detach(p1);
			}

			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
			if (if_block) if_block.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

// (666:29) 
function create_if_block_2(ctx) {
	let p;

	return {
		c() {
			p = element("p");
			p.textContent = "No historical points available.";
			attr(p, "class", "status svelte-1nu95pe");
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

// (664:25) 
function create_if_block_1(ctx) {
	let p;
	let t;

	return {
		c() {
			p = element("p");
			t = text(/*errorMessage*/ ctx[9]);
			attr(p, "class", "status error svelte-1nu95pe");
		},
		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*errorMessage*/ 512) set_data(t, /*errorMessage*/ ctx[9]);
		},
		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (662:2) {#if loading}
function create_if_block(ctx) {
	let p;

	return {
		c() {
			p = element("p");
			p.textContent = "Loading observations...";
			attr(p, "class", "status svelte-1nu95pe");
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

// (678:10) {#each METRIC_OPTIONS as option}
function create_each_block_1(ctx) {
	let button;
	let mounted;
	let dispose;

	function click_handler() {
		return /*click_handler*/ ctx[23](/*option*/ ctx[67]);
	}

	return {
		c() {
			button = element("button");
			button.textContent = `${/*option*/ ctx[67].label} `;
			attr(button, "class", "svelte-1nu95pe");
			toggle_class(button, "selected", /*selectedMetric*/ ctx[5] === /*option*/ ctx[67].value);
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

			if (dirty[0] & /*selectedMetric, METRIC_OPTIONS*/ 65568) {
				toggle_class(button, "selected", /*selectedMetric*/ ctx[5] === /*option*/ ctx[67].value);
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

// (691:10) {#each DELTA_OPTIONS as option}
function create_each_block(ctx) {
	let option_1;
	let t0_value = /*option*/ ctx[67] + "";
	let t0;
	let t1;
	let option_1_selected_value;

	return {
		c() {
			option_1 = element("option");
			t0 = text(t0_value);
			t1 = text(" min\n            ");
			option_1.__value = /*option*/ ctx[67];
			set_input_value(option_1, option_1.__value);
			option_1.selected = option_1_selected_value = /*option*/ ctx[67] === /*selectedDelta*/ ctx[6];
		},
		m(target, anchor) {
			insert(target, option_1, anchor);
			append(option_1, t0);
			append(option_1, t1);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*selectedDelta*/ 64 && option_1_selected_value !== (option_1_selected_value = /*option*/ ctx[67] === /*selectedDelta*/ ctx[6])) {
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

// (715:81) {#if !followLatest}
function create_if_block_3(ctx) {
	let t0;
	let button;
	let mounted;
	let dispose;

	return {
		c() {
			t0 = text("· ");
			button = element("button");
			button.textContent = "jump to latest";
			attr(button, "class", "link svelte-1nu95pe");
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, button, anchor);

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler_1*/ ctx[27]);
				mounted = true;
			}
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(button);
			}

			mounted = false;
			dispose();
		}
	};
}

function create_fragment(ctx) {
	let section;
	let h1;
	let t1;

	function select_block_type(ctx, dirty) {
		if (/*loading*/ ctx[0]) return create_if_block;
		if (/*errorMessage*/ ctx[9]) return create_if_block_1;
		if (!/*timeline*/ ctx[1].length) return create_if_block_2;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			section = element("section");
			h1 = element("h1");
			h1.textContent = "KNMI Solar & Wind";
			t1 = space();
			if_block.c();
			attr(h1, "class", "svelte-1nu95pe");
			attr(section, "class", "svelte-1nu95pe");
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
const REFRESH_INTERVAL = 60_000;
const DELTA_TOLERANCE_MINUTES = 5;
const NO_VALUE = '--';
const STATION_FALLBACK_MINUTES = 20;

function instance($$self, $$props, $$invalidate) {
	let currentTimeISO;
	let latestTimeISO;
	let dataAgeMinutes;
	let previousTimeISO;
	let timespanMinutes;
	const DELTA_OPTIONS = [10, 30, 60];
	const MAX_TIMELINE_AGE_MS = 24 * 60 * 60 * 1000;

	const METRIC_OPTIONS = [
		{
			value: 'radiation',
			label: 'Radiation (W/m\u00b2)'
		},
		{ value: 'wind', label: 'Wind Speed (m/s)' }
	];

	const REGION_HISTORY_COLUMNS = [
		{
			key: 'qg_mean',
			label: 'Rad (W/m\u00b2)',
			decimals: 0,
			suffix: ' W/m\u00b2',
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
			label: 'Dir (\u00b0)',
			decimals: 0,
			suffix: '\u00b0',
			includeDelta: false
		}
	];

	const STATION_HISTORY_COLUMNS = [
		{
			key: 'qg',
			label: 'Rad (W/m\u00b2)',
			decimals: 0,
			suffix: ' W/m\u00b2',
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
			label: 'Dir (\u00b0)',
			decimals: 0,
			suffix: '\u00b0',
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
	let showRegions = true;
	let showStations = true;
	let followLatest = true;
	let lastFetchedAt = null;
	let nowTick = Date.now();
	let clockTimer = null;
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
		if (mapInstance) return true;
		const candidate = map;
		if (!candidate) return false;
		mapInstance = candidate;
		return typeof mapInstance.addLayer === 'function';
	};

	const scheduleMapPoll = () => {
		if (mapPollTimer) return;

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
		const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
		if (!response.ok) throw new Error(`Fetch ${url}: ${response.status}`);
		return response.json();
	};

	const getRadiationColor = value => {
		if (value == null) return '#FFEDA0';
		if (value > 800) return '#800026';
		if (value > 600) return '#BD0026';
		if (value > 400) return '#E31A1C';
		if (value > 200) return '#FC4E2A';
		if (value > 100) return '#FD8D3C';
		if (value > 50) return '#FEB24C';
		if (value > 10) return '#FED976';
		return '#FFEDA0';
	};

	const getWindColor = value => {
		if (value == null) return '#f7fcfd';
		if (value > 20) return '#084081';
		if (value > 15) return '#0868ac';
		if (value > 12) return '#2b8cbe';
		if (value > 9) return '#4eb3d3';
		if (value > 6) return '#7bccc4';
		if (value > 4) return '#a8ddb5';
		if (value > 2) return '#ccebc5';
		if (value > 1) return '#e0f3db';
		return '#f7fcfd';
	};

	const getColor = (value, metric) => metric === 'wind'
	? getWindColor(value)
	: getRadiationColor(value);

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

	const safeHistoryEntries = (historyMap, limit = 5) => {
		try {
			if (!historyMap || typeof historyMap.values !== 'function') return [];
			const entries = Array.from(historyMap.values());
			return entries.slice(-limit).reverse();
		} catch(_) {
			return [];
		}
	};

	const getTrend = (currentValue, previousValue) => {
		if (currentValue == null || previousValue == null) return null;
		const a = Number(currentValue), b = Number(previousValue);
		if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
		return a - b;
	};

	const renderHistoryTable = (historyMap, columns, limit = 5) => {
		const entries = safeHistoryEntries(historyMap, limit);
		if (!entries.length) return '';

		const header = columns.map(c => {
			const d = c.includeDelta ? '<th>&Delta;</th>' : '';
			return `<th>${c.label}</th>${d}`;
		}).join('');

		const rows = entries.map((entry, idx) => {
			const prev = entries[idx + 1] || null;
			let cells = '';

			columns.forEach(c => {
				cells += `<td>${formatNumber(entry?.[c.key], c.decimals ?? 1, c.suffix ?? '')}</td>`;

				if (c.includeDelta) {
					const trend = prev ? getTrend(entry?.[c.key], prev?.[c.key]) : null;

					cells += `<td>${trend != null
					? formatSignedNumber(trend, c.decimals ?? 1, c.suffix ?? '')
					: NO_VALUE}</td>`;
				}
			});

			return `<tr><td>${formatLongTime(entry?.observation_time)}</td>${cells}</tr>`;
		}).join('');

		return `<div class="history-block"><h4>Last ${entries.length} obs</h4>
      <table class="history-table"><thead><tr><th>Time</th>${header}</tr></thead>
      <tbody>${rows}</tbody></table></div>`;
	};

	const prepareIndex = (collection, keyProp) => {
		const index = new Map();
		if (!collection?.features) return index;

		for (const feature of collection.features) {
			const key = feature?.properties?.[keyProp];
			if (!key) continue;
			const history = new Map();

			for (const entry of feature.properties.history || []) {
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
		const previousTime = timeline[currentIndex];
		const now = Date.now();
		const cutoff = now - MAX_TIMELINE_AGE_MS;
		const times = new Set();

		const addTimes = idx => idx.forEach(({ history }) => history.forEach((_, t) => {
			if (new Date(t).getTime() >= cutoff) times.add(t);
		}));

		addTimes(regionsIndex);
		addTimes(stationsIndex);
		const sorted = Array.from(times).sort((a, b) => new Date(a) - new Date(b));
		$$invalidate(1, timeline = sorted);
		$$invalidate(19, timelineDates = timeline.map(t => new Date(t)));

		const keep = !followLatest && previousTime
		? timeline.indexOf(previousTime)
		: -1;

		timelineIndex = new Map(timeline.map((t, idx) => [t, idx]));

		$$invalidate(2, currentIndex = keep >= 0
		? keep
		: timeline.length ? timeline.length - 1 : 0);
	};

	const findPreviousTime = (currentTime, minutes) => {
		if (!currentTime || !timelineIndex.has(currentTime)) return null;
		const idx = timelineIndex.get(currentTime);
		const cur = timelineDates[idx];

		for (let i = idx - 1; i >= 0; i--) {
			if ((cur - timelineDates[i]) / 60000 >= minutes - 0.01) return timeline[i];
		}

		return null;
	};

	const safeGet = (historyMap, key) => {
		try {
			return historyMap && typeof historyMap.get === 'function'
			? historyMap.get(key)
			: undefined;
		} catch(_) {
			return undefined;
		}
	};

	const computeDelta = (historyMap, currentTime, metricKey, minutes) => {
		if (!historyMap || !currentTime) return null;
		const previousTime = findPreviousTime(currentTime, minutes);
		if (!previousTime) return null;
		const current = safeGet(historyMap, currentTime);
		const previous = safeGet(historyMap, previousTime);
		if (!current || !previous) return null;
		const gap = Math.abs((new Date(currentTime) - new Date(previousTime)) / 60000);
		if (gap > minutes + DELTA_TOLERANCE_MINUTES) return null;
		const cv = current[metricKey], pv = previous[metricKey];
		if (cv == null || pv == null) return null;

		return {
			delta: cv - pv,
			previousTime,
			previousValue: pv
		};
	};

	const buildRegionPopupHTML = (name, entry, historyMap, currentTime) => {
		try {
			const dm = selectedDelta;
			const rd = computeDelta(historyMap, currentTime, 'qg_mean', dm);
			const wd = computeDelta(historyMap, currentTime, 'wind_speed_mean', dm);

			const rc = rd
			? `${formatSignedNumber(rd.delta, 0, ' W/m\u00b2')}`
			: NO_VALUE;

			const wc = wd
			? `${formatSignedNumber(wd.delta, 1, ' m/s')}`
			: NO_VALUE;

			const ht = renderHistoryTable(historyMap, REGION_HISTORY_COLUMNS);

			return `<div class="popup"><h3>${name || 'Region'}</h3>
        <p><b>Radiation</b>: ${formatNumber(entry?.qg_mean, 0, ' W/m\u00b2')} (\u0394${dm}m: ${rc})</p>
        <p><b>Wind</b>: ${formatNumber(entry?.wind_speed_mean, 1, ' m/s')} @ ${formatNumber(entry?.wind_direction_mean, 0, '\u00b0')} (\u0394${dm}m: ${wc})</p>
        ${entry?.stations_count != null
			? `<p>Stations: ${entry.stations_count}</p>`
			: ''}
        ${ht}</div>`;
		} catch(_) {
			return `<div class="popup"><h3>${name || 'Region'}</h3><p>Data available on click</p></div>`;
		}
	};

	const buildStationPopupHTML = (stationId, entry, historyMap, currentTime) => {
		try {
			const dm = selectedDelta;
			const rd = computeDelta(historyMap, currentTime, 'qg', dm);
			const wd = computeDelta(historyMap, currentTime, 'ff', dm);

			const rc = rd
			? `${formatSignedNumber(rd.delta, 0, ' W/m\u00b2')}`
			: NO_VALUE;

			const wc = wd
			? `${formatSignedNumber(wd.delta, 1, ' m/s')}`
			: NO_VALUE;

			const ht = renderHistoryTable(historyMap, STATION_HISTORY_COLUMNS);

			return `<div class="popup"><h3>Station ${stationId}</h3>
        <p><b>Radiation</b>: ${formatNumber(entry?.qg, 0, ' W/m\u00b2')} (\u0394${dm}m: ${rc})</p>
        <p><b>Wind</b>: ${formatNumber(entry?.ff, 1, ' m/s')} @ ${formatNumber(entry?.dd, 0, '\u00b0')} (\u0394${dm}m: ${wc})</p>
        ${ht}</div>`;
		} catch(_) {
			return `<div class="popup"><h3>Station ${stationId}</h3><p>Data available on click</p></div>`;
		}
	};

	const buildSimpleTooltip = (title, rad, wind) => {
		return `<div class="map-tooltip"><div class="map-tooltip-title">${title}</div>
      <div>Rad: ${formatNumber(rad, 0, ' W/m\u00b2')}</div>
      <div>Wind: ${formatNumber(wind, 1, ' m/s')}</div></div>`;
	};

	const clearLayer = layerRef => {
		try {
			if (layerRef && mapInstance) {
				mapInstance.removeLayer(layerRef);
			}
		} catch(_) {
			
		} /* ignore */

		return null;
	};

	const drawRegionLayer = currentTime => {
		if (!ensureMap() || !currentTime) {
			scheduleMapPoll();
			return;
		}

		const L = getLeaflet();
		if (!L) return;
		regionLayer = clearLayer(regionLayer);
		regionLayer = L.layerGroup().addTo(mapInstance);
		let drawn = 0;

		regionsIndex.forEach(({ geometry, history }, name) => {
			try {
				if (!geometry) return;
				const entry = history.get(currentTime);
				if (!entry) return;

				// Deep copy geometry for each render to prevent mutation
				const geomCopy = JSON.parse(JSON.stringify(geometry));

				const value = selectedMetric === 'wind'
				? entry.wind_speed_mean
				: entry.qg_mean;

				const feature = {
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							geometry: geomCopy,
							properties: { name, ...entry }
						}
					]
				};

				const layer = L.geoJSON(feature, {
					style: () => ({
						fillColor: getColor(value, selectedMetric),
						fillOpacity: 0.65,
						weight: 1.5,
						color: '#333'
					})
				});

				// Tooltip
				layer.eachLayer(sub => {
					sub.bindTooltip(buildSimpleTooltip(name, entry.qg_mean, entry.wind_speed_mean), {
						permanent: true,
						direction: 'center',
						className: 'region-label'
					});

					sub.bindPopup(() => buildRegionPopupHTML(name, entry, history, currentTime));
				});

				layer.addTo(regionLayer);
				drawn += 1;
			} catch(err) {
				console.warn('Region draw error for', name, err);
			}
		});

		console.log(`[KNMI] Drew ${drawn} region(s) for ${currentTime}`);
	};

	const entryAtOrBefore = (history, currentTime) => {
		const exact = history.get(currentTime);
		if (exact) return exact;
		const target = new Date(currentTime).getTime();
		let best = null;
		let bestTime = -Infinity;

		history.forEach((entry, t) => {
			const ts = new Date(t).getTime();

			if (ts <= target && ts > bestTime && target - ts <= STATION_FALLBACK_MINUTES * 60000) {
				best = entry;
				bestTime = ts;
			}
		});

		return best;
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
		let drawn = 0;
		let failed = 0;

		stationsIndex.forEach(({ geometry, history }, stationId) => {
			try {
				if (!geometry || geometry.type !== 'Point') return;
				const entry = entryAtOrBefore(history, currentTime);
				if (!entry) return;
				const [lon, lat] = geometry.coordinates;
				const value = selectedMetric === 'wind' ? entry.ff : entry.qg;
				const color = getColor(value, selectedMetric);

				// HTML marker icons, like Windy's own plugin examples; Windy's Leaflet build
				// does not reliably render circleMarker paths.
				const icon = L.divIcon({
					className: '',
					html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #1c1c1c;box-shadow:0 0 0 1px #fff;box-sizing:border-box;"></div>`,
					iconSize: [12, 12],
					iconAnchor: [6, 6]
				});

				const marker = L.marker([lat, lon], {
					icon,
					zIndexOffset: 1000,
					riseOnHover: true
				});

				if (value != null) {
					marker.bindTooltip(
						selectedMetric === 'wind'
						? formatNumber(value, 1, '')
						: formatNumber(value, 0, ''),
						{
							permanent: true,
							direction: 'top',
							className: 'station-label',
							offset: [0, -6]
						}
					);
				} else {
					marker.bindTooltip(buildSimpleTooltip(`Stn ${stationId}`, entry.qg, entry.ff), {
						direction: 'top',
						className: 'station-label',
						offset: [0, -6]
					});
				}

				marker.bindPopup(() => buildStationPopupHTML(stationId, entry, history, currentTime));
				marker.addTo(stationLayer);
				drawn += 1;
			} catch(err) {
				failed += 1;
				console.warn('Station marker error:', err);
			}
		});

		console.log(`[KNMI] Drew ${drawn} station(s) for ${currentTime}${failed ? `, ${failed} failed` : ''}`);
	};

	const updateMap = () => {
		if (loading || !timeline.length) return;

		if (!ensureMap()) {
			scheduleMapPoll();
			return;
		}

		const currentTime = timeline[currentIndex];
		if (!currentTime) return;
		console.log(`[KNMI] updateMap: regions=${showRegions} stations=${showStations}, time=${currentTime}, idx=${currentIndex}/${timeline.length}`);
		if (showRegions) drawRegionLayer(currentTime); else regionLayer = clearLayer(regionLayer);
		if (showStations) drawStationLayer(currentTime); else stationLayer = clearLayer(stationLayer);
	};

	const loadData = async () => {
		const firstLoad = !timeline.length;
		if (firstLoad) $$invalidate(0, loading = true);

		try {
			const [regions, stations] = await Promise.all([fetchJSON(REGION_HISTORY_URL), fetchJSON(STATION_HISTORY_URL)]);
			regionsIndex = prepareIndex(regions, 'name');
			stationsIndex = prepareIndex(stations, 'station');
			console.log(`[KNMI] Indexed ${regionsIndex.size} regions, ${stationsIndex.size} stations`);
			buildTimeline();
			$$invalidate(9, errorMessage = '');
			$$invalidate(11, lastFetchedAt = Date.now());
			console.log(`[KNMI] Timeline: ${timeline.length} points, latest=${timeline[timeline.length - 1]}`);
		} catch(err) {
			console.error('KNMI load error:', err);
			if (firstLoad) $$invalidate(9, errorMessage = err?.message || 'Failed to load KNMI data.');
		} finally {
			$$invalidate(0, loading = false);
			updateMap();
		}
	};

	onMount(() => {
		loadData();
		refreshTimer = setInterval(loadData, REFRESH_INTERVAL);

		clockTimer = setInterval(
			() => {
				$$invalidate(20, nowTick = Date.now());
			},
			30_000
		);

		if (!ensureMap()) scheduleMapPoll();
	});

	onDestroy(() => {
		if (refreshTimer) clearInterval(refreshTimer);
		if (mapPollTimer) clearInterval(mapPollTimer);
		if (clockTimer) clearInterval(clockTimer);
		regionLayer = clearLayer(regionLayer);
		stationLayer = clearLayer(stationLayer);
	});

	function input0_change_handler() {
		showRegions = this.checked;
		$$invalidate(3, showRegions);
	}

	function input1_change_handler() {
		showStations = this.checked;
		$$invalidate(4, showStations);
	}

	const click_handler = option => {
		$$invalidate(5, selectedMetric = option.value);
	};

	const change_handler = event => {
		$$invalidate(6, selectedDelta = Number(event.target.value));
	};

	function input2_change_input_handler() {
		currentIndex = to_number(this.value);
		$$invalidate(2, currentIndex);
	}

	const input_handler = () => {
		$$invalidate(10, followLatest = currentIndex === timeline.length - 1);
	};

	const click_handler_1 = () => {
		$$invalidate(10, followLatest = true);
		$$invalidate(2, currentIndex = timeline.length - 1);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*loading, timeline, showRegions, showStations, selectedMetric, selectedDelta, currentIndex*/ 127) {
			{
				if (!loading && timeline.length) {
					updateMap();
				}
			}
		}

		if ($$self.$$.dirty[0] & /*timeline, currentIndex*/ 6) {
			$$invalidate(7, currentTimeISO = timeline.length ? timeline[currentIndex] : null);
		}

		if ($$self.$$.dirty[0] & /*timeline*/ 2) {
			$$invalidate(8, latestTimeISO = timeline.length ? timeline[timeline.length - 1] : null);
		}

		if ($$self.$$.dirty[0] & /*latestTimeISO, nowTick*/ 1048832) {
			$$invalidate(14, dataAgeMinutes = latestTimeISO
			? Math.max(0, Math.round((nowTick - new Date(latestTimeISO).getTime()) / 60000))
			: null);
		}

		if ($$self.$$.dirty[0] & /*currentTimeISO, selectedDelta*/ 192) {
			$$invalidate(13, previousTimeISO = currentTimeISO
			? findPreviousTime(currentTimeISO, selectedDelta)
			: null);
		}

		if ($$self.$$.dirty[0] & /*timelineDates, timeline*/ 524290) {
			$$invalidate(12, timespanMinutes = timelineDates.length >= 2
			? Math.round((timelineDates[timelineDates.length - 1] - timelineDates[0]) / 60000)
			: timeline.length ? 10 : 0);
		}
	};

	return [
		loading,
		timeline,
		currentIndex,
		showRegions,
		showStations,
		selectedMetric,
		selectedDelta,
		currentTimeISO,
		latestTimeISO,
		errorMessage,
		followLatest,
		lastFetchedAt,
		timespanMinutes,
		previousTimeISO,
		dataAgeMinutes,
		DELTA_OPTIONS,
		METRIC_OPTIONS,
		formatLongTime,
		formatShortTime,
		timelineDates,
		nowTick,
		input0_change_handler,
		input1_change_handler,
		click_handler,
		change_handler,
		input2_change_input_handler,
		input_handler,
		click_handler_1
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
