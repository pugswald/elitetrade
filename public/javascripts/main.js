// Elite trader scripting
$( init );

function init(){
  $('#message-sent-dialog').dialog({
    modal: true,
    resizable: false,
    draggable: false,
    autoOpen: false,
    width: 'auto',
    close: function(){
      $('#message-form').resetForm();
      // Clear friends list
      $('#selected-friends').children().remove();
    }
  });
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
  
  
  
  
  
 // Create the password dialog
  $("#forget-me").dialog({
    modal: true,
    resizable: false,
    autoOpen: false,
    width: 'auto',
    buttons: {
      Ok: function(){
        $.ajax({url:'/user',async:false,type:'delete',dataType:'json',success: function(e){
          // Remove all local/remote session data
          localStorage.clear();
          sessionStorage.clear();
          window.location.href="/";
          }
        });
      },
      Cancel: function(){
        $(this).dialog("close");
      }
    }
  });

  // Convert buttons to jquery ui button objects
  $("button").button();
  // Bind add all friends to an action

  // Initialize the friend autocomplete
  $('#friend-autoselect').autocomplete({
    minLength:0,
    source:function( request, response){
      var matches = [];
      var idx =0;
      //console.log('request is');
      //console.log(request);
      // TODO: alphabetize the user friend list - in server
      user.friends.forEach( function (friend,idx,all_friends){
        //console.log($('#'+friend.fb_id));
        if ((friend.public_key)&&($('#'+friend.fb_id).length == 0)) {
          if (friend.name.toLowerCase().indexOf(request.term.toLowerCase()) != -1){
            matches.push({label:friend.name,value:idx});
          }
        }
      });
      response(matches);
    },
    focus: function( event, ui ){
      $( "#project" ).val( ui.item.name );
      return false;
    },
    select: function(event, ui){
      // Create a new friend box
      var friend = user.friends[ui.item.value];
      // TODO: Avoid duplicates
      addFriend(friend);
      //var new_friend = $('#selected-friends').append('<div class="friend" id="'+friend.fb_id+'"><img src="https://graph.facebook.com/'+friend.fb_id+'/picture?type=square">'+friend.name+'<div class="remove-friend">x</div></div>');
      //console.log(new_friend);
      return false;
    }
  });
  // Bind Invite friends to an action
  // TODO: Expand to a full selector/message
  // TODO: Server work to accomodate facebook messages
  $('#invite-friends').click( function(e) {
    e.preventDefault();
    FB.ui({method: 'apprequests',
      message: 'Please join me on Fourth Social for private conversations'
    }, function(e){
      //console.log('Done with requests');
    });
  });
  // Bind all message unlock to an action
  $('#all-message-unlock').click( function(e) {
    e.preventDefault();
    //console.log(e);
    $('.lock-toggle.locked').trigger('click');
  });
  // Bind all message lock to an action
  $('#all-message-lock').click( function(e) {
    e.preventDefault();
    //console.log(e);
    $('.lock-toggle.unlocked').trigger('click');
  });
  // Get the theme rolling
  $('#menu').buttonset();
  // Kick off the message load in the background
  //setTimeout(loadMessages,20);
  //openpgp.init();
  // Populate key-management content
  //updateKeyManagement(true);
  // Unlock the key or display dialog required
  //unlockKey();
  // Set up event handlers for task buttons
  $('#menu').change(function(e){
    //console.log('change happens');
    //console.log(e.target.id);
    selectPane(e.target.value);
  });
    // Form bindings for station
    if (is_admin == 'true'){
        $('#station-form').submit(sendStation);
        $('#station-delete-button').click(deleteStation);
        clearStationForm();
        $('#station-list').dataTable({
            "processing": true,
            "serverSide": true,
            "ajax": "/station",
            order: [1,'asc'],
            columns: [{ "visible": false }, null, null, null, null, null, { "visible": false }]
        });
        $('#station-list').on( 'click', 'tr', function() {
            if ( $(this).hasClass('selected') ) {
                $(this).removeClass('selected');
                clearStationForm();
                //$('#station-delete-button').button("option", "disabled", true);
            } else {
                $('#station-list tr.selected').removeClass('selected');
                $(this).addClass('selected');
                $('#station-delete-button').button("option", "disabled", false);
                $('#station-put-button').button("option", "label", "Modify station");
                //console.log( $('#station-delete-button'));
                var rowData = $('#station-list').DataTable().row( this ).data();
                if (rowData) { // Clicking outside of data form still triggers this
                    var thisform = $('#station-form');
                    thisform.find('input[name="id"]').val(rowData[0]);
                    thisform.find('input[name="name"]').val(rowData[1]);
                    thisform.find('input[name="system"]').val(rowData[2]);
                    thisform.find('input[name="x"]').val(rowData[3]);
                    thisform.find('input[name="y"]').val(rowData[4]);
                    thisform.find('input[name="z"]').val(rowData[5]);
                    console.log(rowData);
                }
            }
        });
        selectPane('#station-admin');
    } else {
        selectPane('#find-route');
    }
    $('#page').fadeIn(1000);
}

function clearStationForm(){
    $('#station-form')[0].reset();
    $('#station-admin-error').text("");
    $('#station-delete-button').button("option", "disabled", true);
    $('#station-put-button').button("option", "label", "Create station");
}

function sendStation(e) {
    var thisform = $('#station-form');
    var name = thisform.find('input[name="name"]').val();
    console.log('Creating new station '+name);
    $.ajax({url:'/station',type:'put',data:thisform.serialize(),success: function(e){
            console.log('Ran put for station');
            console.log(e);
            if ( e.error ) {
                $('#station-admin-error').text("Error: "+e.error);
            } else {
                clearStationForm()
                $('#station-list').DataTable().draw();
            }
        }
    });
    return false;
}
function deleteStation(e) {
    var thisform = $('#station-form');
    var name = thisform.find('input[name="name"]').val();
    console.log('Deleting station '+name);
    $.ajax({url:'/station',type:'delete',data:thisform.serialize(),success: function(e){
            console.log('Ran delete for station');
            console.log(e);
            if ( e.error ) {
                $('#station-admin-error').text("Error: "+e.error);
            } else {
                clearStationForm()
                $('#station-list').DataTable().draw();
            }
        }
    });
    return false;
}
// Sends a message to users
// This will create multiple PUTs to /message, one for each recipient
function sendMessage(e) {
  //console.log('Send message');
  //console.log(e);
  
  var message_raw = $('textarea[name=message]').val();
  //console.log('message raw: '+message_raw);
// Leave try/catch in for a while - the openpgp library is squirrely
try{
  // TODO: Show which users we are missing - which should never happen
  var to_list = [];
  $('#selected-friends').children().each( function(){
    //console.log('send to: '+$(this).attr('id'));
    var to_fbid = $(this).attr('id');
    for (var i=0;i<user.friends.length;++i){
      var u = user.friends[i];
      //console.log(u);
      if (u.fb_id == to_fbid){
        to_list.push(u.id);
        break;
      }
    }
  });
  //console.log(to_list);
//  var recipients = getPublicKeysForUserIds([userId]); // Self test
  var recipients = getPublicKeysForUserIds(to_list);
  //console.log(recipients);
  $.each(recipients, function (uid,pubkey) {
  // TODO: Allow message signing
//    var message = openpgp.write_encrypted_message([recipients[userId].obj],message_raw); // self test
    var message = openpgp.write_encrypted_message([pubkey.obj],message_raw);
//    console.log(message);
    var msg_data = {
      recipient:uid,
      message:message,
      expires:$('#expire-slider').slider('value')/24.0 // TODO: Get client and server on the same units
    };
    $.ajax({url:'/message',type:'put',dataType:'json',data:msg_data,success: function(e){
      // TODO: Error handling, right now everything will come back success
      //console.log(e);
      $('#message-sent-dialog').dialog('open');
      setTimeout( function(){
        $('#message-sent-dialog').dialog('close');
      },1500);
      }});
  });
} catch(err){
  //console.log(err);
}
  //$('#message-form').ajaxSubmit({url:'/message',type:'put',dataType:'json',success: function(e){console.log(e);}});
  return false;
}
function selectPane(paneSelector){
  // Hide all content
  $('#content').children().hide();
  // TODO: Get rid of this horrible hack
  //if (paneSelector == "#messages"){
  //  loadMessages();
  //}else  
  if (paneSelector == "#logout"){
    window.location.href="/logout";
  }

  $(paneSelector).show();
  //console.log('Attempting to select button');
  //console.log( $('input[value="'+paneSelector+'"]'));
  //$('#menu input[value="'+paneSelector+'"]').attr('checked','checked');
  $('#menu input[value="'+paneSelector+'"]')[0].checked=true;
//  $('input[value="'+paneSelector+'"]').button('refresh');
  $('#menu').buttonset('refresh');
  //console.log('buttonset val is '+$('#menu').val());
  //$('#menu').buttonset('refresh');
  //console.log('showing '+paneSelector);
}

function loadMessages(){
  // TODO: Turn this into a listener for changes in the server message list

  // Load messages and decrypt if possible
  //console.log(msgs);
  // User object is required
  if (!user){
    return false;
  }
  //$('#message-list').children().remove();

  //selectPane('#messages');
  //$('#message-list').append('<li>Loading...</li>');
  $.ajax('/message',{success: 
    function(msgs,status,jqXHR){
      setTimeout(loadMessages,5000);  // TODO: Switch to long polling on server, will need to break out message decrypting from loading
      if (jqXHR.status != 200){
        console.log('Non 200 message');
        console.log(jqXHR);
        return;
      }
      // Messages ready to parse
      var prepend = false;
      if ($('#message-list').children('.message').length > 0){
        // prepend new messages
        // TODO: Fix this so ordering can be selected by user
        prepend=true;
      }
      $('#message-error').remove();
      var msg_ids = [];
      //var pub_key = getPublicKeysForUserIds([userId])[userId]; // TODO: Get all public keys into a dict visible to entire class
      for (var mi=0; mi<msgs.length; ++mi) {
        //console.log(msgs[mi]);
        var message = msgs[mi];
        msg_ids.push(message._id);
        if ($('#'+message._id).length){
          //console.log('Message '+message._id+' already in list');
          //console.log($('#'+message._id));
          // Check if message has been decrypted - if not let er rip
          if (($('#'+message._id+' .plaintext').length == 0) && (pk_clear != null)){
            // Remove existing elements and try again
            console.log('Try to decrypt message again');
            $('#'+message._id).remove();
          } else {
            continue;
          }
        }
        var msg_li = $("<li>");
        msg_li.addClass("message");
        msg_li.attr("id",message._id);
        var sender=null;
        for (var i =0; i<user.friends.length; ++i){
          var friend = user.friends[i];
          if (friend.id == message.sender) {
            msg_li.append('<img src="https://graph.facebook.com/'+friend.fb_id+'/picture?type=square">');
            msg_li.append('<div class="sender">'+friend.name+'</div>');// TODO: Possible to attack via html in facebook name?
            sender = friend;
            break;
          }
        }
        // TODO: Template these controls a little better
        var msg_controls = $("<div>");
        msg_controls.addClass("controls");
        var enc_button = $('<span>');
        msg_li.append(msg_controls);
        msg_li.append('<div class="encrypted message-block">'+message.message+'</div>');
        try{
          var message_set=openpgp.read_message(message.message);
          // TODO: Clean up the message_set - create ui for multiple messages
          for (var j in message_set) {
            var plain_text="";
            if (pk_clear != null){
              var keymat = {key:pk_clear, keymaterial:pk_clear.privateKeyPacket};// Bizarre requirement
              //console.log(message_set[j].toString());
              if (message_set[j].sessionKeys){
                plain_text = message_set[j].decrypt(keymat,message_set[j].sessionKeys[0]);
              }
              //console.log(plain_text);
              enc_button.addClass('lock-toggle locked');
              enc_button.attr('title', 'Click to unlock message');
              enc_button.click(function(e){
                //e.preventDefault();
                var lock_div = $(this);
                if (lock_div.hasClass('locked')){
                  lock_div.removeClass('locked');
                  lock_div.addClass('unlocked');
                  lock_div.attr('title', 'Click to lock message');
                  lock_div.parent().siblings('.encrypted').hide();
                  lock_div.parent().siblings('.plaintext').show();
                } else if (lock_div.hasClass('unlocked')){
                  lock_div.removeClass('unlocked');
                  lock_div.addClass('locked');
                  lock_div.attr('title', 'Click to unlock message');
                  lock_div.parent().siblings('.encrypted').show();
                  lock_div.parent().siblings('.plaintext').hide();
                }
              });
              msg_li.append(enc_button);
              var pt_div = $('<div>');
              pt_div.addClass("plaintext message-block");
              pt_div.text(plain_text); // This takes care of messages with html markup
              msg_li.append(pt_div);
            }
          }
        } catch(err) {
          // TODO: Better error handling for user
          //msg_li.append('<div class="plaintext message-block">ERROR WITH MESSAGE</div>');
        }
        //if (msg_li.find('.plaintext').length == 0){
        if (!enc_button.hasClass('lock-toggle')){
          // Add unreadable button
          enc_button.addClass('lock-toggle unreadable');
          enc_button.attr('title', 'Unable to decrypt message');
          //msg_li.append(enc_button);
        }
        msg_controls.append(enc_button);
        // Message expiration time
        var msg_exp = $('<span class="expire-time">Expires in ...</span>');
        msg_exp.data("expires",new Date(message.expires));
        msg_controls.append(msg_exp);
        // Message reply button
        var msg_reply = $('<span class="reply" title="Reply to sender"></span>');
        msg_reply.data("sender",sender);
        msg_reply.click( function() {
          //var reply_id = $(this).parents('li').attr('id'); // May need this later
          // Fill in send message screen
          var sender = $(this).data("sender");
          //console.log(sender);
          //var friend = user.friends[sender];
          // Clear friends list
          $('#selected-friends').children().remove();
          addFriend(sender);

          var orig_msg = $(this).parent().siblings('.plaintext').text();
          var new_msg = sender.name + " wrote:\n";
          var orig_arr = orig_msg.split('\n');
          $.each(orig_arr, function(idx,line){
            new_msg = new_msg + "> "+line+"\n";
          });
          var message_raw = $('textarea[name=message]').val(new_msg);
          // Add sender to list
          selectPane('#send-message');
          
        });
        msg_controls.append(msg_reply);
        var del_button = $("<span>");
        del_button.addClass('delete-icon');
        del_button.attr('title','Delete this message');
        del_button.click(function(e){
          var del_id = $(this).parents('li').attr('id');
          $(this).parents('li').slideUp();

          //console.log(del_id);
          // TODO wire in AJAX delete call
          $.ajax({url:'/message/'+del_id,type:'delete',dataType:'json',success: function(e){
            // TODO: Check for success and handle errors
            //console.log('deleted');
            $(this).parents('li').remove();
            if ($('#message-list').children().length == 0){
              $('#message-list').append('<li id="message-error">No Messages</li>');
            }

            }
          });
        });
        msg_controls.append(del_button);
        msg_li.hide();
        if (prepend){
          $('#message-list').prepend(msg_li); 
        } else {
          $('#message-list').append(msg_li);
        }
        msg_li.show('slideDown');
      }
      // Remove messages not in list
      $('#message-list').children().each( function(){
        if ( $.inArray($(this).attr('id'),msg_ids) == -1){
          $(this).slideUp( function(){
            $(this).remove();
          });;
        }
      });
      if ($('#message-list').children().length == 0){
        $('#message-list').append('<li id="message-error">No Messages</li>');
      }
    }
  });
}

function addFriend(friend){
  // Helper function to add a friend to the send message list
  // It does no checking for duplicates/pub key exists/etc
  var new_friend=$('<div>');
  new_friend.addClass('friend');
  new_friend.attr('id',friend.fb_id);
  new_friend.append('<img src="https://graph.facebook.com/'+friend.fb_id+'/picture?type=square">');
  new_friend.append('<span>'+friend.name+'</span>');
  new_friend.append('<div class="remove-friend">x</div>');
  //$('#selected-friends').append('<div class="friend" id="'+friend.fb_id+'"><img src="https://graph.facebook.com/'+friend.fb_id+'/picture?type=square">'+friend.name+'<div class="remove-friend">x</div></div>');
  //console.log(new_friend.children(".remove-friend"));
  
  new_friend.children(".remove-friend").click( function(e){
    //console.log('Remove friend');
    $(this).parent().remove();
  });
  $('#selected-friends').append(new_friend);
}

function updateExpireLoop(){
  // Update every message expiration time
  //console.log('Update expiry');
  var now = Date.now();
  $('.expire-time').each( function() {
    var msg = '';
    var dt = $(this).data('expires')-now;
    if (dt < 0) {
      // Should have already expired
      msg = 'Message expired';
    } else {
      var secs = Math.ceil(dt/1000);
      var ss = padzero(secs % 60);
      var mins = Math.floor(secs/60);
      var mm = padzero(mins % 60);
      var hours = Math.floor(mins / 60);
      var hh = hours %24;
      var days = Math.floor(hours/24);
      msg = 'Expiring in ';
      if (days > 0){
        msg = msg + days +" day";
        if (days > 1) msg = msg + 's';
      } else {
        msg = msg + hh +":"+mm+":"+ss;
      }
    }
    $(this).text(msg);
  });
  setTimeout(updateExpireLoop,1000);
}

function padzero(num){
  var s = num+"";
  if (s.length == 1) s="0"+s;
  return s;
}

function purgeKeyring() {
  // Remove all keys from the keyring in localStorage
  pk_clear=null;
  for (var i =0; i < openpgp.keyring.privateKeys.length; i++) {
    openpgp.keyring.removePrivateKey(i);
  }
  for (var i =0; i < openpgp.keyring.publicKeys.length; i++) {
    openpgp.keyring.removePublicKey(i);
  }
}

function toHex(str){
  var hex = '';
  for(var i=0;i<str.length;i++) {
    hex += ''+str.charCodeAt(i).toString(16);
  }
  return hex;
}
