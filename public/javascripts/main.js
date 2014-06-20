// Elite trader scripting
$( init );

function init(){
    // Could be useful for use instead of trade datestamps
    var expire_fmt = function(expire){
        var exp_msg ='';
        var days = Math.floor(expire/24);
        if (days > 0) exp_msg = exp_msg+' '+days+' day';
        if (days > 1) exp_msg = exp_msg+'s';
        var hours = expire % 24;
        exp_msg = exp_msg+' '+hours+' hour';
        if (hours > 1) exp_msg = exp_msg+'s';
        $("#expire-hours").text(exp_msg);
    };
  
    // Convert buttons to jquery ui button objects
    $("button").button();
    // Get the theme rolling
    $('#menu').buttonset();
    // Set up event handlers for task buttons
    $('#menu').change(function(e){
        //console.log('change happens');
        //console.log(e.target.id);
        selectPane(e.target.value);
    });
  
    // Station and Commodity autocomplete widgets
    $('input[name="station"]').autocomplete({ source: "/station" });
    $('input[name="commodity"]').autocomplete({ source: "/commodity" });
    selectPane('#find-route');
    $('#page').fadeIn(1000);
}


function selectPane(paneSelector){
    // Hide all content
    $('#content').children().hide();
    if (paneSelector == "#logout"){
        window.location.href="/logout";
    }
    $(paneSelector).show();
    $('#menu input[value="'+paneSelector+'"]')[0].checked=true;
    $('#menu').buttonset('refresh');
}


function padzero(num){
  var s = num+"";
  if (s.length == 1) s="0"+s;
  return s;
}


function toHex(str){
  var hex = '';
  for(var i=0;i<str.length;i++) {
    hex += ''+str.charCodeAt(i).toString(16);
  }
  return hex;
}
