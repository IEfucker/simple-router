/**
 * Created by jack on 2016/1/26.
 */

/*
* create and trigger tap event
*
**/
define(function (require, exports, module) {
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
