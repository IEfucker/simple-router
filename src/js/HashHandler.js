 define(function(require, exports, module) {
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
