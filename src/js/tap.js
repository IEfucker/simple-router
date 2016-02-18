/**
 * Created by jack on 2016/1/26.
 */

/*
* create and trigger tap event
*
**/
define(function (require, exports, module) {
    function createTap(){
        var deltaX = 0,
            deltaY = 0,
            startPoint = {},
            tapType = 'tap',
            cancelled = false;
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
                var tapEvent = new Event(tapType, {
                        bubbles: true,
                        cancelable: true
                });
                cancelled  = !el.dispatchEvent(tapEvent);
                if(cancelled){
                    e.preventDefault();
                    return false;
                }
            }
            deltaX = deltaY = 0;
        }, false);

        //prevent link redirection in 'click' event
        document.body.addEventListener('click', function(e){
            if(cancelled){
                e.preventDefault();
                return false;
            }
        }, false);
    }


    return new createTap();

})
