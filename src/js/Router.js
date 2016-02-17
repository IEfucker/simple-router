/**
 * Created by jack on 2016/2/5.
 */
define(function(require, exports, module){
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