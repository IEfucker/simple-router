(function () {
/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond.js", function(){});

 define('HashHandler',['require','exports','module'],function(require, exports, module) {
//(function(){


    var HashHandler = (function(){
        var lc = window.location;
        function getByURL(url){
            var hash;            
            url && url.replace(new RegExp('#(.*)', 'g'),function($1,$2){
                hash = $2;
            });
            return hash;
        }
        function get(){
            return getByURL(lc.hash);
        }
        function set(hash){
            lc.hash = hash;
        }
        return {
            get: get,
            set: set,
            getByURL: getByURL
        }
    })();
     return HashHandler;
    //window.HashHandler = HashHandler;
//}());
 });

/**
 * Created by jack on 2016/2/5.
 */
define('Router',['require','exports','module','HashHandler'],function(require, exports, module){
    var HashHandler = require('HashHandler');
    function Router(options){
        var r = this;
        if(options === undefined || Object.prototype.toString.apply(options) !== "[object Object]") throw('Router options missed or type error');
        var subscrible = options.subscrible,
            defaultView = options.defaultView,
            onChanged = options.onChanged,
            onInit = options.onInit,
            initHashString = formatHash(HashHandler.get()),
            isReady = false,
            currentAction;

        window.addEventListener('hashchange', locationHashChanged, false);

        function locationHashChanged(e){
            if(!isReady || !validateHash(formatHash(HashHandler.get()))) return;// not yet init or invalid hash
            //console.log(e);
            e && e.preventDefault();


            currentAction = formatHash(HashHandler.get());
            //console.log(currentAction);
            updateRouter(currentAction);
            //console.log(r);

            //console.log(arguments[0].oldURL);
            onChanged(currentAction, formatHash(HashHandler.getByURL(arguments[0].oldURL)));

        }

        function formatHash(hash){
            if(hash){
                //hash can not contain queryString
                hash = hash.replace(/\?.*/g,'');
            }
            return hash;
        }

        // validate hash with subscribled view when init
        function validateHash(hash){
            hash = (subscrible.indexOf(hash) < 0) ? defaultView : hash;
            return hash;
        }

        function _init(){
            r.initHash = validateHash(initHashString);
            r.views = subscrible;
            r.path = [];
            r.currentView = currentAction = r.initHash;
            if(r.initHash !== initHashString){
                window.location.hash = r.initHash;//trigger hashChanged event
            }
            r.path.push(r.initHash);

            isReady = true;
            onInit(r);
        }
        _init();

        function updateRouter(hash){
            //console.log(r.path);
            if(hash !== r.path[r.path.length - 2]){
                r.path.push(hash);
            }else{
                //console.log(1111);
                r.path.pop();
            }
            r.currentView = hash;
        }



    }

    Router.prototype.go = function (action) {
        if(action === this.path[this.path.length - 2]){
            this.back();
            return;
        }
        this.forward(action);
    }

    Router.prototype.forward = function (action) {
        if(action === undefined){
            window.history.forward();
        }else if(typeof action==='number'){
            window.history.go(action);
        }else if(typeof action==='string'){
            HashHandler.set(action);
        }
    }

    Router.prototype.back = function () {
        window.history.go(-1);
    }
    return Router;
});
/**
 * Created by jack on 2016/1/26.
 */

/*
* create and trigger tap event
*
**/
define('tap.js',['require','exports','module'],function (require, exports, module) {
    function createTap(){

        var deltaX = deltaY = 0,
            startPoint = {},
            tapType = 'tap';

        document.body.addEventListener('touchstart', function (e) {
            startPoint['x'] = e.touches[0].clientX;
            startPoint['y'] = e.touches[0].clientY;
        }, false);

        document.body.addEventListener('touchmove', function (e) {
            deltaX = e.touches[0].clientX - startPoint['x'];
            deltaY = e.touches[0].clientY - startPoint['y'];
            //console.log('touchmove',deltaX, deltaY);
        }, false);

        document.body.addEventListener('touchend', function (e) {
            deltaX = Math.abs(deltaX);
            deltaY = Math.abs(deltaY);
            var el = e.target;
            if(deltaX < 20 && deltaY < 20){
                //var tapEvent = new Event(tapType);
                var tapEvent = new CustomEvent(tapType, {
                        bubbles: true,
                        cancelable: true
                });
                var canceled  = el.dispatchEvent(tapEvent);
                (!canceled) && e.preventDefault();
            }
            deltaX = deltaY = 0;
        }, false);
    }

    return new createTap();

})
;
/**
 * Created by jack on 2016/2/17.
 */
define('main.js',['require','exports','module','Router','tap.js'],function (require, exports, module) {
    var Router = require('Router'),
        tap = require('tap.js');


    var ua = navigator.userAgent,
        tapEvent = (RegExp("Mobile").test(ua) && typeof tap === 'object') ? 'tap' : 'click',
        views = getViews(),
        body = document.body,
        backBtn = document.querySelector('.cross-btn') || document.createElement('div'),
        links = document.querySelector('.view-home .contain') || document.createElement('div');


    /*for mobile optimize*/
    if (RegExp("Mobile").test(ua)) {
        body.classList.add("mobile");
    }

    /*add router*/
    var router = new Router({
        subscrible: views,//type array
        defaultView: 'home',
        onChanged: hashChange,
        onInit: function (r) {
            renderView(r.initHash);
        }
    });

    /*router callbacks*/
    function hashChange(currentView, oldView) {
        renderView(currentView, oldView);
    }

    function renderView(className, oldView) {
        oldView !== '' && body.classList.remove(oldView);
        body.classList.add(className);

        if (className === 'home') {
            backBtn.classList.remove('on');
        } else {
            setTimeout(function () {
                backBtn.classList.add('on');
            }, 500);//after layer's transition's done
        }
    }

    //get views className array list, like ["home", "view1", ...]
    function getViews() {
        var sections = document.querySelectorAll(".view"),
            cList = [];
        for (var i = 0; i < sections.length; i++) {
            cList.push(sections[i].className.match(/view-[^ ]+/g)[0].replace("view-", ""));
        }
        return cList;
    }

    /*link tap/click event*/
    links.addEventListener(tapEvent, function (e) {
        var el = e.target;
        if (el.tagName !== 'BUTTON') return;
        var href = el.getAttribute('data-href');
        //console.log(href);
        if (href !== router.currentView) {
            router.go(href);
        }
    }, false);

    //back button tap/click event
    backBtn.addEventListener(tapEvent, function (e) {
        e.preventDefault();
        router.go('home');

    }, false);

    body.classList.add('ready');
});
require(["main.js"]);
}());