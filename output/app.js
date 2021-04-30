(function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        const z_index = (parseInt(computed_style.zIndex) || 0) - 1;
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', `display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ` +
            `overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: ${z_index};`);
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        const crossorigin = is_crossorigin();
        let unsubscribe;
        if (crossorigin) {
            iframe.src = `data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>`;
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            if (crossorigin) {
                unsubscribe();
            }
            else if (unsubscribe && iframe.contentWindow) {
                unsubscribe();
            }
            detach(iframe);
        };
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
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
        flushing = false;
        seen_callbacks.clear();
    }
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
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
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const touchState = {};

    if (typeof window !== "undefined") {
        if (window.ontouchstart === undefined) {
            window.addEventListener(
                "mousedown",
                evt => {
                    if (evt.button !== 0) {
                        return
                    }
                    const customEvt = new CustomEvent("touchstart");
                    evt.identifier = -1;
                    customEvt.changedTouches = [evt];
                    evt.target.dispatchEvent(customEvt);
                },
                {capture: true}
            );
            window.addEventListener(
                "mouseup",
                evt => {
                    if (evt.button !== 0) {
                        return
                    }
                    const customEvt = new CustomEvent("touchend");
                    evt.identifier = -1;
                    customEvt.changedTouches = [evt];
                    evt.target.dispatchEvent(customEvt);
                },
                {capture: true}
            );
        }

        window.addEventListener(
            "touchstart",
            evt => {
                const timestamp = Date.now();
                for (const touch of evt.changedTouches) {
                    touchState[touch.identifier] = {
                        timestamp,
                        touch,
                    };
                }
            },
            {capture: true}
        );
        window.addEventListener(
            "touchend",
            evt => {
                const timestamp = Date.now();
                for (const touch of evt.changedTouches) {
                    const prev = touchState[touch.identifier];
                    touchState[touch.identifier] = null;

                    if (prev === null || prev === undefined) {
                        return
                    }

                    const duration = timestamp - prev.timestamp;
                    const dist = Math.sqrt(
                        (prev.touch.clientX - touch.clientX) ** 2
                        + (prev.touch.clientY - touch.clientY) ** 2
                    );
                    if (dist > 30 || duration > 500) {
                        return
                    }

                    const customEvent = new CustomEvent("tap");
                    customEvent.changedTouches = [touch];
                    touch.target.dispatchEvent(customEvent);
                }
            },
            {capture: true}
        );
    }

    const calcValue = value => {
        if (Array.isArray(value) === false) {
            return value
        }
        if (value[0] === null || value[0] === undefined) {
            return null
        }
        return value.join("")
    };
    const udpateVars = (node, current, next) => {
        const keys = new Set([
            ...Object.keys(current),
            ...Object.keys(next),
        ]);
        for (const key of keys) {
            const varName = `--${key}`;
            const currentValue = calcValue(current[key]);
            const nextValue = calcValue(next[key]);
            if (nextValue === undefined || nextValue === null) {
                node.style.removeProperty(varName);
            }
            if (currentValue !== nextValue) {
                node.style.setProperty(varName, nextValue);
            }
        }
    };
    const vars = (node, vars) => {
        let currentVars = vars;
        udpateVars(node, {}, currentVars);
        return {
            update(newVars) {
                udpateVars(node, currentVars, newVars);
                currentVars = newVars;
            }
        }
    };

    const css = (parts, ...values) => {
        const css = parts
            .reduce(
                (cssParts, part, index) => [
                    ...cssParts,
                    part,
                    values[index] ?? ""
                ],
                []
            )
            .join("");
        return `<style>\n${css}\n</style>`
    };

    /* node_modules\svelte-doric\core\ripple.svelte generated by Svelte v3.25.0 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-4mv18w-style";
    	style.textContent = "ripple-wrapper.svelte-4mv18w{position:absolute;top:0px;left:0px;right:0px;bottom:0px;overflow:hidden}ripple.svelte-4mv18w{width:var(--size);height:var(--size);border-radius:50%;background-color:var(--ripple-color, var(--ripple-normal));position:absolute;left:var(--x);top:var(--y);transform:translate3d(-50%, -50%, 0);pointer-events:none;box-shadow:0px 0px 2px rgba(0, 0, 0, 0.25)}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (111:4) {#each ripples as info (info.id)}
    function create_each_block(key_1, ctx) {
    	let ripple;
    	let vars_action;
    	let ripple_intro;
    	let mounted;
    	let dispose;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			ripple = element("ripple");
    			attr(ripple, "class", "svelte-4mv18w");
    			this.first = ripple;
    		},
    		m(target, anchor) {
    			insert(target, ripple, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, ripple, /*rippleVars*/ ctx[5](/*info*/ ctx[10], /*color*/ ctx[0])));
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (vars_action && is_function(vars_action.update) && dirty & /*ripples, color*/ 3) vars_action.update.call(null, /*rippleVars*/ ctx[5](/*info*/ ctx[10], /*color*/ ctx[0]));
    		},
    		i(local) {
    			if (!ripple_intro) {
    				add_render_callback(() => {
    					ripple_intro = create_in_transition(ripple, customAnimation, {});
    					ripple_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(ripple);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let ripple_wrapper;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let ripple_wrapper_resize_listener;
    	let mounted;
    	let dispose;
    	let each_value = /*ripples*/ ctx[1];
    	const get_key = ctx => /*info*/ ctx[10].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	return {
    		c() {
    			ripple_wrapper = element("ripple-wrapper");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(ripple_wrapper, "class", "svelte-4mv18w");
    			add_render_callback(() => /*ripple_wrapper_elementresize_handler*/ ctx[7].call(ripple_wrapper));
    		},
    		m(target, anchor) {
    			insert(target, ripple_wrapper, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ripple_wrapper, null);
    			}

    			ripple_wrapper_resize_listener = add_resize_listener(ripple_wrapper, /*ripple_wrapper_elementresize_handler*/ ctx[7].bind(ripple_wrapper));

    			if (!mounted) {
    				dispose = listen(ripple_wrapper, "touchstart", /*addRipple*/ ctx[4], { passive: true });
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*rippleVars, ripples, color*/ 35) {
    				const each_value = /*ripples*/ ctx[1];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ripple_wrapper, destroy_block, create_each_block, null, get_each_context);
    			}
    		},
    		i(local) {
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(ripple_wrapper);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			ripple_wrapper_resize_listener();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    const calcOffset = touch => {
    	const { target, clientX, clientY } = touch;
    	const rect = target.getBoundingClientRect();
    	const x = clientX - rect.left;
    	const y = clientY - rect.top;
    	return { x, y };
    };

    const customAnimation = (node, options) => {
    	return {
    		delay: 0,
    		duration: 500,
    		css: (t, u) => `
            transform: translate3d(-50%, -50%, 0) scale(${1 - u ** 1.3});
            opacity: ${u ** 1.3};
        `
    	};
    };

    const duration = 500;

    function instance($$self, $$props, $$invalidate) {
    	let { color = null } = $$props;
    	let { disabled = false } = $$props;
    	let ripples = [];
    	let height = 0;
    	let width = 0;

    	const addRipple = evt => {
    		if (disabled === true) {
    			return;
    		}

    		for (const touch of evt.changedTouches) {
    			const { x, y } = calcOffset(touch);
    			const ripple = { id: Date.now(), x, y, size };
    			$$invalidate(1, ripples = [...ripples, ripple]);
    			setTimeout(() => $$invalidate(1, ripples = ripples.filter(r => r !== ripple)), duration);
    		}
    	};

    	const rippleVars = (info, color) => ({
    		"x": [info.x, "px"],
    		"y": [info.y, "px"],
    		"size": [info.size, "px"],
    		"ripple-color": color
    	});

    	function ripple_wrapper_elementresize_handler() {
    		height = this.offsetHeight;
    		width = this.offsetWidth;
    		$$invalidate(2, height);
    		$$invalidate(3, width);
    	}

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("disabled" in $$props) $$invalidate(6, disabled = $$props.disabled);
    	};

    	let size;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*width, height*/ 12) {
    			 size = Math.max(width, height) * 2;
    		}
    	};

    	return [
    		color,
    		ripples,
    		height,
    		width,
    		addRipple,
    		rippleVars,
    		disabled,
    		ripple_wrapper_elementresize_handler
    	];
    }

    class Ripple extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-4mv18w-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { color: 0, disabled: 6 });
    	}
    }

    /* node_modules\svelte-doric\core\adornment.svelte generated by Svelte v3.25.0 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1issscl-style";
    	style.textContent = "adornment.svelte-1issscl{display:inline-flex;justify-content:center;align-items:center;padding:4px}adornment.start.svelte-1issscl{grid-area:start-adornment}adornment.end.svelte-1issscl{grid-area:end-adornment}";
    	append(document.head, style);
    }

    function create_fragment$1(ctx) {
    	let adornment;
    	let adornment_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			adornment = element("adornment");
    			if (default_slot) default_slot.c();
    			attr(adornment, "class", adornment_class_value = "" + (null_to_empty(/*position*/ ctx[0]) + " svelte-1issscl"));
    			attr(adornment, "style", /*style*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, adornment, anchor);

    			if (default_slot) {
    				default_slot.m(adornment, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*position*/ 1 && adornment_class_value !== (adornment_class_value = "" + (null_to_empty(/*position*/ ctx[0]) + " svelte-1issscl"))) {
    				attr(adornment, "class", adornment_class_value);
    			}

    			if (!current || dirty & /*style*/ 2) {
    				attr(adornment, "style", /*style*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(adornment);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { position = "" } = $$props;
    	let { style } = $$props;

    	$$self.$$set = $$props => {
    		if ("position" in $$props) $$invalidate(0, position = $$props.position);
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [position, style, $$scope, slots];
    }

    class Adornment extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1issscl-style")) add_css$1();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { position: 0, style: 1 });
    	}
    }

    /* node_modules\svelte-doric\core\app-bar.svelte generated by Svelte v3.25.0 */

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-1ygbcur-style";
    	style.textContent = "app-bar.svelte-1ygbcur{position:sticky;top:0px;left:0px;right:0px;height:56px;z-index:+50;background-color:var(--app-bar-background);color:var(--app-bar-text);display:grid;grid-template-columns:min-content auto min-content;grid-template-areas:\"start-adornment title end-adornment\"\r\n    ;box-shadow:0px 2px 2px rgba(0, 0, 0, 0.25);--button-fab-color:var(--app-bar-text);--ripple-color:var(--ripple-dark)}app-bar.flow.svelte-1ygbcur{position:relative;z-index:+0}app-bar.svelte-1ygbcur app-title{grid-area:title;font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}";
    	append(document.head, style);
    }

    function create_fragment$2(ctx) {
    	let app_bar;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			app_bar = element("app-bar");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(app_bar, "class", "svelte-1ygbcur");
    			toggle_class(app_bar, "flow", /*flow*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, app_bar, anchor);

    			if (default_slot) {
    				default_slot.m(app_bar, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (dirty & /*flow*/ 1) {
    				toggle_class(app_bar, "flow", /*flow*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(app_bar);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { flow } = $$props;

    	$$self.$$set = $$props => {
    		if ("flow" in $$props) $$invalidate(0, flow = $$props.flow);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [flow, $$scope, slots];
    }

    class App_bar extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1ygbcur-style")) add_css$2();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { flow: 0 });
    	}
    }

    /* node_modules\svelte-doric\core\app-theme.svelte generated by Svelte v3.25.0 */

    function create_fragment$3(ctx) {
    	let switch_instance0;
    	let t;
    	let switch_instance1;
    	let switch_instance1_anchor;
    	let current;
    	var switch_value = /*theme*/ ctx[0];

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		switch_instance0 = new switch_value(switch_props());
    	}

    	var switch_value_1 = /*baseline*/ ctx[1];

    	function switch_props_1(ctx) {
    		return {};
    	}

    	if (switch_value_1) {
    		switch_instance1 = new switch_value_1(switch_props_1());
    	}

    	return {
    		c() {
    			if (switch_instance0) create_component(switch_instance0.$$.fragment);
    			t = space();
    			if (switch_instance1) create_component(switch_instance1.$$.fragment);
    			switch_instance1_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance0) {
    				mount_component(switch_instance0, target, anchor);
    			}

    			insert(target, t, anchor);

    			if (switch_instance1) {
    				mount_component(switch_instance1, target, anchor);
    			}

    			insert(target, switch_instance1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (switch_value !== (switch_value = /*theme*/ ctx[0])) {
    				if (switch_instance0) {
    					group_outros();
    					const old_component = switch_instance0;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance0 = new switch_value(switch_props());
    					create_component(switch_instance0.$$.fragment);
    					transition_in(switch_instance0.$$.fragment, 1);
    					mount_component(switch_instance0, t.parentNode, t);
    				} else {
    					switch_instance0 = null;
    				}
    			}

    			if (switch_value_1 !== (switch_value_1 = /*baseline*/ ctx[1])) {
    				if (switch_instance1) {
    					group_outros();
    					const old_component = switch_instance1;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value_1) {
    					switch_instance1 = new switch_value_1(switch_props_1());
    					create_component(switch_instance1.$$.fragment);
    					transition_in(switch_instance1.$$.fragment, 1);
    					mount_component(switch_instance1, switch_instance1_anchor.parentNode, switch_instance1_anchor);
    				} else {
    					switch_instance1 = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance0) transition_in(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_in(switch_instance1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance0) transition_out(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_out(switch_instance1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (switch_instance0) destroy_component(switch_instance0, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(switch_instance1_anchor);
    			if (switch_instance1) destroy_component(switch_instance1, detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { theme = null } = $$props;
    	let { baseline = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("baseline" in $$props) $$invalidate(1, baseline = $$props.baseline);
    	};

    	return [theme, baseline];
    }

    class App_theme extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { theme: 0, baseline: 1 });
    	}
    }

    /* node_modules\svelte-doric\core\avatar.svelte generated by Svelte v3.25.0 */

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-1wdv2nx-style";
    	style.textContent = "avatar.svelte-1wdv2nx{display:inline-flex;background-image:var(--avatar-image);background-position:center center;background-size:var(--avatar-image-size);width:var(--avatar-size);height:var(--avatar-size);border-radius:50%;justify-content:center;align-items:center;background-color:var(--avatar-background, var(--button-default-fill));color:var(--avatar-text, var(--button-default-text));font-size:var(--text-size-header)}";
    	append(document.head, style);
    }

    function create_fragment$4(ctx) {
    	let avatar;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	return {
    		c() {
    			avatar = element("avatar");
    			if (default_slot) default_slot.c();
    			attr(avatar, "class", "svelte-1wdv2nx");
    		},
    		m(target, anchor) {
    			insert(target, avatar, anchor);

    			if (default_slot) {
    				default_slot.m(avatar, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, avatar, /*avatarVars*/ ctx[0]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 64) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[6], dirty, null, null);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*avatarVars*/ 1) vars_action.update.call(null, /*avatarVars*/ ctx[0]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(avatar);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { size = "36px" } = $$props;
    	let { imageSize = "contain" } = $$props;
    	let { image } = $$props;
    	let { textColor } = $$props;
    	let { background } = $$props;

    	$$self.$$set = $$props => {
    		if ("size" in $$props) $$invalidate(1, size = $$props.size);
    		if ("imageSize" in $$props) $$invalidate(2, imageSize = $$props.imageSize);
    		if ("image" in $$props) $$invalidate(3, image = $$props.image);
    		if ("textColor" in $$props) $$invalidate(4, textColor = $$props.textColor);
    		if ("background" in $$props) $$invalidate(5, background = $$props.background);
    		if ("$$scope" in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	let avatarVars;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*size, image, imageSize, background, textColor*/ 62) {
    			 $$invalidate(0, avatarVars = {
    				"avatar-size": size,
    				"avatar-image": image ? `url(${image})` : null,
    				"avatar-image-size": imageSize,
    				"avatar-background": background,
    				"avatar-text": textColor
    			});
    		}
    	};

    	return [avatarVars, size, imageSize, image, textColor, background, $$scope, slots];
    }

    class Avatar extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1wdv2nx-style")) add_css$3();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			size: 1,
    			imageSize: 2,
    			image: 3,
    			textColor: 4,
    			background: 5
    		});
    	}
    }

    /* node_modules\svelte-doric\core\baseline.svelte generated by Svelte v3.25.0 */

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-5rcxzn-style";
    	style.textContent = "html{margin:0px;padding:0px;width:100%;height:100%}body{margin:0px;padding:0px;width:100%;min-height:100%;-webkit-tap-highlight-color:transparent;font-family:var(--font);background-color:var(--background);color:var(--text-normal);font-size:var(--text-size);--app-bar-background:var(--primary);--app-bar-text:var(--text-invert);--button-default-fill:#aaaaaa;--button-default-text:var(--text-dark);--button-primary:var(--primary);--button-primary-text:var(--text-dark);--button-primary-ripple:var(--primary-ripple);--button-secondary:var(--secondary);--button-secondary-text:var(--text-dark);--button-secondary-ripple:var(--secondary-ripple);--button-danger:var(--danger);--button-danger-text:var(--text-dark);--button-danger-ripple:var(--danger-ripple);--button-filled-ripple:var(--ripple-invert);--card-background:var(--background-layer);--card-border:var(--layer-border-width) solid var(--text-normal);--control-border:var(--text-secondary);--control-border-focus:var(--primary);--control-border-error:var(--danger)}";
    	append(document.head, style);
    }

    function create_fragment$5(ctx) {
    	let link0;
    	let link1;
    	let link2;

    	return {
    		c() {
    			link0 = element("link");
    			link1 = element("link");
    			link2 = element("link");
    			attr(link0, "href", "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700");
    			attr(link0, "rel", "stylesheet");
    			attr(link0, "type", "text/css");
    			attr(link1, "href", "https://fonts.googleapis.com/css?family=Inconsolata:300,400,500,700");
    			attr(link1, "rel", "stylesheet");
    			attr(link1, "type", "text/css");
    			attr(link2, "href", "https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined");
    			attr(link2, "rel", "stylesheet");
    		},
    		m(target, anchor) {
    			append(document.head, link0);
    			append(document.head, link1);
    			append(document.head, link2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			detach(link0);
    			detach(link1);
    			detach(link2);
    		}
    	};
    }

    class Baseline extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-5rcxzn-style")) add_css$4();
    		init(this, options, null, create_fragment$5, safe_not_equal, {});
    	}
    }

    /* node_modules\svelte-doric\core\card.svelte generated by Svelte v3.25.0 */

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-yxlj1r-style";
    	style.textContent = "card.svelte-yxlj1r:not(.content):not(.actions){display:grid;border-radius:4px;margin:4px;background-color:var(--card-background);border:var(--card-border);box-shadow:0px 2px 4px rgba(0, 0, 0, 0.25);overflow:hidden}";
    	append(document.head, style);
    }

    function create_fragment$6(ctx) {
    	let card;
    	let card_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			card = element("card");
    			if (default_slot) default_slot.c();
    			attr(card, "style", /*style*/ ctx[0]);
    			attr(card, "class", card_class_value = "" + (null_to_empty(/*klass*/ ctx[1]) + " svelte-yxlj1r"));
    		},
    		m(target, anchor) {
    			insert(target, card, anchor);

    			if (default_slot) {
    				default_slot.m(card, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*style*/ 1) {
    				attr(card, "style", /*style*/ ctx[0]);
    			}

    			if (!current || dirty & /*klass*/ 2 && card_class_value !== (card_class_value = "" + (null_to_empty(/*klass*/ ctx[1]) + " svelte-yxlj1r"))) {
    				attr(card, "class", card_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(card);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { style } = $$props;
    	let { class: klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    		if ("class" in $$props) $$invalidate(1, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [style, klass, $$scope, slots];
    }

    class Card extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-yxlj1r-style")) add_css$5();
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, { style: 0, class: 1 });
    	}
    }

    /* node_modules\svelte-doric\core\portal.svelte generated by Svelte v3.25.0 */

    const portalRoot = document.createElement("portal-root");

    if (typeof document !== "undefined") {
    	document.body.appendChild(portalRoot);
    }

    /* node_modules\svelte-doric\core\divider.svelte generated by Svelte v3.25.0 */

    function add_css$6() {
    	var style = element("style");
    	style.id = "svelte-171wxy0-style";
    	style.textContent = "divider.svelte-171wxy0{display:block;height:1px;margin:8px;background-color:var(--text-secondary)}divider.vertical.svelte-171wxy0{width:1px;height:100%;align-self:stretch}list-container>divider.svelte-171wxy0{margin:0px}";
    	append(document.head, style);
    }

    function create_fragment$7(ctx) {
    	let divider;
    	let divider_class_value;

    	return {
    		c() {
    			divider = element("divider");
    			attr(divider, "style", /*style*/ ctx[1]);
    			attr(divider, "class", divider_class_value = "" + (null_to_empty(/*klass*/ ctx[2]) + " svelte-171wxy0"));
    			toggle_class(divider, "vertical", /*vertical*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, divider, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*style*/ 2) {
    				attr(divider, "style", /*style*/ ctx[1]);
    			}

    			if (dirty & /*klass*/ 4 && divider_class_value !== (divider_class_value = "" + (null_to_empty(/*klass*/ ctx[2]) + " svelte-171wxy0"))) {
    				attr(divider, "class", divider_class_value);
    			}

    			if (dirty & /*klass, vertical*/ 5) {
    				toggle_class(divider, "vertical", /*vertical*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(divider);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { vertical = false } = $$props;
    	let { style = "" } = $$props;
    	let { class: klass } = $$props;

    	$$self.$$set = $$props => {
    		if ("vertical" in $$props) $$invalidate(0, vertical = $$props.vertical);
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    		if ("class" in $$props) $$invalidate(2, klass = $$props.class);
    	};

    	return [vertical, style, klass];
    }

    class Divider extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-171wxy0-style")) add_css$6();
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, { vertical: 0, style: 1, class: 2 });
    	}
    }

    /* node_modules\svelte-doric\core\list\content.svelte generated by Svelte v3.25.0 */

    function add_css$7() {
    	var style = element("style");
    	style.id = "svelte-pvgd7u-style";
    	style.textContent = "list-item-content.svelte-pvgd7u{grid-area:content;display:flex;flex-direction:column;justify-content:center;align-items:stretch;grid-area:content;padding:8px}list-item-content.control.svelte-pvgd7u{padding:0px}";
    	append(document.head, style);
    }

    function create_fragment$8(ctx) {
    	let list_item_content;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			list_item_content = element("list-item-content");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(list_item_content, "class", "svelte-pvgd7u");
    			toggle_class(list_item_content, "control", /*control*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, list_item_content, anchor);

    			if (default_slot) {
    				default_slot.m(list_item_content, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (dirty & /*control*/ 1) {
    				toggle_class(list_item_content, "control", /*control*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(list_item_content);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { control } = $$props;

    	$$self.$$set = $$props => {
    		if ("control" in $$props) $$invalidate(0, control = $$props.control);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [control, $$scope, slots];
    }

    class Content extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-pvgd7u-style")) add_css$7();
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, { control: 0 });
    	}
    }

    /* node_modules\svelte-doric\core\list\header.svelte generated by Svelte v3.25.0 */

    function add_css$8() {
    	var style = element("style");
    	style.id = "svelte-1nqipxs-style";
    	style.textContent = "list-header.svelte-1nqipxs{display:grid;position:relative;padding:8px;color:var(--text-normal);background-color:var(--control-background);font-weight:500;font-size:var(--text-size-header);border-bottom:2px solid var(--text-normal)}list-header.sticky.svelte-1nqipxs{position:sticky;top:0px;z-index:+5}list-header.primary.svelte-1nqipxs{color:var(--button-primary)}list-header.secondary.svelte-1nqipxs{color:var(--button-secondary)}list-header.danger.svelte-1nqipxs{color:var(--button-danger)}.compact>list-header.svelte-1nqipxs{padding:4px}";
    	append(document.head, style);
    }

    function create_fragment$9(ctx) {
    	let list_header;
    	let list_header_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			list_header = element("list-header");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(list_header, "class", list_header_class_value = "" + (null_to_empty(/*color*/ ctx[1]) + " svelte-1nqipxs"));
    			toggle_class(list_header, "sticky", /*sticky*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, list_header, anchor);

    			if (default_slot) {
    				default_slot.m(list_header, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*color*/ 2 && list_header_class_value !== (list_header_class_value = "" + (null_to_empty(/*color*/ ctx[1]) + " svelte-1nqipxs"))) {
    				set_custom_element_data(list_header, "class", list_header_class_value);
    			}

    			if (dirty & /*color, sticky*/ 3) {
    				toggle_class(list_header, "sticky", /*sticky*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(list_header);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { sticky } = $$props;
    	let { color = "default" } = $$props;

    	$$self.$$set = $$props => {
    		if ("sticky" in $$props) $$invalidate(0, sticky = $$props.sticky);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [sticky, color, $$scope, slots];
    }

    class Header extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1nqipxs-style")) add_css$8();
    		init(this, options, instance$8, create_fragment$9, safe_not_equal, { sticky: 0, color: 1 });
    	}
    }

    /* node_modules\svelte-doric\core\list\item.svelte generated by Svelte v3.25.0 */

    function add_css$9() {
    	var style = element("style");
    	style.id = "svelte-yzbp42-style";
    	style.textContent = "list-item.svelte-yzbp42{display:grid;position:relative;overflow:hidden;padding:12px 16px;color:var(--text-normal);grid-template-areas:\"start-adornment content end-adornment\"\r\n    ;grid-template-columns:auto 1fr auto}list-item.clickable.svelte-yzbp42{cursor:pointer;user-select:none}.compact>list-item.svelte-yzbp42{padding:4px 8px}a.svelte-yzbp42{position:absolute;top:0px;left:0px;bottom:0px;right:0px;opacity:0}";
    	append(document.head, style);
    }

    // (42:4) {#if clickable}
    function create_if_block_1(ctx) {
    	let ripple;
    	let current;
    	ripple = new Ripple({});

    	return {
    		c() {
    			create_component(ripple.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(ripple, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(ripple, detaching);
    		}
    	};
    }

    // (45:4) {#if href}
    function create_if_block(ctx) {
    	let a;
    	let t;

    	return {
    		c() {
    			a = element("a");
    			t = text(/*href*/ ctx[1]);
    			attr(a, "href", /*href*/ ctx[1]);
    			attr(a, "target", /*target*/ ctx[2]);
    			attr(a, "class", "svelte-yzbp42");
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*href*/ 2) set_data(t, /*href*/ ctx[1]);

    			if (dirty & /*href*/ 2) {
    				attr(a, "href", /*href*/ ctx[1]);
    			}

    			if (dirty & /*target*/ 4) {
    				attr(a, "target", /*target*/ ctx[2]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    		}
    	};
    }

    function create_fragment$a(ctx) {
    	let list_item;
    	let t0;
    	let t1;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
    	let if_block0 = /*clickable*/ ctx[0] && create_if_block_1();
    	let if_block1 = /*href*/ ctx[1] && create_if_block(ctx);

    	return {
    		c() {
    			list_item = element("list-item");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			set_custom_element_data(list_item, "class", "svelte-yzbp42");
    			toggle_class(list_item, "clickable", /*clickable*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, list_item, anchor);

    			if (default_slot) {
    				default_slot.m(list_item, null);
    			}

    			append(list_item, t0);
    			if (if_block0) if_block0.m(list_item, null);
    			append(list_item, t1);
    			if (if_block1) if_block1.m(list_item, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(list_item, "click", /*click_handler*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}

    			if (/*clickable*/ ctx[0]) {
    				if (if_block0) {
    					if (dirty & /*clickable*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1();
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(list_item, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*href*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(list_item, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*clickable*/ 1) {
    				toggle_class(list_item, "clickable", /*clickable*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(if_block0);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(list_item);
    			if (default_slot) default_slot.d(detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { clickable } = $$props;
    	let { href = null } = $$props;
    	let { target = "_blank" } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("clickable" in $$props) $$invalidate(0, clickable = $$props.clickable);
    		if ("href" in $$props) $$invalidate(1, href = $$props.href);
    		if ("target" in $$props) $$invalidate(2, target = $$props.target);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [clickable, href, target, $$scope, slots, click_handler];
    }

    class Item extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-yzbp42-style")) add_css$9();
    		init(this, options, instance$9, create_fragment$a, safe_not_equal, { clickable: 0, href: 1, target: 2 });
    	}
    }

    /* node_modules\svelte-doric\core\list.svelte generated by Svelte v3.25.0 */

    function add_css$a() {
    	var style = element("style");
    	style.id = "svelte-dk8009-style";
    	style.textContent = "list-container.svelte-dk8009{display:grid;grid-template-columns:1fr;overflow:auto}";
    	append(document.head, style);
    }

    function create_fragment$b(ctx) {
    	let list_container;
    	let list_container_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);

    	return {
    		c() {
    			list_container = element("list-container");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(list_container, "class", list_container_class_value = "" + (null_to_empty(/*klass*/ ctx[1]) + " svelte-dk8009"));
    			set_custom_element_data(list_container, "style", /*styleText*/ ctx[2]);
    			toggle_class(list_container, "compact", /*compact*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, list_container, anchor);

    			if (default_slot) {
    				default_slot.m(list_container, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 128) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[7], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 2 && list_container_class_value !== (list_container_class_value = "" + (null_to_empty(/*klass*/ ctx[1]) + " svelte-dk8009"))) {
    				set_custom_element_data(list_container, "class", list_container_class_value);
    			}

    			if (!current || dirty & /*styleText*/ 4) {
    				set_custom_element_data(list_container, "style", /*styleText*/ ctx[2]);
    			}

    			if (dirty & /*klass, compact*/ 3) {
    				toggle_class(list_container, "compact", /*compact*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(list_container);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { items } = $$props;
    	let { clickable } = $$props;
    	let { height } = $$props;
    	let { compact } = $$props;
    	let { style = "" } = $$props;
    	let { class: klass = "" } = $$props;
    	const dispatch = createEventDispatcher();

    	$$self.$$set = $$props => {
    		if ("items" in $$props) $$invalidate(3, items = $$props.items);
    		if ("clickable" in $$props) $$invalidate(4, clickable = $$props.clickable);
    		if ("height" in $$props) $$invalidate(5, height = $$props.height);
    		if ("compact" in $$props) $$invalidate(0, compact = $$props.compact);
    		if ("style" in $$props) $$invalidate(6, style = $$props.style);
    		if ("class" in $$props) $$invalidate(1, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(7, $$scope = $$props.$$scope);
    	};

    	let styleText;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*height, style*/ 96) {
    			 $$invalidate(2, styleText = height ? `height: ${height}; ${style}` : style);
    		}
    	};

    	return [compact, klass, styleText, items, clickable, height, style, $$scope, slots];
    }

    class List extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-dk8009-style")) add_css$a();

    		init(this, options, instance$a, create_fragment$b, safe_not_equal, {
    			items: 3,
    			clickable: 4,
    			height: 5,
    			compact: 0,
    			style: 6,
    			class: 1
    		});
    	}
    }

    /* node_modules\svelte-doric\core\theme\dark.svelte generated by Svelte v3.25.0 */

    function create_fragment$c(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_anchor = empty();
    			html_tag = new HtmlTag(html_anchor);
    		},
    		m(target, anchor) {
    			html_tag.m(/*theme*/ ctx[0], target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    function instance$b($$self) {
    	const theme = css`
        body {
            --font: Inconsolata;
            --background: #161616;
            --background-layer: #333333;
            --layer-border-width: 1px;

            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;

            --primary: #00aaff;
            --primary-ripple: #00aaff60;
            --secondary: #2fbc2f;
            --secondary-ripple: #2fbc2f60;
            --danger: #df5348;
            --danger-ripple: #df534860;

            --text-normal: var(--text-light);
            --text-secondary: #a0a0a0;
            --text-invert: var(--text-dark);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-secondary: 12px;

            --ripple-normal: var(--ripple-light);
            --ripple-invert: var(--ripple-dark);
        }
    `;

    	return [theme];
    }

    class Dark extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$b, create_fragment$c, safe_not_equal, {});
    	}
    }

    /* src\theme.svelte generated by Svelte v3.25.0 */

    function create_fragment$d(ctx) {
    	let darktheme;
    	let t;
    	let html_tag;
    	let html_anchor;
    	let current;
    	darktheme = new Dark({});

    	return {
    		c() {
    			create_component(darktheme.$$.fragment);
    			t = space();
    			html_anchor = empty();
    			html_tag = new HtmlTag(html_anchor);
    		},
    		m(target, anchor) {
    			mount_component(darktheme, target, anchor);
    			insert(target, t, anchor);
    			html_tag.m(/*themeCSS*/ ctx[0], target, anchor);
    			insert(target, html_anchor, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(darktheme.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(darktheme.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(darktheme, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    function instance$c($$self) {
    	const themeCSS = css`
        body {
            --background-layer: #000000a4;
            --font: Megaman;
        }

        @font-face {
            font-family: "Megaman";
            src: url(./font/megaman2.woff) format("woff");
        }
    `;

    	return [themeCSS];
    }

    class Theme extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$c, create_fragment$d, safe_not_equal, {});
    	}
    }

    /* src\links.svelte generated by Svelte v3.25.0 */

    function add_css$b() {
    	var style = element("style");
    	style.id = "svelte-h3tm3-style";
    	style.textContent = "icon.svelte-h3tm3{font-size:36px}";
    	append(document.head, style);
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i][0];
    	child_ctx[3] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i][0];
    	child_ctx[3] = list[i][1];
    	return child_ctx;
    }

    // (23:4) <ListHeader color="primary">
    function create_default_slot_7(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Socials");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (28:12) <Adornment position="start">
    function create_default_slot_6(ctx) {
    	let icon;
    	let icon_class_value;

    	return {
    		c() {
    			icon = element("icon");
    			attr(icon, "class", icon_class_value = "ion-logo-" + /*text*/ ctx[3].toLowerCase() + " svelte-h3tm3");
    		},
    		m(target, anchor) {
    			insert(target, icon, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*socials*/ 1 && icon_class_value !== (icon_class_value = "ion-logo-" + /*text*/ ctx[3].toLowerCase() + " svelte-h3tm3")) {
    				attr(icon, "class", icon_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(icon);
    		}
    	};
    }

    // (31:12) <ListItemContent>
    function create_default_slot_5(ctx) {
    	let t_value = /*text*/ ctx[3] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*socials*/ 1 && t_value !== (t_value = /*text*/ ctx[3] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (27:8) <ListItem {href}>
    function create_default_slot_4(ctx) {
    	let adornment;
    	let t;
    	let listitemcontent;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			}
    		});

    	listitemcontent = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(adornment.$$.fragment);
    			t = space();
    			create_component(listitemcontent.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(adornment, target, anchor);
    			insert(target, t, anchor);
    			mount_component(listitemcontent, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const adornment_changes = {};

    			if (dirty & /*$$scope, socials*/ 257) {
    				adornment_changes.$$scope = { dirty, ctx };
    			}

    			adornment.$set(adornment_changes);
    			const listitemcontent_changes = {};

    			if (dirty & /*$$scope, socials*/ 257) {
    				listitemcontent_changes.$$scope = { dirty, ctx };
    			}

    			listitemcontent.$set(listitemcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(adornment.$$.fragment, local);
    			transition_in(listitemcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(adornment.$$.fragment, local);
    			transition_out(listitemcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(adornment, detaching);
    			if (detaching) detach(t);
    			destroy_component(listitemcontent, detaching);
    		}
    	};
    }

    // (26:4) {#each socials as [href, text] (href)}
    function create_each_block_1(key_1, ctx) {
    	let first;
    	let listitem;
    	let current;

    	listitem = new Item({
    			props: {
    				href: /*href*/ ctx[2],
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(listitem.$$.fragment);
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(listitem, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitem_changes = {};
    			if (dirty & /*socials*/ 1) listitem_changes.href = /*href*/ ctx[2];

    			if (dirty & /*$$scope, socials*/ 257) {
    				listitem_changes.$$scope = { dirty, ctx };
    			}

    			listitem.$set(listitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(listitem, detaching);
    		}
    	};
    }

    // (39:4) <ListHeader color="secondary">
    function create_default_slot_3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Open Source Projects");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (44:12) <ListItemContent>
    function create_default_slot_2(ctx) {
    	let t_value = /*text*/ ctx[3] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*projects*/ 2 && t_value !== (t_value = /*text*/ ctx[3] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (43:8) <ListItem {href}>
    function create_default_slot_1(ctx) {
    	let listitemcontent;
    	let t;
    	let current;

    	listitemcontent = new Content({
    			props: {
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(listitemcontent.$$.fragment);
    			t = space();
    		},
    		m(target, anchor) {
    			mount_component(listitemcontent, target, anchor);
    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitemcontent_changes = {};

    			if (dirty & /*$$scope, projects*/ 258) {
    				listitemcontent_changes.$$scope = { dirty, ctx };
    			}

    			listitemcontent.$set(listitemcontent_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitemcontent.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitemcontent.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listitemcontent, detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (42:4) {#each projects as [href, text] (href)}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let listitem;
    	let current;

    	listitem = new Item({
    			props: {
    				href: /*href*/ ctx[2],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(listitem.$$.fragment);
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(listitem, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listitem_changes = {};
    			if (dirty & /*projects*/ 2) listitem_changes.href = /*href*/ ctx[2];

    			if (dirty & /*$$scope, projects*/ 258) {
    				listitem_changes.$$scope = { dirty, ctx };
    			}

    			listitem.$set(listitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listitem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(listitem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(listitem, detaching);
    		}
    	};
    }

    // (22:0) <List>
    function create_default_slot(ctx) {
    	let listheader0;
    	let t0;
    	let each_blocks_1 = [];
    	let each0_lookup = new Map();
    	let t1;
    	let divider;
    	let t2;
    	let listheader1;
    	let t3;
    	let each_blocks = [];
    	let each1_lookup = new Map();
    	let each1_anchor;
    	let current;

    	listheader0 = new Header({
    			props: {
    				color: "primary",
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value_1 = /*socials*/ ctx[0];
    	const get_key = ctx => /*href*/ ctx[2];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	divider = new Divider({});

    	listheader1 = new Header({
    			props: {
    				color: "secondary",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value = /*projects*/ ctx[1];
    	const get_key_1 = ctx => /*href*/ ctx[2];

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	return {
    		c() {
    			create_component(listheader0.$$.fragment);
    			t0 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();
    			create_component(divider.$$.fragment);
    			t2 = space();
    			create_component(listheader1.$$.fragment);
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    		},
    		m(target, anchor) {
    			mount_component(listheader0, target, anchor);
    			insert(target, t0, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(target, anchor);
    			}

    			insert(target, t1, anchor);
    			mount_component(divider, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(listheader1, target, anchor);
    			insert(target, t3, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const listheader0_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listheader0_changes.$$scope = { dirty, ctx };
    			}

    			listheader0.$set(listheader0_changes);

    			if (dirty & /*socials*/ 1) {
    				const each_value_1 = /*socials*/ ctx[0];
    				group_outros();
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, t1.parentNode, outro_and_destroy_block, create_each_block_1, t1, get_each_context_1);
    				check_outros();
    			}

    			const listheader1_changes = {};

    			if (dirty & /*$$scope*/ 256) {
    				listheader1_changes.$$scope = { dirty, ctx };
    			}

    			listheader1.$set(listheader1_changes);

    			if (dirty & /*projects*/ 2) {
    				const each_value = /*projects*/ ctx[1];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, each1_anchor.parentNode, outro_and_destroy_block, create_each_block$1, each1_anchor, get_each_context$1);
    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(listheader0.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			transition_in(divider.$$.fragment, local);
    			transition_in(listheader1.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(listheader0.$$.fragment, local);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			transition_out(divider.$$.fragment, local);
    			transition_out(listheader1.$$.fragment, local);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_component(listheader0, detaching);
    			if (detaching) detach(t0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d(detaching);
    			}

    			if (detaching) detach(t1);
    			destroy_component(divider, detaching);
    			if (detaching) detach(t2);
    			destroy_component(listheader1, detaching);
    			if (detaching) detach(t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach(each1_anchor);
    		}
    	};
    }

    function create_fragment$e(ctx) {
    	let list;
    	let current;

    	list = new List({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(list.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(list, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const list_changes = {};

    			if (dirty & /*$$scope, projects, socials*/ 259) {
    				list_changes.$$scope = { dirty, ctx };
    			}

    			list.$set(list_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(list, detaching);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { socials } = $$props;
    	let { projects } = $$props;

    	$$self.$$set = $$props => {
    		if ("socials" in $$props) $$invalidate(0, socials = $$props.socials);
    		if ("projects" in $$props) $$invalidate(1, projects = $$props.projects);
    	};

    	return [socials, projects];
    }

    class Links extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-h3tm3-style")) add_css$b();
    		init(this, options, instance$d, create_fragment$e, safe_not_equal, { socials: 0, projects: 1 });
    	}
    }

    /* src\app.svelte generated by Svelte v3.25.0 */

    function add_css$c() {
    	var style = element("style");
    	style.id = "svelte-h5q0zx-style";
    	style.textContent = "body, html{width:100%;height:100%;position:fixed;overflow:hidden}body::before{position:fixed;top:0px;left:0px;bottom:0px;right:0px;content:\"\";background-image:url(images/axel-minimalist-bg.png);background-position:75% 50%;background-size:cover;background-repeat:no-repeat;opacity:0.25;z-index:-1}mobile-test.svelte-h5q0zx{position:absolute;top:0px;left:0px;right:0px;bottom:0px;overflow:auto}content-wrapper.svelte-h5q0zx{width:100%;max-width:320px;display:grid}app-title.svelte-h5q0zx{justify-content:center}";
    	append(document.head, style);
    }

    // (82:12) <AppBar>
    function create_default_slot_1$1(ctx) {
    	let app_title;
    	let avatar;
    	let t;
    	let current;

    	avatar = new Avatar({
    			props: { image: "./images/megaman-rounded.png" }
    		});

    	return {
    		c() {
    			app_title = element("app-title");
    			create_component(avatar.$$.fragment);
    			t = text("\r\n                     Axel669");
    			set_custom_element_data(app_title, "class", "svelte-h5q0zx");
    		},
    		m(target, anchor) {
    			insert(target, app_title, anchor);
    			mount_component(avatar, app_title, null);
    			append(app_title, t);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(avatar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(avatar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(app_title);
    			destroy_component(avatar);
    		}
    	};
    }

    // (81:8) <Card>
    function create_default_slot$1(ctx) {
    	let appbar;
    	let t;
    	let links;
    	let current;

    	appbar = new App_bar({
    			props: {
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	links = new Links({
    			props: {
    				socials: /*socials*/ ctx[0],
    				projects: /*projects*/ ctx[1]
    			}
    		});

    	return {
    		c() {
    			create_component(appbar.$$.fragment);
    			t = space();
    			create_component(links.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(appbar, target, anchor);
    			insert(target, t, anchor);
    			mount_component(links, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const appbar_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				appbar_changes.$$scope = { dirty, ctx };
    			}

    			appbar.$set(appbar_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(appbar.$$.fragment, local);
    			transition_in(links.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(appbar.$$.fragment, local);
    			transition_out(links.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(appbar, detaching);
    			if (detaching) detach(t);
    			destroy_component(links, detaching);
    		}
    	};
    }

    function create_fragment$f(ctx) {
    	let link;
    	let t0;
    	let apptheme;
    	let t1;
    	let mobile_test;
    	let content_wrapper;
    	let card;
    	let current;
    	apptheme = new App_theme({ props: { baseline: Baseline, theme: Theme } });

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			link = element("link");
    			t0 = space();
    			create_component(apptheme.$$.fragment);
    			t1 = space();
    			mobile_test = element("mobile-test");
    			content_wrapper = element("content-wrapper");
    			create_component(card.$$.fragment);
    			attr(link, "href", "https://unpkg.com/ionicons@4.5.10-0/dist/css/ionicons.min.css");
    			attr(link, "rel", "stylesheet");
    			set_custom_element_data(content_wrapper, "class", "svelte-h5q0zx");
    			set_custom_element_data(mobile_test, "class", "svelte-h5q0zx");
    		},
    		m(target, anchor) {
    			append(document.head, link);
    			insert(target, t0, anchor);
    			mount_component(apptheme, target, anchor);
    			insert(target, t1, anchor);
    			insert(target, mobile_test, anchor);
    			append(mobile_test, content_wrapper);
    			mount_component(card, content_wrapper, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(apptheme.$$.fragment, local);
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(apptheme.$$.fragment, local);
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			detach(link);
    			if (detaching) detach(t0);
    			destroy_component(apptheme, detaching);
    			if (detaching) detach(t1);
    			if (detaching) detach(mobile_test);
    			destroy_component(card);
    		}
    	};
    }

    function instance$e($$self) {
    	const socials = [
    		["https://github.com/axel669", "Github"],
    		["https://www.twitch.tv/axel669", "Twitch"],
    		["https://twitter.com/Axel669", "Twitter"],
    		["https://www.linkedin.com/pub/chris-morgan/82/870/264", "LinkedIn"]
    	];

    	const projects = [
    		["https://github.com/axel669/svelte-doric", "Svelte Doric"],
    		["https://github.com/axel669/axel-query", "Axel Query"],
    		["https://github.com/axel669/norn", "Norn"],
    		["#", "Kingsport (Coming Soon)"],
    		["#", "Ratatoskr (Coming Soon)"]
    	];

    	return [socials, projects];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-h5q0zx-style")) add_css$c();
    		init(this, options, instance$e, create_fragment$f, safe_not_equal, {});
    	}
    }

    const app = new App({
        target: document.body
    });

    console.log(app);

}());
