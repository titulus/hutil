// LICENSE_CODE ZON
'use strict'; /*zlint br*/
define(['angular_1_4_8', '/util/escape.js', '/util/date.js'],
    function(angular, zescape, date){
angular.module('angular_util', [])
.filter('zdate', function(){
    return function(d, format, opt){
        if (opt=='local')
            opt = {local: true};
        else if (/^[+-]\d\d:?\d\d$/.test(opt))
            opt = {timezone: opt.replace(':', '')};
        return date.strftime(format||'%v', d, opt);
    };
}).filter('ms_to_dur', function(){
    return date.ms_to_dur.bind(date);
}).filter('nl2br', ['$sce', function($sce){
    return function(input){
        return $sce.trustAsHtml((''+(input||'')).replace(/\n/g, '<br>')); };
}]).filter('uri_comp', function(){
    return zescape.uri_comp.bind(zescape);
}).filter('mailto', function(){
    return zescape.mailto_url.bind(zescape);
});
});
