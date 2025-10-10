const __pluginConfig =  {
  "name": "windy-plugin-knmi-qg-regions",
  "version": "0.2.1",
  "icon": "☀",
  "title": "KNMI Solar Radiation",
  "description": "Overlay KNMI 10 minute irradiance (qg) averaged per Dutch region.",
  "author": "Artis Byte",
  "repository": "https://github.com/artis-byte/NL-solar",
  "desktopUI": "rhpane",
  "mobileUI": "fullscreen",
  "routerPath": "/knmi-solar",
  "private": false,
  "built": 1760117279734,
  "builtReadable": "2025-10-10T17:27:59.734Z",
  "screenshot": "screenshot.jpg"
};

import * as L from 'leaflet';

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
 * @returns {Text} */
function empty() {
	return text('');
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
function select_option(select, value, mounting) {
	for (let i = 0; i < select.options.length; i += 1) {
		const option = select.options[i];
		if (option.__value === value) {
			option.selected = true;
			return;
		}
	}
	if (!mounting || value !== undefined) {
		select.selectedIndex = -1; // no option should be selected
	}
}

function select_value(select) {
	const selected_option = select.querySelector(':checked');
	return selected_option && selected_option.__value;
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
	append_styles(target, "svelte-19uuc02", "section.svelte-19uuc02{padding:0.75em;max-width:320px;font-family:sans-serif;font-size:0.9em;line-height:1.4}h1.svelte-19uuc02{font-size:1.2em;margin:0 0 0.4em}p.intro.svelte-19uuc02{margin:0 0 0.75em}label.svelte-19uuc02{display:block;margin:0.75em 0 0.25em;font-weight:600}select.svelte-19uuc02{width:100%;padding:0.3em;margin-top:0.25em}.status.svelte-19uuc02{margin:0.75em 0 0}.status.error.svelte-19uuc02{color:#b03a2e}.legend.svelte-19uuc02{margin-top:1em;border-top:1px solid #dddddd;padding-top:0.75em}.legend-title.svelte-19uuc02{font-weight:600;margin-bottom:0.4em}.legend-row.svelte-19uuc02{display:flex;align-items:center;margin-bottom:0.25em}.legend-swatch.svelte-19uuc02{width:18px;height:12px;margin-right:0.5em;border:1px solid #333333;box-sizing:border-box}.footer.svelte-19uuc02{margin-top:1em;font-size:0.8em;color:#555555}a.svelte-19uuc02{color:#0066cc}");
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[27] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[30] = list[i];
	return child_ctx;
}

// (392:2) {#if metricKeys.length}
function create_if_block_5(ctx) {
	let label;
	let t1;
	let select;
	let mounted;
	let dispose;
	let each_value_1 = ensure_array_like(/*metricKeys*/ ctx[5]);
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	return {
		c() {
			label = element("label");
			label.textContent = "Metric";
			t1 = space();
			select = element("select");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(label, "for", "metric-select");
			attr(label, "class", "svelte-19uuc02");
			attr(select, "id", "metric-select");
			attr(select, "class", "svelte-19uuc02");
			if (/*selectedMetric*/ ctx[3] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[9].call(select));
		},
		m(target, anchor) {
			insert(target, label, anchor);
			insert(target, t1, anchor);
			insert(target, select, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(select, null);
				}
			}

			select_option(select, /*selectedMetric*/ ctx[3], true);

			if (!mounted) {
				dispose = [
					listen(select, "change", /*handleMetricChange*/ ctx[8]),
					listen(select, "change", /*select_change_handler*/ ctx[9])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*metricKeys, metrics*/ 48) {
				each_value_1 = ensure_array_like(/*metricKeys*/ ctx[5]);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(select, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_1.length;
			}

			if (dirty[0] & /*selectedMetric, metricKeys*/ 40) {
				select_option(select, /*selectedMetric*/ ctx[3]);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(label);
				detach(t1);
				detach(select);
			}

			destroy_each(each_blocks, detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (395:6) {#each metricKeys as key}
function create_each_block_1(ctx) {
	let option;
	let t_value = /*metrics*/ ctx[4][/*key*/ ctx[30]].label + "";
	let t;
	let option_value_value;

	return {
		c() {
			option = element("option");
			t = text(t_value);
			option.__value = option_value_value = /*key*/ ctx[30];
			set_input_value(option, option.__value);
		},
		m(target, anchor) {
			insert(target, option, anchor);
			append(option, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*metrics, metricKeys*/ 48 && t_value !== (t_value = /*metrics*/ ctx[4][/*key*/ ctx[30]].label + "")) set_data(t, t_value);

			if (dirty[0] & /*metricKeys*/ 32 && option_value_value !== (option_value_value = /*key*/ ctx[30])) {
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

// (405:24) 
function create_if_block_4(ctx) {
	let p;
	let t0;
	let t1_value = formatTimestamp(/*lastUpdated*/ ctx[2]) + "";
	let t1;

	return {
		c() {
			p = element("p");
			t0 = text("Last refreshed: ");
			t1 = text(t1_value);
			attr(p, "class", "status svelte-19uuc02");
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

// (403:25) 
function create_if_block_3(ctx) {
	let p;
	let t0;
	let t1;

	return {
		c() {
			p = element("p");
			t0 = text("Failed to load data: ");
			t1 = text(/*errorMessage*/ ctx[1]);
			attr(p, "class", "status error svelte-19uuc02");
		},
		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t0);
			append(p, t1);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*errorMessage*/ 2) set_data(t1, /*errorMessage*/ ctx[1]);
		},
		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (401:2) {#if loading}
function create_if_block_2(ctx) {
	let p;

	return {
		c() {
			p = element("p");
			p.textContent = "Loading latest data...";
			attr(p, "class", "status svelte-19uuc02");
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

// (409:2) {#if legendStops.length}
function create_if_block(ctx) {
	let div1;
	let div0;
	let t0;

	let t1_value = (/*legendUnits*/ ctx[7]
	? ' (' + /*legendUnits*/ ctx[7] + ')'
	: '') + "";

	let t1;
	let t2;
	let each_value = ensure_array_like(/*legendStops*/ ctx[6]);
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

			attr(div0, "class", "legend-title svelte-19uuc02");
			attr(div1, "class", "legend svelte-19uuc02");
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
			if (dirty[0] & /*legendUnits*/ 128 && t1_value !== (t1_value = (/*legendUnits*/ ctx[7]
			? ' (' + /*legendUnits*/ ctx[7] + ')'
			: '') + "")) set_data(t1, t1_value);

			if (dirty[0] & /*legendStops*/ 64) {
				each_value = ensure_array_like(/*legendStops*/ ctx[6]);
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

// (413:8) {#if item.label}
function create_if_block_1(ctx) {
	let div;
	let span0;
	let span0_style_value;
	let t0;
	let span1;
	let t1_value = /*item*/ ctx[27].label + "";
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
			attr(span0, "class", "legend-swatch svelte-19uuc02");
			attr(span0, "style", span0_style_value = `background:${/*item*/ ctx[27].color}`);
			attr(div, "class", "legend-row svelte-19uuc02");
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
			if (dirty[0] & /*legendStops*/ 64 && span0_style_value !== (span0_style_value = `background:${/*item*/ ctx[27].color}`)) {
				attr(span0, "style", span0_style_value);
			}

			if (dirty[0] & /*legendStops*/ 64 && t1_value !== (t1_value = /*item*/ ctx[27].label + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (412:6) {#each legendStops as item}
function create_each_block(ctx) {
	let if_block_anchor;
	let if_block = /*item*/ ctx[27].label && create_if_block_1(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*item*/ ctx[27].label) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_1(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
		}
	};
}

function create_fragment(ctx) {
	let section;
	let h1;
	let t1;
	let p0;
	let t3;
	let t4;
	let t5;
	let t6;
	let p1;
	let t7;
	let a;
	let t8;
	let t9;
	let if_block0 = /*metricKeys*/ ctx[5].length && create_if_block_5(ctx);

	function select_block_type(ctx, dirty) {
		if (/*loading*/ ctx[0]) return create_if_block_2;
		if (/*errorMessage*/ ctx[1]) return create_if_block_3;
		if (/*lastUpdated*/ ctx[2]) return create_if_block_4;
	}

	let current_block_type = select_block_type(ctx);
	let if_block1 = current_block_type && current_block_type(ctx);
	let if_block2 = /*legendStops*/ ctx[6].length && create_if_block(ctx);

	return {
		c() {
			section = element("section");
			h1 = element("h1");
			h1.textContent = "KNMI Solar Radiation";
			t1 = space();
			p0 = element("p");
			p0.textContent = "Overlay KNMI 10 minute irradiance averaged per Dutch region.";
			t3 = space();
			if (if_block0) if_block0.c();
			t4 = space();
			if (if_block1) if_block1.c();
			t5 = space();
			if (if_block2) if_block2.c();
			t6 = space();
			p1 = element("p");
			t7 = text("Source: ");
			a = element("a");
			t8 = text("GeoJSON feed");
			t9 = text(". Data refreshes every 10 minutes.");
			attr(h1, "class", "svelte-19uuc02");
			attr(p0, "class", "intro svelte-19uuc02");
			attr(a, "href", DATA_URL);
			attr(a, "target", "_blank");
			attr(a, "rel", "noopener");
			attr(a, "class", "svelte-19uuc02");
			attr(p1, "class", "footer svelte-19uuc02");
			attr(section, "class", "svelte-19uuc02");
		},
		m(target, anchor) {
			insert(target, section, anchor);
			append(section, h1);
			append(section, t1);
			append(section, p0);
			append(section, t3);
			if (if_block0) if_block0.m(section, null);
			append(section, t4);
			if (if_block1) if_block1.m(section, null);
			append(section, t5);
			if (if_block2) if_block2.m(section, null);
			append(section, t6);
			append(section, p1);
			append(p1, t7);
			append(p1, a);
			append(a, t8);
			append(p1, t9);
		},
		p(ctx, dirty) {
			if (/*metricKeys*/ ctx[5].length) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_5(ctx);
					if_block0.c();
					if_block0.m(section, t4);
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
					if_block1.m(section, t5);
				}
			}

			if (/*legendStops*/ ctx[6].length) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block(ctx);
					if_block2.c();
					if_block2.m(section, t6);
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

			if (if_block0) if_block0.d();

			if (if_block1) {
				if_block1.d();
			}

			if (if_block2) if_block2.d();
		}
	};
}

const DATA_URL = 'https://raw.githubusercontent.com/artis-byte/NL-solar/main/qg_regions.geojson';
const REFRESH_MS = 600_000;
const DEFAULT_METRIC = 'qg_mean';

function getWindyMap() {
	const windy = typeof window !== 'undefined' ? window.W : null;
	return windy && windy.map ? windy.map : null;
}

function formatNumber(value) {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 'n/a';
	}

	const abs = Math.abs(value);

	if (abs >= 1000) {
		return value.toFixed(0);
	}

	if (abs >= 100) {
		return value.toFixed(0);
	}

	if (abs >= 10) {
		return value.toFixed(1);
	}

	if (abs >= 1) {
		return value.toFixed(2);
	}

	if (abs === 0) {
		return '0';
	}

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

	const METRIC_LABELS = {
		qg_mean: 'Mean global irradiance (qg)',
		estimated_output_mw: 'Estimated PV output',
		solar_capacity_mw: 'Installed solar capacity'
	};

	const METRIC_UNITS = {
		qg_mean: 'W/m^2',
		estimated_output_mw: 'MW',
		solar_capacity_mw: 'MW'
	};

	let map = null;
	let overlayLayer = null;
	let refreshTimer = null;
	let mapPollTimer = null;
	let loading = false;
	let errorMessage = '';
	let lastUpdated = '';
	let selectedMetric = DEFAULT_METRIC;
	let metrics = {};
	let metricKeys = [];
	let legendStops = [];
	let legendUnits = '';
	let latestGeoJSON = null;

	function ensureMapAvailable() {
		const current = getWindyMap();

		if (current) {
			map = current;
			return true;
		}

		return false;
	}

	function thresholdsFor(key, stats) {
		if (key === 'qg_mean') {
			return [800, 600, 400, 200, 100, 50, 10];
		}

		const steps = COLORS.length - 1;
		const min = stats.min;
		const max = stats.max;

		if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
			return [];
		}

		const span = max - min;
		const thresholds = [];

		for (let i = steps; i >= 1; i -= 1) {
			thresholds.push(min + span * i / steps);
		}

		return thresholds;
	}

	function buildLegend(thresholds, metricKey) {
		const items = [];
		const units = METRIC_UNITS[metricKey] || '';

		for (let i = 0; i < COLORS.length; i += 1) {
			let label;

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

			if (units && label && label !== 'Higher values' && label !== 'Lower values') {
				label = `${label} ${units}`;
			}

			items.push({ color: COLORS[i], label });
		}

		return items;
	}

	function computeMetrics(geojson) {
		const features = Array.isArray(geojson?.features) ? geojson.features : [];
		const store = {};

		for (const feature of features) {
			const props = feature && feature.properties;

			if (!props) {
				continue;
			}

			for (const [key, value] of Object.entries(props)) {
				if (typeof value === 'number' && Number.isFinite(value) && key !== 'level') {
					if (!store[key]) {
						store[key] = [];
					}

					store[key].push(value);
				}
			}
		}

		const result = {};

		for (const [key, values] of Object.entries(store)) {
			if (!values.length) {
				continue;
			}

			const min = values.reduce((acc, val) => Math.min(acc, val), values[0]);
			const max = values.reduce((acc, val) => Math.max(acc, val), values[0]);

			result[key] = {
				key,
				label: METRIC_LABELS[key] || key,
				units: METRIC_UNITS[key] || '',
				min,
				max,
				thresholds: thresholdsFor(key, { min, max })
			};
		}

		return result;
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

	function popupContent(feature) {
		const props = feature?.properties || {};
		const parts = [];
		const title = props.name || props.station || 'Region';
		parts.push(`<strong>${title}</strong>`);
		const metricInfo = metrics[selectedMetric];

		if (metricInfo) {
			const value = props[selectedMetric];
			const unit = metricInfo.units ? ` ${metricInfo.units}` : '';
			parts.push(`${metricInfo.label}: ${formatNumber(value)}${unit}`);
		}

		const secondary = ['estimated_output_mw', 'solar_capacity_mw'];

		for (const key of secondary) {
			if (key === selectedMetric) {
				continue;
			}

			const val = props[key];

			if (typeof val === 'number' && Number.isFinite(val)) {
				const unit = METRIC_UNITS[key] ? ` ${METRIC_UNITS[key]}` : '';
				const label = METRIC_LABELS[key] || key;
				parts.push(`${label}: ${formatNumber(val)}${unit}`);
			}
		}

		return parts.join('<br>');
	}

	function removeLayer() {
		if (overlayLayer && map) {
			map.removeLayer(overlayLayer);
			overlayLayer = null;
		}
	}

	function renderLayer(geojson) {
		if (!geojson) {
			removeLayer();
			return;
		}

		const metricInfo = metrics[selectedMetric];

		if (!metricInfo) {
			$$invalidate(1, errorMessage = 'No numeric metric found in dataset.');
			removeLayer();
			return;
		}

		if (!ensureMapAvailable()) {
			return;
		}

		removeLayer();
		$$invalidate(6, legendStops = buildLegend(metricInfo.thresholds, selectedMetric));
		$$invalidate(7, legendUnits = metricInfo.units || '');

		overlayLayer = L.geoJSON(geojson, {
			style: feature => {
				const props = feature?.properties || {};
				const value = props[selectedMetric];

				return {
					fillColor: colorForValue(value, metricInfo.thresholds),
					fillOpacity: 0.6,
					weight: 1,
					color: '#333333'
				};
			},
			onEachFeature: (feature, layer) => {
				const html = popupContent(feature);

				if (html) {
					layer.bindPopup(html);
				}
			}
		}).addTo(map);
	}

	async function fetchData() {
		$$invalidate(0, loading = true);
		$$invalidate(1, errorMessage = '');

		try {
			const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });

			if (!response.ok) {
				throw new Error(`Request failed (${response.status})`);
			}

			const geojson = await response.json();
			latestGeoJSON = geojson;
			$$invalidate(4, metrics = computeMetrics(geojson));
			$$invalidate(5, metricKeys = Object.keys(metrics));

			if (!metricKeys.length) {
				throw new Error('GeoJSON does not contain numeric metrics.');
			}

			if (!metrics[selectedMetric]) {
				$$invalidate(3, selectedMetric = metrics[DEFAULT_METRIC] ? DEFAULT_METRIC : metricKeys[0]);
			}

			renderLayer(geojson);
			$$invalidate(2, lastUpdated = new Date().toISOString());
		} catch(err) {
			console.error('Failed to load KNMI data', err);
			$$invalidate(1, errorMessage = err?.message || String(err));
			latestGeoJSON = null;
			$$invalidate(4, metrics = {});
			$$invalidate(5, metricKeys = []);
			$$invalidate(6, legendStops = []);
			$$invalidate(7, legendUnits = '');
			removeLayer();
		} finally {
			$$invalidate(0, loading = false);
		}
	}

	function handleMetricChange(event) {
		$$invalidate(3, selectedMetric = event.currentTarget.value);
		renderLayer(latestGeoJSON);
	}

	onMount(() => {
		ensureMapAvailable();
		fetchData();
		refreshTimer = setInterval(fetchData, REFRESH_MS);

		if (!mapPollTimer) {
			mapPollTimer = setInterval(
				() => {
					if (!map && ensureMapAvailable() && latestGeoJSON) {
						renderLayer(latestGeoJSON);
						clearInterval(mapPollTimer);
						mapPollTimer = null;
					}
				},
				1000
			);
		}
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

		removeLayer();
	});

	function select_change_handler() {
		selectedMetric = select_value(this);
		$$invalidate(3, selectedMetric);
		$$invalidate(5, metricKeys);
	}

	return [
		loading,
		errorMessage,
		lastUpdated,
		selectedMetric,
		metrics,
		metricKeys,
		legendStops,
		legendUnits,
		handleMetricChange,
		select_change_handler
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
