// LICENSE_CODE ZON ISC
'use strict'; /*jslint node:true, browser:true*/
(function(){
var define;
var is_node = typeof module=='object' && module.exports;
if (!is_node)
    define = self.define;
else
    define = require('./require_node.js').define(module, '../');
define([], function(){
var E = date_get;

function pad(num, size){ return ('000'+num).slice(-size); }

E.ms_to_dur = function(_ms){
    var s = '';
    var sec = Math.floor(_ms/1000);
    if (sec<0)
    {
	s += '-';
	sec = -sec;
    }
    var days = Math.floor(sec/(60*60*24));
    sec -= days*60*60*24;
    var hours = Math.floor(sec/(60*60));
    sec -= hours*60*60;
    var mins = Math.floor(sec/60);
    sec -= mins*60;
    if (days)
	s += days + ' ' + (days>1 ? 'Days' : 'Day') + ' ';
    return s+pad(hours, 2)+':'+pad(mins, 2)+':'+pad(sec, 2);
};

E.dur_to_str = function(duration){
    var ret = '';
    function chop(period, name){
        if (duration<period)
            return;
        var number = Math.floor(duration/period);
        ret += number+name;
        duration -= number*period;
    }
    chop(ms.DAY, 'd');
    chop(ms.HOUR, 'h');
    chop(ms.MIN, 'm');
    chop(ms.SEC, 's');
    if (duration)
        ret += duration+'ms';
    if (!ret)
        ret = '0s';
    return ret;
};

E.monotonic = undefined;
E.init = function(){
    if (typeof window=='object' && window.performance
        && window.performance.now)
    {
        // 10% slower than Date.now, but always monotonic
        E.monotonic = window.performance.now.bind(window.performance);
    }
    else if (is_node && !global.mocha_running)
    {
        // brings libuv monotonic time since process start
        var timer = process.binding('timer_wrap').Timer;
        E.monotonic = timer.now.bind(timer);
    }
    else
    {
        var monotonic_last = 0, monotonic_adjust = 0;
        E.monotonic = function(){
            var now = Date.now()+monotonic_adjust;
            if (now>=monotonic_last)
                return E.monotonic_last = now;
            monotonic_adjust += monotonic_last-now;
            return monotonic_last;
        };
    }
};
E.init();

E.str_to_dur = function(str){
    var r = /^(([0-9]+)d)?(([0-9]+)h)?(([0-9]+)m)?(([0-9]+)s)?(([0-9]+)ms)?$/;
    var m = str.match(r);
    if (!m)
        return;
    return ms.DAY*(+m[2]||0)+ms.HOUR*(+m[4]||0)+ms.MIN*(+m[6]||0)
        +ms.SEC*(+m[8]||0)+(+m[10]||0);
};

E.months_long = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
E.months_short = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
    'Sep', 'Oct', 'Nov', 'Dec'];
var months_short_lc = E.months_short.map(function(m){
    return m.toLowerCase(); });
E.days_long = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
    'Friday', 'Saturday'];
var days_long_lc = E.days_long.map(function(d){ return d.toLowerCase(); });
E.days_short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var days_short_lc = E.days_short.map(function(d){ return d.toLowerCase(); });
E.locale = {months_long: E.months_long, months_short: E.months_short,
    days_long: E.days_long, days_short: E.days_short, AM: 'AM', PM: 'PM'};
E.get = date_get;
function date_get(d, _new){
    var y, mon, day, H, M, S, _ms;
    if (d===undefined)
	return new Date();
    if (d==null)
	return new Date(null);
    if (d instanceof Date)
	return _new ? new Date(d) : d;
    if (typeof d==='string')
    {
	var m;
	// check for ISO/SQL/JDate date
	if (m = /^\s*((\d\d\d\d)-(\d\d)-(\d\d)|(\d\d?)-([A-Za-z]{3})-(\d\d(\d\d)?))\s*([\sT](\d\d):(\d\d)(:(\d\d)(\.(\d\d\d))?)?Z?)?\s*$/
	    .exec(d))
	{
            H = +m[10]||0; M = +m[11]||0; S = +m[13]||0; _ms = +m[15]||0;
            if (m[2]) // SQL or ISO date
            {
                y = +m[2]; mon = +m[3]; day = +m[4];
                if (!y && !mon && !day && !H && !M && !S && !_ms)
                    return new Date(NaN);
                return new Date(Date.UTC(y, mon-1, day, H, M, S, _ms));
            }
            if (m[5]) // jdate
            {
                y = +m[7];
                mon = months_short_lc.indexOf(m[6].toLowerCase())+1;
                day = +m[5];
                if (m[7].length==2)
                {
                    y = +y;
                    y += y>=70 ? 1900 : 2000;
                }
                return new Date(Date.UTC(y, mon-1, day, H, M, S, _ms));
            }
            // cannot reach here
        }
        // check for string timestamp
        if (m = /^\s*(\d+)\s*$/.exec(d))
            return new Date(+d);
        // else might be parsed as non UTC!
        return new Date(d);
    }
    if (typeof d==='number')
	return new Date(d);
    throw new TypeError();
}

E.to_sql_ms = function(d){
    d = E.get(d);
    if (isNaN(d))
        return '0000-00-00 00:00:00.000';
    return pad(d.getUTCFullYear(), 4)+'-'+pad(d.getUTCMonth()+1, 2)
    +'-'+pad(d.getUTCDate(), 2)
    +' '+pad(d.getUTCHours(), 2)+':'+pad(d.getUTCMinutes(), 2)
    +':'+pad(d.getUTCSeconds(), 2)
    +'.'+pad(d.getUTCMilliseconds(), 3);
};
E.to_sql_sec = function(d){ return E.to_sql_ms(d).slice(0, -4); };
E.to_sql = function(d){
    return E.to_sql_ms(d).replace(/( 00:00:00)?....$/, ''); };
E.from_sql = E.get;

E.to_month_short = function(d){
    d = E.get(d);
    return E.months_short[d.getUTCMonth()];
};
// timestamp format (used by tickets, etc). dates before 2000 not supported
E.to_jdate = function(d){
    d = E.get(d);
    return (pad(d.getUTCDate(), 2)+'-'+E.months_short[d.getUTCMonth()]
	+'-'+pad(d.getUTCFullYear()%100, 2)+' '+pad(d.getUTCHours(), 2)+
	':'+pad(d.getUTCMinutes(), 2)+':'+pad(d.getUTCSeconds(), 2))
    .replace(/( 00:00)?:00$/, '');
};
// used in log file names
E.to_log_file = function(d){
    d = E.get(d);
    return d.getUTCFullYear()+pad(d.getUTCMonth()+1, 2)+pad(d.getUTCDate(), 2)
    +'_'+pad(d.getUTCHours(), 2)+pad(d.getUTCMinutes(), 2)
    +pad(d.getUTCSeconds(), 2);
};
E.from_log_file = function(d){
    var m = d.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/);
    if (!m)
        return;
    return new Date(Date.UTC(m[1], m[2]-1, m[3], m[4], m[5], m[6]));
};
// zerr compatible timestamp format
E.to_log_ms = function(d){ return E.to_sql_ms(d).replace(/-/g, '.'); };
E.from_rcs = function(d){
    var m = d.match(/^(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})$/);
    if (!m)
        return;
    return new Date(Date.UTC(m[1], m[2]-1, m[3], m[4], m[5], m[6]));
};
E.to_rcs = function(d){ return E.to_sql_sec(d).replace(/[-: ]/g, '.'); };

E.sec = {
    MS: 0.001,
    SEC: 1,
    MIN: 60,
    HOUR: 60*60,
    DAY: 24*60*60,
    WEEK: 7*24*60*60,
    MONTH: 30*24*60*60,
    YEAR: 365*24*60*60,
};
E.ms = {};
for (var key in E.sec)
    E.ms[key] = E.sec[key]*1000;
var ms = E.ms;

E.align = function(d, align){
    d = E.get(d, 1);
    switch (align.toUpperCase())
    {
    case 'MS': break;
    case 'SEC': d.setUTCMilliseconds(0); break;
    case 'MIN': d.setUTCSeconds(0, 0); break;
    case 'HOUR': d.setUTCMinutes(0, 0, 0); break;
    case 'DAY': d.setUTCHours(0, 0, 0, 0); break;
    case 'WEEK':
        d.setUTCDate(d.getUTCDate()-d.getUTCDay());
        d.setUTCHours(0, 0, 0, 0);
        break;
    case 'MONTH': d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); break;
    case 'YEAR': d.setUTCMonth(0, 1); d.setUTCHours(0, 0, 0, 0); break;
    default: throw new Error('invalid align '+align);
    }
    return d;
};

E.add = function(d, duration){
    d = E.get(d, 1);
    if (duration.year)
        d.setUTCFullYear(d.getUTCFullYear()+duration.year);
    if (duration.month)
        d.setUTCMonth(d.getUTCMonth()+duration.month);
    ['day', 'hour', 'min', 'sec', 'ms'].forEach(function(key){
        if (duration[key])
            d.setTime(+d+duration[key]*ms[key.toUpperCase()]);
    });
    return d;
};

E.time_ago = function(d, until_date){
    var _ms = E.get(until_date)-E.get(d);
    if (_ms < 2*ms.SEC)
        return 'right now';
    if (_ms < 2*ms.MIN)
        return Math.round(_ms/ms.SEC)+' sec ago';
    if (_ms < 2*ms.HOUR)
        return Math.round(_ms/ms.MIN)+' min ago';
    if (_ms < 2*ms.DAY)
        return Math.round(_ms/ms.HOUR)+' hour ago';
    if (_ms < 2*ms.WEEK)
        return Math.round(_ms/ms.DAY)+' days ago';
    if (_ms < 2*ms.MONTH)
        return Math.round(_ms/ms.WEEK)+' weeks ago';
    if (_ms < 2*ms.YEAR)
        return Math.round(_ms/ms.MONTH)+' month ago';
    return Math.round(_ms/ms.YEAR)+' years ago';
};

E.ms_to_str = function(_ms){
    var s = ''+_ms;
    return s.length<=3 ? s+'ms' : s.slice(0, -3)+'.'+s.slice(-3)+'s';
};

E.parse = function(text, opt){
    opt = opt||{};
    if (opt.fmt)
        return E.strptime(text, opt.fmt);
    var d, a, i, v, _v, dir, _dir, amount, now = opt.now;
    now = !now ? new Date() : new Date(now);
    text = text.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!text)
        return;
    if (text=='now')
        return now;
    if (!isNaN(d = E.get(text)))
        return d;
    d = now;
    a = text.split(' ');
    dir = a.includes('ago') ? -1 : a.includes('last') ? -1 :
        a.includes('next') ? 1 : undefined;
    for (i=0; i<a.length; i++)
    {
        v = a[i];
        if (/^(ago|last|next)$/.test(v));
        else if (v=='today')
            d = E.align(d, 'DAY');
        else if (v=='yesterday')
            d = E.align(+d-ms.DAY, 'DAY');
        else if (v=='tomorrow')
            d = E.align(+d+ms.DAY, 'DAY');
        else if ((_v = days_short_lc.indexOf(v))>=0)
            d = new Date(+E.align(d, 'WEEK')+_v*ms.DAY+(dir||0)*ms.WEEK);
        else if (_v = /^([+-]?\d+)(?:([ymwdhs])(\d.*)?)?$/.exec(v))
        {
            if (amount!==undefined)
                return;
            amount = dir!==undefined ? Math.abs(+_v[1]) : +_v[1];
            if (_v[2])
            {
                a.splice(i+1, 0, _v[2]);
                if (_v[3])
                    a.splice(i+2, 0, _v[3]);
            }
            continue;
        }
        else if (/^([ymwdhs]|years?|months?|weeks?|days?|hours?|minutes?|min|seconds?|sec)$/.test(v))
        {
            _v = v[0]=='m' && v[1]=='i' ? ms.MIN :
                v[0]=='y' ? ms.YEAR : v[0]=='m' ? ms.MONTH :
                v[0]=='w' ? ms.WEEK :
                v[0]=='d' ? ms.DAY : v[0]=='h' ? ms.HOUR : ms.SEC;
            amount = amount===undefined ? 1 : amount;
            _dir = dir===undefined ? opt.dir||1 : dir;
            if (_v==ms.MONTH)
                d.setUTCMonth(d.getUTCMonth()+_dir*amount);
            else if (_v==ms.YEAR)
                d.setUTCFullYear(d.getUTCFullYear()+_dir*amount);
            else
                d = new Date(+d+_v*amount*_dir);
            amount = undefined;
        }
        else
            return;
        if (amount!==undefined)
            return;
    }
    if (amount!==undefined)
        return;
    return d;
};

E.strptime = function(str, fmt){
    function month(m){ return months_short_lc.indexOf(m.toLowerCase()); }
    var ampm, timezone;
    var parse = {
        '%': ['%', function(){}],
        a: ['[a-z]+', function(m){}],
        A: ['[a-z]+', function(m){}],
        b: ['[a-z]+', function(m){ d.setUTCMonth(month(m)); }],
        B: ['[a-z]+', function(m){ d.setUTCMonth(month(m.toLowerCase())); }],
        Y: ['[0-9]{4}', function(m){ d.setUTCFullYear(+m); }],
        m: ['[0-9]{0,2}', function(m){ d.setUTCMonth(+m-1); }],
        d: ['[0-9]{0,2}', function(m){ d.setUTCDate(+m); }],
        H: ['[0-9]{0,2}', function(m){ d.setUTCHours(+m); }],
        M: ['[0-9]{0,2}', function(m){ d.setUTCMinutes(+m); }],
        S: ['[0-9]{0,2}', function(m){ d.setUTCSeconds(+m); }],
        s: ['[0-9]+', function(m){ d.setUTCMilliseconds(+m); }],
        z: ['[+-][0-9]{4}', function(m){
            timezone = +m.slice(0, 3)*3600+m.slice(3, 5)*60; }],
        Z: ['[a-z]{0,3}[+-][0-9]{2}:?[0-9]{2}|[a-z]{1,3}', function(m){
            m = /^([a-z]{0,3})(?:([+-][0-9]{2}):?([0-9]{2}))?$/i.exec(m);
            if (m[1]=='Z' || m[1]=='UTC')
                return;
            timezone = +m[2]*3600+m[3]*60;
        }],
        I: ['[0-9]{0,2}', function(m){ d.setUTCHours(+m); }],
        p: ['AM|PM', function(m){ ampm = m.toUpperCase(); }],
    };
    var ff = [];
    var re = new RegExp('^\\s*'+fmt.replace(/%(?:([a-zA-Z%]))/g,
        function(_, fd)
    {
        var d = parse[fd];
        if (!d)
            throw Error('Unknown format descripter: '+fd);
        ff.push(d[1]);
        return '('+d[0]+')';
    })+'\\s*$', 'i');
    var matched = str.match(re);
    if (!matched)
        return;
    var d = new Date(0);
    for (var i=0; i<ff.length; i++)
    {
        var fun = ff[i];
        if (!fun)
            continue;
        fun.call(d, matched[i+1]);
    }
    if (timezone)
        d = new Date(d.getTime()-timezone*1000);
    if (ampm)
    {
        if (d.getUTCHours()==12)
            d.setUTCHours(d.getUTCHours()-12);
        if (ampm=='PM')
            d.setUTCHours(d.getUTCHours()+12);
    }
    return d;
};

var utc_local = {
    local: {
	getSeconds: function(d){ return d.getSeconds(); },
	getMinutes: function(d){ return d.getMinutes(); },
	getHours: function(d){ return d.getHours(); },
	getDay: function(d){ return d.getDay(); },
	getDate: function(d){ return d.getDate(); },
	getMonth: function(d){ return d.getMonth(); },
	getFullYear: function(d){ return d.getFullYear(); },
	getYearBegin: function(d){ return new Date(d.getFullYear(), 0, 1); }
    },
    utc: {
	getSeconds: function(d){ return d.getUTCSeconds(); },
	getMinutes: function(d){ return d.getUTCMinutes(); },
	getHours: function(d){ return d.getUTCHours(); },
	getDay: function(d){ return d.getUTCDay(); },
	getDate: function(d){ return d.getUTCDate(); },
	getMonth: function(d){ return d.getUTCMonth(); },
	getFullYear: function(d){ return d.getUTCFullYear(); },
	getYearBegin: function(d){ return new Date(Date.UTC(
            d.getUTCFullYear(), 0, 1)); }
    }
};

E.strftime = function(fmt, d, opt){
    function hours12(hours){
        return hours==0 ? 12 : hours>12 ? hours-12 : hours; }
    function ord_str(n){
        var i = n % 10, ii = n % 100;
        if ((ii >= 11 && ii <= 13) || i==0 || i>=4)
            return 'th';
        switch (i)
        {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        }
    }
    function week_num(l, d, first_weekday){
        // This works by shifting the weekday back by one day if we
        // are treating Monday as the first day of the week.
        var wday = l.getDay(d);
        if (first_weekday=='monday')
            wday = wday==0 /* Sunday */ ? wday = 6 : wday-1;
        var yday = (d-l.getYearBegin(d))/ms.DAY;
        return Math.floor((yday + 7 - wday)/7);
    }
    // Default padding is '0' and default length is 2, both are optional.
    function padx(n, padding, length){
        // padx(n, <length>)
        if (typeof padding=='number')
        {
            length = padding;
            padding = '0';
        }
        // Defaults handle padx(n) and padx(n, <padding>)
        if (padding===undefined)
            padding = '0';
        length = length||2;
        var s = ''+n;
        // padding may be an empty string, don't loop forever if it is
        if (padding)
            for (; s.length<length; s = padding + s);
        return s;
    }
    opt = opt||{};
    d = E.get(d);
    var locale = opt.locale||E.locale;
    var formats = locale.formats||{};
    var timestamp = +d;
    var tz = opt.timezone;
    var utc = opt.utc!==undefined ? opt.utc :
	opt.local!==undefined ? !opt.local :
	true;
    if (tz!=null)
    {
	utc = true;
	// ISO 8601 format timezone string, [-+]HHMM
	// Convert to the number of minutes and it'll be applied to the date
	// below.
	if (typeof tz=='string')
	{
	    var sign = tz[0] == '-' ? -1 : 1;
	    var hours = parseInt(tz.slice(1, 3), 10);
	    var mins = parseInt(tz.slice(3, 5), 10);
	    tz = sign*(60*hours)+mins;
	}
	else if (typeof tz=='number')
	    d = new Date(+d+tz*60000);
    }
    var l = utc ? utc_local.utc : utc_local.local;
    // Most of the specifiers supported by C's strftime, and some from Ruby.
    // Some other syntax extensions from Ruby are supported: %-, %_, and %0
    // to pad with nothing, space, or zero (respectively).
    function replace(fmt){ return fmt.replace(/%([-_0]?.)/g, function(_, c){
	var mod, padding, day, y;
	if (c.length==2)
	{
	    mod = c[0];
	    if (mod=='-') // omit padding
		padding = '';
	    else if (mod=='_') // pad with space
		padding = ' ';
	    else if (mod=='0') // pad with zero
		padding = '0';
	    else // unrecognized, return the format
		return _;
	    c = c[1];
	}
	switch (c)
	{
	// Examples for new Date(0) in GMT
	case 'A': return locale.days_long[l.getDay(d)]; // 'Thursday'
	case 'a': return locale.days_short[l.getDay(d)]; // 'Thu'
	case 'B': return locale.months_long[l.getMonth(d)]; // 'January'
	case 'b': return locale.months_short[l.getMonth(d)]; // 'Jan'
	case 'C': // '19'
	    return padx(Math.floor(l.getFullYear(d)/100), padding);
	case 'D': return replace(formats.D || '%m/%d/%y'); // '01/01/70'
	case 'd': return padx(l.getDate(d), padding); // '01'
	case 'e': return l.getDate(d); // '01'
	case 'F': return replace(formats.F || '%Y-%m-%d'); // '1970-01-01'
	case 'H': return padx(l.getHours(d), padding); // '00'
	case 'h': return locale.months_short[l.getMonth(d)]; // 'Jan'
	case 'I': return padx(hours12(l.getHours(d)), padding); // '12'
	case 'j': // '000'
	    day = Math.ceil((+d-l.getYearBegin(d))/(1000*60*60*24));
	    return pad(day, 3);
	case 'k': // ' 0'
	    return padx(l.getHours(d), padding===undefined ? ' ' : padding);
	case 'L': return pad(Math.floor(d.getMilliseconds()), 3); // '000'
	case 'l': // '12'
	    return padx(hours12(l.getHours(d)),
		padding===undefined ? ' ' : padding);
	case 'M': return padx(l.getMinutes(d), padding); // '00'
	case 'm': return padx(l.getMonth(d)+1, padding); // '01'
	case 'n': return '\n'; // '\n'
	case 'o': return ''+l.getDate(d)+ord_str(l.getDate(d)); // '1st'
	case 'P': // 'am'
            return (l.getHours(d)<12 ? locale.AM : locale.PM).toLowerCase();
	case 'p': return l.getHours(d)<12 ? locale.AM : locale.PM; // 'AM'
	case 'R': return replace(formats.R || '%H:%M'); // '00:00'
	case 'r': return replace(formats.r || '%I:%M:%S %p'); // '12:00:00 AM'
	case 'S': return padx(l.getSeconds(d), padding); // '00'
	case 's': return Math.floor(+d/1000); // '0'
	case 'T': return replace(formats.T || '%H:%M:%S'); // '00:00:00'
	case 't': return '\t'; // '\t'
	case 'U': return padx(week_num(l, d, 'sunday'), padding); // '00'
	case 'u': // '4'
	    day = l.getDay(d);
	    // 1 - 7, Monday is first day of the week
	    return day==0 ? 7 : day;
	case 'v': return replace(formats.v || '%e-%b-%Y'); // '1-Jan-1970'
	case 'W': return padx(week_num(l, d, 'monday'), padding); // '00'
	case 'w': return l.getDay(d); // '4'. 0 Sunday - 6 Saturday
	case 'Y': return l.getFullYear(d); // '1970'
	case 'y': return (''+l.getFullYear(d)).slice(-2); // '70'
	case 'Z': // 'GMT'
	    if (utc)
	        return 'GMT';
	    var tzString = d.toString().match(/\((\w+)\)/);
	    return tzString && tzString[1] || '';
	case 'z': // '+0000'
	    if (utc)
	        return '+0000';
	    var off = typeof tz=='number' ? tz : -d.getTimezoneOffset();
	    return (off<0 ? '-' : '+')+pad(Math.abs(off/60), 2)+pad(off%60, 2);
	default: return c;
	}
    }); }
    return replace(fmt);
};

return E; }); }());