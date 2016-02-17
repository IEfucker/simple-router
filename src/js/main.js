/**
 * Created by jack on 2016/2/17.
 */
define(function (require, exports, module) {
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